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
  Sparkles,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from 'recharts';

const STATUS_COLORS = {
  BACKLOG: '#64748b',
  IN_PROGRESS: '#3b82f6',
  IN_REVIEW: '#a855f7',
  DONE: '#10b981',
  BLOCKED: '#f43f5e',
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
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!stats) return null;

  const { headline, statusBreakdown, assigneeBreakdown, weeklyCompletions } = stats;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Role-Customized Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {isManager ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 px-2 py-0.5 rounded-md font-mono">
                <Shield className="w-3 h-3" /> MANAGER VIEW
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded-md font-mono">
                <User className="w-3 h-3 text-indigo-400" /> MEMBER VIEW
              </span>
            )}
          </div>

          <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            {isManager ? 'Portfolio Executive Dashboard' : `Welcome Back, ${user?.name?.split(' ')[0]}!`}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isManager
              ? 'Complete organization visibility across projects, team workloads, and velocity metrics'
              : 'Workload overview and assigned project performance tracking'}
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50 text-indigo-300 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Realtime Velocity
        </div>
      </div>

      {/* Headline Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-blue-500/40 transition-all duration-300 flex items-center justify-between group shadow-lg">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Open Tasks</div>
            <div className="text-3xl font-extrabold font-display text-slate-100 mt-1">{headline.openTasks}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-950/60 text-blue-400 border border-blue-800/60 group-hover:scale-110 transition duration-300 shadow-inner">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-rose-500/40 transition-all duration-300 flex items-center justify-between group shadow-lg">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Overdue Tasks</div>
            <div className="text-3xl font-extrabold font-display text-rose-400 mt-1">{headline.overdueTasks}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-rose-950/60 text-rose-400 border border-rose-800/60 group-hover:scale-110 transition duration-300 shadow-inner">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-amber-500/40 transition-all duration-300 flex items-center justify-between group shadow-lg">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Due This Week</div>
            <div className="text-3xl font-extrabold font-display text-amber-400 mt-1">{headline.dueThisWeek}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-950/60 text-amber-400 border border-amber-800/60 group-hover:scale-110 transition duration-300 shadow-inner">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all duration-300 flex items-center justify-between group shadow-lg">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Done This Week</div>
            <div className="text-3xl font-extrabold font-display text-emerald-400 mt-1">{headline.completedThisWeek}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 group-hover:scale-110 transition duration-300 shadow-inner">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts Row 1: Status & Assignee Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 font-display font-bold text-slate-200">
            <PieChartIcon className="w-5 h-5 text-indigo-400" />
            <span>Task Breakdown by Status</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusBreakdown}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={55}
                  paddingAngle={4}
                >
                  {statusBreakdown.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#64748b'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-2 text-xs">
            {statusBreakdown.map((st) => (
              <div key={st.status} className="flex items-center gap-1.5 text-slate-300 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[st.status] || '#64748b' }}
                ></span>
                <span className="font-medium">
                  {st.status.replace('_', ' ')} ({st.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Assignee Breakdown Bar Chart */}
        <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 font-display font-bold text-slate-200">
            <BarChart3 className="w-5 h-5 text-indigo-400" />
            <span>Workload Breakdown by Assignee</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assigneeBreakdown}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Chart Row 2: 8-Week Completion Trend */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display font-bold text-slate-200">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>Task Completions Over the Last 8 Weeks</span>
          </div>
          <span className="text-xs text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800/60 font-mono font-medium">
            Timeline Velocity
          </span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={weeklyCompletions}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="week" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
              />
              <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCount)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
