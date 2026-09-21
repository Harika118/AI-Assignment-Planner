let assignments = [];

// ===============================
// ADD ASSIGNMENT
// ===============================

async function addAssignment() {
    const name = document.getElementById("assignmentName").value.trim();
    const subject = document.getElementById("subject").value.trim();
    const deadline = document.getElementById("deadline").value;
    const hours = document.getElementById("hours").value;
    const difficulty = document.getElementById("difficulty").value;

    if (!name || !subject || !deadline || !hours || !difficulty) {
        alert("Please fill all fields.");
        return;
    }

    const assignment = {
        name,
        subject,
        deadline,
        hours: Number(hours),
        difficulty
    };

    assignments.push(assignment);

    displayAssignments();

    // Clear form
    document.getElementById("assignmentName").value = "";
    document.getElementById("subject").value = "";
    document.getElementById("deadline").value = "";
    document.getElementById("hours").value = "";
    document.getElementById("difficulty").value = "";

    console.log("Assignment added:", assignment);
}

// ===============================
// DISPLAY ASSIGNMENTS
// ===============================

function displayAssignments() {
    const container = document.getElementById("assignments");

    if (!container) return;

    container.innerHTML = "";

    assignments.forEach((assignment, index) => {
        const card = document.createElement("div");

        card.className = "assignment-item";

        card.innerHTML = `
            <div class="assignment-details">
                <strong>${assignment.name}</strong>

                <small>
                    Subject: ${assignment.subject}<br>
                    Deadline: ${assignment.deadline}<br>
                    Study Time: ${assignment.hours} hours<br>
                    Difficulty: ${assignment.difficulty}
                </small>
            </div>

            <button onclick="removeAssignment(${index})">
                Remove
            </button>
        `;

        container.appendChild(card);
    });

    const count = document.getElementById("assignmentCount");

    if (count) {
        count.textContent =
            `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`;
    }
}

// ===============================
// REMOVE ASSIGNMENT
// ===============================

function removeAssignment(index) {
    assignments.splice(index, 1);
    displayAssignments();
}

// ===============================
// GENERATE AI PLAN
// ===============================

async function generatePlan() {

    if (assignments.length === 0) {
        alert("Please add at least one assignment first.");
        return;
    }

    console.log("Generating AI study plan...");
    console.log("Assignments:", assignments);

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/api/ai-plan",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    assignments: assignments
                })
            }
        );

        console.log("HTTP Status:", response.status);

        const raw = await response.text();

        console.log("Backend response:", raw);

        let data;

        try {
            data = JSON.parse(raw);
        } catch (error) {
            console.error("Invalid JSON:", raw);
            throw new Error("Backend returned invalid JSON.");
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                "AI service failed."
            );
        }

        if (!data.aiPlan) {
            throw new Error("No AI plan returned by backend.");
        }

        let cleanText = data.aiPlan.toString().trim();

        // Remove markdown code blocks
        cleanText = cleanText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        let aiResult;

        try {
            aiResult = JSON.parse(cleanText);
        } catch (error) {
            console.error("AI JSON parsing failed:", error);

            // If Gemini returns normal text,
            // use local plan instead.
            aiResult = createLocalPlan();
        }

        displayStudyPlan(aiResult);

    } catch (error) {

        console.error("AI Plan Error:", error);

        // Fallback so the project still works
        // even if Gemini/backend is temporarily unavailable.

        const localPlan = createLocalPlan();

        displayStudyPlan(localPlan);
    }
}

// ===============================
// LOCAL FALLBACK PLAN
// ===============================

function createLocalPlan() {

    const difficultyWeight = {
        "Hard": 3,
        "Medium": 2,
        "Easy": 1
    };

    const sortedAssignments = [...assignments].sort(
        (a, b) => {

            const difficultyDifference =
                (difficultyWeight[b.difficulty] || 0) -
                (difficultyWeight[a.difficulty] || 0);

            if (difficultyDifference !== 0) {
                return difficultyDifference;
            }

            return new Date(a.deadline) -
                   new Date(b.deadline);
        }
    );

    const plan = sortedAssignments.map(
        (assignment, index) => {

            let reason;

            if (assignment.difficulty === "Hard") {
                reason =
                    "High difficulty assignment scheduled early.";
            } else if (assignment.difficulty === "Medium") {
                reason =
                    "Medium difficulty assignment scheduled after high-priority tasks.";
            } else {
                reason =
                    "Easy assignment scheduled to maintain steady progress.";
            }

            return {
                day: `Day ${index + 1}`,
                task: assignment.name,
                subject: assignment.subject,
                hours: Number(assignment.hours),
                reason: reason
            };
        }
    );

    return {
        summary:
            "Your personalized study plan is organized using assignment difficulty, deadline and estimated study hours.",

        plan: plan
    };
}

// ===============================
// DISPLAY STUDY PLAN
// ===============================

function displayStudyPlan(aiResult) {

    let planContainer =
        document.getElementById("studyPlan");

    if (!planContainer) {

        planContainer =
            document.createElement("div");

        planContainer.id = "studyPlan";

        const page =
            document.querySelector(".planner-page");

        if (page) {
            page.appendChild(planContainer);
        }
    }

    planContainer.innerHTML = "";

    const heading =
        document.createElement("h2");

    heading.textContent =
        "🤖 Your AI Study Plan";

    planContainer.appendChild(heading);

    if (aiResult.summary) {

        const summary =
            document.createElement("p");

        summary.textContent =
            aiResult.summary;

        planContainer.appendChild(summary);
    }

    if (
        !aiResult.plan ||
        !Array.isArray(aiResult.plan)
    ) {

        const errorMessage =
            document.createElement("p");

        errorMessage.textContent =
            "No study plan was returned.";

        planContainer.appendChild(errorMessage);

        return;
    }

    aiResult.plan.forEach(item => {

        const card =
            document.createElement("div");

        card.className =
            "assignment-item";

        card.innerHTML = `
            <div class="assignment-details">

                <strong>
                    ${item.day || "Study Day"}:
                    ${item.task || "Task"}
                </strong>

                <small>
                    📚 Subject:
                    ${item.subject || "N/A"}
                    <br>

                    ⏱️ Study Time:
                    ${item.hours || 1} hours
                    <br>

                    💡 Reason:
                    ${item.reason || "Recommended by AI"}
                </small>

            </div>
        `;

        planContainer.appendChild(card);
    });

    planContainer.scrollIntoView({
        behavior: "smooth"
    });
}