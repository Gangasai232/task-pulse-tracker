# AI Prompts & Workflow Log

This document records the prompt sequence used with Antigravity AI to plan, scaffold, implement, and refine the TaskPulse application.

---

## 1. System Planning & Architecture Prompt
- **Prompt:**
  > "Review the task tracker requirements in README.md. Generate an implementation plan using the MERN stack with MongoDB schemas, state machine transition rules, audit log schema, and step-by-step implementation milestones."
- **Outcome:** Created structured design plan covering 10 functional requirements and documentation stubs.

---

## 2. Backend & State Machine Generation Prompt
- **Prompt:**
  > "Create the Express server, Mongoose models (User, Project, Task, ActivityLog, AlertDismissal), and stateMachine.js utility enforcing lifecycle transitions (Backlog -> In Progress -> In Review -> Done, Blocked) and blocking task checks."
- **Outcome:** Successfully scaffolded database schemas and server validation rules.

---

## 3. Prompt with Initial Bad Output & Correction (Reversal Example)
- **Initial Prompt:**
  > "Implement bulk task updates using Mongoose `updateMany()` for maximum performance."
- **Issue Discovered:**
  > Using `updateMany()` updated all tasks atomically, bypassing individual task state machine checks and failing to return itemized pass/fail reports per task (violating Requirement 7).
- **Correction Prompt:**
  > "Refactor `/api/tasks/bulk` to process tasks individually in a loop, running `validateStatusTransition` and `checkUnfinishedBlockingTasks` per item, and return a structured array of `{ taskId, success, error }` results."
- **Outcome:** Corrected implementation to provide detailed per-task pass/fail outcome reporting.

---

## 4. React UI & Glassmorphism Design Prompt
- **Prompt:**
  > "Build Vite React components with a modern dark-mode glassmorphism design system. Include Navbar with overdue alert counter, Sidebar, Board/List view toggle, TaskModal with timeline, and AllTasksPage with server pagination."
- **Outcome:** Produced responsive UI with high visual polish, Recharts graphs, and modal workflows.
