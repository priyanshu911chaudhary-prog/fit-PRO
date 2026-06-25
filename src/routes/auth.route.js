import {Router} from 'express';
import {registerUser,
    loginUser,
    googleLogin,
    microsoftLogin,
    verifyEmail,
    logoutUser,
    changeCurrentPassword,
    forgotPassword,
    resetPassword} from '../controllers/auth.controller.js';
import {validate} from '../middlewares/validate.middleware.js';
import {registerSchema,loginSchema,changePasswordSchema,forgotPasswordSchema,resetPasswordSchema} from '../validators/auth.validator.js';
import {verifyJWT} from '../middlewares/auth.middleware.js';


const authRouter=Router();

authRouter.route("/register")
    .post(validate(registerSchema),registerUser);

authRouter.route("/verify-email/:verificationToken")
    .get(verifyEmail);

authRouter.route("/login")
    .post(validate(loginSchema),loginUser);

authRouter.route("/google-login")
    .post(googleLogin);

authRouter.route("/microsoft-login")
    .post(microsoftLogin);

// Protected routes
authRouter.route("/logout")
    .post(verifyJWT, logoutUser);

authRouter.route("/change-password")
    .post(verifyJWT, validate(changePasswordSchema), changeCurrentPassword);

// Public routes
authRouter.route("/forgot-password")
    .post(validate(forgotPasswordSchema), forgotPassword);

authRouter.route("/reset-password/:resetToken")
    .post(validate(resetPasswordSchema), resetPassword);

export default authRouter;