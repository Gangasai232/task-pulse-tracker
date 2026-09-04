# Project Plan & Time Breakdown

Total Time Spent: **12 hours** across 4 work sessions.

---

## 1. Work Sessions & Progress Log

### Session 1: Setup & Backend Core (2.5 hours)
- Designed Mongoose models for `User`, `Project`, `Task`, `ActivityLog`, and `AlertDismissal`.
- Built the task state machine helper (`stateMachine.js`) to handle allowed status steps and check for unfinished blocking dependencies.
- Created Express API routes for authentication (JWT + roles), project management, user management, and basic task CRUD.

### Session 2: Advanced APIs & Dashboard Metrics (3 hours)
- Added text search, status/assignee filtering, priority sorting, and pagination to `GET /api/tasks`.
- Built the bulk action processing endpoint (`/api/tasks/bulk`) to validate tasks in a loop and return itemized pass/fail results.
- Added dashboard statistics and 8-week completion trend calculations in `/api/dashboard/stats`.
- Built the overdue alert dismissal logic with due date tracking.
- Wrote initial database seeding scripts for demo data.

### Session 3: Frontend UI & Components (4.5 hours)
- Set up the React client using Vite, TailwindCSS, and custom dark glassmorphism styling (`index.css`).
- Built key UI components: Navbar (with overdue alerts badge), Sidebar, status badges, and priority badges.
- Created pages: `LoginPage` (with quick demo login buttons), `ProjectsPage`, `ProjectDetailPage` (with Kanban board & list view toggles), `AllTasksPage` (with search, filters, pagination, and bulk action bar), and `AdminConsole`.
- Created `TaskModal` with state transition buttons, blocking task alerts, and the activity log timeline.

### Session 4: Refactoring, Testing & Documentation (2 hours)
- Refactored route handlers into dedicated controllers under `server/controllers/`.
- Fixed deployment routing issues (added `vercel.json` SPA rewrites and server wildcard fallback).
- Tested state machine edge cases, role permissions, and bulk action error reports.
- Wrote project documentation (`architecture.md`, `schema.md`, `plan.md`, `decisions.md`, `ai-prompts.md`).

---

## 2. Building Strategy

1. **Backend First:** Built the database schemas, authentication middleware, and state machine validation on the server before starting the UI so business rules were enforced early.
2. **Core Task UI Second:** Built the Kanban board, project detail pages, and task modals next so I could test task state transitions visually.
3. **Search, Bulk Actions & Dashboard Third:** Built search/filtering, bulk action bars, and Recharts dashboard analytics once single-task features were solid.

---

## 3. Trade-offs & Scope Cuts

- **Explicit Buttons over Drag-and-Drop Library:** Used clear "Move to [Status]" buttons (which only show legal state machine steps) instead of a complex drag-and-drop library to prevent accidental illegal transitions.
- **In-App Overdue Badges over Email Sending:** Used real-time navbar badges and alert modals instead of setting up external SMTP email sending.
