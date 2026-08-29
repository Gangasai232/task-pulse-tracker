import React from 'react';

const statusConfig = {
  BACKLOG: { label: 'Backlog', bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
  IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-950/80', text: 'text-blue-400', border: 'border-blue-800/50' },
  IN_REVIEW: { label: 'In Review', bg: 'bg-purple-950/80', text: 'text-purple-400', border: 'border-purple-800/50' },
  DONE: { label: 'Done', bg: 'bg-emerald-950/80', text: 'text-emerald-400', border: 'border-emerald-800/50' },
  BLOCKED: { label: 'Blocked', bg: 'bg-rose-950/80', text: 'text-rose-400', border: 'border-rose-800/50' },
};

export const StatusBadge = ({ status, size = 'md' }) => {
  const cfg = statusConfig[status] || { label: status, bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' };
  
  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-xs' 
    : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeClasses}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.text.replace('text-', 'bg-')}`}></span>
      {cfg.label}
    </span>
  );
};
