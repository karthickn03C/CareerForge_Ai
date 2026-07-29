# CareerForge Ai 🚀
### AI-Powered Placement Preparation Platform

A multi-agent web app that helps students track placement preparation, identify weak areas, generate targeted practice questions, run mock interviews, and get a personalized day-by-day prep plan.

---

## 🤖 The 4 AI Agents

| Agent | Type | Purpose |
|-------|------|---------|
| **Progress Agent** | Pure Logic | Analyzes problem counts per topic, classifies as weak/moderate/strong |
| **Question Agent** | Gemini LLM | Generates a topic-specific MCQ with explanation |
| **Interview Agent** | Gemini LLM | Conducts a 2-phase mock interview: question → evaluate answer |
| **Planner Agent** | Gemini LLM | Creates a day-by-day or week-by-week prep plan based on weak topics |

---

## 🛠️ Tech Stack

- **Frontend**: React + Vite, Tailwind CSS, Recharts
- **Backend**: Node.js + Express
- **Database**: sql.js (pure-JS SQLite, file-backed)
- **AI**: Google Gemini API (`gemini-2.0-flash`)

---

## ⚡ Quick Start

### 1. Prerequisites
- Node.js v18+ 
- A [Google Gemini API key](https://aistudio.google.com/apikey) (free tier works)

### 2. Clone & install
```bash
git clone <repo>
cd PerpPilot
npm run install:all
```

### 3. Configure API key
Edit `backend/.env`:
```
GEMINI_API_KEY=your_actual_key_here
PORT=5000
```

### 4. Run
```bash
npm run dev
```
This starts:
- Backend at `http://localhost:5000`
- Frontend at `http://localhost:5173`

---

## 📱 Features

### Dashboard Tab
- Color-coded bar chart (🔴 weak / 🟡 moderate / 🟢 strong) per topic
- Add progress entries (topic, platform, count)
- Import from LeetCode by username (public GraphQL API)
- Stats cards: total problems, weak/moderate/strong counts

### Practice Tab
- Generate MCQs for your weakest topic (or custom topic + difficulty)
- 4-option multiple choice with labeled answer buttons
- Reveal correct answer + step-by-step explanation
- Session history with accuracy score

### Mock Interview Tab
- Toggle between **Technical** and **HR** mode
- Chat UI: AI asks question → you type answer → AI evaluates
- Score ring (0–10) with strengths, gaps, and model answer
- Past session history with average score

### My Plan Tab
- Set your placement drive date
- AI generates a day-by-day (≤14 days) or week-by-week plan
- Colorful animated vertical timeline
- Countdown timer showing days remaining

---

## 🗄️ Data Model

```sql
students          (id, name, target_date, created_at)
progress_entries  (id, student_id, topic, platform, problems_solved, date_added)
practice_questions(id, student_id, topic, question, options, correct_answer, explanation, created_at)
interview_sessions(id, student_id, mode, question, student_answer, score, strengths, gaps, better_answer, created_at)
plans             (id, student_id, plan_json, generated_at)
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/students` | List all students |
| POST | `/api/students` | Create student |
| GET | `/api/progress/:studentId` | Get progress + analysis |
| POST | `/api/progress/:studentId` | Add progress entry |
| POST | `/api/progress/:studentId/import-leetcode` | Import from LeetCode |
| POST | `/api/questions/:studentId/generate` | Generate MCQ (Gemini) |
| POST | `/api/interview/:studentId/start` | Start interview session (Gemini) |
| POST | `/api/interview/session/:id/answer` | Submit answer + get feedback (Gemini) |
| POST | `/api/planner/:studentId/generate` | Generate study plan (Gemini) |
| GET | `/api/health` | Server health check |

---

## 🎯 Demo Walkthrough

1. Create a student profile → Dashboard
2. Add progress: `Dynamic Programming: 5`, `Arrays: 30`, `Graph: 8`, `Sorting: 20`
3. View the bar chart — DP and Graph show as red (weak)
4. Practice tab → Generate Question → auto-selects DP (weakest) → answer MCQ
5. Interview tab → Technical mode → Start → answer → see score card
6. My Plan tab → set date 14 days out → Generate → see full timeline

---

*Built with ❤️ for placement season*
