# TaskFlow

TaskFlow is a full-stack, AI-enhanced task management application. It combines a React 19 + TypeScript + Tailwind CSS frontend with a Node.js + Express.js backend backed by Firebase Firestore and Firebase Authentication. AI-powered features (task prioritisation and next-task recommendations) are delivered through a dual-engine integration of **Google Gemini** and **Groq**, comparing both APIs side by side.

---

## ✨ Features

### Core Task Management
- **Task CRUD** — Create, read, update, and delete tasks with titles, descriptions, categories, priorities, statuses, due dates, and time fields
- **Task Priorities** — Low, Medium, High, Urgent
- **Task Statuses** — To Do, In Progress, In Review, Completed
- **Task Categories** — Development, Design, Marketing, Research, Operations, Productivity
- **Custom Categories** — Users can manage their own categories
- **Overdue Detection** — Any incomplete task whose deadline has passed is immediately flagged as overdue, rechecked on creation, deadline edits, page load, tab focus, and periodically while the app is open

### Views
- **Dashboard Overview** — Summary cards (total, overdue, high-priority, completed), recent tasks, quick actions
- **My Tasks** — Filterable and sortable task table with inline actions
- **Kanban Board** — Drag-free column view organised by task status
- **Calendar** — Month/week/day calendar displaying tasks by due date
- **Completed Tasks** — Archive of finished tasks
- **Analytics** — Charts and statistics on productivity trends

### AI Assistant (Dual-Engine — Gemini vs Groq)
- **AI Priority Analysis** — Sends all pending tasks to both Google Gemini and Groq simultaneously; each engine returns a recommended priority (High / Medium / Low), a suggested execution order, and a one-sentence reason per task. Results are displayed side by side with Speed (ms), Accuracy (/10), and Clarity (/10) metrics
- **What Should I Do Next?** — Sends pending tasks to both engines and each returns the single best task to focus on right now, along with an urgency score and a plain-language reason. Both responses are displayed side by side with the same Speed / Accuracy / Clarity strip
- **Apply recommendations independently** — Each engine column has its own Apply button so users choose which engine's output to adopt, with no automatic overwrite of existing task data

### Notifications & Alerts
- **Session-scoped entry alerts** — On first visit per browser session, the user is notified if they have overdue tasks or high-priority tasks requiring immediate attention
- **Notifications page** — In-app notification centre for deadline, overdue, created, completed, and system events

### Authentication
- **Email / Password** registration and login via Firebase Auth
- **Google OAuth** sign-in via Firebase popup flow
- **Forgot Password** flow
- **Firebase ID Token** passed as Bearer token to every backend request; verified server-side via Firebase Admin SDK
- **Token auto-refresh** — tokens are refreshed transparently before expiry

### Admin Panel
- **Admin Overview** — Platform-wide stats (users, tasks, activity)
- **User Management** — List all users, view profiles, change roles (Super Admin only)
- **All Tasks** — Cross-user task browser for administrators
- **Reports** — Aggregated reports per category / priority / time range
- **Activity Logs** — Audit trail of platform events
- **Categories & Priorities** — Global category and priority management
- **Admin Settings**
- Role-guarded routing: `admin` role required; role promotion restricted to `isSuperAdmin`

### UI / UX
- **Light and Dark themes** — toggled globally, persisted in context
- **Fully responsive** — desktop, tablet, and mobile layouts
- **Toast notifications** for success, warning, and error feedback
- **Minimal, professional design** — no glassmorphism, no gradient backgrounds, no decorative AI badges

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend framework** | React 19 |
| **Frontend language** | TypeScript (~7.0) |
| **Build tool** | Vite 8 with `vite-plugin-singlefile` (single HTML output) |
| **Styling** | Tailwind CSS 4 (via `@tailwindcss/vite` plugin) |
| **Icons** | Lucide React |
| **Backend runtime** | Node.js |
| **Backend framework** | Express.js 5 |
| **Database** | Firebase Firestore (NoSQL document database) |
| **Authentication** | Firebase Authentication (Email/Password + Google OAuth) |
| **Backend Firebase SDK** | Firebase Admin SDK 14 |
| **Frontend Firebase SDK** | Firebase JS SDK 13 |
| **AI — primary engine** | Groq API (`groq-sdk`) — default model: `qwen/qwen3.8-27b` with auto-fallback |
| **AI — secondary engine** | Google Gemini API (`@google/generative-ai`) — default model: `gemini-3.5-flash` with lite/fallback variants |
| **Testing** | Jest 29 + Supertest |
| **Linter** | OXLint |
| **Frontend deployment** | Vercel |
| **Backend deployment** | Render |

> **No PostgreSQL, MySQL, MongoDB, or any relational/other NoSQL database is used.** All data is stored in Firebase Firestore.

---

## 📁 Project Structure

```text
taskflow/
├── backend/
│   ├── config/
│   │   ├── constants.js              # Shared constants (priority levels, statuses, etc.)
│   │   └── db.js                     # Firebase Admin SDK initialisation (Firestore + Auth)
│   ├── controllers/
│   │   ├── adminController.js        # Admin stats, user listing, role management
│   │   ├── aiController.js           # Groq + Gemini dual-engine AI endpoints
│   │   ├── authController.js         # Register, login, Google OAuth, profile CRUD
│   │   ├── categoryController.js     # Category CRUD
│   │   └── taskController.js         # Task CRUD with overdue logic
│   ├── middlewares/
│   │   ├── authMiddleware.js         # Firebase ID token verification; requireAdmin / requireSuperAdmin guards
│   │   └── errorHandler.js           # Global Express error handler
│   ├── models/
│   │   ├── categoryModel.js          # Firestore read/write helpers for categories
│   │   ├── taskModel.js              # Firestore read/write helpers for tasks
│   │   └── userModel.js              # Firestore read/write helpers for users
│   ├── routes/
│   │   ├── adminRoutes.js            # GET /api/admin/users, /stats; PUT /api/admin/users/:uid/role
│   │   ├── aiRoutes.js               # POST /api/ai/prioritize, /next-task, /compare-prioritize, /compare-next-task
│   │   ├── authRoutes.js             # POST /api/auth/register, /login, /google; GET/PUT /api/auth/profile
│   │   ├── categoryRoutes.js         # CRUD /api/categories
│   │   └── taskRoutes.js             # CRUD /api/tasks
│   ├── tests/
│   │   ├── ai.test.js                # Jest tests for all four AI endpoints (mocked SDKs)
│   │   ├── api.test.js               # Jest integration tests for auth, task, and category routes
│   │   └── overdue.test.js           # Jest unit tests for overdue detection logic
│   ├── .env                          # Local environment variables (never commit)
│   ├── package.json
│   ├── server.js                     # Express entry point; Firestore health-check on GET /
│   └── serviceAccountKey.json        # Firebase service account key (never commit)
│
├── database/
│   ├── firestore.indexes.json        # Firestore composite index definitions
│   ├── firestore.rules               # Firestore security rules
│   ├── README.md                     # Database design notes
│   └── seed.js                       # Optional Firestore seed script
│
├── docs/
│   ├── database-design.md            # Firestore collection design and field definitions
│   └── frontend-backend-api-contract.md  # API request/response contracts
│
├── frontend/
│   ├── public/
│   │   └── assets/                   # Static images (logos, icons)
│   ├── src/
│   │   ├── assets/                   # Branding assets imported by React components
│   │   ├── components/
│   │   │   ├── ai/
│   │   │   │   ├── AINextTaskPanel.tsx       # "What Should I Do Next?" side-by-side panel
│   │   │   │   └── AIPrioritizePanel.tsx     # "AI Priority Analysis" side-by-side panel
│   │   │   ├── analytics/            # Charts and statistics components
│   │   │   ├── auth/                 # LoginPage, RegisterPage, ForgotPasswordPage
│   │   │   ├── calendar/             # Calendar view components
│   │   │   ├── common/               # Header, Sidebar, AdminSidebar, Footer, modals
│   │   │   ├── kanban/               # Kanban board components
│   │   │   └── tasks/                # TaskModal, TaskDetailModal, TaskTable, TaskFilters
│   │   ├── context/
│   │   │   ├── AuthContext.tsx       # Auth state; Firebase Auth listener; role management
│   │   │   ├── TaskContext.tsx       # Task CRUD state; overdue recalculation; session alerts
│   │   │   ├── ThemeContext.tsx      # Light/dark theme
│   │   │   └── ToastContext.tsx      # Global toast notification system
│   │   ├── pages/
│   │   │   ├── admin/                # AdminOverviewPage, UserManagementPage, AdminAllTasksPage,
│   │   │   │                         #   AdminReportsPage, AdminActivityLogsPage,
│   │   │   │                         #   CategoriesPrioritiesPage, AdminSettingsPage
│   │   │   └── user/                 # DashboardOverview, MyTasksPage, CalendarPage, KanbanPage,
│   │   │                             #   CompletedTasksPage, AnalyticsPage, NotificationsPage,
│   │   │                             #   SettingsPage, AIAssistantPage
│   │   ├── services/
│   │   │   ├── api.ts                # Axios/fetch wrappers for all backend API calls
│   │   │   └── firebase.ts           # Firebase client SDK init; signIn, register, logout helpers
│   │   ├── types/
│   │   │   └── index.ts              # Shared TypeScript types (Task, User, Notification, etc.)
│   │   ├── App.tsx                   # Root component; client-side routing via page state
│   │   ├── main.tsx                  # React DOM entry point
│   │   └── index.css                 # Global styles
│   ├── .env                          # Local frontend environment variables (never commit)
│   ├── .env.example                  # Frontend env template
│   ├── index.src.html                # Vite HTML entry (built to single index.html)
│   ├── package.json
│   ├── vercel.json                   # Vercel SPA rewrite rule
│   └── vite.config.ts                # Vite + React + Tailwind + singlefile config
│
├── .env.example                      # Root-level env template (backend variables)
├── .firebaserc                       # Firebase project alias
├── firebase.json                     # Firestore rules/indexes deployment config
└── README.md
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

```env
# Server
PORT=5000
NODE_ENV=development

# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-firebase-project-id
# Option A — base64-encoded service account JSON (recommended for Render / cloud)
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-service-account-json>
# Option B — local file path (for local development)
# FIREBASE_SERVICE_ACCOUNT_KEY_PATH=./serviceAccountKey.json

# Groq AI — https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here
# Optional: override default model (default: qwen/qwen3.8-27b with auto-fallback)
# GROQ_MODEL=qwen/qwen3.8-27b

# Google Gemini AI — https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here
# Optional: override default model (default: gemini-3.5-flash with lite/fallback variants)
# GEMINI_MODEL=gemini-3.5-flash

# CORS — restrict in production
# CORS_ORIGIN=https://your-frontend-domain.vercel.app
```

### Frontend (`frontend/.env`)

```env
# Backend API base URL
VITE_API_URL=http://localhost:5000/api

# Firebase Web App Configuration (Firebase Console → Project Settings → Your apps)
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Optional: Google OAuth Client ID (for Google Identity Services)
VITE_GOOGLE_CLIENT_ID=
```

> **Never commit `.env`, `backend/.env`, `frontend/.env`, or `serviceAccountKey.json` to version control.**

---

## 🔥 Firebase Setup

TaskFlow uses two Firebase SDKs:

| SDK | Used in | Purpose |
|---|---|---|
| **Firebase Admin SDK** (`firebase-admin`) | Backend | Verifying ID tokens, Firestore read/write, user management |
| **Firebase JS SDK** (`firebase`) | Frontend | Client-side Auth (sign-in, sign-up, token retrieval) |

### Steps

1. **Create a Firebase project** at [console.firebase.google.com](https://console.firebase.google.com).
2. **Enable Firestore** (Native mode) and **Firebase Authentication** (Email/Password + Google providers).
3. **Service account (backend)**
   - Go to Project Settings → Service Accounts → Generate new private key.
   - Save as `backend/serviceAccountKey.json` for local dev, **or** base64-encode and set as `FIREBASE_SERVICE_ACCOUNT` env var on Render.
4. **Web app config (frontend)**
   - Go to Project Settings → General → Your apps → Add Web App.
   - Copy the `firebaseConfig` values into `frontend/.env`.
5. **Deploy Firestore rules and indexes** (optional, using Firebase CLI):

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase deploy --only firestore
   ```

   The rules file is at [`database/firestore.rules`](database/firestore.rules) and indexes at [`database/firestore.indexes.json`](database/firestore.indexes.json).

---

## 🤖 AI Setup

The AI features require two separate API keys — one for each engine. Both are stored **only on the backend** and never sent to the browser.

### Groq
1. Sign up at [console.groq.com](https://console.groq.com).
2. Create an API key and add it as `GROQ_API_KEY` in `backend/.env`.
3. The backend defaults to `qwen/qwen3.8-27b` with automatic fallback through `llama-3.3-70b-versatile` → `llama-3.1-8b-instant`.

### Google Gemini
1. Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).
2. Add it as `GEMINI_API_KEY` in `backend/.env`.
3. The backend tries models in this order (fastest first): `gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-3.5-flash` → `gemini-3-flash-preview` → `gemini-3.7-flash` → `gemini-3.8-flash`.

---

## 🚀 Local Development

### Prerequisites

- Node.js 18+
- A Firebase project with Firestore and Authentication enabled
- Groq API key
- Google Gemini API key

### 1. Clone the repository

```bash
git clone https://github.com/your-org/taskflow.git
cd taskflow
```

### 2. Configure the backend

```bash
cd backend
cp ../.env.example .env
# Edit backend/.env — fill in FIREBASE_PROJECT_ID, FIREBASE_SERVICE_ACCOUNT (or place
# serviceAccountKey.json in backend/), GROQ_API_KEY, GEMINI_API_KEY
npm install
npm run dev        # starts on http://localhost:5000
```

### 3. Configure the frontend

```bash
cd frontend
cp .env.example .env
# Edit frontend/.env — fill in VITE_API_URL and all VITE_FIREBASE_* values
npm install
npm run dev        # starts on http://localhost:3000
```

### 4. Health check

Visit `http://localhost:5000/` — you should see:

```json
{ "success": true, "message": "TaskFlow Backend API is running!", "firebase": "connected" }
```

---

## 🧪 Running Tests

```bash
cd backend
npm test
# Runs Jest across tests/api.test.js, tests/ai.test.js, tests/overdue.test.js
# All SDK calls are mocked — no real API keys required for tests
# Expected: 78 tests pass
```

---

## 🏗️ Building for Production

```bash
cd frontend
npm run build
# TypeScript compile → Vite build → single self-contained index.html in dist/
```

---

## 🌐 API Reference

All routes (except `GET /`) require a valid Firebase ID token in the `Authorization: Bearer <token>` header.

### Auth — `/api/auth`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/register` | — | Register with email + password |
| `POST` | `/login` | — | Sign in with email + password |
| `POST` | `/google` | — | Sign in / register with Google ID token |
| `GET` | `/profile` | ✅ | Get current user's profile |
| `POST` | `/profile` | ✅ | Create user profile document in Firestore |
| `PUT` | `/profile` | ✅ | Update user profile (name, etc.) |

### Tasks — `/api/tasks`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | ✅ | Create a new task |
| `GET` | `/` | ✅ | Get all tasks for the authenticated user |
| `GET` | `/:id` | ✅ | Get a single task by ID |
| `PUT` | `/:id` | ✅ | Update a task |
| `DELETE` | `/:id` | ✅ | Delete a task |

### Categories — `/api/categories`

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/` | ✅ | Create a category |
| `GET` | `/` | ✅ | List user's categories |
| `GET` | `/:id` | ✅ | Get a category |
| `PUT` | `/:id` | ✅ | Update a category |
| `DELETE` | `/:id` | ✅ | Delete a category |

### AI — `/api/ai`

All AI endpoints require authentication and expect `{ "tasks": [...] }` in the request body.

| Method | Path | Description |
|---|---|---|
| `POST` | `/prioritize` | Groq-only: analyse tasks and return recommended priorities and ordering |
| `POST` | `/next-task` | Groq-only: return the single best task to focus on now |
| `POST` | `/compare-prioritize` | **Dual-engine**: run identical priority analysis on Gemini and Groq in parallel; return both results with Speed/Accuracy/Clarity metrics |
| `POST` | `/compare-next-task` | **Dual-engine**: run identical next-task recommendation on Gemini and Groq in parallel; return both results with Speed/Accuracy/Clarity metrics |

### Admin — `/api/admin` (Admin role required)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/users` | Admin | List all users |
| `GET` | `/stats` | Admin | Platform-wide statistics |
| `PUT` | `/users/:uid/role` | Super Admin | Change a user's role |

---

## 🚢 Deployment

### Frontend — Vercel

1. Connect your GitHub repository to [Vercel](https://vercel.com).
2. Set the **Root Directory** to `frontend`.
3. Vercel auto-detects Vite; the build command is `npm run build` and output directory is `dist`.
4. Add all `VITE_*` environment variables in Vercel → Project → Settings → Environment Variables.
5. The included [`frontend/vercel.json`](frontend/vercel.json) handles SPA client-side routing rewrites automatically.

### Backend — Render

1. Create a new **Web Service** on [Render](https://render.com) pointing to your repository.
2. Set the **Root Directory** to `backend`.
3. **Build command:** `npm install`
4. **Start command:** `node server.js`
5. Add all backend environment variables in Render → Environment:
   - `NODE_ENV=production`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_SERVICE_ACCOUNT` — paste the **base64-encoded** service account JSON (do not use the file path option on Render)
   - `GROQ_API_KEY`
   - `GEMINI_API_KEY`
   - `CORS_ORIGIN` — set to your Vercel frontend URL (e.g. `https://taskflow.vercel.app`)
6. Update `VITE_API_URL` in your Vercel environment variables to point at the Render backend URL.

---

## 🔒 Security Notes

- **Never commit** `backend/.env`, `frontend/.env`, or `backend/serviceAccountKey.json`.
- These files are excluded via `.gitignore`.
- All AI API keys live exclusively in `backend/.env` and are never sent to or exposed in the browser.
- Firestore Security Rules (see [`database/firestore.rules`](database/firestore.rules)) enforce that:
  - Users can only read and write their own tasks and categories.
  - Role elevation is not permitted via client-side writes.
- Firebase ID tokens are verified server-side on every protected request using the Admin SDK.

---

## 📄 Additional Documentation

- [`docs/database-design.md`](docs/database-design.md) — Firestore collection structure, field definitions, and data flow
- [`docs/frontend-backend-api-contract.md`](docs/frontend-backend-api-contract.md) — Detailed API request/response contracts
- [`database/README.md`](database/README.md) — Firestore rules and index explanations
