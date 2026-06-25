import {Router} from 'express';
import {registerUser,
    loginUser,
    googleLogin,
    microsoftLogin,
    verifyEmail,
    logoutUser,
    changeCurrentPassword,
    forgotPassword,
    resetPassword,
    refreshAccessToken} from '../controllers/auth.controller.js';
import {validate} from '../middlewares/validate.middleware.js';
import {registerSchema,loginSchema,changePasswordSchema,forgotPasswordSchema,resetPasswordSchema} from '../validators/auth.validator.js';
import {verifyJWT} from '../middlewares/auth.middleware.js';

const authRouter=Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: User registered successfully
 */
authRouter.route("/register").post(validate(registerSchema),registerUser);

/**
 * @swagger
 * /auth/verify-email/{verificationToken}:
 *   get:
 *     summary: Verify user's email
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: verificationToken
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
authRouter.route("/verify-email/:verificationToken").get(verifyEmail);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User logged in successfully
 */
authRouter.route("/login").post(validate(loginSchema),loginUser);

/**
 * @swagger
 * /auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Access token refreshed
 */
authRouter.route("/refresh-token").post(refreshAccessToken);

authRouter.route("/google-login").post(googleLogin);
authRouter.route("/microsoft-login").post(microsoftLogin);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
 */
authRouter.route("/logout").post(verifyJWT, logoutUser);

/**
 * @swagger
 * /auth/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password changed successfully
 */
authRouter.route("/change-password").post(verifyJWT, validate(changePasswordSchema), changeCurrentPassword);

/**
 * @swagger
 * /auth/forgot-password:
 *   post:
 *     summary: Send forgot password email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset link sent
 */
authRouter.route("/forgot-password").post(validate(forgotPasswordSchema), forgotPassword);

/**
 * @swagger
 * /auth/reset-password/{resetToken}:
 *   post:
 *     summary: Reset password
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: resetToken
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
authRouter.route("/reset-password/:resetToken").post(validate(resetPasswordSchema), resetPassword);

export default authRouter;