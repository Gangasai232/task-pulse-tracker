const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['CREATED', 'STATUS_CHANGE', 'FIELD_UPDATE', 'ASSIGNMENT_CHANGE', 'COMMENT'],
      required: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    comment: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Timeline items are append-only!
  }
);

module.exports = mongoose.model('ActivityLog', activityLogSchema);
