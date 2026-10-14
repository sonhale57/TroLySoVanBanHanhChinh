import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { LoginPage } from './pages/LoginPage';
import { WorkspacePage } from './pages/WorkspacePage';
import { AdminLegalKBPage } from './pages/AdminLegalKBPage';
import { LegalLookupPage } from './pages/LegalLookupPage';
import { ProcessedDocumentsPage } from './pages/ProcessedDocumentsPage';
import { AdminUserManagementPage } from './pages/AdminUserManagementPage';
import { AuditLogModal } from './components/modals/AuditLogModal';
import { ShieldAlert } from 'lucide-react';
import { ProcessIncomingResult } from './types';

const AppContent: React.FC = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [workspaceData, setWorkspaceData] = useState<ProcessIncomingResult | null>(null);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center text-gov-text font-bold text-xs">
        Đang khởi động phiên làm việc cán bộ...
      </div>
    );
  }

  // Nếu chưa đăng nhập -> Hiển thị màn hình Login
  if (!isAuthenticated || !user) {
    return <LoginPage onLoginSuccess={() => setCurrentPath('/')} />;
  }

  const getActiveNav = (): 'workspace' | 'legal-kb' | 'lookup' | 'processed-docs' | 'users' => {
    if (currentPath === '/processed-documents') return 'processed-docs';
    if (currentPath === '/admin/users') return 'users';
    if (currentPath === '/admin/legal-kb') return 'legal-kb';
    if (currentPath === '/legal-lookup') return 'lookup';
    return 'workspace';
  };

  const handleOpenInWorkspace = (data: ProcessIncomingResult) => {
    setWorkspaceData(data);
    setCurrentPath('/');
  };

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col font-sans">
      {/* Header công vụ & Navigation tác nghiệp */}
      <Header
        onOpenAuditLogs={() => setIsAuditLogOpen(true)}
        activeNav={getActiveNav()}
        onNavigate={(path) => setCurrentPath(path)}
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
            onBackToWorkspace={() => setCurrentPath('/')}
            onOpenInWorkspace={handleOpenInWorkspace}
          />
        )}

        {currentPath === '/admin/users' && (
          user.role === 'ADMIN' ? (
            <AdminUserManagementPage onBackToWorkspace={() => setCurrentPath('/')} />
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
                onClick={() => setCurrentPath('/')}
                className="mt-4 px-4 py-2 rounded-lg bg-gov-primary text-white text-xs font-bold"
              >
                Quay về Bàn làm việc
              </button>
            </div>
          )
        )}

        {currentPath === '/admin/legal-kb' && (
          user.role === 'ADMIN' ? (
            <AdminLegalKBPage onBackToWorkspace={() => setCurrentPath('/')} />
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
                onClick={() => setCurrentPath('/legal-lookup')}
                className="mt-4 px-4 py-2 rounded-lg bg-gov-primary text-white text-xs font-bold"
              >
                Chuyển sang trang Tra cứu Pháp luật
              </button>
            </div>
          )
        )}

        {currentPath === '/legal-lookup' && (
          <LegalLookupPage onBackToWorkspace={() => setCurrentPath('/')} />
        )}
      </main>

      {/* Audit Log Modal */}
      <AuditLogModal
        isOpen={isAuditLogOpen}
        onClose={() => setIsAuditLogOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return <AppContent />;
};

export default App;
