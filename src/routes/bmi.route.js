import {Router} from "express";
import {logBmi, getBmiHistory} from "../controllers/bmi.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";

const BmiRouter = Router();
BmiRouter.use(verifyJWT); // Apply JWT verification middleware to all routes

BmiRouter.post("/log", logBmi);
BmiRouter.get("/history", getBmiHistory);

export default BmiRouter;
