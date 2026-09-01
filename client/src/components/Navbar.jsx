import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from './ThemeToggle';
import { Bell, LogOut, Shield } from 'lucide-react';

export const Navbar = ({ onOpenAlertsModal }) => {
  const { user, alertCount, logout, isManager } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-[#0f172a]/95 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left Brand Identity */}
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-sm">
          T
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-bold text-slate-100 tracking-tight">
              TaskPulse
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono font-medium">
              v1.0
            </span>
          </div>
        </div>
      </div>

      {/* Right User Actions */}
      <div className="flex items-center gap-3">
        {/* Day / Night Mode Theme Switcher */}
        <ThemeToggle />

        {/* Overdue Alerts Badge */}
        <button
          onClick={onOpenAlertsModal}
          className="relative p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition"
          title="Overdue Alerts"
        >
          <Bell className="w-4 h-4 text-slate-300" />
          {alertCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] font-bold h-4 min-w-[16px] px-1 rounded-full flex items-center justify-center border border-slate-950 shadow-sm">
              {alertCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
          <div className="relative">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user?.name}
              className="w-8 h-8 rounded-full border border-slate-700 object-cover"
            />
          </div>

          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-slate-200">
              {user?.name}
            </div>
            <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
              <span className="uppercase tracking-wide text-indigo-400 font-bold">{user?.role}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
