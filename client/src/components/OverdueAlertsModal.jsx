import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from './StatusBadge';
import { Bell, X, Calendar, Check, AlertCircle } from 'lucide-react';

export const OverdueAlertsModal = ({ onClose, onSelectTask }) => {
  const { refreshAlerts } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const res = await api.get('/dashboard/alerts');
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error('Failed to load overdue alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleDismiss = async (taskId, e) => {
    e.stopPropagation();
    try {
      await api.post('/dashboard/alerts/dismiss', { taskId });
      await loadAlerts();
      await refreshAlerts();
    } catch (err) {
      alert(`Dismissal failed: ${err.message}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-950/60 border border-red-800/60 text-red-400">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-slate-100">Overdue Task Alerts</h2>
              <p className="text-xs text-slate-400">
                Tasks assigned to you that are past their due date and not finished
              </p>
            </div>
          </div>

          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-xs text-slate-500">Checking overdue alerts...</div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Check className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">All caught up!</div>
              <p className="text-xs text-slate-500">You have no active overdue alerts.</p>
            </div>
          ) : (
            alerts.map((task) => (
              <div
                key={task._id}
                onClick={() => {
                  onSelectTask(task._id);
                  onClose();
                }}
                className="p-4 rounded-xl glass-panel-hover border border-rose-900/30 bg-rose-950/10 cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-indigo-400 font-bold">
                      {task.project?.key}-{task.taskNum}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{task.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 text-rose-400 font-medium">
                      <Calendar className="w-3.5 h-3.5" /> Due:{' '}
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                    </span>
                    <StatusBadge status={task.status} size="sm" />
                  </div>
                </div>

                <button
                  onClick={(e) => handleDismiss(task._id, e)}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 whitespace-nowrap"
                  title="Dismiss alert until due date changes"
                >
                  <X className="w-3.5 h-3.5 text-slate-400" /> Dismiss
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
