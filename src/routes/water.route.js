import { Router } from "express";
import { addWater, getTodayWaterIntake } from "../controllers/water.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const waterRouter = Router();

waterRouter.use(verifyJWT);

/**
 * @swagger
 * /water:
 *   post:
 *     summary: Log water intake
 *     tags: [Water]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amountMl:
 *                 type: number
 *     responses:
 *       201:
 *         description: Water intake logged successfully
 */
waterRouter.post("/", addWater);

/**
 * @swagger
 * /water/today:
 *   get:
 *     summary: Get today's water intake
 *     tags: [Water]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's water intake fetched successfully
 */
waterRouter.get("/today", getTodayWaterIntake);

export default waterRouter;
