import "dotenv/config";
import connectDB from "../config/db.js"; // Adjust path to your DB connection
import { Exercise } from "../models/exercise.model.js";
import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);
const defaultExercises = [
    { name: "Bodyweight Squats", targetMuscle: "legs", equipment: "bodyweight", category: "strength" },
    { name: "Push-ups", targetMuscle: "chest", equipment: "bodyweight", category: "strength" },
    { name: "Walking Lunges", targetMuscle: "legs", equipment: "bodyweight", category: "strength" },
    { name: "Plank", targetMuscle: "core", equipment: "bodyweight", category: "strength" },
    { name: "Glute Bridges", targetMuscle: "legs", equipment: "bodyweight", category: "strength" },
    { name: "Reverse Lunges", targetMuscle: "legs", equipment: "bodyweight", category: "strength" },
    { name: "Superman", targetMuscle: "back", equipment: "bodyweight", category: "strength" },
    { name: "Side Plank", targetMuscle: "core", equipment: "bodyweight", category: "strength" },
    { name: "Bird-Dog", targetMuscle: "core", equipment: "bodyweight", category: "strength" },
    { name: "Leg Raises", targetMuscle: "core", equipment: "bodyweight", category: "strength" },
    { name: "Mountain Climbers", targetMuscle: "core", equipment: "bodyweight", category: "cardio" },
    { name: "Triceps Push-ups", targetMuscle: "arms", equipment: "bodyweight", category: "strength" },
    { name: "Wall Sit", targetMuscle: "legs", equipment: "bodyweight", category: "strength" },
    { name: "Calf Raises", targetMuscle: "legs", equipment: "bodyweight", category: "strength" }
];

const seedDB = async () => {
    try {
        await connectDB();
        await Exercise.deleteMany({}); // Optional: Clears existing exercises to prevent duplicates
        await Exercise.insertMany(defaultExercises);
        console.log("Database seeded successfully!");
        process.exit();
    } catch (err) {
        console.error("Error seeding database:", err);
        process.exit(1);
    }
};

seedDB();