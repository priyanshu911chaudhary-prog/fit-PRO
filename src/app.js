import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import logger from "./utils/logger.js";

const app=express();

//security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
    message: "Too many requests from this IP, please try again after 15 minutes",
    standardHeaders: true, 
    legacyHeaders: false, 
});

const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit each IP to 20 requests per `window` for auth routes
    message: "Too many authentication attempts, please try again after an hour",
    standardHeaders: true, 
    legacyHeaders: false, 
});

app.use(limiter);

// HTTP request logging via Morgan + Winston
const morganFormat = process.env.NODE_ENV === "production" ? "combined" : "dev";
app.use(
    morgan(morganFormat, {
        stream: {
            write: (message) => logger.info(message.trim()),
        },
    })
);

// basic configuration
app.use(express.json({limit: '16kb'}));
app.use(express.urlencoded({extended: true, limit: '16kb'}));
app.use(express.static('public'));
app.use(cookieParser());

// Fix for Express 5: express-mongo-sanitize attempts to mutate req.query, which is a getter in Express 5.
app.use((req, res, next) => {
    Object.defineProperty(req, 'query', {
        value: { ...req.query },
        writable: true,
        configurable: true
    });
    next();
});
app.use(mongoSanitize());

//cors configuration
app.use(cors({
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS","PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
}),
);


//routes
import authRouter from "./routes/auth.route.js";
import profileRouter from "./routes/profile.route.js";
import bmiRouter from "./routes/bmi.route.js";
import dashboardRouter from "./routes/dashboard.route.js";
import workoutRouter from "./routes/workout.route.js";
import mealRouter from "./routes/meal.route.js";
import aiRouter from "./routes/ai.route.js";
import waterRouter from "./routes/water.route.js";
import {errorHandler} from "./middlewares/error.middleware.js";

// Swagger docs
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./swagger.js";
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Apply stricter rate limiter specifically to authentication routes
app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/bmi", bmiRouter);
app.use("/api/v1/dashboard", dashboardRouter);
app.use("/api/v1/workout", workoutRouter);
app.use("/api/v1/meal", mealRouter);
app.use("/api/v1/ai", aiRouter);
app.use("/api/v1/water", waterRouter);

app.use(errorHandler);
export default app;