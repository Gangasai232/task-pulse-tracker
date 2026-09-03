import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { PriorityBadge } from './PriorityBadge';
import {
  X,
  Clock,
  User,
  Calendar,
  AlertTriangle,
  Send,
  Trash2,
  Lock,
  ArrowRight,
  MessageSquare,
  History,
} from 'lucide-react';

export const TaskModal = ({ taskId, onClose, onTaskUpdated }) => {
  const { user, isManager } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedBlocking, setSelectedBlocking] = useState([]);

  // Available options
  const [allProjectMembers, setAllProjectMembers] = useState([]);
  const [allProjectTasks, setAllProjectTasks] = useState([]);

  const loadTask = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await api.get(`/tasks/${taskId}`);
      setTask(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setPriority(data.priority);
      setDueDate(data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '');
      setSelectedAssignees(data.assignees?.map((a) => a._id) || []);
      setSelectedBlocking(data.blockingTasks?.map((b) => b._id) || []);

      if (data.project) {
        // Fetch project members and tasks for assignment / dependency selection
        const projData = await api.get(`/projects/${data.project._id}`);
        setAllProjectMembers(projData.members || []);

        const projTasks = await api.get(`/tasks?projectId=${data.project._id}&limit=100`);
        setAllProjectTasks(projTasks.tasks.filter((t) => t._id !== data._id));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (taskId) loadTask();
  }, [taskId]);

  const handleStatusMove = async (targetStatus) => {
    try {
      setTransitioning(true);
      setError('');
      await api.put(`/tasks/${taskId}`, { status: targetStatus });
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setTransitioning(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      setSubmittingComment(true);
      setError('');
      await api.post(`/tasks/${taskId}/comments`, { comment: commentText });
      setCommentText('');
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const toggleAssigneeSelection = (userId) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter((id) => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await api.put(`/tasks/${taskId}`, {
        title,
        description,
        priority,
        dueDate: dueDate || null,
        assignees: selectedAssignees,
        blockingTasks: selectedBlocking,
      });
      setIsEditing(false);
      await loadTask();
      if (onTaskUpdated) onTaskUpdated();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm(`Are you sure you want to delete task "${task.title}"?`)) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-slate-400">Loading task details...</span>
        </div>
      </div>
    );
  }

  if (!task) return null;

  const projectKey = task.project?.key || 'TASK';
  const taskCode = `${projectKey}-${task.taskNum}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="glass-panel w-full max-w-4xl max-h-[90vh] rounded-2xl flex flex-col shadow-2xl border border-slate-800 my-auto overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-950/80 text-indigo-400 font-mono text-xs font-bold border border-indigo-800/60">
              {taskCode}
            </span>
            <StatusBadge status={task.status} />
            <PriorityBadge priority={task.priority} />
          </div>

          <div className="flex items-center gap-2">
            {isManager && (
              <button
                onClick={handleDeleteTask}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition"
                title="Delete Task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-6 mb-0 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Action Rejected by Server</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Main Body Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-y-auto flex-1">
          {/* Left Column: Details & Edit Form */}
          <div className="lg:col-span-2 space-y-6">
            {!isEditing ? (
              <div>
                <h2 className="text-xl font-bold text-slate-100 font-display mb-2">{task.title}</h2>
                <p className="text-sm text-slate-300 whitespace-pre-wrap bg-slate-900/40 p-4 rounded-xl border border-slate-800/60">
                  {task.description || 'No description provided.'}
                </p>
                {isManager && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="mt-3 text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                  >
                    Edit Task Details →
                  </button>
                )}
              </div>
            ) : (
              <form onSubmit={handleSaveEdit} className="space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Due Date</label>
                    <input
                      type="date"
                      min={new Date().toISOString().split('T')[0]}
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-slate-100 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Project Members</label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2.5 bg-slate-950 rounded-lg border border-slate-700">
                    {allProjectMembers.length > 0 ? (
                      allProjectMembers.map((m) => {
                        const isSel = selectedAssignees.includes(m._id);
                        return (
                          <button
                            key={m._id}
                            type="button"
                            onClick={() => toggleAssigneeSelection(m._id)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                              isSel
                                ? 'bg-indigo-900 text-indigo-200 border-indigo-600'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                            }`}
                          >
                            {m.name}
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs text-slate-500 italic">No project members available</span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            )}

            {/* Legal Lifecycle State Machine Transitions */}
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-3">
              <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center justify-between">
                <span>Legal Workflow Transitions</span>
                <span className="text-[10px] text-indigo-400 font-normal">Server State Enforced</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {task.legalTransitions && task.legalTransitions.length > 0 ? (
                  task.legalTransitions.map((targetSt) => (
                    <button
                      key={targetSt}
                      onClick={() => handleStatusMove(targetSt)}
                      disabled={transitioning}
                      className="px-3 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                    >
                      Move to {targetSt.replace('_', ' ')} <ArrowRight className="w-3 h-3" />
                    </button>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No legal status moves available.</span>
                )}
              </div>
            </div>

            {/* Blocking Dependencies */}
            {task.blockingTasks && task.blockingTasks.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 space-y-2">
                <div className="text-xs font-semibold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Blocking Dependencies</span>
                </div>
                <div className="space-y-1.5">
                  {task.blockingTasks.map((bt) => (
                    <div
                      key={bt._id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 text-xs border border-slate-800"
                    >
                      <span className="font-mono text-slate-300">
                        {bt.project?.key}-{bt.taskNum}: {bt.title}
                      </span>
                      <StatusBadge status={bt.status} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline History & Comments */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <History className="w-4 h-4 text-indigo-400" />
                <span>Immutable History & Timeline</span>
              </div>

              {/* Add Comment */}
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Leave an immutable comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={submittingComment || !commentText.trim()}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 disabled:opacity-50 transition"
                >
                  <Send className="w-3.5 h-3.5" /> Post
                </button>
              </form>

              {/* Timeline List */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                {task.timeline && task.timeline.length > 0 ? (
                  task.timeline.map((item) => (
                    <div key={item._id} className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                          {item.actor?.name || 'System User'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Render Human Readable Event Details */}
                      {(() => {
                        const isBulk = item.metadata?.bulk || item.details?.bulk;

                        if (item.type === 'COMMENT') {
                          return (
                            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-slate-200 text-xs">
                              <span className="text-slate-400 font-medium block mb-1">Left a comment:</span>
                              <p className="italic font-sans text-slate-100">"{item.comment}"</p>
                            </div>
                          );
                        }

                        if (item.type === 'CREATED') {
                          return (
                            <p className="text-slate-300">
                              Created task{' '}
                              <span className="text-indigo-400 font-medium font-mono">
                                ({item.oldValue?.title || item.details?.title || 'Task Created'})
                              </span>
                            </p>
                          );
                        }

                        if (item.type === 'STATUS_CHANGE') {
                          const oldVal = item.oldValue || item.details?.oldValue || item.details?.oldVal;
                          const newVal = item.newValue || item.details?.newValue || item.details?.newVal;
                          return (
                            <div className="flex items-center gap-2 flex-wrap text-slate-300">
                              <span>Moved status from</span>
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[11px] border border-slate-700">{oldVal}</span>
                              <span>to</span>
                              <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-mono text-[11px] border border-indigo-800 font-semibold">{newVal}</span>
                              {isBulk && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">
                                  [Bulk Action]
                                </span>
                              )}
                            </div>
                          );
                        }

                        if (item.type === 'FIELD_CHANGE' || item.type === 'FIELD_UPDATE') {
                          const fieldName = item.field || item.details?.field || 'field';
                          const oldVal = item.oldValue !== undefined ? item.oldValue : item.details?.oldValue || item.details?.oldVal;
                          const newVal = item.newValue !== undefined ? item.newValue : item.details?.newValue || item.details?.newVal;
                          return (
                            <div className="flex items-center gap-1.5 flex-wrap text-slate-300">
                              <span>Updated <strong className="text-slate-200 capitalize">{fieldName}</strong>:</span>
                              <span className="line-through text-slate-500 font-mono">{String(oldVal || 'None')}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-indigo-300 font-medium font-mono">{String(newVal || 'None')}</span>
                              {isBulk && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">
                                  [Bulk Action]
                                </span>
                              )}
                            </div>
                          );
                        }

                        if (item.type === 'ASSIGNED') {
                          const targetName = item.targetUser?.name || item.details?.targetUser?.name || item.details?.userId || 'User';
                          return (
                            <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                              <span>Assigned task to</span>
                              <span className="bg-emerald-950/80 text-emerald-300 px-2 py-0.5 rounded border border-emerald-800 font-semibold text-[11px]">{targetName}</span>
                              {isBulk && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">[Bulk Action]</span>}
                            </div>
                          );
                        }

                        if (item.type === 'UNASSIGNED') {
                          const targetName = item.targetUser?.name || item.details?.targetUser?.name || item.details?.userId || 'User';
                          const reason = item.details?.reason ? ` (${item.details.reason})` : '';
                          return (
                            <div className="flex items-center gap-1.5 text-rose-400 font-medium">
                              <span>Unassigned</span>
                              <span className="bg-rose-950/80 text-rose-300 px-2 py-0.5 rounded border border-rose-800 font-semibold text-[11px]">{targetName}</span>
                              {reason && <span className="text-slate-400 text-[11px] italic">{reason}</span>}
                              {isBulk && <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 font-mono">[Bulk Action]</span>}
                            </div>
                          );
                        }

                        return (
                          <p className="text-slate-400 font-mono text-[11px]">
                            Action: <span className="text-indigo-400">{item.type}</span> {item.details && JSON.stringify(item.details)}
                          </p>
                        );
                      })()}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">No activity history recorded yet.</span>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Metadata Sidebar */}
          <div className="space-y-6 bg-slate-900/30 p-4 rounded-xl border border-slate-800/60 h-fit">
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Project
              </label>
              <div className="text-sm font-semibold text-slate-200">{task.project?.name}</div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Assignees
              </label>
              <div className="space-y-1.5">
                {task.assignees && task.assignees.length > 0 ? (
                  task.assignees.map((user) => (
                    <div key={user._id} className="flex items-center gap-2 text-xs text-slate-300">
                      <img src={user.avatarUrl} alt={user.name} className="w-5 h-5 rounded-full border border-slate-700" />
                      <span>{user.name}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-slate-500 italic">Unassigned</span>
                )}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Due Date
              </label>
              <div className="text-xs text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                Created
              </label>
              <div className="text-xs text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                {new Date(task.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
