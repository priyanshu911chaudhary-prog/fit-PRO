import {User} from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/async-handler.js";
import {sendEmail,emailVerificationTemplate,passwordResetTemplate} from "../utils/sendEmail.js";
import crypto from "crypto";
import {OAuth2Client} from "google-auth-library";
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

const googleClient=new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const msClient=jwksClient({
    jwksUri: "https://login.microsoftonline.com/common/discovery/v2.0/keys"
});

const getMicrosoftSigningKey=(header,callback)=>{
    msClient.getSigningKey(header.kid,(err,key)=>{
        if(err){
            return callback(err);
        }
        const signingKey=key.getPublicKey();
        callback(null,signingKey);
    });
}

const microsoftLogin=asyncHandler(async (req,res,next)=>{
    const {idToken}=req.body;

    if(!idToken){
        throw new ApiError(400,"Microsoft ID token is required");
    }

    let decodedPayload;
    try{
        decodedPayload=await new Promise((resolve,reject)=>{
            jwt.verify(idToken,getMicrosoftSigningKey,
                {
                    audience: process.env.MICROSOFT_CLIENT_ID,
                },(err,decoded)=>{
                if(err){
                    return reject(err);
                }
                resolve(decoded);
            });
        })
    }catch(err){
        throw new ApiError(400,"Invalid Microsoft ID token");
    }

    const email=decodedPayload.preferred_username || decodedPayload.email;
    const name=decodedPayload.name;
    const microsoftId=decodedPayload.oid || decodedPayload.sub;

    if(!email){
        throw new ApiError(400,"Email not found in Microsoft ID token");
    }


    let user=await User.findOne({email});

    if(!user){
        user=await User.create({
            fullName:name || "Microsoft User",
            email,
            authProvider:"microsoft", 
            isVerified:true,
            microsoftId
        });
    }else{
        if(!user.microsoftId){
            user.microsoftId=microsoftId;
            user.authProvider="microsoft";
            user.isVerified=true;
            await user.save({validateBeforeSave:false});
        }
    }

    const accessToken=user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();

    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false});

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry");

    const options={
        httpOnly: true,
        secure: process.env.NODE_ENV==="production",
        sameSite: "strict",
        maxAge: 7*24*60*60*1000 // 7 days
    }

    return res
        .status(200)
        .cookie("refreshToken",refreshToken,options)
        .cookie("accessToken",accessToken,options)
        .json(
            new ApiResponse(
                201,
                "User logged in successfully via Microsoft",
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                }
            )
        );
});

const googleLogin=asyncHandler(async (req,res,next)=>{
    const {idToken}=req.body;

    if(!idToken){
        throw new ApiError(400,"Google ID token is required");
    }

    let ticket;
    try{
        ticket=await googleClient.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });
    }catch(err){
        throw new ApiError(400,"Invalid Google ID token");
    }

    const payload=ticket.getPayload();
    const {email,name,sub:googleId}=payload;

    let user=await User.findOne({email});

    if(!user){
        user=await User.create({
            fullName:name,
            email,
            authProvider:"google", 
            isVerified:true,
            googleId
        });
    }else{
        if(!user.googleId){
            user.googleId=googleId;
            user.authProvider="google";
            user.isVerified=true;
            await user.save({validateBeforeSave:false});
        }
    }

    const accessToken=user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();

    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false});

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry");
    
    const options={
        httpOnly: true,
        secure: process.env.NODE_ENV==="production",
        sameSite: "strict",
        maxAge: 7*24*60*60*1000 // 7 days
    }

    return res
        .status(200)
        .cookie("refreshToken",refreshToken,options)
        .cookie("accessToken",accessToken,options)
        .json(
            new ApiResponse(
                201,
                "User logged in successfully via Google",
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                }
            )
        );
});

const registerUser=asyncHandler(async (req,res,next)=>{
    const {fullName,email,password}=req.body;

    const existingUser=await User.findOne({email});

    if(existingUser){
        throw new ApiError(400,"Email already in use");
    }

    const newUser=await User.create({
        fullName,
        email,
        password,
        isVerified: false
    });

    const {unhasedToken,hashedToken,tokenexpiry}=newUser.generateTemporaryToken();

    newUser.emailVerificationToken=hashedToken;
    newUser.emailVerificationTokenExpiry=tokenexpiry;

    const verificationLink = `${process.env.CORS_ORIGIN}/verify-email/${unhasedToken}`;

    await newUser.save({validateBeforeSave:false});

    await sendEmail({
        email: newUser.email,
        subject: "Verify Your Email Address",
        mailgenContent: emailVerificationTemplate(newUser.fullName, verificationLink)
    });

    const createdUser=await User.findById(newUser._id).select("-password -emailVerificationToken -emailVerificationTokenExpiry");

    if(!createdUser){
        throw new ApiError(500,"Failed to create user");
    }

    return res
        .status(201)
        .json(new ApiResponse(201,"User registered successfully. Please check your email to verify your account.",createdUser));
});

const loginUser=asyncHandler(async (req,res,next)=>{
    const {email,password}=req.body;

    const user=await User.findOne({email});

    if(!user){
        throw new ApiError(400,"Invalid email");
    }

    const isPasswordValid=await user.comparePassword(password);

    if(!isPasswordValid){
        throw new ApiError(400,"Invalid password");
    }

    if(!user.isVerified){
        throw new ApiError(400,"Email not verified. Please check your email to verify your account.");
    }

    const accessToken=user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();

    user.refreshToken=refreshToken;
    await user.save({validateBeforeSave:false});

    const loggedInUser=await User.findById(user._id).select("-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry -forgotPasswordToken -forgotPasswordTokenExpiry");
    
    const options={
        httpOnly: true,
        secure: process.env.NODE_ENV==="production",
        sameSite: "strict",
        maxAge: 7*24*60*60*1000 // 7 days
    }

    return res
        .status(200)
        .cookie("refreshToken",refreshToken,options)
        .cookie("accessToken",accessToken,options)
        .json(
            new ApiResponse(
                201,
                "User logged in successfully",
                {
                    user: loggedInUser,
                    accessToken,
                    refreshToken
                }
            )
        );
});

const verifyEmail = asyncHandler(async (req, res) => {
    const verificationToken = req.params.verificationToken?.trim();

    if (!verificationToken) {
        throw new ApiError(400, "Verification token is missing");
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(verificationToken)
        .digest("hex");

    // 1. Find the user using ONLY the hash. We removed the $gt expiry query here.
    const user = await User.findOne({
        emailVerificationToken: hashedToken,
    });

    // 2. If no user is found, the token is completely wrong or already used
    if (!user) {
        throw new ApiError(400, "Verification link is invalid or has already been used");
    }

    // 3. Now, do the Expiry check manually using plain JavaScript!
    const currentTime = new Date();
    const expiryTime = new Date(user.emailVerificationTokenExpiry);

    if (expiryTime < currentTime) {
        // Optional: You could even automatically clear the token here since it's useless now
        throw new ApiError(400, "Your verification link has expired. Please request a new one.");
    }

    // 4. Mark the user as verified and clear the temporary tokens
    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, "Email verified successfully. You can now log in.", {})
    );
});

const completeUserProfile = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const {
        age,
        gender,
        height,
        weight,
        fitnessGoal,
        activityLevel,
        dietaryPreference
    } = req.body;

    const user = await User.findById(userId);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    // Update user profile
    user.age = age;
    user.gender = gender;
    user.height = height;
    user.weight = weight;
    user.fitnessGoal = fitnessGoal;
    user.activityLevel = activityLevel;
    user.dietaryPreference = dietaryPreference;
    user.isProfileComplete = true;

    await user.save();

    return res.status(200).json(
        new ApiResponse(200, "User profile updated successfully.", { user })
    );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, "User logged out successfully", {}));
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
        throw new ApiError(404, "User not found");
    }

    const isPasswordCorrect = await user.comparePassword(oldPassword);
    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: false });

    return res
        .status(200)
        .json(new ApiResponse(200, "Password changed successfully", {}));
});

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
        // Return success even if not found to prevent email enumeration
        return res.status(200).json(new ApiResponse(200, "If an account with that email exists, a password reset link has been sent.", {}));
    }

    if (user.authProvider !== "local") {
        throw new ApiError(400, "This account is managed by an external provider (Google/Microsoft).");
    }

    const { unhasedToken, hashedToken, tokenExpiry } = user.generateTemporaryToken();

    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordTokenExpiry = tokenExpiry;
    await user.save({ validateBeforeSave: false });

    const resetLink = `${process.env.CORS_ORIGIN}/reset-password/${unhasedToken}`;

    await sendEmail({
        email: user.email,
        subject: "Reset Your Password",
        mailgenContent: passwordResetTemplate(user.fullName, resetLink)
    });

    return res.status(200).json(new ApiResponse(200, "If an account with that email exists, a password reset link has been sent.", {}));
});

const resetPassword = asyncHandler(async (req, res) => {
    const { resetToken } = req.params;
    const { newPassword } = req.body;

    if (!resetToken) {
        throw new ApiError(400, "Reset token is missing");
    }

    const hashedToken = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

    const user = await User.findOne({
        forgotPasswordToken: hashedToken,
    });

    if (!user) {
        throw new ApiError(400, "Reset token is invalid or has expired");
    }

    const currentTime = new Date();
    const expiryTime = new Date(user.forgotPasswordTokenExpiry);

    if (expiryTime < currentTime) {
        throw new ApiError(400, "Your reset token has expired. Please request a new one.");
    }

    user.password = newPassword;
    user.forgotPasswordToken = undefined;
    user.forgotPasswordTokenExpiry = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(200).json(new ApiResponse(200, "Password reset successfully. You can now log in with your new password.", {}));
});

export {
    registerUser,
    googleLogin,
    microsoftLogin,
    loginUser,
    verifyEmail,
    logoutUser,
    changeCurrentPassword,
    forgotPassword,
    resetPassword
};
