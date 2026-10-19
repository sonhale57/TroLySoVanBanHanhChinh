import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, FileClock } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const normStatus = status?.toUpperCase() || 'ACTIVE';

  if (normStatus === 'ACTIVE') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-emerald-100 text-emerald-950 border border-emerald-400 whitespace-nowrap shadow-sm ${
          size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        }`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 flex-shrink-0" />
        Đang có hiệu lực
      </span>
    );
  }

  if (normStatus === 'EXPIRED') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-red-100 text-red-950 border border-red-400 whitespace-nowrap shadow-sm ${
          size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        }`}
      >
        <XCircle className="w-3.5 h-3.5 text-red-700 flex-shrink-0" />
        Hết hiệu lực
      </span>
    );
  }

  if (normStatus === 'EXPIRED_PARTIAL') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-amber-100 text-amber-950 border border-amber-400 whitespace-nowrap shadow-sm ${
          size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
        }`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-800 flex-shrink-0" />
        Bãi bỏ một phần
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-full bg-slate-100 text-slate-800 border border-slate-300 whitespace-nowrap shadow-sm ${
        size === 'sm' ? 'px-2.5 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
    >
      <FileClock className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
      Dự thảo (Chưa áp dụng)
    </span>
  );
};
