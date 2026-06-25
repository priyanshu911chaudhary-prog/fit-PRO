import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";


const app=express();

//security middleware
app.use(helmet());


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
import {errorHandler} from "./middlewares/error.middleware.js";

app.use("/api/v1/auth", authRouter);
app.use("/api/v1/profile", profileRouter);
app.use("/api/v1/bmi", bmiRouter);

app.use(errorHandler);
export default app;