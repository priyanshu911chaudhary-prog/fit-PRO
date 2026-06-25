import { Router } from "express";
import { getDashboardData } from "../controllers/dashboard.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const dashboardRouter = Router();
dashboardRouter.use(verifyJWT);

// The aggregation endpoint
dashboardRouter.route("/stats").get(getDashboardData);

export default dashboardRouter;