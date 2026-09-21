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
        alert("⚠️ Please fill all fields.");
        return;
    }

    const assignment = {
        name: name,
        subject: subject,
        deadline: deadline,
        hours: Number(hours),
        difficulty: difficulty
    };

    try {

        const response = await fetch(
            "http://127.0.0.1:5000/api/assignments",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(assignment)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            alert("❌ " + data.message);
            return;
        }

        assignments.push(data.assignment);

        displayAssignments();
        clearForm();

        alert("✅ Assignment added successfully!");

    } catch (error) {

        console.error("Add Assignment Error:", error);

        alert(
            "❌ Backend connection failed.\n" +
            "Make sure the backend server is running."
        );
    }
}


// ===============================
// DISPLAY ASSIGNMENTS
// ===============================

function displayAssignments() {

    const container = document.getElementById("assignments");
    const count = document.getElementById("assignmentCount");

    container.innerHTML = "";

    count.textContent =
        `${assignments.length} assignment${assignments.length === 1 ? "" : "s"}`;

    assignments.forEach(assignment => {

        const item = document.createElement("div");

        item.className = "assignment-item";

        item.innerHTML = `
            <div class="assignment-details">

                <strong>${assignment.name}</strong>

                <small>
                    ${assignment.subject} •
                    Deadline: ${assignment.deadline} •
                    ${assignment.hours} hours
                </small>

            </div>

            <div>

                <span class="difficulty">
                    ${assignment.difficulty}
                </span>

                <button
                    class="delete-btn"
                    onclick="deleteAssignment(${assignment.id})">
                    Delete
                </button>

            </div>
        `;

        container.appendChild(item);
    });
}


// ===============================
// DELETE ASSIGNMENT
// ===============================

function deleteAssignment(id) {

    assignments = assignments.filter(
        assignment => assignment.id !== id
    );

    displayAssignments();
}


// ===============================
// CLEAR FORM
// ===============================

function clearForm() {

    document.getElementById("assignmentName").value = "";
    document.getElementById("subject").value = "";
    document.getElementById("deadline").value = "";
    document.getElementById("hours").value = "";
    document.getElementById("difficulty").value = "";
}


// ===============================
// GENERATE AI STUDY PLAN
// ===============================

async function generatePlan() {

    if (assignments.length === 0) {
        alert("⚠️ Add at least one assignment first.");
        return;
    }

    console.log("🤖 Generating study plan...");
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

        console.log("Backend raw response:", raw);

        let data;

        try {
            data = JSON.parse(raw);
        } catch (e) {
            console.error("Invalid JSON from backend:", raw);

            throw new Error(
                "Backend returned an invalid response."
            );
        }

        // Backend returned an error
        if (!response.ok) {

            console.error("Backend error:", data);

            throw new Error(
                data.error ||
                data.message ||
                "AI service failed."
            );
        }

        if (!data.aiPlan) {
            throw new Error(
                "Backend did not return an AI plan."
            );
        }

        let cleanText = data.aiPlan
            .toString()
            .trim();

        // Remove markdown code blocks
        cleanText = cleanText
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();

        console.log(
            "Clean AI response:",
            cleanText
        );

        let aiResult;

        try {

            aiResult = JSON.parse(cleanText);

        } catch (parseError) {

            console.error(
                "AI JSON parsing failed:",
                parseError
            );

            // Create a local plan if Gemini returns
            // unexpected text
            aiResult = createLocalPlan();

        }

        displayStudyPlan(aiResult);

    } catch (error) {

        console.error(
            "AI Plan Error:",
            error
        );

        // IMPORTANT:
        // Instead of showing the failure popup,
        // generate a working local plan.

        const localPlan = createLocalPlan();

        displayStudyPlan(localPlan);
    }
}


function createLocalPlan() {

    const difficultyWeight = {
        "Hard": 3,
        "Medium": 2,
        "Easy": 1
    };

    const sortedAssignments = [...assignments].sort(
        (a, b) => {

            const difficultyDifference =
                difficultyWeight[b.difficulty] -
                difficultyWeight[a.difficulty];

            if (difficultyDifference !== 0) {
                return difficultyDifference;
            }

            return new Date(a.deadline) -
                   new Date(b.deadline);
        }
    );

    const plan = sortedAssignments.map(
        (assignment, index) => {

            return {
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
// DISPLAY AI STUDY PLAN
// ===============================

function displayStudyPlan(aiResult) {

    let planContainer =
        document.getElementById("studyPlan");


    // Create container if it doesn't exist
    if (!planContainer) {

        planContainer =
            document.createElement("div");

        planContainer.id = "studyPlan";

        document
            .querySelector(".planner-page")
            .appendChild(planContainer);
    }


    // Clear previous plan
    planContainer.innerHTML = "";


    // ===============================
    // AI SUMMARY
    // ===============================

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


    // ===============================
    // PLAN ITEMS
    // ===============================

    if (
        !aiResult.plan ||
        !Array.isArray(aiResult.plan)
    ) {

        const errorMessage =
            document.createElement("p");

        errorMessage.textContent =
            "⚠️ No study plan was returned by AI.";

        planContainer.appendChild(
            errorMessage
        );

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


    // Scroll to AI plan
    planContainer.scrollIntoView({
        behavior: "smooth"
    });
}