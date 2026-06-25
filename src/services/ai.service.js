import { GoogleGenerativeAI } from "@google/generative-ai";
import {Exercise} from "../models/exercise.model.js";
import {FoodItem} from "../models/foodItem.model.js";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);


export const generateWorkoutPlan = async (profile) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are a professional fitness coach. Create a 3-day workout plan for a user with the following profile:
    - Goal: ${profile.fitnessGoal}
    - Equipment: ${profile.equipmentAvailable}
    - Experience Level: ${profile.experienceLevel}

    Output ONLY a JSON object in this format:
    {
      "planName": "string",
      "schedule": [
        { "day": "Day 1", "exercises": [{ "name": "Exact exercise name", "sets": number, "reps": number }] }
      ]
    }
    Ensure exercise names exist in standard gym terminology.
    `;

    const result = await model.generateContent(prompt);
    let textResponse = result.response.text();
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(textResponse);
};

export const mapAIExercisesToIds = async (aiExercises) => {
    // Fetch all exercises from DB once to avoid N+1 queries
    const allExercises = await Exercise.find({}, '_id name');

    const mappedExercises = aiExercises.map((item) => {
        // Fuzzy search in memory
        const regex = new RegExp(item.name, 'i');
        const exercise = allExercises.find(e => regex.test(e.name));
        
        return {
            ...item,
            exerciseId: exercise ? exercise._id : null, // Found? Add ID
            isLogged: !!exercise // Helper for UI
        };
    });

    return mappedExercises;
};

export const generateMealPlan = async (profile) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are a professional nutritionist. Create a 3-day meal plan for a user with the following profile:
    - Goal: ${profile.fitnessGoal}
    - Dietary Preference: ${profile.dietaryPreference}

    Output ONLY a JSON object in this format:
    {
      "planName": "string",
      "schedule": [
        { "day": "Day 1", "meals": [{ "name": "Exact food name", "servingSize": "e.g., 1 cup", "calories": number, "protein": number, "carbs": number, "fat": number }] }
      ]
    }
    Ensure food names exist in standard dietary terminology.
    `;

    const result = await model.generateContent(prompt);
    let textResponse = result.response.text();
    textResponse = textResponse.replace(/```json/gi, '').replace(/```/gi, '').trim();
    return JSON.parse(textResponse);
};

export const mapAIMealsToIds = async (aiMeals) => {
    // Fetch all food items from DB once to avoid N+1 queries
    const allFoodItems = await FoodItem.find({}, '_id name');

    const mappedMeals = [];

    for (const item of aiMeals) {
        // Safe regex search
        const safeName = item.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(safeName, 'i');
        let foodItem = allFoodItems.find(f => regex.test(f.name));
        
        if (!foodItem) {
            try {
                // Dynamically create the food item if it doesn't exist in our DB
                foodItem = await FoodItem.create({
                    name: item.name,
                    calories: item.calories || 0,
                    protein: item.protein || 0,
                    carbs: item.carbs || 0,
                    fat: item.fat || 0,
                    mealType: "snack", // Default generic meal type
                    dietaryPreference: "none"
                });
                // Add to our in-memory list so it's found if the AI suggests it again
                allFoodItems.push(foodItem);
            } catch (err) {
                console.error("Failed to dynamically create missing FoodItem:", err);
            }
        }

        mappedMeals.push({
            ...item,
            foodItemId: foodItem ? foodItem._id : null,
            isLogged: !!foodItem
        });
    }

    return mappedMeals;
};

export const generateAICoachResponse = async (userMessage, context) => {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
    You are a professional, motivating AI fitness and nutrition coach.
    You are chatting with a user who has the following context:
    - Profile Goal: ${context.profile?.fitnessGoal || "Unknown"}
    - Dietary Preference: ${context.profile?.dietaryPreference || "Unknown"}
    - Activity Level: ${context.profile?.activityLevel || "Unknown"}
    - BMI: ${context.bmi?.bmi || "Unknown"} (${context.bmi?.category || "Unknown"})
    
    Recent Workouts:
    ${context.recentWorkouts.map(w => `- ${w.title} (${w.totalDuration} mins)`).join('\n')}
    
    Recent Meals:
    ${context.recentMeals.map(m => `- ${m.title} (${m.totalCalories} kcal)`).join('\n')}

    The user says: "${userMessage}"

    Provide a concise, highly personalized, and encouraging response based on their data. Keep it under 150 words.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
};