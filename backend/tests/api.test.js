/**
 * TaskFlow API Tests
 *
 * HOW IT WORKS
 * ─────────────
 * firebase-admin/auth pulls in `jose` (pure ESM) which Jest (CommonJS runner)
 * cannot require directly.  We mock the entire firebase-admin SDK so Jest never
 * loads `jose`.  The mock returns:
 *   • verifyIdToken → resolves with a fake decoded token (simulates VALID auth)
 *   • verifyIdToken called with the string "bad-token" → rejects  (simulates INVALID auth)
 *
 * This lets us test every route handler AND the auth middleware without network
 * access and without a real Firebase project.
 *
 * To run end-to-end tests against the live Firestore you need a real token:
 *   $env:FIREBASE_TEST_TOKEN="eyJ..."
 *   npm test
 * Those tests are intentionally in a SEPARATE file (tests/live.test.js).
 */

// ── Mock firebase-admin BEFORE any app code loads ─────────────────────────
jest.mock("firebase-admin/app", () => ({
    initializeApp: jest.fn(),
    cert: jest.fn((sa) => sa),
    getApps: jest.fn(() => [1])          // pretend app is already initialized
}));

const mockTimestamp = {
    now: jest.fn(() => ({ _seconds: 0, _nanoseconds: 0 })),
    fromDate: jest.fn((d) => ({ _seconds: Math.floor(d.getTime() / 1000), _nanoseconds: 0 }))
};

// Mock Firestore document / collection
const makeDoc = (exists, data = {}) => ({
    exists,
    id: "mock-doc-id",
    data: () => data
});

const mockDocRef = {
    get: jest.fn(),
    set: jest.fn(() => Promise.resolve()),
    update: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve())
};

const mockCollection = {
    add: jest.fn(),
    doc: jest.fn(() => mockDocRef),
    where: jest.fn(() => mockCollection),
    orderBy: jest.fn(() => mockCollection),
    get: jest.fn()
};

jest.mock("firebase-admin/firestore", () => ({
    getFirestore: jest.fn(() => ({
        collection: jest.fn(() => mockCollection)
    })),
    Timestamp: mockTimestamp
}));

// Mock auth — verifyIdToken resolves for "valid-token", rejects for anything else
const mockVerifyIdToken = jest.fn((token) => {
    if (token === "bad-token" || token === "this.is.not.a.valid.firebase.token") {
        return Promise.reject(new Error("Invalid token"));
    }
    if (token === "superadmin-token") {
        return Promise.resolve({ uid: "superadmin-uid", email: "omkarghangale36@gmail.com", email_verified: true });
    }
    if (token === "admin-token") {
        return Promise.resolve({ uid: "admin-uid", email: "admin@example.com", email_verified: true });
    }
    return Promise.resolve({ uid: "test-uid-123", email: "test@example.com", email_verified: true });
});

jest.mock("firebase-admin/auth", () => ({
    getAuth: jest.fn(() => ({
        verifyIdToken: mockVerifyIdToken
    }))
}));

// ── Now load the app ───────────────────────────────────────────────────────
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const request = require("supertest");

const { db } = require("../config/db");
const taskRoutes = require("../routes/taskRoutes");
const categoryRoutes = require("../routes/categoryRoutes");
const authRoutes = require("../routes/authRoutes");
const adminRoutes = require("../routes/adminRoutes");
const errorHandler = require("../middlewares/errorHandler");

const app = express();
app.use(cors());
app.use(express.json());

// Health-check
app.get("/", async (req, res) => {
    res.status(200).json({ success: true, message: "TaskFlow Backend API is running!", firebase: "mocked" });
});

app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin", adminRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: "API route not found." }));
app.use(errorHandler);

// Auth header helper
const validAuth = { Authorization: "Bearer valid-token" };
const badAuth   = { Authorization: "Bearer bad-token" };

// ── Health Check ───────────────────────────────────────────────────────────
describe("Health Check", () => {
    test("GET / → 200 success", async () => {
        const res = await request(app).get("/");
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.message).toMatch(/TaskFlow Backend API/);
    });
});

describe("404 for unknown routes", () => {
    test("GET /api/unknown → 404", async () => {
        const res = await request(app).get("/api/unknown");
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });
});

// ── Auth Middleware: missing token ─────────────────────────────────────────
describe("Auth middleware — missing token → 401", () => {
    test("GET /api/auth/profile", async () => {
        const res = await request(app).get("/api/auth/profile");
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
    test("GET /api/tasks", async () => {
        const res = await request(app).get("/api/tasks");
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
    test("POST /api/tasks", async () => {
        const res = await request(app).post("/api/tasks").send({ title: "Test" });
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
    test("GET /api/categories", async () => {
        const res = await request(app).get("/api/categories");
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
    test("POST /api/categories", async () => {
        const res = await request(app).post("/api/categories").send({ categoryName: "Work" });
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

// ── Auth Middleware: invalid token ────────────────────────────────────────
describe("Auth middleware — invalid token → 401", () => {
    test("GET /api/auth/profile with bad token", async () => {
        const res = await request(app).get("/api/auth/profile").set(badAuth);
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
    test("GET /api/tasks with bad token", async () => {
        const res = await request(app).get("/api/tasks").set(badAuth);
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
    test("GET /api/categories with bad token", async () => {
        const res = await request(app).get("/api/categories").set(badAuth);
        expect(res.statusCode).toBe(401);
        expect(res.body.success).toBe(false);
    });
});

// ── Profile routes ────────────────────────────────────────────────────────
describe("Profile (mocked Firestore)", () => {
    beforeEach(() => jest.clearAllMocks());

    test("GET /api/auth/profile — user not found → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(false));
        const res = await request(app).get("/api/auth/profile").set(validAuth);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

    test("GET /api/auth/profile — user exists → 200", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { name: "Alice", email: "test@example.com" }));
        const res = await request(app).get("/api/auth/profile").set(validAuth);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("name", "Alice");
    });

    test("POST /api/auth/profile — no name → 400", async () => {
        const res = await request(app).post("/api/auth/profile").set(validAuth).send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("POST /api/auth/profile — profile already exists → 409", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { name: "Alice" }));
        const res = await request(app).post("/api/auth/profile").set(validAuth).send({ name: "Alice" });
        expect(res.statusCode).toBe(409);
        expect(res.body.success).toBe(false);
    });

    test("POST /api/auth/profile — create new → 201", async () => {
        // First call: check existing → not found; second call: set
        mockDocRef.get.mockResolvedValueOnce(makeDoc(false));
        const res = await request(app).post("/api/auth/profile").set(validAuth).send({ name: "Alice" });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("name", "Alice");
    });

    test("PUT /api/auth/profile — no name → 400", async () => {
        const res = await request(app).put("/api/auth/profile").set(validAuth).send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("PUT /api/auth/profile — user not found → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(false));
        const res = await request(app).put("/api/auth/profile").set(validAuth).send({ name: "Bob" });
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

    test("PUT /api/auth/profile — success → 200", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { name: "Alice" }));
        const res = await request(app).put("/api/auth/profile").set(validAuth).send({ name: "Alice Updated" });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Category routes ───────────────────────────────────────────────────────
describe("Categories (mocked Firestore)", () => {
    beforeEach(() => jest.clearAllMocks());

    test("POST /api/categories — no name → 400", async () => {
        const res = await request(app).post("/api/categories").set(validAuth).send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/required/i);
    });

    test("POST /api/categories — valid → 201", async () => {
        mockCollection.add.mockResolvedValue({ id: "cat-id-1" });
        const res = await request(app).post("/api/categories").set(validAuth).send({ categoryName: "Work" });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("id", "cat-id-1");
        expect(res.body.data).toHaveProperty("categoryName", "Work");
    });

    test("GET /api/categories → 200 with array", async () => {
        mockCollection.get.mockResolvedValue({
            docs: [{ id: "cat-1", data: () => ({ userId: "test-uid-123", categoryName: "Work" }) }]
        });
        const res = await request(app).get("/api/categories").set(validAuth);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test("GET /api/categories/:id — not found → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(false));
        const res = await request(app).get("/api/categories/nonexistent").set(validAuth);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

    test("GET /api/categories/:id — found → 200", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { userId: "test-uid-123", categoryName: "Work" }));
        const res = await request(app).get("/api/categories/cat-id-1").set(validAuth);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("PUT /api/categories/:id — no name → 400", async () => {
        const res = await request(app).put("/api/categories/cat-id-1").set(validAuth).send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("PUT /api/categories/:id — not found → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(false));
        const res = await request(app).put("/api/categories/cat-id-1").set(validAuth).send({ categoryName: "New" });
        expect(res.statusCode).toBe(404);
    });

    test("PUT /api/categories/:id — success → 200", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { userId: "test-uid-123", categoryName: "Work" }));
        const res = await request(app).put("/api/categories/cat-id-1").set(validAuth).send({ categoryName: "Personal" });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("DELETE /api/categories/:id — not found → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(false));
        const res = await request(app).delete("/api/categories/cat-id-1").set(validAuth);
        expect(res.statusCode).toBe(404);
    });

    test("DELETE /api/categories/:id — success → 200", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { userId: "test-uid-123", categoryName: "Work" }));
        const res = await request(app).delete("/api/categories/cat-id-1").set(validAuth);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Task routes ───────────────────────────────────────────────────────────
describe("Tasks (mocked Firestore)", () => {
    beforeEach(() => jest.clearAllMocks());

    test("POST /api/tasks — no title → 400", async () => {
        const res = await request(app).post("/api/tasks").set(validAuth).send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("POST /api/tasks — invalid priority → 400", async () => {
        const res = await request(app).post("/api/tasks").set(validAuth).send({ title: "T", priority: "Critical" });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Priority/);
    });

    test("POST /api/tasks — invalid status → 400", async () => {
        const res = await request(app).post("/api/tasks").set(validAuth).send({ title: "T", status: "Archived" });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
        expect(res.body.message).toMatch(/Status/);
    });

    test("POST /api/tasks — valid minimal → 201", async () => {
        mockCollection.add.mockResolvedValue({ id: "task-id-1" });
        const res = await request(app).post("/api/tasks").set(validAuth).send({ title: "My Task" });
        expect(res.statusCode).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("id", "task-id-1");
        expect(res.body.data).toHaveProperty("title", "My Task");
        expect(res.body.data.priority).toBe("Medium");
        expect(res.body.data.status).toBe("Pending");
    });

    test("POST /api/tasks — with invalid due date → 400", async () => {
        const res = await request(app).post("/api/tasks").set(validAuth).send({ title: "T", dueDate: "not-a-date" });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("POST /api/tasks — title too long → 400", async () => {
        const res = await request(app).post("/api/tasks").set(validAuth).send({ title: "x".repeat(201) });
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("GET /api/tasks → 200 with array", async () => {
        mockCollection.get.mockResolvedValue({
            docs: [{ id: "task-1", data: () => ({ userId: "test-uid-123", title: "My Task" }) }]
        });
        const res = await request(app).get("/api/tasks").set(validAuth);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test("GET /api/tasks/:id — not found → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(false));
        const res = await request(app).get("/api/tasks/nonexistent").set(validAuth);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

    test("GET /api/tasks/:id — wrong user → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { userId: "other-uid", title: "Task" }));
        const res = await request(app).get("/api/tasks/task-id-1").set(validAuth);
        expect(res.statusCode).toBe(404);
        expect(res.body.success).toBe(false);
    });

    test("GET /api/tasks/:id — found → 200", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { userId: "test-uid-123", title: "My Task" }));
        const res = await request(app).get("/api/tasks/task-id-1").set(validAuth);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("PUT /api/tasks/:id — no fields → 400", async () => {
        const res = await request(app).put("/api/tasks/task-id-1").set(validAuth).send({});
        expect(res.statusCode).toBe(400);
        expect(res.body.success).toBe(false);
    });

    test("PUT /api/tasks/:id — not found → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(false));
        const res = await request(app).put("/api/tasks/task-id-1").set(validAuth).send({ title: "Updated" });
        expect(res.statusCode).toBe(404);
    });

    test("PUT /api/tasks/:id — success → 200", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { userId: "test-uid-123", title: "My Task" }));
        const res = await request(app).put("/api/tasks/task-id-1").set(validAuth).send({ title: "Updated Task", status: "In Progress" });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });

    test("DELETE /api/tasks/:id — not found → 404", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(false));
        const res = await request(app).delete("/api/tasks/task-id-1").set(validAuth);
        expect(res.statusCode).toBe(404);
    });

    test("DELETE /api/tasks/:id — success → 200", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { userId: "test-uid-123", title: "My Task" }));
        const res = await request(app).delete("/api/tasks/task-id-1").set(validAuth);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});

// ── Admin Routes ───────────────────────────────────────────────────────────
describe("Admin Management API", () => {
    const superAdminAuth = { Authorization: "Bearer superadmin-token" };
    const adminAuth      = { Authorization: "Bearer admin-token" };
    const userAuth       = { Authorization: "Bearer valid-token" };

    test("GET /api/admin/users — missing auth → 401", async () => {
        const res = await request(app).get("/api/admin/users");
        expect(res.statusCode).toBe(401);
    });

    test("GET /api/admin/users — normal user → 403 Forbidden", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { email: "test@example.com", role: "user" }));
        const res = await request(app).get("/api/admin/users").set(userAuth);
        expect(res.statusCode).toBe(403);
        expect(res.body.success).toBe(false);
    });

    test("GET /api/admin/users — Super Admin → 200 success", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { email: "omkarghangale36@gmail.com", role: "admin" }));
        mockCollection.get.mockResolvedValue({
            docs: [
                makeDoc(true, { email: "omkarghangale36@gmail.com", name: "Omkar", role: "admin" }),
                makeDoc(true, { email: "member@example.com", name: "Member", role: "user" })
            ]
        });
        const res = await request(app).get("/api/admin/users").set(superAdminAuth);
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(Array.isArray(res.body.data)).toBe(true);
    });

    test("PUT /api/admin/users/:uid/role — normal admin attempting to promote/demote → 403 Forbidden", async () => {
        mockDocRef.get.mockResolvedValue(makeDoc(true, { email: "admin@example.com", role: "admin" }));
        const res = await request(app)
            .put("/api/admin/users/target-uid/role")
            .set(adminAuth)
            .send({ role: "admin" });
        expect(res.statusCode).toBe(403);
    });

    test("PUT /api/admin/users/:uid/role — attempting to modify Super Admin → 403 Forbidden", async () => {
        mockDocRef.get.mockResolvedValueOnce(makeDoc(true, { email: "omkarghangale36@gmail.com", role: "admin" }));

        const res = await request(app)
            .put("/api/admin/users/super-uid/role")
            .set(superAdminAuth)
            .send({ role: "user" });
        expect(res.statusCode).toBe(403);
        expect(res.body.message).toMatch(/Super Admin/i);
    });

    test("PUT /api/admin/users/:uid/role — Super Admin promotes user to admin → 200 success", async () => {
        mockDocRef.get
            .mockResolvedValueOnce(makeDoc(true, { email: "user@example.com", role: "user", name: "Regular" }))
            .mockResolvedValueOnce(makeDoc(true, { email: "user@example.com", role: "admin", name: "Regular" }));

        const res = await request(app)
            .put("/api/admin/users/user-uid/role")
            .set(superAdminAuth)
            .send({ role: "admin" });
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
    });
});
