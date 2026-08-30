import React from 'react';

const statusConfig = {
  BACKLOG: {
    label: 'Backlog',
    bg: 'bg-slate-900/90',
    text: 'text-slate-300',
    border: 'border-slate-700/80',
    dot: 'bg-slate-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-blue-950/70',
    text: 'text-blue-300',
    border: 'border-blue-700/60 shadow-sm shadow-blue-500/10',
    dot: 'bg-blue-400 animate-pulse',
  },
  IN_REVIEW: {
    label: 'In Review',
    bg: 'bg-purple-950/70',
    text: 'text-purple-300',
    border: 'border-purple-700/60 shadow-sm shadow-purple-500/10',
    dot: 'bg-purple-400',
  },
  DONE: {
    label: 'Done',
    bg: 'bg-emerald-950/70',
    text: 'text-emerald-300',
    border: 'border-emerald-700/60 shadow-sm shadow-emerald-500/10',
    dot: 'bg-emerald-400',
  },
  BLOCKED: {
    label: 'Blocked',
    bg: 'bg-rose-950/80',
    text: 'text-rose-300',
    border: 'border-rose-700/80 shadow-sm shadow-rose-500/10',
    dot: 'bg-rose-500 animate-ping',
  },
};

export const StatusBadge = ({ status, size = 'md' }) => {
  const cfg = statusConfig[status] || {
    label: status,
    bg: 'bg-slate-900',
    text: 'text-slate-300',
    border: 'border-slate-700',
    dot: 'bg-slate-400',
  };

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border backdrop-blur-md ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}></span>
      {cfg.label}
    </span>
  );
};
