import React, { useState, useEffect } from 'react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, User, ShieldCheck, Mail, Calendar, Key, AlertCircle } from 'lucide-react';

export const UsersPage = () => {
  const { user, isManager } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // New account form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const canRegister = isManager || user?.role === 'ADMIN';

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/users');
      setUsers(res || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
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
      setCreating(true);
      setError('');
      await api.post('/users', {
        name,
        email,
        password,
        role,
      });

      setName('');
      setEmail('');
      setPassword('');
      setRole('MEMBER');
      setShowModal(false);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">
            User Accounts Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Registered organization managers, staff members, and administrators
          </p>
        </div>

        {canRegister && (
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 active:scale-95 transition"
          >
            <UserPlus className="w-4 h-4" /> Register New Account
          </button>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u._id}
            className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 hover:border-indigo-500/40 transition shadow-lg flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={u.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
                  alt={u.name}
                  className="w-11 h-11 rounded-full border-2 border-indigo-500/40 object-cover shadow-md"
                />
                <div>
                  <h3 className="font-display font-bold text-sm text-slate-100">{u.name}</h3>
                  <div className="text-xs text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-slate-500" />
                    <span>{u.email}</span>
                  </div>
                </div>
              </div>

              {/* Role Badge */}
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 border ${
                  u.role === 'ADMIN'
                    ? 'bg-rose-950/80 text-rose-300 border-rose-800'
                    : u.role === 'MANAGER'
                    ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800'
                    : 'bg-slate-900 text-slate-300 border-slate-800'
                }`}
              >
                {u.role === 'ADMIN' ? (
                  <ShieldCheck className="w-3 h-3 text-rose-400" />
                ) : u.role === 'MANAGER' ? (
                  <Shield className="w-3 h-3 text-indigo-400" />
                ) : (
                  <User className="w-3 h-3 text-slate-400" />
                )}
                {u.role}
              </span>
            </div>

            <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" /> Joined {new Date(u.createdAt).toLocaleDateString()}
              </span>
              <span className="text-emerald-400 font-semibold">Active</span>
            </div>
          </div>
        ))}
      </div>

      {/* Register Account Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="glass-panel w-full max-w-md rounded-2xl p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-lg text-slate-100 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" /> Register User Account
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/90 border border-rose-800 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
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
                <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm text-slate-100 focus:outline-none"
                >
                  <option value="MEMBER">Member (Regular Staff)</option>
                  <option value="MANAGER">Manager (Project & Team Lead)</option>
                  <option value="ADMIN">Admin (System Administrator)</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                >
                  {creating ? 'Registering...' : 'Register Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
