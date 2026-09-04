# Database Schemas & Data Models

This document explains the MongoDB database structure for TaskPulse, how models relate to each other, and how validation rules are handled.

---

## 1. Collections & Models

### `users` Collection
Stores user accounts and login credentials.
- `_id`: ObjectId (Primary key)
- `name`: String (Required, trimmed)
- `email`: String (Required, unique, lowercase)
- `password`: String (Required, bcrypt hash)
- `role`: String (`ADMIN`, `MANAGER`, or `MEMBER`, default: `MEMBER`)
- `avatarUrl`: String (Profile picture link)
- `timestamps`: `createdAt` and `updatedAt`

### `projects` Collection
Stores software projects created by managers.
- `_id`: ObjectId
- `key`: String (Required, unique, uppercase, e.g. `MOBILE` or `PAY`)
- `name`: String (Required, trimmed)
- `description`: String
- `owner`: ObjectId (References `User` model, required)
- `members`: Array of ObjectIds (References `User` model)
- `archived`: Boolean (Default: `false`)
- `timestamps`: `createdAt` and `updatedAt`

### `tasks` Collection
Stores individual tasks belonging to a project.
- `_id`: ObjectId
- `project`: ObjectId (References `Project` model, required)
- `taskNum`: Number (Sequential task number per project, e.g. 1, 2, 3)
- `title`: String (Required, trimmed)
- `description`: String
- `priority`: String (`LOW`, `MEDIUM`, `HIGH`, `URGENT`, default: `MEDIUM`)
- `status`: String (`BACKLOG`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `BLOCKED`, default: `BACKLOG`)
- `previousStatus`: String (Stores previous status when a task is blocked)
- `dueDate`: Date (Optional due date)
- `assignees`: Array of ObjectIds (References `User` model)
- `blockingTasks`: Array of ObjectIds (References other `Task` models in the same project)
- `timestamps`: `createdAt` and `updatedAt`

### `activitylogs` Collection (Timeline)
Stores the append-only timeline history of all task events.
- `_id`: ObjectId
- `task`: ObjectId (References `Task` model, required)
- `actor`: ObjectId (References `User` model who made the change, required)
- `type`: String (`CREATED`, `STATUS_CHANGE`, `FIELD_CHANGE`, `ASSIGNED`, `UNASSIGNED`, `COMMENT`)
- `field`: String (Name of updated field, if applicable)
- `oldValue`: Mixed (Value before the edit)
- `newValue`: Mixed (Value after the edit)
- `targetUser`: ObjectId (References `User` model for assignment changes)
- `comment`: String (Comment text, if type is `COMMENT`)
- `details`: Object (Additional context metadata)
- `timestamps`: `createdAt` and `updatedAt`

### `alertdismissals` Collection
Tracks overdue alert dismissals per user.
- `_id`: ObjectId
- `user`: ObjectId (References `User` model, required)
- `task`: ObjectId (References `Task` model, required)
- `dismissedAtDueDate`: Date (Task's due date when dismissed)

---

## 2. Relationships Between Models

- **User & Project:** A user can own multiple projects (One-to-Many). A project can have multiple assigned members (Many-to-Many).
- **Project & Task:** A project contains multiple tasks (One-to-Many).
- **Task & User:** A task can be assigned to multiple users (Many-to-Many).
- **Task & Task (Blocking Dependencies):** A task can depend on other tasks within the same project (Self-referential Many-to-Many).
- **Task & ActivityLog:** A task has many timeline history logs (One-to-Many).

---

## 3. Database vs. Backend Validation Rules

### Handled by MongoDB / Mongoose Schema:
- Unique constraints on `user.email` and `project.key`.
- Compound unique index on `alertdismissals` (`{ user: 1, task: 1 }`).
- Field types, default values, and enum values.

### Handled in Express Backend Code:
- **Task State Machine Rules:** Allowed transitions (`BACKLOG` → `IN_PROGRESS` → `IN_REVIEW` → `DONE`) are checked in `server/utils/stateMachine.js`.
- **Unfinished Blocking Dependencies:** Checking that all tasks in `blockingTasks` are `DONE` before marking a task as `DONE`.
- **Assignee Project Membership Check:** Ensuring only users listed in `project.members` can be assigned to a task.
- **Auto-Unassign on Member Removal:** Removing a member from a project automatically clears them from tasks in that project.

---

## 4. Key Performance Choices

- **`previousStatus` on Task:** Stored directly on the task document so unblocking a task doesn't require searching through past activity logs.
- **`dismissedAtDueDate` on AlertDismissal:** Saved at dismissal time so comparing timestamps is fast without extra database lookups.
