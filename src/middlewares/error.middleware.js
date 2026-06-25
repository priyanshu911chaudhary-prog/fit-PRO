import ApiError from "../utils/ApiError.js";

export const errorHandler = (err, req, res, next) => {
    let error = err;

    // Wrap unhandled errors in our custom ApiError class
    if (!(error instanceof ApiError)) {
        const statusCode = error.statusCode ? error.statusCode : 500;
        const message = error.message || "Something went wrong";
        error = new ApiError(statusCode, message, error?.errors || [], err.stack);
    }

    // --- CONSOLE REPORT (For your terminal) ---
    console.error("\n🔴 [CRITICAL ERROR REPORT] 🔴");
    console.error(`Timestamp: ${new Date().toISOString()}`);
    console.error(`Endpoint:  ${req.method} ${req.originalUrl}`);
    console.error(`Message:   ${error.message}`);
    if (process.env.NODE_ENV !== "production") {
        console.error(`Stack:     \n${error.stack}\n`);
    }

    // --- JSON RESPONSE REPORT (For Postman) ---
    const responsePayload = {
        success: false,
        message: error.message,
        errors: error.errors,
        // Only attach the deep diagnostic data if we are NOT in production
        ...(process.env.NODE_ENV !== "production" && {
            diagnosticReport: {
                errorName: err.name,
                path: req.originalUrl,
                method: req.method,
                // Split the stack trace into an array so it is easily readable in JSON
                stackTrace: error.stack ? error.stack.split('\n').map(line => line.trim()) : [],
            }
        })
    };

    return res.status(error.statusCode).json(responsePayload);
};