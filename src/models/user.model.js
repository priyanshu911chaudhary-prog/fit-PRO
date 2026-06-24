import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const userSchema=new mongoose.Schema(
    {
        fullName:{
            type: String,
            required: [true, "Full name is required"],
            trim: true,
            index: true
        },
        email:{
            type: String,
            required: [true, "Email is required"],
            unique: true,
            trim: true,
            lowercase: true,
        },
        authProvider:{
            type: String,
            enum: ["local", "google", "microsoft"],
            default: "local"
        },
        providerId:{
            type: String,
            default: null
        },
        password:{
            type: String,
            required:function() {
                return this.authProvider === "local";
            }
        },
        isVerified:{
            type: Boolean,
            default: function() {
                return this.authProvider !== "local";
            }
        },
        googleId:{
            type: String,
            default: null
        },
        microsoftId:{
            type: String,
            default: null
        },
        refreshToken:{
            type: String,
        },
        forgotPasswordToken:{
            type: String,
        },
        forgotPasswordTokenExpiry:{
            type: Date,
        },
        emailVerificationToken:{
            type: String,
        },
        emailVerificationTokenExpiry:{
            type: Date,
        },
    },
    {
        timestamps: true
    }
);

userSchema.pre("save", async function() {
    if (!this.isModified("password")) return;
    this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword=async function(password){
    return await bcrypt.compare(password,this.password);
}

userSchema.methods.generateAccessToken=function(){
    return jwt.sign(
        {
            userId: this._id,
            email: this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRATION
        }
    )
}

userSchema.methods.generateRefreshToken=function(){
    return jwt.sign(
        {
            userId: this._id,
            email: this.email,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRATION
        }
    )
}

userSchema.methods.generateTemporaryToken=function(){
    const unhasedToken=crypto.randomBytes(32).toString("hex");
    const hashedToken=crypto
        .createHash("sha256")
        .update(unhasedToken)
        .digest("hex");

    const tokenExpiry = Date.now() + 15 * 60 * 1000;

    return {
        unhasedToken,
        hashedToken,
        tokenExpiry
    };
}

export const User=mongoose.model("User",userSchema);
