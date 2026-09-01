import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle = () => {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-xl border transition-all duration-300 flex items-center gap-2 text-xs font-semibold shadow-md active:scale-95 ${
        isDark
          ? 'bg-slate-900 text-amber-300 border-slate-800 hover:bg-slate-800 hover:border-amber-500/40'
          : 'bg-white text-indigo-600 border-slate-200 hover:bg-slate-50 hover:border-indigo-500/40'
      }`}
      title={isDark ? 'Switch to Day Mode (Light)' : 'Switch to Night Mode (Dark)'}
    >
      {isDark ? (
        <>
          <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
          <span className="hidden sm:inline">Day Mode</span>
        </>
      ) : (
        <>
          <Moon className="w-4 h-4 text-indigo-600" />
          <span className="hidden sm:inline">Night Mode</span>
        </>
      )}
    </button>
  );
};
