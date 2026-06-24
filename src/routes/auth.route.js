import {Router} from 'express';
import {registerUser,
    loginUser,
    googleLogin,
    microsoftLogin,
    verifyEmail} from '../controllers/auth.controller.js';
import {validate} from '../middlewares/validate.middleware.js';
import {registerSchema,loginSchema} from '../validators/auth.validator.js';


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

export default authRouter;