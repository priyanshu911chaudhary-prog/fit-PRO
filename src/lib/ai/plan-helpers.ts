import mongoose from "mongoose";
import { Exercise } from "@/models/exercise";
import { FoodItem } from "@/models/foodItem";
import { AIMealPlanOutput, AIWorkoutPlanOutput } from "./gemini";

export async function mapAIExercisesToIds(
  schedule: AIWorkoutPlanOutput["schedule"]
): Promise<
  Array<{
    day: string;
    exercises: Array<{
      exerciseId?: mongoose.Types.ObjectId | null;
      name: string;
      sets: number;
      reps: number;
    }>;
  }>
> {
  const allExercises = await Exercise.find({}, "_id name");

  return Promise.all(
    schedule.map(async (day) => {
      const exercises = await Promise.all(
        day.exercises.map(async (ex) => {
          const safeName = ex.name.trim();
          const regex = new RegExp(`^${safeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
          let match = allExercises.find((e) => regex.test(e.name));

          if (!match) {
            // Find with partial regex match
            match = allExercises.find((e) => new RegExp(safeName, "i").test(e.name));
          }

          if (!match) {
            // Idempotently create exercise so it is available in catalog
            try {
              match = await Exercise.findOneAndUpdate(
                { name: safeName },
                {
                  $setOnInsert: {
                    name: safeName,
                    targetMuscle: "full_body",
                    equipment: "bodyweight",
                    category: "strength",
                  },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
              if (match) {
                allExercises.push(match);
              }
            } catch {
              // On race, fetch existing
              match = (await Exercise.findOne({ name: safeName })) || undefined;
            }
          }

          return {
            exerciseId: match ? (match._id as mongoose.Types.ObjectId) : null,
            name: safeName,
            sets: ex.sets,
            reps: ex.reps,
          };
        })
      );

      return {
        day: day.day,
        exercises,
      };
    })
  );
}

export async function mapAIMealsToIds(
  schedule: AIMealPlanOutput["schedule"]
): Promise<
  Array<{
    day: string;
    meals: Array<{
      foodItemId?: mongoose.Types.ObjectId | null;
      name: string;
      servingSize: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
  }>
> {
  const allFoodItems = await FoodItem.find({}, "_id name");

  return Promise.all(
    schedule.map(async (day) => {
      const meals = await Promise.all(
        day.meals.map(async (m) => {
          const safeName = m.name.trim();

          // Approved Fix 18: Clamp macro values to sane ranges
          const calories = Math.max(0, Math.min(3000, Number(m.calories) || 0));
          const protein = Math.max(0, Math.min(200, Number(m.protein) || 0));
          const carbs = Math.max(0, Math.min(300, Number(m.carbs) || 0));
          const fat = Math.max(0, Math.min(150, Number(m.fat) || 0));

          const regex = new RegExp(`^${safeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i");
          let match = allFoodItems.find((f) => regex.test(f.name));

          if (!match) {
            try {
              // Approved Fix 18: Upsert by normalized name, avoid race duplicates
              match = await FoodItem.findOneAndUpdate(
                { name: safeName },
                {
                  $setOnInsert: {
                    name: safeName,
                    calories,
                    protein,
                    carbs,
                    fat,
                    mealType: "snack",
                    dietaryPreference: "none",
                  },
                },
                { upsert: true, new: true, setDefaultsOnInsert: true }
              );
              if (match) {
                allFoodItems.push(match);
              }
            } catch {
              match = (await FoodItem.findOne({ name: safeName })) || undefined;
            }
          }

          return {
            foodItemId: match ? (match._id as mongoose.Types.ObjectId) : null,
            name: safeName,
            servingSize: m.servingSize || "1 serving",
            calories,
            protein,
            carbs,
            fat,
          };
        })
      );

      return {
        day: day.day,
        meals,
      };
    })
  );
}
