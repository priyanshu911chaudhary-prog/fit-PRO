import { Router } from "express";
import { setupProfile } from "../controllers/profile.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { profileSetupValidator } from "../validators/profile.validator.js";

const Profilerouter = Router();
Profilerouter.use(verifyJWT);

/**
 * @swagger
 * /profile/setup-profile:
 *   post:
 *     summary: Setup or update user profile
 *     tags: [Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fitnessGoal:
 *                 type: string
 *               dietaryPreference:
 *                 type: string
 *               activityLevel:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile setup successfully
 */
Profilerouter.route("/setup-profile").post(validate(profileSetupValidator), setupProfile);

export default Profilerouter;