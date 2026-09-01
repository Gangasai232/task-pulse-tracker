import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CheckSquare, Search, Plus, Users, ShieldCheck } from 'lucide-react';
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
    <aside className="w-60 bg-[#0f172a] border-r border-slate-800 min-h-[calc(100vh-57px)] p-4 flex flex-col justify-between">
      <div className="space-y-5">
        {/* Only Manager/Member project creation button */}
        {!isAdmin && isManager && (
          <button
            onClick={onOpenCreateProject}
            className="w-full py-2 px-3.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        )}

        {isAdmin && (
          <div className="p-3 rounded-lg bg-slate-900 border border-indigo-900/60 text-xs font-semibold text-indigo-300 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
            <span>Admin Governance Portal</span>
          </div>
        )}

        <nav className="space-y-1">
          <div className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
            {isAdmin ? 'System Governance' : 'Menu'}
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    isActive
                      ? 'bg-indigo-950/80 text-indigo-400 border border-indigo-800/80'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
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

      <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-500 px-3 flex items-center justify-between font-mono">
        <span>Version</span>
        <span className="text-slate-400">1.3.0</span>
      </div>
    </aside>
  );
};
