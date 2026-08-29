import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { TaskModal } from '../components/TaskModal';
import { ProjectModal } from '../components/ProjectModal';
import {
  Folder,
  Plus,
  Settings,
  LayoutGrid,
  List,
  Users,
  Calendar,
  Lock,
  ArrowLeft,
  Search,
} from 'lucide-react';

const BOARD_COLUMNS = [
  { id: 'BACKLOG', label: 'Backlog', color: 'border-slate-700' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-700/60' },
  { id: 'IN_REVIEW', label: 'In Review', color: 'border-purple-700/60' },
  { id: 'BLOCKED', label: 'Blocked', color: 'border-rose-700/60' },
  { id: 'DONE', label: 'Done', color: 'border-emerald-700/60' },
];

export const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isManager } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('board'); // 'board' | 'list'

  // Task & Project Modal triggers
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showEditProject, setShowEditProject] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPriority, setNewPriority] = useState('MEDIUM');
  const [newDueDate, setNewDueDate] = useState('');
  const [newAssignees, setNewAssignees] = useState([]);
  const [creatingTask, setCreatingTask] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const proj = await api.get(`/projects/${id}`);
      setProject(proj);

      const taskRes = await api.get(`/tasks?projectId=${id}&limit=100`);
      setTasks(taskRes.tasks || []);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      setCreatingTask(true);
      await api.post('/tasks', {
        project: id,
        title: newTitle,
        description: newDesc,
        priority: newPriority,
        dueDate: newDueDate || null,
        assignees: newAssignees,
      });

      setNewTitle('');
      setNewDesc('');
      setNewDueDate('');
      setNewAssignees([]);
      setShowCreateTask(false);
      await loadData();
    } catch (err) {
      alert(`Task creation failed: ${err.message}`);
    } finally {
      setCreatingTask(false);
    }
  };

  const toggleAssigneeSelection = (uId) => {
    if (newAssignees.includes(uId)) {
      setNewAssignees(newAssignees.filter((a) => a !== uId));
    } else {
      setNewAssignees([...newAssignees, uId]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div className="space-y-1">
          <button
            onClick={() => navigate('/projects')}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Projects
          </button>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-xl bg-indigo-950/80 text-indigo-300 font-mono text-sm font-bold border border-indigo-800">
              {project.key}
            </span>
            <h1 className="font-display text-2xl font-bold text-slate-100">{project.name}</h1>
          </div>
          <p className="text-xs text-slate-400">{project.description || 'No description provided.'}</p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'board' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Board
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                viewMode === 'list' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
          </div>

          {isManager && (
            <button
              onClick={() => setShowEditProject(true)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition"
              title="Edit Project Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={() => setShowCreateTask(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
      </div>

      {/* Main Board / List Rendering */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto pb-4">
          {BOARD_COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div
                key={col.id}
                className="glass-panel p-4 rounded-2xl border border-slate-800/80 flex flex-col min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-xs text-slate-200">{col.label}</span>
                    <span className="h-5 px-2 rounded-full bg-slate-900 text-slate-400 text-[10px] font-bold flex items-center justify-center border border-slate-800">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Column Task Cards */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((t) => (
                    <div
                      key={t._id}
                      onClick={() => setSelectedTaskId(t._id)}
                      className="p-4 rounded-xl glass-panel-hover bg-slate-900/60 border border-slate-800 cursor-pointer space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[10px] font-bold text-indigo-400">
                          {project.key}-{t.taskNum}
                        </span>
                        <PriorityBadge priority={t.priority} size="sm" />
                      </div>

                      <h4 className="text-xs font-semibold text-slate-100 line-clamp-2">{t.title}</h4>

                      {t.blockingTasks && t.blockingTasks.length > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-amber-400 font-medium bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/40 w-fit">
                          <Lock className="w-2.5 h-2.5" /> Blocked by {t.blockingTasks.length} task(s)
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-800/60">
                        <div className="flex items-center gap-1">
                          {t.assignees && t.assignees.length > 0 ? (
                            <div className="flex -space-x-1">
                              {t.assignees.map((u) => (
                                <img
                                  key={u._id}
                                  src={u.avatarUrl}
                                  alt={u.name}
                                  className="w-4 h-4 rounded-full border border-slate-950"
                                />
                              ))}
                            </div>
                          ) : (
                            <span className="italic text-slate-600">Unassigned</span>
                          )}
                        </div>

                        {t.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(t.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th className="p-4">Key</th>
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Assignees</th>
                <th className="p-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {tasks.map((t) => (
                <tr
                  key={t._id}
                  onClick={() => setSelectedTaskId(t._id)}
                  className="hover:bg-slate-900/60 cursor-pointer transition"
                >
                  <td className="p-4 font-mono font-bold text-indigo-400">
                    {project.key}-{t.taskNum}
                  </td>
                  <td className="p-4 font-semibold text-slate-200">{t.title}</td>
                  <td className="p-4">
                    <StatusBadge status={t.status} size="sm" />
                  </td>
                  <td className="p-4">
                    <PriorityBadge priority={t.priority} size="sm" />
                  </td>
                  <td className="p-4">
                    {t.assignees && t.assignees.length > 0
                      ? t.assignees.map((a) => a.name).join(', ')
                      : 'Unassigned'}
                  </td>
                  <td className="p-4 text-slate-400">
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-lg rounded-2xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <h3 className="font-display font-bold text-lg text-slate-100">Create New Task in {project.name}</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Implement API Endpoint Security"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Detailed task description..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none"
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
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Project Members</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-slate-900 rounded-xl border border-slate-800">
                  {project.members?.map((m) => {
                    const isSel = newAssignees.includes(m._id);
                    return (
                      <button
                        key={m._id}
                        type="button"
                        onClick={() => toggleAssigneeSelection(m._id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          isSel
                            ? 'bg-indigo-900 text-indigo-200 border-indigo-600'
                            : 'bg-slate-950 text-slate-400 border-slate-800'
                        }`}
                      >
                        {m.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingTask}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={loadData}
        />
      )}

      {/* Edit Project Settings Modal */}
      {showEditProject && (
        <ProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onProjectSaved={loadData}
        />
      )}
    </div>
  );
};
