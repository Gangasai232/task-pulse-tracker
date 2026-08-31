import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CheckSquare, Search, PlusCircle, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = ({ onOpenCreateProject }) => {
  const { isManager, user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  // Dedicated Admin navigation vs Standard Manager/Member navigation
  const navItems = isAdmin
    ? [
        { to: '/admin', label: 'Admin Governance', icon: ShieldCheck, highlight: true },
        { to: '/users', label: 'Registered Accounts', icon: Users },
      ]
    : [
        { to: '/', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/projects', label: 'Projects', icon: FolderKanban },
        { to: '/all-tasks', label: 'All Tasks & Search', icon: Search },
        { to: '/my-tasks', label: 'My Assigned Tasks', icon: CheckSquare },
        { to: '/users', label: 'User Directory', icon: Users },
      ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800/80 min-h-[calc(100vh-65px)] p-4 flex flex-col justify-between">
      <div className="space-y-6">
        {/* Only Manager/Member project creation button */}
        {!isAdmin && isManager && (
          <button
            onClick={onOpenCreateProject}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all duration-200 active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            New Project
          </button>
        )}

        {isAdmin && (
          <div className="p-3.5 rounded-2xl bg-indigo-950/60 border border-indigo-800/60 text-xs font-semibold text-indigo-300 flex items-center gap-2 shadow-inner">
            <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>Admin Governance Portal</span>
          </div>
        )}

        <nav className="space-y-1.5">
          <div className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {isAdmin ? 'System Governance' : 'Navigation'}
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
                      ? item.highlight
                        ? 'bg-indigo-950/80 text-indigo-300 border border-indigo-800 shadow-sm'
                        : 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-sm'
                      : item.highlight
                      ? 'text-indigo-400 hover:bg-indigo-950/30 border border-indigo-900/40'
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
          <span className="font-mono text-slate-400">v1.3.0</span>
        </div>
      </div>
    </aside>
  );
};
