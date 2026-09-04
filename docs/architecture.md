# Application Architecture

This document explains how TaskPulse is structured and how its different components work together.

---

## 1. Overview

TaskPulse is built using the MERN stack:
- **Frontend:** React (Vite) with TailwindCSS for styling and Recharts for dashboard analytics graphs.
- **Backend:** Node.js with Express.js for the REST API endpoints.
- **Database:** MongoDB with Mongoose ORM (plus an in-memory MongoDB fallback for local testing without setup).

---

## 2. Main Parts of the System

### Frontend (React Single-Page App)
The frontend handles all UI rendering and user interactions:
- **Pages & Views:** Login page, Dashboard analytics, Projects list, Project detail view, All tasks view, My tasks view, Users page, and System Admin Console.
- **State & Session:** Uses `AuthContext` to manage user login state and store the JWT token in `localStorage`.
- **API Calls:** Sends HTTP requests to the Node API using Axios with automatic JWT header attachment.

### Backend (Node.js + Express API)
The backend handles business logic, security, and database operations:
- **Controllers & Routes:** Divided into separate controller files (`auth`, `user`, `project`, `task`, `dashboard`) and route definitions.
- **Authentication & Permissions:** JWT middleware authenticates requests and checks user roles (`ADMIN`, `MANAGER`, `MEMBER`).
- **State Machine Rules (`utils/stateMachine.js`):** Enforces allowed task workflow paths (`BACKLOG` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`, plus `BLOCKED` handling). It also checks for unfinished blocking dependencies before allowing a task to be marked as `DONE`.

### Database (MongoDB + Mongoose Schemas)
The database stores data across 5 main collections:
- **Users:** Account information, bcrypt-hashed passwords, roles, and avatar URLs.
- **Projects:** Project key (e.g., `MOBILE`), name, description, owner ID, and member IDs.
- **Tasks:** Task number, title, description, priority, status, previous status, due date, assigned user IDs, and blocking task IDs.
- **ActivityLogs:** Append-only timeline history recording task creation, field edits (`oldValue` vs `newValue`), status transitions, user assignments, and comments.
- **AlertDismissals:** Tracks which overdue alerts users have dismissed so they don't keep reappearing unless the due date changes.

---

## 3. How Data Flows (Example: Updating a Task to 'Done')

Here is what happens step-by-step when a user changes a task status to **Done**:

1. **User Action:** The user clicks "Move to Done" inside the Task Modal in their browser.
2. **HTTP Request:** React sends a `PUT /api/tasks/:id` request with `{ status: "DONE" }` and the user's JWT token in the Authorization header.
3. **Authentication:** Express checks the JWT token using `authMiddleware`. If valid, it attaches the user details to `req.user`.
4. **Access Check:** The controller checks if the user is a manager, admin, or an assigned project member.
5. **State Machine Validation:** The server calls `validateStatusTransition` to verify if moving from the current status to `DONE` is a legal step.
6. **Blocking Dependencies Check:** The server queries MongoDB to confirm all tasks in `blockingTasks` are already set to `DONE`. If any blocker is unfinished, the backend rejects the request with a detailed error listing the blocking tasks.
7. **Database Update & Activity Log:** If valid, `task.status` updates to `DONE`, and a new entry is created in `ActivityLog` recording who completed the task and when.
8. **UI Response:** The server returns the updated task object, and React updates the Kanban board, task lists, and dashboard metrics.

---

## 4. Key Design Choices

- **REST API over WebSockets:** Used HTTP REST endpoints and state refresh triggers instead of WebSockets to keep server infrastructure stateless and easy to deploy on free hosting tiers (Render & Vercel).
- **Append-Only History Logs:** Activity logs are strictly created and never edited or deleted, preserving a clear audit trail of all task modifications.
