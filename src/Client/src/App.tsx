import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { LoginPage } from './pages/LoginPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { AdminLegalKBPage } from './pages/AdminLegalKBPage';
import { LegalLookupPage } from './pages/LegalLookupPage';
import { ProcessedDocumentsPage } from './pages/ProcessedDocumentsPage';
import { AdminUserManagementPage } from './pages/AdminUserManagementPage';
import { AiSettingsPage } from './pages/AiSettingsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { ShieldAlert } from 'lucide-react';
import { ProcessIncomingResult } from './types';
import { MobileMainView } from './pages/mobile/MobileMainView';

// Hàm chuẩn hóa và ánh xạ URL path tới route hợp lệ
export const normalizePath = (rawPath?: string): string => {
  if (!rawPath) return '/';
  const clean = rawPath.split('?')[0].replace(/^#\/?/, '').trim();
  const normalized = clean.startsWith('/') ? clean : `/${clean}`;

  if (normalized === '/' || normalized === '/workspace') return '/';
  if (normalized === '/processed-documents' || normalized === '/processed' || normalized === '/documents') return '/processed-documents';
  if (normalized === '/settings' || normalized === '/ai-settings' || normalized === '/config') return '/settings';
  if (normalized === '/admin/users' || normalized === '/users') return '/admin/users';
  if (normalized === '/admin/legal-kb' || normalized === '/legal-kb') return '/admin/legal-kb';
  if (normalized === '/legal-lookup' || normalized === '/lookup') return '/legal-lookup';
  if (normalized === '/audit-log' || normalized === '/logs') return '/audit-log';

  return '/';
};

// Hàm lấy đường dẫn ban đầu khi người dùng truy cập hoặc Refresh (F5) trang
const getInitialPath = (): string => {
  if (typeof window === 'undefined') return '/';

  // 1. Ưu tiên pathname từ thanh địa chỉ trình duyệt (khi F5 hoặc truy cập trực tiếp URL)
  const pathname = window.location.pathname;
  if (pathname && pathname !== '/') {
    const norm = normalizePath(pathname);
    if (norm !== '/') return norm;
  }

  // 2. Kiểm tra URL hash (nếu truy cập dạng #/processed-documents)
  if (window.location.hash) {
    const normHash = normalizePath(window.location.hash);
    if (normHash !== '/') return normHash;
  }

  // 3. Kiểm tra localStorage đã lưu phiên tác nghiệp trước đó
  try {
    const saved = localStorage.getItem('gov_last_active_path');
    if (saved) {
      const normSaved = normalizePath(saved);
      if (normSaved !== '/') return normSaved;
    }
  } catch {}

  return '/';
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>(getInitialPath);
  const [notification, setNotification] = useState<string | null>(null);
  const [workspaceData, setWorkspaceData] = useState<ProcessIncomingResult | null>(null);

  // Tự động nhận diện thiết bị truy cập (Mobile < 768px vs Desktop >= 768px)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  // Hàm chuyển trang chính thức (Đồng bộ đồng thời React State, Browser History và LocalStorage)
  const navigateTo = (path: string, replace: boolean = false) => {
    const target = normalizePath(path);
    setCurrentPath(target);
    try {
      localStorage.setItem('gov_last_active_path', target);
      if (replace) {
        window.history.replaceState({ path: target }, '', target);
      } else if (window.location.pathname !== target) {
        window.history.pushState({ path: target }, '', target);
      }
    } catch (err) {
      console.warn('History navigation error:', err);
    }
  };

  // Đồng bộ popstate khi người dùng bấm Back / Forward trên trình duyệt
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const pathFromEvent = event.state?.path || window.location.pathname;
      const target = normalizePath(pathFromEvent);
      setCurrentPath(target);
      try {
        localStorage.setItem('gov_last_active_path', target);
      } catch {}
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Đồng bộ URL ngay khi ứng dụng mount hoặc chuyển trang
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.pathname !== currentPath) {
      try {
        window.history.replaceState({ path: currentPath }, '', currentPath);
      } catch {}
    }
    try {
      localStorage.setItem('gov_last_active_path', currentPath);
    } catch {}
  }, [currentPath]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center text-gov-text font-bold text-xs">
        Đang khởi động phiên làm việc cán bộ...
      </div>
    );
  }

  // Nếu chưa đăng nhập -> Hiển thị màn hình Login (sau khi login tự động redirect về trang đang truy cập)
  if (!isAuthenticated || !user) {
    return (
      <LoginPage
        onLoginSuccess={() => {
          const target = getInitialPath();
          navigateTo(target, true);
        }}
      />
    );
  }

  // Giao diện Di động chuyên biệt: Tự động kích hoạt khi truy cập từ thiết bị Mobile
  if (isMobile) {
    return <MobileMainView />;
  }

  const getActiveNav = (): 'workspace' | 'legal-kb' | 'lookup' | 'processed-docs' | 'users' | 'settings' => {
    if (currentPath === '/processed-documents') return 'processed-docs';
    if (currentPath === '/settings') return 'settings';
    if (currentPath === '/admin/users') return 'users';
    if (currentPath === '/admin/legal-kb') return 'legal-kb';
    if (currentPath === '/legal-lookup') return 'lookup';
    return 'workspace';
  };

  const handleOpenInWorkspace = (data: ProcessIncomingResult) => {
    setWorkspaceData(data);
    navigateTo('/');
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col font-sans relative">
      {/* Header công vụ & Navigation tác nghiệp */}
      <Header
        activeNav={getActiveNav()}
        onNavigate={(path) => navigateTo(path)}
      />

      {/* Main Routed Page */}
      <main className="flex-1">
        {currentPath === '/' && (
          <WorkspacePage
            notification={notification}
            setNotification={setNotification}
            initialData={workspaceData}
          />
        )}

        {currentPath === '/processed-documents' && (
          <ProcessedDocumentsPage
            onBackToWorkspace={() => navigateTo('/')}
            onOpenInWorkspace={handleOpenInWorkspace}
          />
        )}

        {currentPath === '/settings' && (
          <AiSettingsPage
            onBackToWorkspace={() => navigateTo('/')}
          />
        )}

        {currentPath === '/admin/users' && (
          user.role === 'ADMIN' ? (
            <AdminUserManagementPage onBackToWorkspace={() => navigateTo('/')} />
          ) : (
            <div className="max-w-2xl mx-auto mt-12 p-6 bg-white rounded-xl shadow border border-gov-danger-border text-center">
              <ShieldAlert className="w-12 h-12 text-gov-danger mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gov-danger uppercase">
                Truy cập bị từ chối (Chỉ dành cho Cấp Lãnh đạo Quản lý)
              </h3>
              <p className="text-xs text-gov-text-secondary mt-1">
                Tài khoản của bạn mang vai trò <strong>{user.role}</strong>. Bạn không có quyền quản trị tài khoản cán bộ.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('/')}
                className="mt-4 px-4 py-2 rounded-lg bg-gov-primary text-white text-xs font-bold"
              >
                Quay về Bàn làm việc
              </button>
            </div>
          )
        )}

        {currentPath === '/admin/legal-kb' && (
          user.role === 'ADMIN' ? (
            <AdminLegalKBPage onBackToWorkspace={() => navigateTo('/')} />
          ) : (
            <div className="max-w-2xl mx-auto mt-12 p-6 bg-white rounded-xl shadow border border-gov-danger-border text-center">
              <ShieldAlert className="w-12 h-12 text-gov-danger mx-auto mb-3" />
              <h3 className="text-sm font-bold text-gov-danger uppercase">
                Truy cập bị từ chối (Chỉ dành cho Lãnh đạo Pháp chế)
              </h3>
              <p className="text-xs text-gov-text-secondary mt-1">
                Tài khoản của bạn mang vai trò <strong>{user.role}</strong>. Bạn không có quyền truy cập trang quản trị Tủ sách pháp luật.
              </p>
              <button
                type="button"
                onClick={() => navigateTo('/legal-lookup')}
                className="mt-4 px-4 py-2 rounded-lg bg-gov-primary text-white text-xs font-bold"
              >
                Chuyển sang trang Tra cứu Pháp luật
              </button>
            </div>
          )
        )}

        {currentPath === '/legal-lookup' && (
          <LegalLookupPage onBackToWorkspace={() => navigateTo('/')} />
        )}

        {currentPath === '/audit-log' && (
          <AuditLogPage onBackToWorkspace={() => navigateTo('/')} />
        )}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
