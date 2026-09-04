# Key Design Decisions

Here are 5 key technical choices and trade-offs I made while building TaskPulse, including one decision I changed my mind about during development.

---

## 1. Validating Task Rules on the Server (Not just Frontend)
- **What I chose:** I wrote a server-side state machine helper (`server/utils/stateMachine.js`) that checks all status transitions and blocking dependency rules before saving changes to MongoDB.
- **Why:** If I only checked status rules in React, someone could bypass the rules using direct API requests or Postman. Putting the validation on the backend ensures task lifecycle rules (`BACKLOG` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`, and `BLOCKED`) are always enforced.

---

## 2. In-Memory MongoDB Fallback for Quick Local Testing
- **What I chose:** I configured `server/config/db.js` so that if `MONGODB_URI` is not set in `.env`, the server automatically starts an in-memory MongoDB database (`mongodb-memory-server`).
- **Why:** Anyone cloning the repository can run `npm start` immediately without needing to set up a local MongoDB installation or cloud database credentials beforehand.

---

## 3. How Overdue Alert Dismissals Work
- **What I chose:** Instead of using a simple `isDismissed = true` boolean flag, I created an `AlertDismissal` model that saves the exact due date at the time the user dismissed the alert (`dismissedAtDueDate`).
- **Why:** If a manager changes the due date on an overdue task later, a simple boolean flag would keep the alert hidden forever. By comparing due date timestamps, the alert automatically reappears if the due date is modified.

---

## 4. Itemized Pass/Fail Results for Bulk Task Actions
- **What I chose:** In `/api/tasks/bulk`, the server processes selected tasks one by one in a loop, runs state machine checks on each, and returns a structured result array (`[{ taskId, success, error }]`).
- **Why:** If a user selects 5 tasks for a bulk status update and 1 task is blocked by an unfinished dependency, the 4 valid tasks still succeed while displaying a clear error message for the 1 blocked task in the UI modal.

---

## 5. Decision I Changed: Hard Deletes with Reference Cleanup (Replaced Soft Deletes)
- **First approach:** Originally, I considered using soft deletes (`deleted: true`) for tasks.
- **Why I changed it:** Soft-deleted tasks complicated pagination metrics, text search, and total count calculations in MongoDB queries. I switched to explicit hard deletes (`Task.findByIdAndDelete()`) while automatically cleaning up any references in `blockingTasks` arrays and `ActivityLog` entries.
