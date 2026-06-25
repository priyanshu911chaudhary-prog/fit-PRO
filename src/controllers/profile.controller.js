import { Profile } from "../models/profile.model.js";
import  ApiError from "../utils/apiError.js"; // Ensure casing matches your file
import  ApiResponse from "../utils/apiResponse.js"; // Ensure casing matches your file
import  asyncHandler from "../utils/async-handler.js"; // Ensure casing matches your file

export const setupProfile = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const profileData = req.body;

    // 1. Check if the user already has a profile
    let profile = await Profile.findOne({ user: userId });

    if (profile) {
        // 2a. If it exists, update it using Object.assign
        Object.assign(profile, profileData);
        profile.isProfileComplete = true;
    } else {
        // 2b. If it doesn't exist, create a brand new one
        profile = new Profile({
            user: userId,
            ...profileData,
            isProfileComplete: true
        });
    }

    // 3. Save the document. This natively runs all Mongoose validations safely!
    await profile.save();

    // 4. Double check it saved (this should never fail now)
    if (!profile) {
        throw new ApiError(500, "Critical Error: Profile could not be saved to the database.");
    }

    return res.status(200).json(
        new ApiResponse(200, "Profile setup complete. Welcome to the dashboard!", profile)
    );
});