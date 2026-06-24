import {User} from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/async-handler.js";
import {sendEmail,emailVerificationTemplate} from "../utils/sendEmail.js";
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


export {
    registerUser,
    googleLogin,
    microsoftLogin,
    loginUser,
    verifyEmail
};
