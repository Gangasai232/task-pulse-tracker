import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  Clock,
  Calendar,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Shield,
  User,
  Users,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
} from 'recharts';

const STATUS_COLORS = {
  BACKLOG: '#64748b',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#a855f7',
  DONE: '#10b981',
  BLOCKED: '#ef4444',
};

export const DashboardPage = () => {
  const { user, isManager } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await api.get('/dashboard/stats');
        setStats(data || {});
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
        setStats({});
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) return null;

  const openTasks = stats?.openTasks ?? stats?.headline?.openTasks ?? 0;
  const overdueTasks = stats?.overdueTasks ?? stats?.headline?.overdueTasks ?? 0;
  const dueThisWeek = stats?.dueThisWeek ?? stats?.headline?.dueThisWeek ?? 0;
  const completedThisWeek = stats?.completedThisWeek ?? stats?.headline?.completedThisWeek ?? 0;

  const tasksByStatus = Array.isArray(stats?.tasksByStatus) ? stats.tasksByStatus : Array.isArray(stats?.statusBreakdown) ? stats.statusBreakdown : [];
  const tasksByAssignee = Array.isArray(stats?.tasksByAssignee) ? stats.tasksByAssignee : Array.isArray(stats?.assigneeBreakdown) ? stats.assigneeBreakdown : [];
  const completionsLast8Weeks = Array.isArray(stats?.completionsLast8Weeks) ? stats.completionsLast8Weeks : Array.isArray(stats?.weeklyCompletions) ? stats.weeklyCompletions : [];

  const maxAssigneeCount = Math.max(...(tasksByAssignee.map((a) => a?.count || 0) || [1]), 1);

  return (
    <div className="space-y-6">
      {/* Role-Customized Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isManager ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-800 px-2 py-0.5 rounded font-mono">
                <Shield className="w-3 h-3" /> MANAGER DASHBOARD
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded font-mono">
                <User className="w-3 h-3 text-indigo-400" /> MEMBER VIEW
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold text-slate-100">
            {isManager ? 'Portfolio Executive Overview' : `Welcome Back, ${(user?.name || 'User').split(' ')[0]}!`}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isManager
              ? 'Complete organization visibility across projects, team workloads, and velocity metrics'
              : 'Workload overview and assigned project performance tracking'}
          </p>
        </div>
      </div>

      {/* Primary 4 KPI Headline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-xl border border-slate-800 border-t-2 border-t-blue-500 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">OPEN TASKS</div>
            <div className="text-3xl font-extrabold text-slate-100 mt-1">{openTasks}</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-950/50 text-blue-400 border border-blue-900">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 border-t-2 border-t-rose-500 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-rose-400 uppercase tracking-wider">OVERDUE TASKS</div>
            <div className="text-3xl font-extrabold text-rose-300 mt-1">{overdueTasks}</div>
          </div>
          <div className="p-3 rounded-lg bg-rose-950/50 text-rose-400 border border-rose-900">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 border-t-2 border-t-purple-500 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-purple-400 uppercase tracking-wider">DUE THIS WEEK</div>
            <div className="text-3xl font-extrabold text-purple-300 mt-1">{dueThisWeek}</div>
          </div>
          <div className="p-3 rounded-lg bg-purple-950/50 text-purple-400 border border-purple-900">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-xl border border-slate-800 border-t-2 border-t-emerald-500 flex items-center justify-between shadow-sm">
          <div>
            <div className="text-xs font-medium text-emerald-400 uppercase tracking-wider">COMPLETED THIS WEEK</div>
            <div className="text-3xl font-extrabold text-emerald-300 mt-1">{completedThisWeek}</div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-950/50 text-emerald-400 border border-emerald-900">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Grid: Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Weekly Completion Velocity Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-xl border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <h3 className="font-semibold text-sm text-slate-100">8-Week Completion Velocity</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">Historical Progress</span>
          </div>

          <div className="w-full pt-2 min-h-[250px]">
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={completionsLast8Weeks}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="week" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#818cf8' }}
                />
                <Area type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCompleted)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-sm text-slate-100">Tasks by Status</h3>
            </div>
          </div>

          <div className="w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height={190}>
              <PieChart>
                <Pie
                  data={tasksByStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                >
                  {tasksByStatus.map((entry) => (
                    <Cell key={entry?.status || Math.random()} fill={STATUS_COLORS[entry?.status] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Status Breakdown Legend */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
            {tasksByStatus.map((item) => (
              <div key={item?.status || Math.random()} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: STATUS_COLORS[item?.status] || '#64748b' }}></span>
                <span className="text-slate-400 capitalize">{(item?.status || '').replace('_', ' ').toLowerCase()}:</span>
                <span className="font-bold text-slate-200 ml-auto">{item?.count || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tasks by Assignee - Scrollable Responsive Bar Layout for Any Team Size */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-sm text-slate-100">Tasks by Assignee</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">{tasksByAssignee.length} Tracked</span>
        </div>

        <div className="space-y-3.5 max-h-72 overflow-y-auto pr-2">
          {tasksByAssignee.length > 0 ? (
            tasksByAssignee.map((assignee) => {
              const count = assignee?.count || 0;
              const name = assignee?.name || 'Unassigned';
              const pct = Math.round((count / maxAssigneeCount) * 100);
              return (
                <div key={name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-200">{name}</span>
                    <span className="font-mono text-emerald-400 font-bold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-900/60 text-[11px]">
                      {count} {count === 1 ? 'task' : 'tasks'}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800/80">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(pct, count > 0 ? 6 : 0)}%` }}
                    ></div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-xs text-slate-500 italic py-4 text-center">No active team task assignments found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
