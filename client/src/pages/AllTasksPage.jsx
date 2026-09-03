import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/StatusBadge';
import { PriorityBadge } from '../components/PriorityBadge';
import { TaskModal } from '../components/TaskModal';
import { BulkActionBar } from '../components/BulkActionBar';
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Layers,
  User,
  SlidersHorizontal,
} from 'lucide-react';

export const AllTasksPage = () => {
  const { user, isManager } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters & Query state
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('');
  const [overdueFilter, setOverdueFilter] = useState('');
  const [sortBy, setSortBy] = useState('updatedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Multi-select state
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);

  // Data sources for dropdown filter options
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  // Detail Modal
  const [activeTaskId, setActiveTaskId] = useState(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    const fetchDropdownOptions = async () => {
      try {
        const [projData, userData] = await Promise.all([api.get('/projects'), api.get('/users')]);
        setProjects(projData);
        setUsers(userData);
      } catch (err) {
        console.error('Failed to load filter dropdowns:', err);
      }
    };
    fetchDropdownOptions();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        search: debouncedSearch,
        projectId,
        status,
        assigneeId,
        priority,
        overdue: overdueFilter,
        sortBy,
        sortOrder,
        page: page.toString(),
        limit: limit.toString(),
      });

      const res = await api.get(`/tasks?${queryParams.toString()}`);
      setTasks(res.tasks || []);
      setTotal(res.total ?? res.pagination?.total ?? 0);
      setTotalPages(res.totalPages ?? res.pagination?.totalPages ?? 1);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [debouncedSearch, projectId, status, assigneeId, priority, overdueFilter, sortBy, sortOrder, page]);

  // Toggle single task checkbox selection
  const toggleSelectTask = (taskId) => {
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  // Toggle select all tasks on current page
  const toggleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map((t) => t._id));
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    if (tasks.length === 0) return alert('No tasks available to export.');

    const headers = ['Task Key', 'Project', 'Title', 'Status', 'Priority', 'Assignees', 'Due Date', 'Created At'];
    const rows = tasks.map((t) => [
      `"${t.project?.key || 'TASK'}-${t.taskNum}"`,
      `"${t.project?.name || ''}"`,
      `"${t.title.replace(/"/g, '""')}"`,
      `"${t.status}"`,
      `"${t.priority}"`,
      `"${t.assignees ? t.assignees.map((a) => a.name).join(', ') : ''}"`,
      `"${t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ''}"`,
      `"${new Date(t.createdAt).toLocaleDateString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `task_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header & Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-100">Find & Filter Tasks</h1>
          <p className="text-xs text-slate-400">Server-side searching, filtering, sorting, pagination, and bulk operations</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center gap-2 transition"
        >
          <Download className="w-4 h-4 text-indigo-400" /> Export CSV
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-800 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search task title or description on server..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Dropdowns Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* Project Filter */}
          <select
            value={projectId}
            onChange={(e) => {
              setProjectId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.key} - {p.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="BACKLOG">Backlog</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="DONE">Done</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>

          {/* Assignee Filter */}
          <select
            value={assigneeId}
            onChange={(e) => {
              setAssigneeId(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned Tasks</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>
                {u.name}
              </option>
            ))}
          </select>

          {/* Overdue Filter */}
          <select
            value={overdueFilter}
            onChange={(e) => {
              setOverdueFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="">All Due Dates</option>
            <option value="overdue">Overdue Only</option>
            <option value="not_overdue">Not Overdue</option>
          </select>

          {/* Sort Field */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="updatedAt">Sort: Last Updated</option>
            <option value="dueDate">Sort: Due Date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none"
          >
            <option value="desc">Order: Descending</option>
            <option value="asc">Order: Ascending</option>
          </select>
        </div>
      </div>

      {/* Task List Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-500">Executing server query...</div>
        ) : tasks.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <SlidersHorizontal className="w-8 h-8 text-slate-600 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">No Matching Tasks</div>
            <p className="text-xs text-slate-500">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <th className="p-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={tasks.length > 0 && selectedTaskIds.length === tasks.length}
                    onChange={toggleSelectAll}
                    className="rounded accent-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="p-4">Key</th>
                <th className="p-4">Project</th>
                <th className="p-4">Title</th>
                <th className="p-4">Status</th>
                <th className="p-4">Priority</th>
                <th className="p-4">Assignees</th>
                <th className="p-4">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {tasks.map((t) => {
                const isSelected = selectedTaskIds.includes(t._id);
                return (
                  <tr
                    key={t._id}
                    className={`hover:bg-slate-900/60 transition ${isSelected ? 'bg-indigo-950/20' : ''}`}
                  >
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectTask(t._id)}
                        className="rounded accent-indigo-600 cursor-pointer"
                      />
                    </td>
                    <td
                      onClick={() => setActiveTaskId(t._id)}
                      className="p-4 font-mono font-bold text-indigo-400 cursor-pointer"
                    >
                      {t.project?.key || 'TASK'}-{t.taskNum}
                    </td>
                    <td onClick={() => setActiveTaskId(t._id)} className="p-4 text-slate-300 font-medium cursor-pointer">
                      {t.project?.name}
                    </td>
                    <td onClick={() => setActiveTaskId(t._id)} className="p-4 font-semibold text-slate-100 cursor-pointer">
                      {t.title}
                    </td>
                    <td onClick={() => setActiveTaskId(t._id)} className="p-4 cursor-pointer">
                      <StatusBadge status={t.status} size="sm" />
                    </td>
                    <td onClick={() => setActiveTaskId(t._id)} className="p-4 cursor-pointer">
                      <PriorityBadge priority={t.priority} size="sm" />
                    </td>
                    <td onClick={() => setActiveTaskId(t._id)} className="p-4 text-slate-300 cursor-pointer">
                      {t.assignees && t.assignees.length > 0
                        ? t.assignees.map((a) => a.name).join(', ')
                        : 'Unassigned'}
                    </td>
                    <td onClick={() => setActiveTaskId(t._id)} className="p-4 text-slate-400 cursor-pointer">
                      {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'N/A'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        {/* Server Pagination */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing <span className="font-semibold text-slate-200">{total === 0 ? 0 : (page - 1) * limit + 1}–{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-semibold text-slate-200">{total}</span> tasks
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-200 px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      <BulkActionBar
        selectedTaskIds={selectedTaskIds}
        onClearSelection={() => setSelectedTaskIds([])}
        onRefreshNeeded={loadTasks}
        users={users}
      />

      {/* Task Modal */}
      {activeTaskId && (
        <TaskModal
          taskId={activeTaskId}
          onClose={() => setActiveTaskId(null)}
          onTaskUpdated={loadTasks}
        />
      )}
    </div>
  );
};
