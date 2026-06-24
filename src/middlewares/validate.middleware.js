
import ApiError from "../utils/ApiError.js";

export const validate = (schema) => async (req, res, next) => {
    try {
        // parseAsync checks the body against the Zod schema
        await schema.parseAsync(req.body);
        next();
    } catch (error) {
        // Zod returns an array of issues. We map over them to extract just the human-readable messages.
        const extractedErrors = error.errors.map((err) => err.message);
        
        // Pass the error to your global error handler using your ApiError class
        next(new ApiError(400, "Validation Failed", extractedErrors));
    }
};