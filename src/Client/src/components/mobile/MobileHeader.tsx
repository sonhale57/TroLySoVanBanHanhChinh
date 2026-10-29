import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onRefresh,
  isRefreshing = false
}) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm md:hidden">
      <div className="flex items-center justify-between px-3.5 py-2.5 max-w-lg mx-auto">
        {/* Left: Quốc huy Việt Nam & Tên cơ quan / Hệ thống */}
        <div className="flex items-center gap-2.5">
          <img
            src="/images/quochuy.svg"
            alt="Quốc huy Việt Nam"
            className="w-8 h-8 drop-shadow-sm flex-shrink-0"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-black tracking-tight text-gov-primary uppercase">
                Trợ lý số Công vụ
              </span>
            </div>
            <p className="text-[10px] text-slate-600 font-medium line-clamp-1">
              {user ? `${user.fullName} • ${user.department || 'Văn phòng UBND'}` : 'Giám sát điều hành'}
            </p>
          </div>
        </div>

        {/* Right: Nút làm mới dữ liệu báo cáo */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2 text-slate-600 hover:text-gov-primary active:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-gov-primary' : ''}`} />
          </button>
        )}
      </div>
    </header>
  );
};
