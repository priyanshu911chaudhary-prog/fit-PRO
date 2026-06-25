import {Router} from "express";
import {logMeal, getMealHistory} from "../controllers/meal.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import { getAIMealPlan, getSavedMealPlans } from "../controllers/ai.controller.js";

const mealRouter = Router();
mealRouter.use(verifyJWT);

/**
 * @swagger
 * /meal/log:
 *   post:
 *     summary: Log a meal
 *     tags: [Meal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Meal logged successfully
 */
mealRouter.post("/log", logMeal);

/**
 * @swagger
 * /meal/history:
 *   get:
 *     summary: Get meal history
 *     tags: [Meal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Meal history fetched successfully
 */
mealRouter.get("/history", getMealHistory);

/**
 * @swagger
 * /meal/ai/generate:
 *   post:
 *     summary: Generate an AI meal plan
 *     tags: [Meal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI Meal Plan generated
 */
mealRouter.post("/ai/generate", getAIMealPlan);

/**
 * @swagger
 * /meal/ai/savedplan:
 *   get:
 *     summary: Get saved AI meal plans
 *     tags: [Meal]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved meal plans fetched successfully
 */
mealRouter.get("/ai/savedplan", getSavedMealPlans);

export default mealRouter;
