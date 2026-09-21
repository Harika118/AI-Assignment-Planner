import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

let ai = null;

if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY
    });
    console.log("✅ Gemini API key loaded");
} else {
    console.log("⚠️ GEMINI_API_KEY not found - fallback mode enabled");
}


// ===============================
// HOME
// ===============================

app.get("/", (req, res) => {
    res.json({
        message: "AI Assignment Planner Backend is running 🚀"
    });
});


// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Server is healthy"
    });
});


// ===============================
// ADD ASSIGNMENT
// ===============================

app.post("/api/assignments", (req, res) => {

    const {
        name,
        subject,
        deadline,
        hours,
        difficulty
    } = req.body;

    if (
        !name ||
        !subject ||
        !deadline ||
        !hours ||
        !difficulty
    ) {
        return res.status(400).json({
            success: false,
            message: "All assignment fields are required."
        });
    }

    const assignment = {
        id: Date.now(),
        name,
        subject,
        deadline,
        hours: Number(hours),
        difficulty
    };

    res.status(201).json({
        success: true,
        message: "Assignment received successfully.",
        assignment
    });
});


// ===============================
// FALLBACK PLAN
// ===============================

function createFallbackPlan(assignments) {

    const sorted = [...assignments].sort((a, b) => {

        const difficultyWeight = {
            Hard: 3,
            Medium: 2,
            Easy: 1
        };

        const difficultyDifference =
            difficultyWeight[b.difficulty] -
            difficultyWeight[a.difficulty];

        if (difficultyDifference !== 0) {
            return difficultyDifference;
        }

        return new Date(a.deadline) -
            new Date(b.deadline);
    });

    const plan = [];

    sorted.forEach((assignment, index) => {

        plan.push({
            day: `Day ${index + 1}`,
            task: assignment.name,
            subject: assignment.subject,
            hours: Number(assignment.hours),
            reason:
                assignment.difficulty === "Hard"
                    ? "High difficulty assignment scheduled early."
                    : assignment.difficulty === "Medium"
                    ? "Medium difficulty assignment scheduled after priority tasks."
                    : "Easy assignment scheduled to maintain steady progress."
        });

    });

    return {
        summary:
            "Your study plan is organized according to assignment difficulty, deadline, and estimated workload.",
        plan
    };
}


// ===============================
// AI STUDY PLAN
// ===============================

app.post("/api/ai-plan", async (req, res) => {

    try {

        const { assignments } = req.body;

        if (
            !assignments ||
            !Array.isArray(assignments) ||
            assignments.length === 0
        ) {
            return res.status(400).json({
                success: false,
                message: "No assignments provided."
            });
        }


        // ===============================
        // GEMINI AI
        // ===============================

        if (ai) {

            try {

                const prompt = `
You are an AI study planner for a college student.

Create a practical personalized study plan from these assignments:

${JSON.stringify(assignments, null, 2)}

Consider:

- Deadline urgency
- Difficulty
- Required study hours
- Workload
- Logical study order

Return ONLY valid JSON.

Required format:

{
  "summary": "short explanation",
  "plan": [
    {
      "day": "Day 1",
      "task": "task name",
      "subject": "subject",
      "hours": 2,
      "reason": "why this task is scheduled"
    }
  ]
}
`;

                console.log("🤖 Sending request to Gemini...");

                const response =
                    await ai.models.generateContent({

                        model: "gemini-2.5-flash",

                        contents: prompt,

                        config: {
                            responseMimeType: "application/json"
                        }

                    });


                const text =
                    typeof response.text === "function"
                        ? response.text()
                        : response.text;


                if (!text) {
                    throw new Error(
                        "Gemini returned an empty response."
                    );
                }


                console.log("✅ Gemini response received");


                return res.json({
                    success: true,
                    aiPlan: text,
                    source: "Gemini AI"
                });

            } catch (geminiError) {

                console.error(
                    "⚠️ Gemini Error:",
                    geminiError.message
                );

                console.log(
                    "🔄 Switching to fallback planner..."
                );
            }
        }


        // ===============================
        // FALLBACK
        // ===============================

        const fallbackPlan =
            createFallbackPlan(assignments);


        return res.json({
            success: true,
            aiPlan: JSON.stringify(fallbackPlan),
            source: "Smart Local Planner"
        });

    } catch (error) {

        console.error(
            "❌ AI Plan Error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Unable to generate study plan.",
            error: error.message
        });
    }
});


// ===============================
// START SERVER
// ===============================

app.listen(
    PORT,
    "0.0.0.0",
    () => {

        console.log(
            `🚀 Server running at http://127.0.0.1:${PORT}`
        );

    }
);