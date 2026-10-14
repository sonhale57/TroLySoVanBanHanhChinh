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
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-gov-active-bg text-gov-active border border-gov-active-border ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <CheckCircle2 className="w-3.5 h-3.5 text-gov-active" />
        Đang có hiệu lực
      </span>
    );
  }

  if (normStatus === 'EXPIRED') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-gov-danger-bg text-gov-danger border border-gov-danger-border ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <XCircle className="w-3.5 h-3.5 text-gov-danger" />
        Hết hiệu lực
      </span>
    );
  }

  if (normStatus === 'EXPIRED_PARTIAL') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-gov-warning-bg text-gov-warning border border-gov-warning-border ${
          size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
        }`}
      >
        <AlertTriangle className="w-3.5 h-3.5 text-gov-warning" />
        Bãi bỏ một phần
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-gray-100 text-gray-700 border border-gray-300 ${
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      }`}
    >
      <FileClock className="w-3.5 h-3.5 text-gray-500" />
      Dự thảo (Chưa áp dụng)
    </span>
  );
};
