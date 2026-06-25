import { Router } from "express";
import { postAIChat } from "../controllers/ai.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const aiRouter = Router();

aiRouter.use(verifyJWT);

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     summary: Chat with the AI fitness coach
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: AI Coach responded
 */
aiRouter.post("/chat", postAIChat);

export default aiRouter;
