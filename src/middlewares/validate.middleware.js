import ApiError from "../utils/ApiError.js"; // Double check your capitalization here (ApiError vs apiError)

export const validate = (schema) => async (req, res, next) => {
    try {
        // parseAsync automatically strips out any data not defined in the schema
        // and coerces types (like turning string dates into Date objects)
        req.body = await schema.parseAsync(req.body);
        next();
    } catch (error) {
        // Zod stores its validation failures in an array called 'errors'
        if (error.errors && Array.isArray(error.errors)) {
            const errorMessages = error.errors.map((issue) => {
                // If it's a nested field, this adds the path (e.g., 'address.zipcode: Invalid')
                const path = issue.path.length > 0 ? `${issue.path.join('.')}: ` : "";
                return `${path}${issue.message}`;
            });
            
            // Pass it to your global error.middleware.js
            return next(new ApiError(400, "Validation Failed", errorMessages));
        }
        
        // If it's a generic server error, pass it down
        next(error);
    }
};