import { Router } from "express";
import { setupProfile } from "../controllers/profile.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { profileSetupValidator } from "../validators/profile.validator.js";

const Profilerouter = Router();
Profilerouter.use(verifyJWT); 

Profilerouter.route("/setup-profile").post(validate(profileSetupValidator), setupProfile);

export default Profilerouter;