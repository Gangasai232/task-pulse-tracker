import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CheckSquare, Search, PlusCircle, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ onOpenCreateProject }) => {
  const { isManager, user } = useAuth();
  const isAdminOrManager = isManager || user?.role === 'ADMIN';

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/projects', label: 'Projects', icon: FolderKanban },
    { to: '/all-tasks', label: 'All Tasks & Search', icon: Search },
    { to: '/my-tasks', label: 'My Assigned Tasks', icon: CheckSquare },
    { to: '/users', label: 'User Accounts', icon: Users },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 min-h-[calc(100vh-65px)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {isAdminOrManager && (
          <button
            onClick={onOpenCreateProject}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all duration-200 active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            New Project
          </button>
        )}

        <nav className="space-y-1.5">
          <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`
                }
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </div>

      <div className="pt-4 border-t border-slate-800/80 text-xs text-slate-500 px-3">
        <div className="flex items-center justify-between">
          <span>System Version</span>
          <span className="font-mono text-slate-400">v1.1.0</span>
        </div>
      </div>
    </aside>
  );
};
