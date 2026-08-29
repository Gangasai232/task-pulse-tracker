import React from 'react';
import { AlertTriangle, AlertCircle, ArrowUpRight, Minus } from 'lucide-react';

const priorityConfig = {
  LOW: { label: 'Low', icon: Minus, bg: 'bg-slate-800/60', text: 'text-slate-400', border: 'border-slate-700' },
  MEDIUM: { label: 'Medium', icon: ArrowUpRight, bg: 'bg-amber-950/40', text: 'text-amber-400', border: 'border-amber-900/40' },
  HIGH: { label: 'High', icon: AlertCircle, bg: 'bg-orange-950/50', text: 'text-orange-400', border: 'border-orange-900/50' },
  URGENT: { label: 'Urgent', icon: AlertTriangle, bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-900/60' },
};

export const PriorityBadge = ({ priority, size = 'md' }) => {
  const cfg = priorityConfig[priority] || priorityConfig.MEDIUM;
  const Icon = cfg.icon;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border ${cfg.bg} ${cfg.text} ${cfg.border} ${sizeClasses}`}>
      <Icon className="w-3.5 h-3.5" />
      {cfg.label}
    </span>
  );
};
