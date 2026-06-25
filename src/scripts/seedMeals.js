import "dotenv/config";
import connectDB from "../config/db.js"; // Adjust path to your DB connection
import { FoodItem } from "../models/foodItem.model.js";
import dns from "dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

const defaultMeals = [
    { name: "Oatmeal with Berries", calories: 300, protein: 10, carbs: 54, fat: 5, mealType: "breakfast", dietaryPreference: "vegetarian" },
    { name: "Scrambled Eggs and Toast", calories: 350, protein: 18, carbs: 30, fat: 18, mealType: "breakfast", dietaryPreference: "vegetarian" },
    { name: "Chicken Breast with Quinoa", calories: 500, protein: 45, carbs: 40, fat: 12, mealType: "lunch", dietaryPreference: "none" },
    { name: "Lentil Soup", calories: 320, protein: 18, carbs: 55, fat: 4, mealType: "lunch", dietaryPreference: "vegan" },
    { name: "Grilled Salmon with Asparagus", calories: 450, protein: 35, carbs: 10, fat: 25, mealType: "dinner", dietaryPreference: "pescatarian" },
    { name: "Vegetable Stir-fry with Tofu", calories: 400, protein: 20, carbs: 45, fat: 15, mealType: "dinner", dietaryPreference: "vegan" },
    { name: "Greek Yogurt with Almonds", calories: 250, protein: 15, carbs: 15, fat: 16, mealType: "snack", dietaryPreference: "vegetarian" },
    { name: "Apple with Peanut Butter", calories: 200, protein: 6, carbs: 25, fat: 10, mealType: "snack", dietaryPreference: "vegan" },
    { name: "Protein Shake", calories: 150, protein: 25, carbs: 5, fat: 2, mealType: "snack", dietaryPreference: "vegetarian" },
    { name: "Avocado Toast", calories: 300, protein: 6, carbs: 25, fat: 20, mealType: "breakfast", dietaryPreference: "vegan" }
];

const seedDB = async () => {
    try {
        await connectDB();
        await FoodItem.deleteMany({}); // Clears existing items
        await FoodItem.insertMany(defaultMeals);
        console.log("Database seeded with meals successfully!");
        process.exit();
    } catch (err) {
        console.error("Error seeding database:", err);
        process.exit(1);
    }
};

seedDB();
