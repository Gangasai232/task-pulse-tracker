# Architecture

## 1. System Components & High-Level Topology

The TaskPulse platform is architected as a decoupled, multi-tier full-stack MERN application (MongoDB, Express, React, Node.js):

- **Browser Tier (React + Vite SPA):** 
  - Written in modern React (Vite bundler, React Router v6, TailwindCSS, Recharts).
  - Handles client-side routing, interactive Kanban board drag-and-drop mechanics, real-time status badge indicators, and dynamic chart rendering.
  - Communicates asynchronously with the backend REST API over HTTPS/JSON using Axios with Bearer JWT interceptors.

- **Application API Tier (Node.js + Express):**
  - Runs on Express.js providing RESTful endpoints for Authentication, Projects, Tasks, Dashboard Aggregations, Activity History, and Overdue Alerts.
  - **Security & Authorization Middleware:** Validates JWT access tokens on every request and enforces Role-Based Access Control (RBAC) separating `MANAGER` vs `MEMBER` capabilities server-side.
  - **State Machine & Rules Engine (`stateMachine.js`):** Enforces mandatory task lifecycle state transitions (`Backlog → In Progress → In Review → Done`, `Blocked`), dependency completion validation, and illegal status jump rejections.

- **Database Tier (MongoDB + Mongoose ORM):**
  - Schema-enforced document storage for Users, Projects, Tasks, Activity Logs, and Alert Dismissals.
  - Leverages compound indexes (`{ project: 1, taskNum: 1 }`, `{ user: 1, task: 1 }`) for fast querying, server-side pagination, text search over titles/descriptions, and multi-field filtering.

---

## 2. End-to-End Request Path: Transitioning a Task to 'Done'

Here is the exact request lifecycle when a user attempts to complete a task:

1. **User Action (Browser):**
   - The user clicks "Move to Done" on a task detail modal in React.
   - The client dispatches a `PUT /api/tasks/:id` HTTP request with `{ status: "DONE" }` and the user's JWT in `Authorization: Bearer <token>`.

2. **Authentication & RBAC (`authMiddleware`):**
   - Express intercepts the request, verifies the JWT signature, resolves `req.user`, and verifies whether the user is a manager or an assigned project member. If invalid, returns `401 Unauthorized` or `403 Forbidden`.

3. **State Machine & Legal Move Validation (`utils/stateMachine.js`):**
   - The server inspects `task.status` (e.g. `IN_PROGRESS` or `IN_REVIEW`).
   - Checks `validateStatusTransition()` matrix. If illegal (e.g. direct jump from `BACKLOG` to `DONE`), rejects immediately with `400 Bad Request` and descriptive error message.

4. **Blocking Dependency Check (`checkUnfinishedBlockingTasks`):**
   - The server queries `Task.find({ _id: { $in: task.blockingTasks } })`.
   - If any blocking task has `status !== 'DONE'`, execution halts and returns `400 Bad Request` with an explicit reason string listing the blocking task keys and titles.

5. **Database Mutation & Append-Only History Logging:**
   - If valid, `task.status` is updated to `'DONE'`, and `task.previousStatus` is cleared.
   - An immutable timeline document is inserted into `ActivityLog`: `{ task, actor: user._id, type: 'STATUS_CHANGE', details: { oldVal: 'IN_PROGRESS', newVal: 'DONE' } }`.

6. **Client UI Update:**
   - The server returns `200 OK` with updated task payload including legal transitions. The React SPA re-renders the task board, updates dashboard velocity counts, and refreshes overdue counters.

---

## 3. What We Decided Not to Build (Deliberate Out-of-Scope Decisions)

1. **WebSockets for Real-time Push Notifications:** Polling-on-demand and state re-fetching on user interaction was selected over WebSocket connections to keep infrastructure stateless and simple for free-tier hosting deployment.
2. **Hard Cascading Task Deletions:** Deleting a project cascades unassignments cleanly but preserves history; raw database cascade hard-deletes were omitted to guarantee audit integrity.
