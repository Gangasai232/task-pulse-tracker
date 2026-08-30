import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, LogOut, Shield, Sparkles } from 'lucide-react';

export const Navbar = ({ onOpenAlertsModal }) => {
  const { user, alertCount, logout, isManager } = useAuth();

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-slate-800/80 px-6 py-3.5 flex items-center justify-between shadow-xl">
      <div className="flex items-center gap-3">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-xl blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
          <div className="relative h-9 w-9 rounded-xl bg-slate-950 flex items-center justify-center border border-indigo-500/30">
            <span className="font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 text-xl tracking-wider">
              T
            </span>
          </div>
        </div>

        <div>
          <h1 className="font-display text-lg font-bold bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent flex items-center gap-1.5">
            TaskPulse
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-800/60 font-mono font-normal">
              PRO
            </span>
          </h1>
          <p className="text-[10px] text-slate-400 font-medium tracking-wider uppercase">Portfolio & Task Tracker</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Overdue Alerts Badge */}
        <button
          onClick={onOpenAlertsModal}
          className="relative p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-indigo-500/40 transition-all duration-200 group shadow-md"
          title="Overdue Alerts"
        >
          <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform duration-200 text-slate-300 group-hover:text-indigo-400" />
          {alertCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-rose-500 to-red-600 text-white text-[10px] font-bold h-5 min-w-[20px] px-1.5 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-lg shadow-rose-500/30 animate-bounce">
              {alertCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-800/80">
          <div className="relative">
            <img
              src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={user?.name}
              className="w-9 h-9 rounded-full border-2 border-indigo-500/40 object-cover shadow-md"
            />
            {isManager && (
              <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-indigo-600 text-white ring-2 ring-slate-950">
                <Shield className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
              {user?.name}
            </div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1">
              <span>{user?.role}</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400 font-mono text-[10px]">{user?.email}</span>
            </div>
          </div>

          <button
            onClick={logout}
            className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/50 transition-all duration-200"
            title="Sign Out"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
