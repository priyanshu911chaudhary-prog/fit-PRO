import { Router } from "express";
import { getDashboardData } from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const dashboardRouter = Router();
dashboardRouter.use(verifyJWT);

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Get user dashboard statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 */
dashboardRouter.route("/stats").get(getDashboardData);

export default dashboardRouter;