import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        message: "AI Assignment Planner Backend is running 🚀"
    });
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "OK",
        message: "Server is healthy"
    });
});

app.post("/api/assignments", (req, res) => {

    const { name, subject, deadline, hours, difficulty } = req.body;

    if (!name || !subject || !deadline || !hours || !difficulty) {
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
        hours,
        difficulty
    };

    res.status(201).json({
        success: true,
        message: "Assignment received successfully.",
        assignment
    });
});

app.post("/api/ai-plan", async (req, res) => {
    try {
        const { assignments } = req.body;

        if (!assignments || assignments.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No assignments provided."
            });
        }

        const prompt = `
You are an AI study planner for a college student.

Create a practical personalized study plan from these assignments:

${JSON.stringify(assignments, null, 2)}

Consider:
- Deadline urgency
- Difficulty
- Required hours
- Workload
- Logical study order

Return ONLY valid JSON in this format:

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

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });

        const text = response.text;

        res.json({
            success: true,
            aiPlan: text
        });

    } catch (error) {
        console.error("AI Error:", error);

        res.status(500).json({
            success: false,
            message: "AI plan generation failed.",
            error: error.message
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running at http://127.0.0.1:${PORT}`);
});