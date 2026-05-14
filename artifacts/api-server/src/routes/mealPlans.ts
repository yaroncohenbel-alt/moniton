import { Router } from "express";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.post("/meal-plans/generate", async (req, res) => {
  try {
    const { preferences, budget, servings } = req.body as {
      preferences: string[];
      budget: string;
      servings: number;
    };

    const dietaryNotes =
      preferences.length > 0
        ? `Dietary restrictions/preferences: ${preferences.join(", ")}`
        : "No specific dietary restrictions";

    const budgetNote =
      budget === "low"
        ? "Budget: low (under $50/week total)"
        : budget === "medium"
          ? "Budget: medium ($50-100/week total)"
          : "Budget: high (over $100/week total)";

    const prompt = `You are a meal planning assistant for busy college students. Generate a 7-day meal plan for ${servings} person(s).

${dietaryNotes}
${budgetNote}

Focus on:
- Quick and easy meals (under 30 minutes prep time)
- Budget-friendly ingredients available at any grocery store
- Nutritionally balanced meals
- College kitchen friendly (minimal equipment, basic cooking skills)
- Variety in cuisines and flavors throughout the week

Return ONLY valid JSON with no markdown, no code blocks, no explanation. Use this exact structure:
{
  "days": [
    {
      "day": "Monday",
      "breakfast": {
        "name": "Meal name",
        "description": "One sentence description",
        "cuisine": "Cuisine type",
        "prepTime": "X min",
        "ingredients": ["ingredient with amount", "ingredient with amount"]
      },
      "lunch": { "name": "...", "description": "...", "cuisine": "...", "prepTime": "X min", "ingredients": [...] },
      "dinner": { "name": "...", "description": "...", "cuisine": "...", "prepTime": "X min", "ingredients": [...] }
    }
  ],
  "groceryList": [
    {
      "id": "item-1",
      "name": "Item name",
      "amount": "Consolidated amount (e.g. 2 lbs)",
      "category": "Produce"
    }
  ]
}

Days must be: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.
Grocery list categories must be one of: Produce, Dairy, Protein, Grains, Pantry, Frozen, Beverages, Other.
Consolidate duplicate ingredients across all meals into single grocery items.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const mealPlan = JSON.parse(content);
    res.json(mealPlan);
  } catch (err) {
    req.log.error({ err }, "Failed to generate meal plan");
    res.status(500).json({ error: "Failed to generate meal plan" });
  }
});

export default router;
