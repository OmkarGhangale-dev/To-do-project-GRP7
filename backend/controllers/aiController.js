/**
 * aiController.js
 * Smart AI Task Manager — Groq-powered controller
 *
 * Features:
 *  POST /api/ai/prioritize       — Analyse tasks and recommend priorities / ordering
 *  POST /api/ai/next-task        — Recommend the single best next task to focus on
 *  POST /api/ai/breakdown        — Break a large task into 3–5 actionable subtasks
 *
 * Design decisions (adapted from openkickstartai/smart-task-manager-ai ml_models approach):
 *  • The reference repo uses scikit-learn classifiers with feature vectors built from:
 *      - keyword urgency scoring, deadline proximity, priority label, text length
 *    We replicate the same FEATURE set as prompting context for the LLM, so the
 *    AI makes decisions using the same signals a trained model would.
 *  • All Groq calls are made server-side — the API key never reaches the browser.
 *  • Responses are validated before returning; malformed AI output returns 502.
 *  • Rate-limit and network errors are caught and returned as 503 with a clear message.
 */

const Groq = require("groq-sdk");

// Lazy singleton so the SDK is only constructed when actually needed
let groqClient = null;

function getGroqClient() {
    if (!groqClient) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("GROQ_API_KEY environment variable is not set.");
        }
        groqClient = new Groq({ apiKey });
    }
    return groqClient;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

/**
 * Build a compact task summary string for the prompt, mirroring the feature
 * engineering used in the reference ml_models priority_model:
 *   title text + description snippet + deadline proximity + current priority
 */
function buildTaskSummary(task, now = new Date()) {
    const parts = [];

    parts.push(`ID: ${task.id || "unknown"}`);
    parts.push(`Title: "${task.title || "Untitled"}"`);

    if (task.description && task.description.trim()) {
        const snippet = task.description.trim().slice(0, 120);
        parts.push(`Description: "${snippet}${task.description.length > 120 ? "…" : ""}"`);
    }

    if (task.dueDate) {
        const due = new Date(task.dueDate);
        if (!isNaN(due.getTime())) {
            const diffMs = due - now;
            const diffDays = Math.round(diffMs / 86_400_000);
            if (diffDays < 0) {
                parts.push(`Deadline: OVERDUE by ${Math.abs(diffDays)} day(s)`);
            } else if (diffDays === 0) {
                parts.push("Deadline: DUE TODAY");
            } else {
                parts.push(`Deadline: in ${diffDays} day(s)`);
            }
        }
    } else {
        parts.push("Deadline: not set");
    }

    if (task.priority) parts.push(`Current priority: ${task.priority}`);
    if (task.status) parts.push(`Status: ${task.status}`);
    if (task.category) parts.push(`Category: ${task.category}`);

    return parts.join(" | ");
}

/**
 * Call Groq with a JSON-output system prompt, then parse and validate the response.
 * Returns the parsed object, or throws on failure.
 */
async function callGroqJSON(systemPrompt, userPrompt, timeoutMs = 20_000) {
    const groq = getGroqClient();

    // Simple timeout wrapper
    const responseP = groq.chat.completions.create({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 1024,
        response_format: { type: "json_object" },
    });

    const timeoutP = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Groq API timeout")), timeoutMs)
    );

    const response = await Promise.race([responseP, timeoutP]);
    const raw = response.choices?.[0]?.message?.content || "";

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error(`Groq returned non-JSON content: ${raw.slice(0, 200)}`);
    }
}

// ─── Input validators ─────────────────────────────────────────────────────────

function isValidTaskList(tasks) {
    return Array.isArray(tasks) && tasks.length > 0 && tasks.length <= 50;
}

function isNonEmptyString(val, maxLen = 2000) {
    return typeof val === "string" && val.trim().length > 0 && val.length <= maxLen;
}

// ─── Controllers ─────────────────────────────────────────────────────────────

/**
 * POST /api/ai/prioritize
 *
 * Body: { tasks: [{ id, title, description, dueDate, priority, status, category }] }
 *
 * Returns:
 *   { recommendations: [{ id, suggestedPriority, suggestedOrder, reason }] }
 */
const prioritizeTasks = async (req, res, next) => {
    try {
        const { tasks } = req.body;

        if (!isValidTaskList(tasks)) {
            return res.status(400).json({
                success: false,
                message: "tasks must be a non-empty array of up to 50 task objects.",
            });
        }

        // Validate each task has at minimum a title
        for (const t of tasks) {
            if (!t.id || !isNonEmptyString(t.title, 200)) {
                return res.status(400).json({
                    success: false,
                    message: "Each task must have an id and a non-empty title.",
                });
            }
        }

        // Filter to only incomplete tasks (prioritising completed tasks has no value)
        const pendingTasks = tasks.filter(
            (t) => t.status !== "Completed" && t.status !== "Done"
        );

        if (pendingTasks.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    recommendations: [],
                    summary: "All tasks are already completed — nothing to prioritise.",
                },
            });
        }

        const now = new Date();
        const taskSummaries = pendingTasks
            .map((t, i) => `${i + 1}. ${buildTaskSummary(t, now)}`)
            .join("\n");

        const systemPrompt = `You are a smart task prioritisation engine for a productivity application.
Analyse the provided task list and return a JSON object with this exact shape:

{
  "recommendations": [
    {
      "id": "<task id>",
      "suggestedPriority": "High" | "Medium" | "Low",
      "suggestedOrder": <integer starting at 1, 1 = do first>,
      "reason": "<one concise sentence explaining why>"
    }
  ],
  "summary": "<2-3 sentence overview of the prioritisation rationale>"
}

Rules:
- Assign suggestedOrder 1 to the most critical task.
- Consider deadline proximity, overdue status, urgency keywords in the title/description, and category.
- Keep reasons short (max 20 words), clear, and actionable — no jargon.
- Never suggest a task should have a lower order just because it already has a high priority; if it is overdue and high priority, it stays near the top.
- Do not include completed tasks in the output.
- Return ONLY the JSON object, no extra text.`;

        const userPrompt = `Here are the tasks to prioritise:\n\n${taskSummaries}`;

        let parsed;
        try {
            parsed = await callGroqJSON(systemPrompt, userPrompt);
        } catch (err) {
            const isRateLimit = err.status === 429 || err.message?.includes("rate");
            return res.status(isRateLimit ? 503 : 502).json({
                success: false,
                message: isRateLimit
                    ? "AI service is temporarily rate-limited. Please try again shortly."
                    : `AI service error: ${err.message}`,
            });
        }

        // Validate structure
        if (!Array.isArray(parsed.recommendations)) {
            return res.status(502).json({
                success: false,
                message: "AI returned an unexpected response format.",
            });
        }

        const allowedPriorities = ["High", "Medium", "Low"];
        const validRecs = parsed.recommendations
            .filter((r) => r.id && allowedPriorities.includes(r.suggestedPriority))
            .map((r) => ({
                id: String(r.id),
                suggestedPriority: r.suggestedPriority,
                suggestedOrder: Number(r.suggestedOrder) || 999,
                reason: typeof r.reason === "string" ? r.reason.slice(0, 200) : "",
            }))
            .sort((a, b) => a.suggestedOrder - b.suggestedOrder);

        return res.status(200).json({
            success: true,
            data: {
                recommendations: validRecs,
                summary:
                    typeof parsed.summary === "string"
                        ? parsed.summary.slice(0, 500)
                        : "",
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/ai/next-task
 *
 * Body: { tasks: [{ id, title, description, dueDate, priority, status, category }] }
 *
 * Returns:
 *   { recommendation: { id, title, reason, urgencyScore } }
 */
const getNextTask = async (req, res, next) => {
    try {
        const { tasks } = req.body;

        if (!isValidTaskList(tasks)) {
            return res.status(400).json({
                success: false,
                message: "tasks must be a non-empty array of up to 50 task objects.",
            });
        }

        const pendingTasks = tasks.filter(
            (t) => t.status !== "Completed" && t.status !== "Done"
        );

        if (pendingTasks.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    recommendation: null,
                    message: "All tasks are completed! Nothing pending right now.",
                },
            });
        }

        const now = new Date();
        const taskSummaries = pendingTasks
            .map((t, i) => `${i + 1}. ${buildTaskSummary(t, now)}`)
            .join("\n");

        const systemPrompt = `You are a productivity coach AI for a task management app.
Given a list of pending tasks, choose the SINGLE best task the user should focus on right now.

Return ONLY this JSON object:
{
  "id": "<task id of the recommended task>",
  "title": "<title of the recommended task>",
  "reason": "<2-3 sentences explaining why this is the best task to do now>",
  "urgencyScore": <integer 1-10, where 10 is most urgent>
}

Consider: overdue tasks first, then today's deadline tasks, then high priority, then workload balance.
Be specific in your reason. Avoid generic advice like "this is important". Mention the deadline or priority level.`;

        const userPrompt = `Pending tasks:\n\n${taskSummaries}\n\nWhich single task should the user focus on right now?`;

        let parsed;
        try {
            parsed = await callGroqJSON(systemPrompt, userPrompt);
        } catch (err) {
            const isRateLimit = err.status === 429 || err.message?.includes("rate");
            return res.status(isRateLimit ? 503 : 502).json({
                success: false,
                message: isRateLimit
                    ? "AI service is temporarily rate-limited. Please try again shortly."
                    : `AI service error: ${err.message}`,
            });
        }

        if (!parsed.id || !parsed.reason) {
            return res.status(502).json({
                success: false,
                message: "AI returned an unexpected response format.",
            });
        }

        return res.status(200).json({
            success: true,
            data: {
                recommendation: {
                    id: String(parsed.id),
                    title: typeof parsed.title === "string" ? parsed.title.slice(0, 200) : "",
                    reason: typeof parsed.reason === "string" ? parsed.reason.slice(0, 500) : "",
                    urgencyScore: Math.min(10, Math.max(1, Number(parsed.urgencyScore) || 5)),
                },
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/ai/breakdown
 *
 * Body: { task: { id, title, description, dueDate, priority } }
 *
 * Returns:
 *   { subtasks: [{ title, description, estimatedHours }] }
 */
const breakdownTask = async (req, res, next) => {
    try {
        const { task } = req.body;

        if (!task || typeof task !== "object") {
            return res.status(400).json({
                success: false,
                message: "A task object is required.",
            });
        }

        if (!isNonEmptyString(task.title, 200)) {
            return res.status(400).json({
                success: false,
                message: "task.title is required and must be a non-empty string.",
            });
        }

        const taskContext = buildTaskSummary(task);

        const systemPrompt = `You are a project planning assistant in a task management app.
Break the given task into exactly 3 to 5 smaller, actionable subtasks.

Return ONLY this JSON object:
{
  "subtasks": [
    {
      "title": "<short imperative action, max 80 chars>",
      "description": "<1-2 sentences explaining what exactly to do>",
      "estimatedHours": <number, e.g. 0.5, 1, 2>
    }
  ]
}

Rules:
- Each subtask must be a concrete, independently completable action.
- Order subtasks logically (earlier steps first).
- estimatedHours should be realistic (0.25 to 8).
- Titles must be imperative ("Research X", "Write Y", "Review Z").
- Do NOT include the parent task as a subtask.
- Return between 3 and 5 subtasks.`;

        const userPrompt = `Break down this task into actionable subtasks:\n\n${taskContext}`;

        let parsed;
        try {
            parsed = await callGroqJSON(systemPrompt, userPrompt);
        } catch (err) {
            const isRateLimit = err.status === 429 || err.message?.includes("rate");
            return res.status(isRateLimit ? 503 : 502).json({
                success: false,
                message: isRateLimit
                    ? "AI service is temporarily rate-limited. Please try again shortly."
                    : `AI service error: ${err.message}`,
            });
        }

        if (!Array.isArray(parsed.subtasks) || parsed.subtasks.length < 1) {
            return res.status(502).json({
                success: false,
                message: "AI returned an unexpected response format.",
            });
        }

        const validSubtasks = parsed.subtasks
            .filter((s) => isNonEmptyString(s.title, 80))
            .slice(0, 5)
            .map((s) => ({
                title: s.title.trim().slice(0, 80),
                description:
                    typeof s.description === "string" ? s.description.slice(0, 500) : "",
                estimatedHours:
                    typeof s.estimatedHours === "number" &&
                    s.estimatedHours > 0 &&
                    s.estimatedHours <= 24
                        ? s.estimatedHours
                        : 1,
            }));

        if (validSubtasks.length < 1) {
            return res.status(502).json({
                success: false,
                message: "AI could not generate valid subtasks for this task.",
            });
        }

        return res.status(200).json({
            success: true,
            data: { subtasks: validSubtasks },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = { prioritizeTasks, getNextTask, breakdownTask };
