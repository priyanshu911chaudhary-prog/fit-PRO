import {Router} from "express";
import {logMeal, getMealHistory} from "../controllers/meal.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import { getAIMealPlan, getSavedMealPlans } from "../controllers/ai.controller.js";

const mealRouter = Router();
mealRouter.use(verifyJWT); // Apply JWT verification middleware to all routes

mealRouter.post("/log", logMeal);
mealRouter.get("/history", getMealHistory);
mealRouter.post("/ai/generate", getAIMealPlan);
mealRouter.get("/ai/savedplan", getSavedMealPlans);

export default mealRouter;
