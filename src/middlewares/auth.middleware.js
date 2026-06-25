import jwt from "jsonwebtoken";
import {User} from "../models/user.model.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/async-handler.js";

export const verifyJWT=asyncHandler(async (req, res, next) => {
    try{
        const token =req.cookies?.accessToken || req.headers?.authorization?.replace("Bearer ", "");
        if(!token){
            throw new ApiError(401, "Access token is missing");
        }
        const decoded=jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user=await User.findById(decoded.userId);
        if(!user){
            throw new ApiError(401, "User not found");
        }
        req.user=user;
        next();
    }catch(err){
        throw new ApiError(401, err.message || "Invalid or expired access token");
    }
});