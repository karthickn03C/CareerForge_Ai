# CareerForge AI 🚀
### AI-Powered Placement Command Center

> **Transform placement preparation from panic into precision — with real AI, real data, and real-time tracking.**

[![Vercel](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel)](https://career-forge-ai-git-main-karthickn03cs-projects.vercel.app)
[![Render](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render)](https://careerforge-ai-2bbv.onrender.com/api/health)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌐 Live Demo & Mobile App

| Service / Download | Link / Location |
|--------------------|-----------------|
| **Frontend Web App (Vercel)** | https://career-forge-ai-git-main-karthickn03cs-projects.vercel.app |
| **Backend API (Render)** | https://careerforge-ai-2bbv.onrender.com/api |
| **📱 Android APK Direct Download** | [**CareerForge_AI_v1.0_Release.apk**](./apk_download/CareerForge_AI_v1.0_Release.apk) |
| **📱 Alternative Root APK** | [**CareerForge_AI.apk**](./CareerForge_AI.apk) |
| **Health Check** | https://careerforge-ai-2bbv.onrender.com/api/health |

---

## 📱 Android Mobile Application (APK)

You can download and install the official **CareerForge AI Android App** directly from this repository:

- 📦 **Download APK File**: [`apk_download/CareerForge_AI_v1.0_Release.apk`](./apk_download/CareerForge_AI_v1.0_Release.apk) (**50.5 MB**)
- 🔗 **Direct Repository Download**: [`CareerForge_AI.apk`](./CareerForge_AI.apk)

### Features included in Mobile App:
- ✅ **Full Parity with Web App**: Student Login, Registration, ForgeMind AI, Resume Analyzer, Coding Practice, Mock Interview, Study Planner, and Opportunity Discovery.
- ✅ **Automatic Server Pre-Warmup**: Silently wakes up Render backend on app startup for instantaneous login responses.
- ✅ **Native Android Build**: Includes explicit `INTERNET` and `ACCESS_NETWORK_STATE` permissions.

---

## 🎯 What is CareerForge AI?

CareerForge AI is a full-stack, AI-powered placement preparation platform built for final-year engineering students. It combines a **Student Portal** for personalized AI coaching with a **Staff Portal** that gives placement officers real-time visibility into every student's readiness.

---

## ✨ Features

### 🎓 Student Portal
| Feature | Description |
|---------|-------------|
| **Dashboard** | Live placement readiness score — Resume, Coding, Interview, and Overall |
| **ForgeMind AI** | Personal AI mentor with persistent conversation memory |
| **Resume Analyzer** | ATS scoring, keyword gap analysis, and actionable feedback |
| **AI Coding Practice** | AI-generated problems by topic, difficulty, and language with auto-evaluation |
| **Mock Interview** | Technical & HR interview simulation with AI scoring and feedback |
| **Study Planner** | Company-weighted day-by-day or week-by-week AI roadmap |
| **Opportunities** | Curated placement drives filtered by readiness score |

### 👨‍💼 Staff Portal
| Feature | Description |
|---------|-------------|
| **Live Dashboard** | Real-time student roster with readiness scores and risk flags |
| **Activity Feed** | Live feed of all student activities via Server-Sent Events (SSE) |
| **ForgeMind Staff AI** | Query any student's full profile with AI-powered analysis |
| **Reports** | One-click CSV export of all student placement data |
| **Placement Drives** | Manage drives and see eligible student count per drive |

---

## 🤖 AI Agents

| Agent | Model | Purpose |
|-------|-------|---------|
| **ForgeMind Agent** | Groq LLaMA 3.3 70B | Personal AI mentor with context memory |
| **Resume Agent** | Groq LLaMA 3.1 8B | ATS scoring and resume feedback |
| **Interview Agent** | Groq LLaMA 3.3 70B | Mock interview Q&A and evaluation |
| **Coding Agent** | Groq LLaMA 3.3 70B | Code problem generation and evaluation |
| **Planner Agent** | Groq LLaMA 3.3 70B | Company-specific study plan generation |
| **Opportunity Agent** | Groq LLaMA 3.1 8B | Placement opportunity discovery |
| **Progress Agent** | Pure Logic | Topic weakness classification |

> All agents use multi-model fallback chains (llama-3.3-70b → llama-3.1-8b → gemma2-9b) for maximum reliability.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts |
| **Backend** | Node.js, Express.js |
| **Database** | sql.js (SQLite in WebAssembly, file-backed) |
| **Authentication** | JWT + bcryptjs |
| **AI** | Groq SDK (LLaMA 3.3 70B, LLaMA 3.1 8B, Gemma2 9B) |
| **Real-Time** | Server-Sent Events (SSE) |
| **Deployment** | Vercel (Frontend) + Render (Backend) |

---

## ⚡ Quick Start

### Prerequisites
- Node.js v18+
- A [Groq API key](https://console.groq.com) (free tier available)

### 1. Clone & Install
```bash
git clone https://github.com/karthickn03C/CareerForge_Ai.git
cd CareerForge_Ai
npm run install:all
```

### 2. Configure Environment

Create `backend/.env`:
```env
PORT=5000
GROQ_API_KEY=your_groq_api_key_here
JWT_SECRET=your_jwt_secret_here
```

Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000
```

### 3. Run Locally
```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
cd frontend && npm run dev
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:5000/api

---

## 🔑 Default Staff Accounts

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@careerforge.ai | Admin@123 |
| Placement Officer | placement@careerforge.ai | Placement@123 |
| HOD | hod@careerforge.ai | HOD@123 |
| Faculty | faculty@careerforge.ai | Faculty@123 |

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health check |
| POST | `/api/auth/register` | Student / Staff registration |
| POST | `/api/auth/login` | Authentication + JWT |
| GET | `/api/students/:id` | Student profile |
| GET | `/api/students/staff/analytics` | Staff dashboard data |
| GET | `/api/students/staff/activity-feed` | Real-time activity feed |
| POST | `/api/forgemind/:id/chat` | ForgeMind AI chat |
| POST | `/api/resume/:id/upload` | Resume upload + ATS analysis |
| POST | `/api/interview/:id/start` | Start mock interview |
| POST | `/api/interview/session/:id/answer` | Submit interview answer |
| POST | `/api/planner/:id/generate` | Generate study plan |
| GET | `/api/opportunities/:id/saved` | Get opportunities |
| POST | `/api/students/:id/preppilot-history` | Log coding solved problem |
| GET | `/api/reports/download/csv` | Download CSV report |
| GET | `/api/events` | SSE real-time event stream |

---

## 📊 Scoring Model

All scores are computed from **real student activity** logged in the database:

| Score | Computed From |
|-------|--------------|
| **Resume Score** | ATS analysis of uploaded resume |
| **Coding Score** | Problems solved, weighted by difficulty (Easy×1, Medium×2.5, Hard×5) |
| **Interview Score** | Average AI score across mock interview sessions |
| **Placement Readiness** | Weighted average: Resume×35% + Coding×45% + Interview×20% |

---

## 📁 Project Structure

```
CareerForge_Ai/
├── backend/
│   ├── agents/          # AI agent modules (ForgeMind, Resume, Interview, etc.)
│   ├── db/              # Database init, schema, helper functions
│   ├── routes/          # Express API routes
│   ├── server.js        # Entry point
│   └── .env.example     # Environment variable template
├── frontend/
│   ├── src/
│   │   ├── pages/       # React page components
│   │   ├── components/  # Shared UI components
│   │   └── api/         # API client helpers
│   └── index.html
└── README.md
```

---

## ✅ QA Status

All 17 automated integration tests pass with **100% pass rate**:

- ✅ Server Health
- ✅ Student Register + DB Verification
- ✅ Student Login + JWT
- ✅ Dashboard Profile Fetch
- ✅ ForgeMind AI Chat + Memory
- ✅ Resume Upload + ATS Scoring
- ✅ Coding Problem Submit + Score
- ✅ Mock Interview Start + Evaluate
- ✅ Study Planner Generate + Store
- ✅ Opportunities Discovery
- ✅ Staff Login (Role: staff)
- ✅ Staff Analytics + Roster
- ✅ Real-Time Activity Feed (SSE)
- ✅ ForgeMind Staff AI Profile Lookup
- ✅ CSV Report Download

---

*Built with ❤️ for placement season — by Karthick Naveen S*
