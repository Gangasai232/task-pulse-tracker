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
      enum: ['CREATED', 'STATUS_CHANGE', 'FIELD_CHANGE', 'FIELD_UPDATE', 'ASSIGNED', 'UNASSIGNED', 'ASSIGNMENT_CHANGE', 'COMMENT'],
      required: true,
    },
    field: {
      type: String,
      default: null,
    },
    oldValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    comment: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Timeline items are append-only!
  }
);

// Immutability Guard: Prevent editing history records at schema level
activityLogSchema.pre('updateOne', function () {
  throw new Error('ActivityLog entries are immutable and cannot be updated.');
});
activityLogSchema.pre('findOneAndUpdate', function () {
  throw new Error('ActivityLog entries are immutable and cannot be updated.');
});
activityLogSchema.pre('updateMany', function () {
  throw new Error('ActivityLog entries are immutable and cannot be updated.');
});

module.exports = mongoose.model('ActivityLog', activityLogSchema);
