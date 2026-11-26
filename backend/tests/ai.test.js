/**
 * ai.test.js — Backend tests for all three Groq AI endpoints
 *
 * Uses the same mocking pattern as the existing api.test.js:
 *  - Firebase Admin is fully mocked (no network calls)
 *  - groq-sdk is mocked so the Groq API key is never needed in CI
 *
 * Covers:
 *   POST /api/ai/prioritize — auth guard, validation, success, error paths
 *   POST /api/ai/next-task  — auth guard, validation, success, all-complete edge case
 *   POST /api/ai/breakdown  — auth guard, validation, success, error paths
 */

// ── Mock Firebase BEFORE any app code loads ──────────────────────────────────
jest.mock("firebase-admin/app", () => ({
    initializeApp: jest.fn(),
    cert: jest.fn((sa) => sa),
    getApps: jest.fn(() => [1]),
}));

const mockTimestamp = {
    now: jest.fn(() => ({ _seconds: 0, _nanoseconds: 0 })),
    fromDate: jest.fn((d) => ({ _seconds: Math.floor(d.getTime() / 1000), _nanoseconds: 0 })),
};

const mockDocRef = {
    get: jest.fn(),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
};

const mockCollection = {
    add: jest.fn(),
    doc: jest.fn(() => mockDocRef),
    where: jest.fn(() => mockCollection),
    orderBy: jest.fn(() => mockCollection),
    get: jest.fn(),
};

jest.mock("firebase-admin/firestore", () => ({
    getFirestore: jest.fn(() => ({
        collection: jest.fn(() => mockCollection),
    })),
    Timestamp: mockTimestamp,
}));

jest.mock("firebase-admin/auth", () => ({
    getAuth: jest.fn(() => ({
        verifyIdToken: jest.fn((token) => {
            if (token === "bad-token") return Promise.reject(new Error("Invalid token"));
            return Promise.resolve({ uid: "test-uid", email: "test@example.com", emailVerified: true });
        }),
        getUser: jest.fn(() => Promise.resolve({ email: "test@example.com" })),
    })),
}));

// ── Mock groq-sdk so we never need a real API key ────────────────────────────
const mockGroqCreate = jest.fn();
jest.mock("groq-sdk", () => {
    return jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: mockGroqCreate,
            },
        },
    }));
});

// ── Load server AFTER all mocks are set ─────────────────────────────────────
process.env.NODE_ENV = "test";
process.env.GROQ_API_KEY = "test-groq-key";
require("dotenv").config();

const request = require("supertest");
const { db } = require("../config/db");
const app = require("../server");

const VALID_TOKEN = "valid-firebase-token";
const AUTH_HEADER = `Bearer ${VALID_TOKEN}`;

// Helper: build a minimal Groq mock response
function mockGroqResponse(contentObj) {
    mockGroqCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify(contentObj) } }],
    });
}

// ── Test data ─────────────────────────────────────────────────────────────────

const sampleTasks = [
    {
        id: "task-1",
        title: "Fix critical production bug",
        description: "The login page crashes for 20% of users",
        dueDate: new Date(Date.now() - 86_400_000).toISOString(), // yesterday (overdue)
        priority: "High",
        status: "In Progress",
        category: "Development",
    },
    {
        id: "task-2",
        title: "Write weekly report",
        description: "Summarise progress for the team",
        dueDate: new Date(Date.now() + 3 * 86_400_000).toISOString(), // 3 days from now
        priority: "Medium",
        status: "To Do",
        category: "Operations",
    },
    {
        id: "task-3",
        title: "Research new UI libraries",
        description: "",
        dueDate: null,
        priority: "Low",
        status: "To Do",
        category: "Research",
    },
];

// ── POST /api/ai/prioritize ───────────────────────────────────────────────────

describe("AI Prioritize — POST /api/ai/prioritize", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("missing auth token → 401", async () => {
        const res = await request(app).post("/api/ai/prioritize").send({ tasks: sampleTasks });
        expect(res.status).toBe(401);
        expect(res.body.success).toBe(false);
    });

    test("missing tasks body → 400", async () => {
        const res = await request(app)
            .post("/api/ai/prioritize")
            .set("Authorization", AUTH_HEADER)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("empty tasks array → 400", async () => {
        const res = await request(app)
            .post("/api/ai/prioritize")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: [] });
        expect(res.status).toBe(400);
    });

    test("task missing id → 400", async () => {
        const res = await request(app)
            .post("/api/ai/prioritize")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: [{ title: "No id here" }] });
        expect(res.status).toBe(400);
    });

    test("all tasks completed → 200 with empty recommendations", async () => {
        const completedTasks = sampleTasks.map((t) => ({ ...t, status: "Completed" }));
        const res = await request(app)
            .post("/api/ai/prioritize")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: completedTasks });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.recommendations).toHaveLength(0);
    });

    test("valid tasks → 200 with recommendations", async () => {
        mockGroqCreate.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            recommendations: [
                                { id: "task-1", suggestedPriority: "High", suggestedOrder: 1, reason: "Overdue and critical" },
                                { id: "task-2", suggestedPriority: "Medium", suggestedOrder: 2, reason: "Due in 3 days" },
                                { id: "task-3", suggestedPriority: "Low", suggestedOrder: 3, reason: "No deadline" },
                            ],
                            summary: "Fix the production bug first as it is overdue.",
                        }),
                    },
                },
            ],
        });

        const res = await request(app)
            .post("/api/ai/prioritize")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: sampleTasks });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data.recommendations)).toBe(true);
        expect(res.body.data.recommendations[0].id).toBe("task-1");
        expect(res.body.data.recommendations[0].suggestedPriority).toBe("High");
        expect(typeof res.body.data.summary).toBe("string");
    });

    test("Groq API rate-limit error → 503", async () => {
        const rateLimitErr = new Error("rate limit exceeded");
        rateLimitErr.status = 429;
        mockGroqCreate.mockRejectedValueOnce(rateLimitErr);

        const res = await request(app)
            .post("/api/ai/prioritize")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: sampleTasks });

        expect(res.status).toBe(503);
        expect(res.body.success).toBe(false);
    });

    test("Groq returns malformed JSON → 502", async () => {
        mockGroqCreate.mockResolvedValueOnce({
            choices: [{ message: { content: "not json at all" } }],
        });

        const res = await request(app)
            .post("/api/ai/prioritize")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: sampleTasks });

        expect(res.status).toBe(502);
    });
});

// ── POST /api/ai/next-task ────────────────────────────────────────────────────

describe("AI Next Task — POST /api/ai/next-task", () => {
    beforeEach(() => jest.clearAllMocks());

    test("missing auth → 401", async () => {
        const res = await request(app).post("/api/ai/next-task").send({ tasks: sampleTasks });
        expect(res.status).toBe(401);
    });

    test("no tasks body → 400", async () => {
        const res = await request(app)
            .post("/api/ai/next-task")
            .set("Authorization", AUTH_HEADER)
            .send({});
        expect(res.status).toBe(400);
    });

    test("all tasks completed → 200 with null recommendation", async () => {
        const completedTasks = sampleTasks.map((t) => ({ ...t, status: "Completed" }));
        const res = await request(app)
            .post("/api/ai/next-task")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: completedTasks });
        expect(res.status).toBe(200);
        expect(res.body.data.recommendation).toBeNull();
    });

    test("valid tasks → 200 with recommendation", async () => {
        mockGroqCreate.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            id: "task-1",
                            title: "Fix critical production bug",
                            reason: "This task is overdue and high priority, causing real user impact. Resolve it before anything else.",
                            urgencyScore: 9,
                        }),
                    },
                },
            ],
        });

        const res = await request(app)
            .post("/api/ai/next-task")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: sampleTasks });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.recommendation.id).toBe("task-1");
        expect(res.body.data.recommendation.urgencyScore).toBeGreaterThanOrEqual(1);
        expect(res.body.data.recommendation.urgencyScore).toBeLessThanOrEqual(10);
    });

    test("Groq network error → 502", async () => {
        mockGroqCreate.mockRejectedValueOnce(new Error("Network failure"));

        const res = await request(app)
            .post("/api/ai/next-task")
            .set("Authorization", AUTH_HEADER)
            .send({ tasks: sampleTasks });

        expect(res.status).toBe(502);
        expect(res.body.success).toBe(false);
    });
});

// ── POST /api/ai/breakdown ────────────────────────────────────────────────────

describe("AI Task Breakdown — POST /api/ai/breakdown", () => {
    beforeEach(() => jest.clearAllMocks());

    test("missing auth → 401", async () => {
        const res = await request(app)
            .post("/api/ai/breakdown")
            .send({ task: sampleTasks[0] });
        expect(res.status).toBe(401);
    });

    test("no task body → 400", async () => {
        const res = await request(app)
            .post("/api/ai/breakdown")
            .set("Authorization", AUTH_HEADER)
            .send({});
        expect(res.status).toBe(400);
    });

    test("task with empty title → 400", async () => {
        const res = await request(app)
            .post("/api/ai/breakdown")
            .set("Authorization", AUTH_HEADER)
            .send({ task: { id: "t1", title: "  " } });
        expect(res.status).toBe(400);
    });

    test("valid task → 200 with 3–5 subtasks", async () => {
        mockGroqCreate.mockResolvedValueOnce({
            choices: [
                {
                    message: {
                        content: JSON.stringify({
                            subtasks: [
                                { title: "Reproduce the bug locally", description: "Set up test account and reproduce the crash.", estimatedHours: 0.5 },
                                { title: "Identify root cause in auth flow", description: "Trace the error in the authentication middleware.", estimatedHours: 1 },
                                { title: "Implement fix", description: "Apply the targeted fix and add a regression test.", estimatedHours: 2 },
                                { title: "Deploy to staging", description: "Build and deploy to staging environment.", estimatedHours: 0.5 },
                                { title: "Verify fix in production", description: "Monitor error rates after production deploy.", estimatedHours: 0.25 },
                            ],
                        }),
                    },
                },
            ],
        });

        const res = await request(app)
            .post("/api/ai/breakdown")
            .set("Authorization", AUTH_HEADER)
            .send({ task: sampleTasks[0] });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        const { subtasks } = res.body.data;
        expect(subtasks.length).toBeGreaterThanOrEqual(3);
        expect(subtasks.length).toBeLessThanOrEqual(5);
        expect(subtasks[0].title).toBeTruthy();
        expect(typeof subtasks[0].estimatedHours).toBe("number");
    });

    test("Groq rate limit → 503", async () => {
        const err = new Error("rate limit");
        err.status = 429;
        mockGroqCreate.mockRejectedValueOnce(err);

        const res = await request(app)
            .post("/api/ai/breakdown")
            .set("Authorization", AUTH_HEADER)
            .send({ task: sampleTasks[0] });

        expect(res.status).toBe(503);
    });

    test("Groq returns no subtasks → 502", async () => {
        mockGroqCreate.mockResolvedValueOnce({
            choices: [{ message: { content: JSON.stringify({ subtasks: [] }) } }],
        });

        const res = await request(app)
            .post("/api/ai/breakdown")
            .set("Authorization", AUTH_HEADER)
            .send({ task: sampleTasks[0] });

        expect(res.status).toBe(502);
    });
});
