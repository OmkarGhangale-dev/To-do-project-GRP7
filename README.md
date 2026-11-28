# TaskFlow — Smart AI Task Manager

TaskFlow is a modern, responsive task management and productivity application powered by **Google Gemini API** and **Groq API** for intelligent task prioritization and next-task recommendations side by side.

---

## 🛠️ Technology Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Lucide Icons
- **Backend:** Node.js, Express.js
- **Database & Auth:** Firebase Firestore & Firebase Authentication
- **AI Engines:**
  - **Google Gemini API** (`@google/generative-ai` — `gemini-3.5-flash`)
  - **Groq API** (`groq-sdk` — `qwen/qwen3.8-27b`)

---

## ✨ Key Features

- **Side-by-Side AI Comparison (`Gemini` vs `Groq`)**:
  - **What Should I Do Next?**: Sends identical task lists simultaneously to Google Gemini and Groq, displaying each model's recommended next task, urgency score, **Speed (time taken)**, **Accuracy**, and **Clarity** side by side.
  - **AI Priority Analysis**: Compares priority rankings (`High`, `Medium`, `Low`) and execution order from both Gemini and Groq side by side with **Speed**, **Accuracy**, and **Clarity** scores, plus independent **Apply** buttons.
  - **Independent Error Handling**: If one API fails, the other continues seamlessly.
- **Website-Entry Notification Alerts**:
  - Automatically alerts users upon entering the website about **overdue tasks** and **high-priority / urgent tasks** via both toast popups and the in-app Notification Centre.
- **Time-Aware Overdue Detection**:
  - Evaluates deadlines in real time across Firebase Timestamps, ISO strings, and local timezones.

---

## ⚙️ Environment Setup

Copy `.env.example` to `backend/.env` and configure your keys:

```env
PORT=5000
FIREBASE_PROJECT_ID=your-firebase-project-id

# Groq AI — https://console.groq.com/keys
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=qwen/qwen3.8-27b

# Google Gemini AI — https://aistudio.google.com/apikey
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

---

## 🚀 Running Locally

### Backend
```bash
cd backend
npm install
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Running Tests
```bash
cd backend
npm test
```
