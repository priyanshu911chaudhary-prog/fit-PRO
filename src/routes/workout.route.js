import {Router} from "express";
import {logWorkout,getWorkoutHistory} from "../controllers/workout.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import { getAIWorkoutPlan,getSavedWorkoutPlans } from "../controllers/ai.controller.js";

const WorkoutRouter = Router();
WorkoutRouter.use(verifyJWT); // Apply JWT verification middleware to all routes

WorkoutRouter.post("/log", logWorkout);
WorkoutRouter.get("/history", getWorkoutHistory);
WorkoutRouter.post("/ai/generate", getAIWorkoutPlan);
WorkoutRouter.get("/ai/savedplan", getSavedWorkoutPlans);

export default WorkoutRouter;
