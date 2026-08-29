import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, Shield, User as UserIcon } from 'lucide-react';

export const Navbar = ({ onOpenAlertsModal }) => {
  const { user, alertCount, logout, isManager } = useAuth();

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <span className="font-display font-black text-white text-lg tracking-wider">T</span>
        </div>
        <div>
          <h1 className="font-display text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            TaskPulse
          </h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">Portfolio Tracker</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Overdue Alerts Badge */}
        <button
          onClick={onOpenAlertsModal}
          className="relative p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-all duration-200"
          title="Overdue Alerts"
        >
          <Bell className="w-5 h-5" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center animate-pulse border-2 border-slate-950 shadow-md">
              {alertCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
            alt={user?.name}
            className="w-9 h-9 rounded-full border border-indigo-500/30 object-cover"
          />
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              {user?.name}
              {isManager && (
                <span className="inline-flex items-center gap-0.5 text-[10px] bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 px-1.5 py-0.5 rounded font-mono font-medium">
                  <Shield className="w-2.5 h-2.5" /> MANAGER
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400">{user?.email}</div>
          </div>

          <button
            onClick={logout}
            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 transition-all"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
