import React, { useState, useEffect } from 'react';
import api from '../api';
import { CheckSquare, Calendar, User, ArrowRight, X, AlertCircle, CheckCircle2 } from 'lucide-react';

export const BulkActionBar = ({ selectedTaskIds, onClearSelection, onRefreshNeeded, users = [] }) => {
  const [actionType, setActionType] = useState('UPDATE_STATUS');
  const [targetStatus, setTargetStatus] = useState('IN_PROGRESS');
  const [targetAssignees, setTargetAssignees] = useState([]);
  const [targetDueDate, setTargetDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Result modal state
  const [reportResults, setReportResults] = useState(null);

  if (!selectedTaskIds || selectedTaskIds.length === 0) return null;

  const handleRunBulkAction = async () => {
    try {
      setSubmitting(true);
      let payload = {};

      if (actionType === 'UPDATE_STATUS') {
        payload = { targetStatus };
      } else if (actionType === 'UPDATE_ASSIGNEES') {
        payload = { assignees: targetAssignees };
      } else if (actionType === 'UPDATE_DUE_DATE') {
        payload = { dueDate: targetDueDate || null };
      }

      const res = await api.post('/tasks/bulk', {
        taskIds: selectedTaskIds,
        action: actionType,
        payload,
      });

      setReportResults(res.results);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err) {
      alert(`Bulk action error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleAssignee = (uId) => {
    if (targetAssignees.includes(uId)) {
      setTargetAssignees(targetAssignees.filter((id) => id !== uId));
    } else {
      setTargetAssignees([...targetAssignees, uId]);
    }
  };

  return (
    <>
      {/* Floating Toolbar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 glass-panel border border-indigo-500/40 p-4 rounded-2xl shadow-2xl flex flex-wrap items-center gap-4 bg-slate-900/95 backdrop-blur-lg">
        <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
          <span className="h-6 w-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
            {selectedTaskIds.length}
          </span>
          <span className="text-xs font-semibold text-slate-200">Tasks Selected</span>
        </div>

        {/* Action Type Dropdown */}
        <select
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-slate-200 focus:outline-none focus:border-indigo-500"
        >
          <option value="UPDATE_STATUS">Bulk Move Status</option>
          <option value="UPDATE_ASSIGNEES">Bulk Change Assignees</option>
          <option value="UPDATE_DUE_DATE">Bulk Set Due Date</option>
        </select>

        {/* Action Payload Inputs */}
        {actionType === 'UPDATE_STATUS' && (
          <select
            value={targetStatus}
            onChange={(e) => setTargetStatus(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs font-semibold text-indigo-300 focus:outline-none"
          >
            <option value="BACKLOG">Backlog</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>
        )}

        {actionType === 'UPDATE_ASSIGNEES' && (
          <div className="flex items-center gap-1 max-w-xs overflow-x-auto">
            {users.map((u) => {
              const isSel = targetAssignees.includes(u._id);
              return (
                <button
                  key={u._id}
                  type="button"
                  onClick={() => toggleAssignee(u._id)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-semibold border transition ${
                    isSel
                      ? 'bg-indigo-900 text-indigo-200 border-indigo-600'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {u.name.split(' ')[0]}
                </button>
              );
            })}
          </div>
        )}

        {actionType === 'UPDATE_DUE_DATE' && (
          <input
            type="date"
            value={targetDueDate}
            onChange={(e) => setTargetDueDate(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none"
          />
        )}

        <button
          onClick={handleRunBulkAction}
          disabled={submitting}
          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50"
        >
          {submitting ? 'Applying...' : 'Apply Bulk Action'}
        </button>

        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ml-2"
          title="Cancel Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Per-Task Batch Outcome Report Modal */}
      {reportResults && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl border border-slate-800 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-indigo-400" />
                <span>Bulk Action Outcome Report</span>
              </h3>
              <button
                onClick={() => {
                  setReportResults(null);
                  onClearSelection();
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              The server evaluated each task individually against state machine rules and permissions. Below is the itemized report:
            </p>

            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
              {reportResults.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    item.success
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {item.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="font-mono text-slate-200">Task ID: ...{item.taskId.slice(-6)}</span>
                  </div>

                  <div className="text-right">
                    {item.success ? (
                      <span className="font-semibold text-emerald-400">Success</span>
                    ) : (
                      <span className="font-semibold text-rose-400">{item.error}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setReportResults(null);
                  onClearSelection();
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
