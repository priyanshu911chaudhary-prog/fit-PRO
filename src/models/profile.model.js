import mongoose from "mongoose";
import {AvailableUserGenders} from "../utils/constants.js";
import {AvailableUserGoals} from "../utils/constants.js";
import {AvailableUserActivityLevels} from "../utils/constants.js";

const profileSchema=new mongoose.Schema(
    {
        user:{
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
        },
        gender:{
            type: String,
            enum: AvailableUserGenders,
            default: "other"
        },
        dob:{
            type: Date,
        },
        height:{
            type: Number,
        },
        weight:{
            type: Number,
        },
        goal:{
            type: String,
            enum: AvailableUserGoals,
            default: "general_fitness"
        },
        activityLevel:{
            type: String,
            enum: AvailableUserActivityLevels,
            default: "sedentary"
        }
    }
    ,
    {
        timestamps: true
    }
);


export const Profile=mongoose.model("Profile",profileSchema);