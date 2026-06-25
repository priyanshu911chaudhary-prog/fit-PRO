import { GoogleGenerativeAI } from "@google/generative-ai";
import {Exercise} from "../models/exercise.model.js";

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