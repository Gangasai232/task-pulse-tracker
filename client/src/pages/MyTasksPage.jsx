import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { TaskModal } from '../components/TaskModal';
import { CheckSquare, Calendar, Folder } from 'lucide-react';

export const MyTasksPage = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const loadMyTasks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/tasks?myTasksOnly=true&limit=100');
      setTasks(res.tasks || []);
    } catch (err) {
      console.error('Failed to load my assigned tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyTasks();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-100">My Assigned Tasks</h1>
        <p className="text-xs text-slate-400">
          Personal task list assigned to {user?.name} across all active client projects
        </p>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Loading your tasks...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <CheckSquare className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">You're all clear!</div>
            <p className="text-xs text-slate-500">You currently have no tasks assigned across any project.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th className="p-4">Key</th>
                <th className="p-4">Project</th>
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {tasks.map((t) => (
                <tr
                  key={t._id}
                  onClick={() => setActiveTaskId(t._id)}
                  className="hover:bg-slate-900/60 cursor-pointer transition"
                >
                  <td className="p-4 font-mono font-bold text-indigo-400">
                    {t.project?.key || 'TASK'}-{t.taskNum}
                  </td>
                  <td className="p-4 text-slate-300 font-medium">{t.project?.name}</td>
                  <td className="p-4 font-semibold text-slate-100">{t.title}</td>
                  <td className="p-4">
                    <StatusBadge status={t.status} size="sm" />
                  </td>
                  <td className="p-4">
                    <PriorityBadge priority={t.priority} size="sm" />
                  </td>
                  <td className="p-4 text-slate-400">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {activeTaskId && (
        <TaskModal
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={loadMyTasks}
        />
      )}
    </div>
  );
};
