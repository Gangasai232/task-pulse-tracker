const mongoose = require('mongoose');

const alertDismissalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    dismissedAtDueDate: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

// Compound index so a user has one dismissal record per task
alertDismissalSchema.index({ user: 1, task: 1 }, { unique: true });

module.exports = mongoose.model('AlertDismissal', alertDismissalSchema);
