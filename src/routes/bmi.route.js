import {Router} from "express";
import {logBmi, getBmiHistory} from "../controllers/bmi.controller.js";
import {verifyJWT} from "../middlewares/auth.middleware.js";

const BmiRouter = Router();
BmiRouter.use(verifyJWT);

/**
 * @swagger
 * /bmi/log:
 *   post:
 *     summary: Log a new BMI entry
 *     tags: [BMI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               weight:
 *                 type: number
 *               height:
 *                 type: number
 *     responses:
 *       201:
 *         description: BMI logged successfully
 */
BmiRouter.post("/log", logBmi);

/**
 * @swagger
 * /bmi/history:
 *   get:
 *     summary: Get BMI history
 *     tags: [BMI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: BMI history retrieved successfully
 */
BmiRouter.get("/history", getBmiHistory);

export default BmiRouter;
