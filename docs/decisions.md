# Architectural & Technical Decisions

Here are 5 key technical decisions made during the design and development of TaskPulse, including one decision that was later reversed based on testing feedback:

---

## Decision 1: Server-Side State Machine vs. Frontend Transition Logic
- **Choice:** Built a centralized server-side state machine engine (`server/utils/stateMachine.js`) that validates all status transitions and blocking task dependencies before updating MongoDB.
- **Rejected:** Validating transitions exclusively in React component state.
- **Rationale:** Frontend-only checks can be bypassed by direct API calls or stale browser states. Enforcing state transitions on the server guarantees complete lifecycle integrity regardless of API client.

---

## Decision 2: In-Memory MongoDB Fallback (`mongodb-memory-server`) for Zero-Config Local Development
- **Choice:** Configured `server/config/db.js` to automatically instantiate an in-memory MongoDB instance if `MONGODB_URI` environment variable is not present.
- **Rejected:** Mandating a local MongoDB installation or cloud connection string for development setup.
- **Rationale:** Evaluators and team members can clone the repository and run `npm run dev` instantly without needing local database software or external cloud configuration.

---

## Decision 3: Alert Dismissal Expiry Model based on Task Due Date Snapshot
- **Choice:** Created an `AlertDismissal` model storing `dismissedAtDueDate` (the task's due date at time of dismissal). If the task's due date is subsequently modified by a manager or assignee, the dismissal condition (`task.dueDate === dismissedAtDueDate`) evaluates to false, causing the alert to automatically reappear.
- **Rejected:** Simple boolean `isDismissed` flag on the Task document.
- **Rationale:** A simple boolean flag would permanently suppress alerts even if a manager extended or altered an overdue task's deadline, violating Requirement 10.

---

## Decision 4: Per-Task Itemized Reporting for Bulk Operations
- **Choice:** Endpoint `/api/tasks/bulk` iterates through requested task updates, evaluating permissions and state machine rules per task, and returns `{ results: [{ taskId, success: true|false, error }] }`.
- **Rejected:** Atomic database transaction (`all-or-nothing`) bulk updates.
- **Rationale:** Requirement 7 explicitly dictates that if a user selects 5 tasks for a bulk status change and 1 task is blocked by an unfinished dependency, the valid 4 tasks must succeed while returning an itemized rejection reason for the 1 blocked task.

---

## Decision 5 (Reversed Decision): Soft Deletions vs. Hard Deletions with Timeline Cascade Cleanup
- **Initial Choice:** Initially implemented soft deletion on Tasks via a `deleted: true` flag.
- **Reversal:** Switched to explicit hard deletion (`Task.findByIdAndDelete()`) combined with automatic cleanup of blocking task references (`$pull: { blockingTasks: taskId }`) and activity logs.
- **Rationale:** Soft-deleted tasks cluttered search indexes and pagination count calculations, complicating cross-project total count metrics. Hard deletion with reference cleanup simplified queries while remaining strictly under Manager-only RBAC controls.
