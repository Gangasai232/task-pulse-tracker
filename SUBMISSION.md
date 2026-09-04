# Submission

## Links

- **GitHub repository:** https://github.com/Gangasai232/task-pulse-tracker
- **Live application:** https://task-pulse-tracker.vercel.app

## Notes for the reviewer

The server features an automatic in-memory MongoDB fallback when no external database URI is configured, allowing immediate full-stack execution out of the box (`npm start` or `npm run dev`). On first boot, the server automatically seeds realistic demo data including projects, tasks, blocking dependencies, overdue tasks, and historical 8-week completions.

## Deployment credentials

| Role | Email | Password |
|------|-------|----------|
| **System Admin** | `admin@acme.com` | `12345678` |
| **Manager (Ganga Sai)** | `gangasai@gmail.com` | `12345678` |
| **Manager (Koushik)** | `koushik@gmail.com` | `12345678` |
| **Member (Harish)** | `harish@gmail.com` | `12345678` |
| **Member (Manideep)** | `manideep@gmail.com` | `12345678` |
| **Member (Vishnu)** | `vishnu@gmail.com` | `12345678` |

## Stack

| Layer | What you used | Why |
|-------|---------------|-----|
| Frontend | React 18 + Vite, TailwindCSS, Recharts, Lucide Icons | High-performance SPA with modern glassmorphism aesthetics and responsive chart rendering. |
| Backend | Node.js + Express.js, JWT, bcryptjs | Lightweight, fast REST API framework with modular middleware routing. |
| Database | MongoDB + Mongoose ORM (with MongoMemoryServer fallback) | Schema-validated document database for rich JSON task timelines and multi-assignee arrays. |
| Hosting | Render (Server API) + Vercel (React Client) | Standard free-tier hosting for Node API and static React SPA. |

## Goal checklist

| # | Goal | Status | Notes |
|---|------|--------|-------|
| 1 | Accounts and roles | Done | Enforced on server via JWT RBAC middleware (`requireRole('MANAGER')`). |
| 2 | Projects | Done | CRUD for projects with unique keys, member management, and archive/restore toggle. |
| 3 | Tasks inside projects | Done | Tasks with priority, due date, description, and blocking dependency references. |
| 4 | Task lifecycle with rules | Done | Server state machine validates transitions (`Backlog → In Progress → In Review → Done`, `Blocked`), checks unfinished dependencies, and returns explanatory rejection messages. |
| 5 | Assignment | Done | Only project members can be assigned. Removing a member from a project automatically unassigns them from its tasks. "My Tasks" view across projects. |
| 6 | Finding things | Done | Server-side text search, project/status/assignee/priority/overdue filtering, sorting, and pagination with total match counts. |
| 7 | Acting on many tasks at once | Done | Multi-select bulk action bar with per-task pass/fail outcome report modal + CSV export. |
| 8 | Dashboard | Done | Headline counts, status pie chart, assignee workload bar chart, and 8-week completion trend area chart. |
| 9 | History you cannot rewrite | Done | Append-only task timeline recording creation, field delta edits, status transitions, assignment changes, and comments. No edit/delete endpoints exist. |
| 10 | Overdue alerts | Done | Nav badge counter & alert list for overdue unfinished tasks. Dismissible by assignees; automatically reappears if due date is altered. |

## How much time did you actually spend?
12 hours total across 4 structured sessions.

## What would you do next, with another 12 hours?
1. Implement real-time task status updates using Socket.io so team members see changes instantly.
2. Add interactive drag-and-drop task card reordering on the Kanban board.
3. Add automated email notifications (using Nodemailer) when a task is assigned or becomes overdue.

## What are you least happy with in this codebase, and why?
In-memory client-side CSV formatting for very large datasets: while it works seamlessly for filtered queries under pagination limits, server-streaming CSV generation would be more efficient for export datasets over 100,000 tasks.
