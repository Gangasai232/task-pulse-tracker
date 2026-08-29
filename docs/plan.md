# Project Plan & Time Breakdown

## 1. Work Session Breakdown

The project implementation was structured into 4 sequential sessions across a 12-hour budget:

### Session 1: Architecture & Backend Foundation (Estimated: 3h | Actual: 2.5h)
- Designed MongoDB schemas (`User`, `Project`, `Task`, `ActivityLog`, `AlertDismissal`).
- Implemented state machine engine (`stateMachine.js`) with illegal status jump validation and blocking dependency validation.
- Built Express REST endpoints for Auth (JWT + RBAC), Projects, Tasks, and Users.

### Session 2: Advanced Backend APIs & Data Seeding (Estimated: 3h | Actual: 3h)
- Implemented server-side pagination, regex search, multi-field filtering, and sorting for `/api/tasks`.
- Built bulk action processing engine returning itemized pass/fail reports (`/api/tasks/bulk`).
- Built dashboard aggregation metrics and 8-week weekly completion trend statistics (`/api/dashboard/stats`).
- Implemented overdue alert dismissal logic with automatic re-trigger on due date edits.
- Wrote automated data seeding script (`scripts/seed.js`) generating realistic multi-project demo dataset.

### Session 3: Modern React UI & State Integration (Estimated: 4h | Actual: 4.5h)
- Scaffolded Vite + React SPA with dark mode glassmorphism design system in `index.css`.
- Built reusable UI components: `Navbar` (with overdue alert counter badge), `Sidebar`, `StatusBadge`, `PriorityBadge`.
- Built `LoginPage` with 1-click Quick Demo Account login buttons.
- Built `ProjectsPage` with grid view, archive toggle, and project modal.
- Built `ProjectDetailPage` with Kanban Board vs List View toggle and task creation form.
- Built `AllTasksPage` with server search/filter bar, pagination controls, CSV export, and `BulkActionBar`.
- Built `TaskModal` with state machine transition buttons, blocking task indicators, and append-only activity timeline history.

### Session 4: Testing, Verification & Documentation (Estimated: 2h | Actual: 2h)
- Conducted end-to-end verification of state machine rejection rules, bulk action edge cases, and role restrictions.
- Authored technical documentation files in `docs/` (`architecture.md`, `schema.md`, `plan.md`, `decisions.md`, `ai-prompts.md`).
- Completed `SUBMISSION.md`.

---

## 2. Order of Building & Rationale

1. **Database Schemas & State Machine First:** Enforcing transition logic on the server before building UI ensured that validation rules could not be bypassed by client state.
2. **Backend API & Seeding Second:** Having a populated backend allowed immediate visual verification when building React UI components.
3. **Core Task UI Third:** Building Kanban boards and detail drawers next allowed testing complex task lifecycles visually.
4. **Search, Bulk Actions & Dashboard Analytics Fourth:** Built once core single-task workflows were stable.

---

## 3. Scope Cuts & Trade-offs

- **Drag-and-Drop Board Animation:** Drag-and-drop library integration was deferred in favor of clear, explicit "Move to [Status]" buttons that render only legal transitions.
- **Email Digest:** Replaced with in-app real-time overdue alerts badge counter to avoid third-party SMTP API dependencies.
