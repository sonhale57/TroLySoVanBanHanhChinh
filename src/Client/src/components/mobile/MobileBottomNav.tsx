import React from 'react';
import { FileText, Clock, Bell, User, TrendingUp } from 'lucide-react';

export type MobileTab = 'report' | 'docs' | 'sla' | 'notify' | 'profile';

interface MobileBottomNavProps {
  activeTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
  unreadCount?: number;
  slaWarningCount?: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  unreadCount = 0,
  slaWarningCount = 0
}) => {
  const handleTabClick = (tab: MobileTab) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(15);
    }
    onTabChange(tab);
  };

  const navItems: { id: MobileTab; label: string; icon: React.FC<{ className?: string }>; badge?: number }[] = [
    {
      id: 'report',
      label: 'Báo cáo',
      icon: TrendingUp
    },
    {
      id: 'docs',
      label: 'Hồ sơ',
      icon: FileText
    },
    {
      id: 'sla',
      label: 'Nhắc việc',
      icon: Clock,
      badge: slaWarningCount > 0 ? slaWarningCount : undefined
    },
    {
      id: 'notify',
      label: 'Thông báo',
      icon: Bell,
      badge: unreadCount > 0 ? unreadCount : undefined
    },
    {
      id: 'profile',
      label: 'Cán bộ',
      icon: User
    }
  ];

  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] md:hidden">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleTabClick(item.id)}
              className={`relative flex flex-col items-center justify-center transition-all duration-200 py-1 ${
                isActive ? 'text-gov-primary' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {/* Active Tab Top Indicator Bar */}
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-gov-primary rounded-full shadow-sm" />
              )}

              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-transform duration-200 ${
                    isActive ? 'scale-110 stroke-[2.4]' : 'stroke-[1.8]'
                  }`}
                />

                {/* Badge đếm số thông báo / việc cần xử lý */}
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 bg-gov-danger text-white text-[10px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[10px] tracking-tight mt-1 transition-all ${
                  isActive ? 'font-bold text-gov-primary' : 'font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
