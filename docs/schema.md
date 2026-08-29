# Schema Documentation

## 1. Collections, Columns & Field Types

### `users` Collection
| Field | Type | Options / Constraints |
|---|---|---|
| `_id` | ObjectId | Primary Key |
| `name` | String | Required, Trimmed |
| `email` | String | Required, Unique, Lowercase, Indexed |
| `password` | String | Required (bcrypt hash) |
| `role` | String | Enum `['MANAGER', 'MEMBER']`, Default `'MEMBER'` |
| `avatarUrl` | String | Default picture URL |
| `createdAt` / `updatedAt` | Date | Managed by Mongoose timestamps |

### `projects` Collection
| Field | Type | Options / Constraints |
|---|---|---|
| `_id` | ObjectId | Primary Key |
| `key` | String | Required, Unique, Uppercase, Max length 10 |
| `name` | String | Required, Trimmed |
| `description` | String | Default `""` |
| `owner` | ObjectId | Ref `User`, Required |
| `members` | Array<ObjectId> | Ref `User` |
| `archived` | Boolean | Default `false`, Indexed |
| `createdAt` / `updatedAt` | Date | Managed by Mongoose timestamps |

### `tasks` Collection
| Field | Type | Options / Constraints |
|---|---|---|
| `_id` | ObjectId | Primary Key |
| `project` | ObjectId | Ref `Project`, Required, Indexed |
| `taskNum` | Number | Auto-incrementing integer per project |
| `title` | String | Required, Trimmed |
| `description` | String | Default `""` |
| `priority` | String | Enum `['LOW', 'MEDIUM', 'HIGH', 'URGENT']` |
| `status` | String | Enum `['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED']` |
| `previousStatus` | String | Enum `['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', null]` |
| `dueDate` | Date | Optional, Indexed |
| `assignees` | Array<ObjectId> | Ref `User` |
| `blockingTasks` | Array<ObjectId> | Ref `Task` (Same project) |
| `createdAt` / `updatedAt` | Date | Managed by Mongoose timestamps |

### `activitylogs` Collection (Timeline)
| Field | Type | Options / Constraints |
|---|---|---|
| `_id` | ObjectId | Primary Key |
| `task` | ObjectId | Ref `Task`, Required, Indexed |
| `actor` | ObjectId | Ref `User`, Required |
| `type` | String | Enum `['CREATED', 'STATUS_CHANGE', 'FIELD_UPDATE', 'ASSIGNMENT_CHANGE', 'COMMENT']` |
| `details` | Mixed Object | Optional old/new delta values |
| `comment` | String | Optional comment body |
| `createdAt` | Date | Managed timestamp (Strictly append-only) |

### `alertdismissals` Collection
| Field | Type | Options / Constraints |
|---|---|---|
| `_id` | ObjectId | Primary Key |
| `user` | ObjectId | Ref `User`, Required |
| `task` | ObjectId | Ref `Task`, Required |
| `dismissedAtDueDate` | Date | Required (Unique Compound Index `{ user: 1, task: 1 }`) |

---

## 2. Entity Relationships

- **User to Project (Owner):** One-to-Many (`User` owns multiple `Projects`).
- **Project to User (Members):** Many-to-Many (`Project.members` array vs `User`).
- **Project to Task:** One-to-Many (`Project` contains multiple `Tasks`).
- **Task to User (Assignees):** Many-to-Many (`Task.assignees` array vs `User`).
- **Task to Task (Blocking Dependencies):** Many-to-Many self-referential relationship (`Task.blockingTasks` array referencing other `Tasks` in the same project).
- **Task to ActivityLog:** One-to-Many (`Task` has many timeline entries).

---

## 3. Database vs. Application Enforced Constraints

### Enforced by Database (MongoDB / Mongoose Schema Constraints)
- Unique indexes on `user.email` and `project.key`.
- Compound unique index on `alertdismissals ({ user: 1, task: 1 })`.
- Field type validations (ObjectIds, Dates, Enums).

### Enforced by Application Code
- **Task Lifecycle State Machine Rules:** Transitions like forbidding jumps from `Backlog → Done` are validated in application logic (`utils/stateMachine.js`) because transition matrix validation requires stateful comparisons with previous values.
- **Unfinished Blocking Dependency Rules:** Ensuring a task cannot move to `Done` if any dependency is not `Done` requires querying dependency document statuses dynamically.
- **Project Membership Assignment Control:** Verifying that assignees belong to `project.members` prior to assignment.
- **Auto-Unassign Cascade:** When a member is removed from a project, application code executes `$pull` on `Task.assignees`.

**Why draw the line here?** Relational rules dependent on business workflow rules (like workflow state machines and cross-document dependency checks) are cleaner and more expressively handled in application domain logic, whereas structural integrity (uniqueness, types) belongs in database schema constraints.

---

## 4. Deliberate Denormalisation

- **`previousStatus` on Task:** Denormalized directly into the task document instead of traversing the `activitylogs` history on every unblock operation.
- **`dismissedAtDueDate` on AlertDismissal:** Storing the exact date value at dismissal time allows instant comparison without performing expensive JOIN-like lookups against historical edits.

---

## 5. What Would Break First at 100x Data?

1. **In-Memory Sorting & Aggregations:** Cross-project dashboard stats and weekly completions currently aggregate in Node memory. At 100x scale, MongoDB aggregation pipelines (`$facet`, `$bucketAuto`) and indexed materialized views would be required.
2. **Sequential `taskNum` Generation:** Finding `maxTaskNum + 1` via `.sort({ taskNum: -1 })` can experience race conditions under high concurrent task creations. A transactional sequence generator (`counters` collection) or UUIDs would replace it.
