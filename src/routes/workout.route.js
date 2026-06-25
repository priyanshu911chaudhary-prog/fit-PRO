import {Router} from "express";
import {logWorkout,getWorkoutHistory} from "../controllers/workout.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";
import { getAIWorkoutPlan,getSavedWorkoutPlans } from "../controllers/ai.controller.js";

const WorkoutRouter = Router();
WorkoutRouter.use(verifyJWT);

/**
 * @swagger
 * /workout/log:
 *   post:
 *     summary: Log a workout
 *     tags: [Workout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Workout logged successfully
 */
WorkoutRouter.post("/log", logWorkout);

/**
 * @swagger
 * /workout/history:
 *   get:
 *     summary: Get workout history
 *     tags: [Workout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: History fetched successfully
 */
WorkoutRouter.get("/history", getWorkoutHistory);

/**
 * @swagger
 * /workout/ai/generate:
 *   post:
 *     summary: Generate an AI workout plan
 *     tags: [Workout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI Plan generated
 */
WorkoutRouter.post("/ai/generate", getAIWorkoutPlan);

/**
 * @swagger
 * /workout/ai/savedplan:
 *   get:
 *     summary: Get saved AI workout plans
 *     tags: [Workout]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Saved plans fetched successfully
 */
WorkoutRouter.get("/ai/savedplan", getSavedWorkoutPlans);

export default WorkoutRouter;
