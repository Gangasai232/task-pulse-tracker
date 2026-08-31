import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Shield,
  User,
  Mail,
  Calendar,
  AlertCircle,
  Search,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const AdminConsole = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res || []);
    } catch (err) {
      console.error('Failed to fetch users for admin console:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      setSuccessMsg('');
      await api.post('/users', { name, email, password, role });

      setSuccessMsg(`Successfully registered account '${email}' as '${role}'.`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('MEMBER');
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const totalCount = users.length;
  const adminCount = users.filter((u) => u.role === 'ADMIN').length;
  const managerCount = users.filter((u) => u.role === 'MANAGER').length;
  const memberCount = users.filter((u) => u.role === 'MEMBER').length;

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-slate-950 via-indigo-950/60 to-purple-950/40 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <ShieldCheck className="w-48 h-48 text-indigo-400" />
        </div>

        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950/90 text-indigo-300 text-xs font-bold font-mono border border-indigo-800/80 shadow-md">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" /> SYSTEM ADMIN PORTAL
          </div>
          <h1 className="font-display text-2xl md:text-3xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            User Account Registration & Governance
          </h1>
          <p className="text-xs text-slate-300 max-w-xl">
            Dedicated Administrator workspace for registering accounts, assigning system roles, and managing member access.
          </p>
        </div>
      </div>

      {/* Role Counts KPI Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex items-center justify-between shadow-lg hover:border-slate-700 transition">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Registered Accounts</div>
            <div className="text-3xl font-extrabold font-display text-slate-100 mt-1">{totalCount}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-slate-900 text-slate-300 border border-slate-800">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-purple-900/50 flex items-center justify-between shadow-lg hover:border-purple-500/40 transition">
          <div>
            <div className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider">Administrators</div>
            <div className="text-3xl font-extrabold font-display text-purple-300 mt-1">{adminCount}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-purple-950/60 text-purple-400 border border-purple-800/60">
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-indigo-900/50 flex items-center justify-between shadow-lg hover:border-indigo-500/40 transition">
          <div>
            <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Project Managers</div>
            <div className="text-3xl font-extrabold font-display text-indigo-300 mt-1">{managerCount}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-indigo-950/60 text-indigo-400 border border-indigo-800/60">
            <Shield className="w-6 h-6" />
          </div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-emerald-900/50 flex items-center justify-between shadow-lg hover:border-emerald-500/40 transition">
          <div>
            <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Staff Members</div>
            <div className="text-3xl font-extrabold font-display text-emerald-300 mt-1">{memberCount}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <User className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Account Registration Form, Right Accounts List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Provisioning Form */}
        <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 font-display font-bold text-slate-100 text-base">
            <UserPlus className="w-5 h-5 text-indigo-400" />
            <span>Account Registration</span>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-800 text-emerald-300 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. David Miller"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="e.g. david@acme.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Account Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Assign Account Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none"
              >
                <option value="MEMBER">Member (Regular Staff)</option>
                <option value="MANAGER">Manager (Project Lead)</option>
                <option value="ADMIN">Admin (System Administrator)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Registering Account...' : 'Register Account'}
            </button>
          </form>
        </div>

        {/* Right Column: Registered Accounts List */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-bold text-slate-100 text-base">Registered Account Directory</h3>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search accounts..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 focus:outline-none"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300"
              >
                <option value="ALL">All Roles</option>
                <option value="ADMIN">Admins</option>
                <option value="MANAGER">Managers</option>
                <option value="MEMBER">Members</option>
              </select>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {filteredUsers.map((u) => (
              <div
                key={u._id}
                className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 shadow-md hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                    alt={u.name}
                    className="w-10 h-10 rounded-full border border-slate-700 object-cover"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-100">{u.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Registered {new Date(u.createdAt).toLocaleDateString()} at {new Date(u.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      u.role === 'ADMIN'
                        ? 'bg-purple-950/80 text-purple-300 border-purple-800'
                        : u.role === 'MANAGER'
                        ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                        : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                    }`}
                  >
                    {u.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
