import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  History,
  Shield,
  User,
  FileText,
  KeyRound,
  LogOut,
  ChevronDown,
  Clock,
  ShieldCheck,
  FolderArchive,
  Users
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { ActionConfirmModal } from './ActionConfirmModal';

interface HeaderProps {
  onOpenAuditLogs: () => void;
  activeNav?: 'workspace' | 'legal-kb' | 'lookup' | 'processed-docs' | 'users';
  onNavigate?: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenAuditLogs,
  activeNav = 'workspace',
  onNavigate,
}) => {
  const { user, logout } = useAuth();
  const [isChangePassOpen, setIsChangePassOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeStr = now.toLocaleDateString('vi-VN', {
        weekday: 'long',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }) + ' • ' + now.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });
      setCurrentTime(timeStr);
    };

    updateClock();
    const interval = setInterval(updateClock, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmLogout = async () => {
    setIsLogoutConfirmOpen(false);
    await logout();
    if (onNavigate) {
      onNavigate('/login');
    }
  };

  const handleNav = (path: string) => {
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <>
      {/* =========================================================
          1. HEADER CHÍNH: Left: National | Right: User Identity
             Có background_header_xlvbhc.webp làm điểm nhấn
         ========================================================= */}
      <header
        className="text-white shadow-md border-b-2 border-gov-gold select-none relative z-30 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `linear-gradient(rgba(186, 28, 29, 0.88), rgba(143, 18, 19, 0.94)), url('/images/background_header_xlvbhc.webp')`,
        }}
      >
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          {/* Left: National Emblem & System Name */}
          <div
            className="flex items-center gap-3.5 cursor-pointer transition-opacity hover:opacity-95"
            onClick={() => handleNav('/')}
          >
            <img
              src="/images/quochuy.svg"
              className="w-12 h-12 drop-shadow-md flex-shrink-0"
              alt="Quốc huy Việt Nam"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black tracking-wide uppercase leading-tight drop-shadow-sm">
                  TRỢ LÝ SỐ VĂN BẢN HÀNH CHÍNH CÔNG
                </h1>
              </div>
              <p className="text-xs text-white/90 font-normal">
                Hệ thống hỗ trợ xử lý Hồ sơ và Văn bản hành chính Công
              </p>
            </div>
          </div>

          {/* Right: User Identity (Cán bộ công vụ định danh & Dropdown menu) */}
          {user && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-black/25 hover:bg-black/35 border border-white/20 text-left transition-all"
              >
                <div className="w-8 h-8 rounded-full bg-white text-gov-primary flex items-center justify-center font-bold text-xs shadow-sm flex-shrink-0">
                  {user.role === 'ADMIN' ? (
                    <Shield className="w-4 h-4 text-gov-primary" />
                  ) : (
                    <User className="w-4 h-4 text-gov-primary" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 leading-none">
                    {user.fullName}
                  </div>
                  <div className="text-[11px] text-white/80 mt-0.5 max-w-[160px] truncate">
                    {user.department}
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>

              {/* Dropdown Menu Cá nhân (Đổi mật khẩu, Đăng xuất) */}
              {isUserMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-60 bg-white text-gov-text rounded-xl shadow-2xl border border-gov-border py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2.5 border-b border-gov-border bg-gov-subtle/40">
                      <div className="text-xs font-bold text-gov-text">{user.fullName}</div>
                      <div className="text-[11px] text-gov-text-secondary">{user.department}</div>
                      <div className="text-[10px] font-semibold text-gov-primary mt-0.5">
                        Tài khoản: @{user.username}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsChangePassOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-gov-text hover:bg-gov-bg flex items-center gap-2 font-medium transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-gov-gold" />
                      <span>Đổi mật khẩu cá nhân</span>
                    </button>

                    <div className="border-t border-gov-border my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        setIsLogoutConfirmOpen(true);
                      }}
                      className="w-full text-left px-3.5 py-2 text-xs text-gov-danger hover:bg-gov-danger-bg flex items-center gap-2 font-bold transition-colors"
                    >
                      <LogOut className="w-4 h-4 text-gov-danger" />
                      <span>Đăng xuất phiên làm việc</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      {/* =========================================================
          2. THANH NAVIGATION MỚI (Tách biệt riêng bên dưới Header)
         ========================================================= */}
      <nav className="bg-white border-b border-gov-border shadow-sm sticky top-0 z-20 select-none">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          {/* Left: Tab điều hướng tác nghiệp */}
          <div className="flex items-center gap-1 sm:gap-2 py-1.5 overflow-x-auto">
            {/* Tab: Bàn làm việc */}
            <button
              type="button"
              onClick={() => handleNav('/')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeNav === 'workspace'
                ? 'bg-gov-primary text-white shadow-sm'
                : 'text-gov-text-secondary hover:text-gov-text hover:bg-gov-bg'
                }`}
            >
              <FileText className={`w-4 h-4 ${activeNav === 'workspace' ? 'text-white' : 'text-gov-primary'}`} />
              <span>Bàn làm việc</span>
            </button>

            {/* Tab: Kho Hồ sơ đã xử lý */}
            <button
              type="button"
              onClick={() => handleNav('/processed-documents')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeNav === 'processed-docs'
                ? 'bg-gov-primary text-white shadow-sm'
                : 'text-gov-text-secondary hover:text-gov-text hover:bg-gov-bg'
                }`}
            >
              <FolderArchive className={`w-4 h-4 ${activeNav === 'processed-docs' ? 'text-white' : 'text-gov-gold'}`} />
              <span>Hồ sơ đã xử lý</span>
            </button>

            {/* Tab: Tủ sách / Tra cứu Pháp luật */}
            <button
              type="button"
              onClick={() => handleNav(user?.role === 'ADMIN' ? '/admin/legal-kb' : '/legal-lookup')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeNav === 'legal-kb' || activeNav === 'lookup'
                ? 'bg-gov-primary text-white shadow-sm'
                : 'text-gov-text-secondary hover:text-gov-text hover:bg-gov-bg'
                }`}
            >
              <BookMarked className={`w-4 h-4 ${activeNav === 'legal-kb' || activeNav === 'lookup' ? 'text-gov-gold-light' : 'text-gov-gold'}`} />
              <span>
                {user?.role === 'ADMIN' ? 'Quản trị Tủ sách Pháp luật' : 'Tra cứu Pháp luật'}
              </span>
            </button>

            {/* Tab: Quản trị Cán bộ (Chỉ ADMIN) */}
            {user?.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => handleNav('/admin/users')}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeNav === 'users'
                  ? 'bg-gov-primary text-white shadow-sm'
                  : 'text-gov-text-secondary hover:text-gov-text hover:bg-gov-bg'
                  }`}
              >
                <Users className={`w-4 h-4 ${activeNav === 'users' ? 'text-white' : 'text-gov-primary'}`} />
                <span>Quản lý Cán bộ</span>
              </button>
            )}

            {/* Tab: Nhật ký Xử lý */}
            <button
              type="button"
              onClick={onOpenAuditLogs}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-gov-text-secondary hover:text-gov-text hover:bg-gov-bg transition-all whitespace-nowrap"
            >
              <History className="w-4 h-4 text-gov-text-secondary" />
              <span>Nhật ký Xử lý</span>
            </button>
          </div>

          {/* Right: Thông tin phiên trực & Tiêu chuẩn bảo mật */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-gov-text-secondary">
            {currentTime && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-gov-text-secondary">
                <Clock className="w-3.5 h-3.5 text-gov-gold" />
                <span>{currentTime}</span>
              </div>
            )}
            <div className="h-3.5 w-px bg-gov-border" />
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gov-active">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>An toàn cấp độ 3</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Modal Đổi mật khẩu cá nhân */}
      <ChangePasswordModal
        isOpen={isChangePassOpen}
        onClose={() => setIsChangePassOpen(false)}
      />

      {/* Toast/Modal Confirm trước khi Đăng xuất */}
      <ActionConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onConfirm={handleConfirmLogout}
        title="Xác nhận kết thúc phiên làm việc"
        message="Đồng chí có chắc chắn muốn đăng xuất khỏi hệ thống Trợ lý số Văn bản Hành chính Công không?"
        detail={`Tài khoản: ${user?.username} (${user?.fullName} - ${user?.role})`}
        confirmText="Đăng xuất phiên làm việc"
        cancelText="Tiếp tục làm việc"
        type="danger"
      />
    </>
  );
};

export default Header;
