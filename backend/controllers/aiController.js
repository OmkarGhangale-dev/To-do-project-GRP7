/**
 * aiController.js
 * Smart AI Task Manager — Dual-Engine (Google Gemini & Groq) controller
 *
 * Features:
 *  POST /api/ai/prioritize         — Analyse tasks and recommend priorities / ordering (Groq)
 *  POST /api/ai/next-task          — Recommend the single best next task to focus on (Groq)
 *  POST /api/ai/compare-prioritize — Side-by-side Priority Analysis (Gemini vs Groq)
 *  POST /api/ai/compare-next-task  — Side-by-side "What Should I Do Next?" (Gemini vs Groq)
 *
 * Design decisions:
 *  • All AI calls are made server-side — API keys never reach the browser.
 *  • In compare endpoints, both providers receive identical prompts in parallel via Promise.allSettled,
 *    so one provider's error never blocks the other.
 *  • Speed (ms), Accuracy (/10), and Clarity (/10) are computed from actual model outputs.
 */

const Groq = require("groq-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Lazy singletons so the SDKs are only constructed when actually needed
let groqClient = null;

function getGroqClient(apiKeyOverride) {
    if (apiKeyOverride) {
        return new Groq({ apiKey: apiKeyOverride });
    }
    if (!groqClient) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            throw new Error("GROQ_API_KEY environment variable is not set.");
        }
        groqClient = new Groq({ apiKey });
    }
    return groqClient;
}

let geminiClient = null;

function getGeminiClient(apiKeyOverride) {
    const apiKey = apiKeyOverride || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("GEMINI_API_KEY environment variable is not set.");
    }
    if (apiKeyOverride) {
        return new GoogleGenerativeAI(apiKeyOverride);
    }
    if (!geminiClient) {
        geminiClient = new GoogleGenerativeAI(apiKey);
    }
    return geminiClient;
}

// ─── Shared helpers ──────────────────────────────────────────────────────────

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
 * Call Groq with JSON output, returning { model, latencyMs, data }.
 */
async function callGroqJSONWithMeta(systemPrompt, userPrompt, customKey, timeoutMs = 20_000) {
    const startTime = Date.now();
    const groq = getGroqClient(customKey);

    const candidateModels = [
        process.env.GROQ_MODEL,
        "qwen/qwen3.8-27b",
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
    ].filter(Boolean);

    const modelsToTry = [...new Set(candidateModels)];
    let lastError = null;

    for (const model of modelsToTry) {
        try {
            const responseP = groq.chat.completions.create({
                model,
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
            const latencyMs = Date.now() - startTime;
            const raw = response.choices?.[0]?.message?.content || "";

            let parsed;
            try {
                parsed = JSON.parse(raw);
            } catch {
                throw new Error(`Groq returned non-JSON content: ${raw.slice(0, 200)}`);
            }

            return { model, latencyMs, data: parsed };
        } catch (err) {
            lastError = err;
            const isModelNotFound =
                err.status === 404 ||
                err.code === "model_not_found" ||
                err.code === "model_decommissioned" ||
                (err.message && err.message.includes("does not exist"));

            if (isModelNotFound) {
                console.warn(`Groq model '${model}' not available, attempting fallback...`);
                continue;
            }
            throw err;
        }
    }

    throw lastError || new Error("All Groq model attempts failed.");
}

async function callGroqJSON(systemPrompt, userPrompt, timeoutMs = 20_000) {
    const res = await callGroqJSONWithMeta(systemPrompt, userPrompt, null, timeoutMs);
    return res.data;
}

/**
 * Call Google Gemini with JSON output, returning { model, latencyMs, data }.
 * Combines systemPrompt + userPrompt into a single content block to avoid
 * systemInstruction overhead. Falls back across model variants on 404/503/429/timeout.
 */
async function callGeminiJSONWithMeta(systemPrompt, userPrompt, customKey, timeoutMs = 60_000) {
    const startTime = Date.now();
    const genAI = getGeminiClient(customKey);

    // Fastest models first — lite variants are ~1.5s vs ~3.5s for full flash
    const candidateModels = [
        process.env.GEMINI_MODEL,
        "gemini-3.5-flash-lite",   // ~1.5s — fastest
        "gemini-3.1-flash-lite",   // ~1.6s — fast
        "gemini-3.5-flash",        // ~3.5s — reliable
        "gemini-3-flash-preview",  // ~3.4s — fallback
        "gemini-3.7-flash",
        "gemini-3.8-flash",
    ].filter(Boolean);

    const modelsToTry = [...new Set(candidateModels)];
    let lastError = null;

    for (const modelName of modelsToTry) {
        try {
            // No systemInstruction parameter — merge into one content block to
            // eliminate the extra round-trip overhead that caused timeouts.
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.3,
                },
            });

            const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

            const timeoutP = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Gemini API timeout after ${timeoutMs / 1000}s`)), timeoutMs)
            );

            const result = await Promise.race([model.generateContent(combinedPrompt), timeoutP]);
            const latencyMs = Date.now() - startTime;
            const responseText = result.response.text();

            let parsed;
            try {
                parsed = JSON.parse(responseText);
            } catch {
                const match = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                if (match) {
                    parsed = JSON.parse(match[1]);
                } else {
                    throw new Error(`Gemini returned non-JSON content: ${responseText.slice(0, 200)}`);
                }
            }

            return { model: modelName, latencyMs, data: parsed };
        } catch (err) {
            lastError = err;
            const msg = err.message || "";
            const shouldFallback =
                err.status === 404 ||
                err.status === 503 ||
                err.status === 429 ||
                msg.includes("not found") ||
                msg.includes("no longer available") ||
                msg.includes("unsupported") ||
                msg.includes("high demand") ||
                msg.includes("Service Unavailable") ||
                msg.includes("timeout"); // also try next (faster) model on timeout

            if (shouldFallback) {
                console.warn(`Gemini model '${modelName}' failed (${err.status || msg.slice(0, 60)}), trying next...`);
                continue;
            }
            throw err;
        }
    }

    throw lastError || new Error("All Gemini model attempts failed.");
}

// ─── Input validators ─────────────────────────────────────────────────────────

function isValidTaskList(tasks) {
    return Array.isArray(tasks) && tasks.length > 0 && tasks.length <= 50;
}

function isNonEmptyString(val, maxLen = 2000) {
    return typeof val === "string" && val.trim().length > 0 && val.length <= maxLen;
}

// ─── Prompt builders ─────────────────────────────────────────────────────────

function buildPrioritizePrompts(pendingTasks, now = new Date()) {
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
    return { systemPrompt, userPrompt };
}

function buildNextTaskPrompts(pendingTasks, now = new Date()) {
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
    return { systemPrompt, userPrompt };
}

// ─── Objective Evaluation Metrics ────────────────────────────────────────────

function computeNextTaskMetrics(pendingTasks, parsed, latencyMs) {
    const validIds = new Set(pendingTasks.map((t) => String(t.id)));
    const matchedTask = pendingTasks.find((t) => String(t.id) === String(parsed.id));

    // Accuracy (out of 10): valid task ID, valid urgencyScore, overdue/priority alignment
    let accuracy = 6.0;
    if (matchedTask && validIds.has(String(parsed.id))) accuracy += 2.0;
    if (typeof parsed.urgencyScore === "number" && parsed.urgencyScore >= 1 && parsed.urgencyScore <= 10) {
        accuracy += 1.0;
    }
    if (matchedTask) {
        const hasOverdue = pendingTasks.some((t) => t.dueDate && new Date(t.dueDate) < new Date());
        const pickedOverdue = matchedTask.dueDate && new Date(matchedTask.dueDate) < new Date();
        if (!hasOverdue || pickedOverdue || matchedTask.priority === "High" || matchedTask.priority === "Urgent") {
            accuracy += 1.0;
        } else {
            accuracy += 0.4;
        }
    }
    accuracy = Math.max(5.0, Math.min(10.0, Math.round(accuracy * 10) / 10));

    // Clarity (out of 10): specific reasoning referencing deadline/priority/title, concise length
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
    let clarity = 6.5;
    if (reason.length >= 40 && reason.length <= 320) clarity += 1.5;
    else if (reason.length > 15) clarity += 0.7;

    const specificityTerms = ["overdue", "deadline", "due", "priority", "urgent", "high", "today", "first", "critical"];
    const lowerReason = reason.toLowerCase();
    const hits = specificityTerms.filter((w) => lowerReason.includes(w)).length;
    clarity += Math.min(2.0, hits * 0.6);
    clarity = Math.max(5.0, Math.min(10.0, Math.round(clarity * 10) / 10));

    return {
        speedMs: latencyMs,
        accuracy,
        clarity,
    };
}

function computePrioritizeMetrics(pendingTasks, validRecs, summary, latencyMs) {
    const expectedIds = new Set(pendingTasks.map((t) => String(t.id)));
    const returnedIds = new Set(validRecs.map((r) => String(r.id)));

    // Accuracy (out of 10): task ID coverage, valid order sequence, no hallucinated IDs
    let matchedCount = 0;
    returnedIds.forEach((id) => {
        if (expectedIds.has(id)) matchedCount++;
    });
    const coverageRatio = expectedIds.size > 0 ? matchedCount / expectedIds.size : 1;
    let accuracy = 6.0 + coverageRatio * 3.0;

    // Bonus for sequential ordering starting at 1
    if (validRecs.length > 0 && validRecs[0].suggestedOrder === 1) {
        accuracy += 1.0;
    }
    accuracy = Math.max(5.0, Math.min(10.0, Math.round(accuracy * 10) / 10));

    // Clarity (out of 10): concise reasons (<= 25 words), non-empty summary
    let clarity = 6.0;
    if (validRecs.length > 0) {
        const conciseReasons = validRecs.filter((r) => {
            const words = (r.reason || "").trim().split(/\s+/).filter(Boolean).length;
            return words >= 4 && words <= 26;
        }).length;
        clarity += (conciseReasons / validRecs.length) * 2.5;
    }
    if (typeof summary === "string" && summary.trim().length >= 30) {
        clarity += 1.5;
    }
    clarity = Math.max(5.0, Math.min(10.0, Math.round(clarity * 10) / 10));

    return {
        speedMs: latencyMs,
        accuracy,
        clarity,
    };
}

// ─── Single-Provider Controllers (preserved for compatibility) ────────────────

const prioritizeTasks = async (req, res, next) => {
    try {
        const { tasks } = req.body;

        if (!isValidTaskList(tasks)) {
            return res.status(400).json({
                success: false,
                message: "tasks must be a non-empty array of up to 50 task objects.",
            });
        }

        for (const t of tasks) {
            if (!t.id || !isNonEmptyString(t.title, 200)) {
                return res.status(400).json({
                    success: false,
                    message: "Each task must have an id and a non-empty title.",
                });
            }
        }

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

        const { systemPrompt, userPrompt } = buildPrioritizePrompts(pendingTasks);

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

        const { systemPrompt, userPrompt } = buildNextTaskPrompts(pendingTasks);

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

// ─── Side-by-Side Comparison Controllers (Gemini vs Groq) ───────────────────

/**
 * POST /api/ai/compare-next-task
 * Runs identical prompts on Google Gemini and Groq in parallel,
 * returning side-by-side recommendations with speed (ms), accuracy, and clarity.
 */
const compareNextTask = async (req, res, next) => {
    try {
        const { tasks, geminiApiKey, groqApiKey } = req.body;

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
                    empty: true,
                    message: "All tasks are completed! Nothing pending right now.",
                    gemini: null,
                    groq: null,
                },
            });
        }

        const { systemPrompt, userPrompt } = buildNextTaskPrompts(pendingTasks);

        const [geminiSettled, groqSettled] = await Promise.allSettled([
            callGeminiJSONWithMeta(systemPrompt, userPrompt, geminiApiKey),
            callGroqJSONWithMeta(systemPrompt, userPrompt, groqApiKey),
        ]);

        const formatResult = (settled, defaultModel) => {
            if (settled.status === "fulfilled") {
                const { model, latencyMs, data } = settled.value;
                if (!data || !data.id || !data.reason) {
                    return {
                        status: "error",
                        model,
                        responseTimeMs: latencyMs,
                        recommendation: null,
                        metrics: null,
                        error: "Model returned an incomplete response format.",
                    };
                }
                const recommendation = {
                    id: String(data.id),
                    title: typeof data.title === "string" ? data.title.slice(0, 200) : "",
                    reason: typeof data.reason === "string" ? data.reason.slice(0, 500) : "",
                    urgencyScore: Math.min(10, Math.max(1, Number(data.urgencyScore) || 5)),
                };
                const metrics = computeNextTaskMetrics(pendingTasks, recommendation, latencyMs);
                return {
                    status: "success",
                    model,
                    responseTimeMs: latencyMs,
                    recommendation,
                    metrics,
                    error: null,
                };
            }
            return {
                status: "error",
                model: defaultModel,
                responseTimeMs: null,
                recommendation: null,
                metrics: null,
                error: settled.reason?.message || "AI request failed.",
            };
        };

        return res.status(200).json({
            success: true,
            data: {
                empty: false,
                gemini: formatResult(geminiSettled, process.env.GEMINI_MODEL || "gemini-3.8-flash"),
                groq: formatResult(groqSettled, process.env.GROQ_MODEL || "qwen/qwen3.8-27b"),
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * POST /api/ai/compare-prioritize
 * Runs identical priority analysis prompts on Google Gemini and Groq in parallel,
 * returning side-by-side recommendations with speed (ms), accuracy, and clarity.
 */
const comparePrioritize = async (req, res, next) => {
    try {
        const { tasks, geminiApiKey, groqApiKey } = req.body;

        if (!isValidTaskList(tasks)) {
            return res.status(400).json({
                success: false,
                message: "tasks must be a non-empty array of up to 50 task objects.",
            });
        }

        for (const t of tasks) {
            if (!t.id || !isNonEmptyString(t.title, 200)) {
                return res.status(400).json({
                    success: false,
                    message: "Each task must have an id and a non-empty title.",
                });
            }
        }

        const pendingTasks = tasks.filter(
            (t) => t.status !== "Completed" && t.status !== "Done"
        );

        if (pendingTasks.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    empty: true,
                    message: "All tasks are already completed — nothing to prioritise.",
                    gemini: null,
                    groq: null,
                },
            });
        }

        const { systemPrompt, userPrompt } = buildPrioritizePrompts(pendingTasks);

        const [geminiSettled, groqSettled] = await Promise.allSettled([
            callGeminiJSONWithMeta(systemPrompt, userPrompt, geminiApiKey),
            callGroqJSONWithMeta(systemPrompt, userPrompt, groqApiKey),
        ]);

        const allowedPriorities = ["High", "Medium", "Low"];
        const formatResult = (settled, defaultModel) => {
            if (settled.status === "fulfilled") {
                const { model, latencyMs, data } = settled.value;
                if (!data || !Array.isArray(data.recommendations)) {
                    return {
                        status: "error",
                        model,
                        responseTimeMs: latencyMs,
                        recommendations: [],
                        summary: "",
                        metrics: null,
                        error: "Model returned an unexpected response format.",
                    };
                }
                const validRecs = data.recommendations
                    .filter((r) => r.id && allowedPriorities.includes(r.suggestedPriority))
                    .map((r) => ({
                        id: String(r.id),
                        suggestedPriority: r.suggestedPriority,
                        suggestedOrder: Number(r.suggestedOrder) || 999,
                        reason: typeof r.reason === "string" ? r.reason.slice(0, 200) : "",
                    }))
                    .sort((a, b) => a.suggestedOrder - b.suggestedOrder);

                const summary = typeof data.summary === "string" ? data.summary.slice(0, 500) : "";
                const metrics = computePrioritizeMetrics(pendingTasks, validRecs, summary, latencyMs);

                return {
                    status: "success",
                    model,
                    responseTimeMs: latencyMs,
                    recommendations: validRecs,
                    summary,
                    metrics,
                    error: null,
                };
            }
            return {
                status: "error",
                model: defaultModel,
                responseTimeMs: null,
                recommendations: [],
                summary: "",
                metrics: null,
                error: settled.reason?.message || "AI request failed.",
            };
        };

        return res.status(200).json({
            success: true,
            data: {
                empty: false,
                gemini: formatResult(geminiSettled, process.env.GEMINI_MODEL || "gemini-3.8-flash"),
                groq: formatResult(groqSettled, process.env.GROQ_MODEL || "qwen/qwen3.8-27b"),
            },
        });
    } catch (err) {
        next(err);
    }
};

module.exports = {
    prioritizeTasks,
    getNextTask,
    comparePrioritize,
    compareNextTask,
};
