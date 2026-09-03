const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    taskNum: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
      default: 'MEDIUM',
      required: true,
    },
    status: {
      type: String,
      enum: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'],
      default: 'BACKLOG',
      required: true,
    },
    previousStatus: {
      type: String,
      enum: ['BACKLOG', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', null],
      default: null,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    assignees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    blockingTasks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task',
      },
    ],
  },
  { timestamps: true }
);

// Virtual field for task code identifier (e.g. PRJ-101)
taskSchema.virtual('taskKey').get(function () {
  if (this.populated && this.project && this.project.key) {
    return `${this.project.key}-${this.taskNum}`;
  }
  return `TASK-${this.taskNum}`;
});

taskSchema.set('toJSON', { virtuals: true });
taskSchema.set('toObject', { virtuals: true });

// Clear prior alert dismissals if dueDate, status, or assignees are modified
taskSchema.pre('save', async function (next) {
  if (this.isModified('dueDate') || this.isModified('status') || this.isModified('assignees')) {
    try {
      const AlertDismissal = mongoose.model('AlertDismissal');
      await AlertDismissal.deleteMany({ task: this._id });
    } catch (err) {
      // Model might not be registered yet
    }
  }
  next();
});

module.exports = mongoose.model('Task', taskSchema);
