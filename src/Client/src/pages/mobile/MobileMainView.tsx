import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  FileText,
  Clock,
  Bell,
  User,
  AlertTriangle,
  CheckCircle2,
  Search,
  Smartphone,
  LogOut,
  Flame,
  CheckCheck,
  Send,
  Calendar,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  KeyRound,
  ShieldCheck,
  Cpu,
  SlidersHorizontal,
  BookCheck,
  Eye,
  EyeOff,
  Trash2,
  Save,
  RotateCcw,
  ExternalLink,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { notificationService } from '../../services/notificationService';
import {
  MobileQuickReport,
  NotificationItem,
  ProcessedRecordItem,
  UserAiConfig,
  UserNotificationPreferences,
  DepartmentSkillConfigItem,
  DocumentStatistics
} from '../../types';
import { MobileBottomNav, MobileTab } from '../../components/mobile/MobileBottomNav';
import { MobileHeader } from '../../components/mobile/MobileHeader';
import { AiTestChatModal } from '../../components/modals/AiTestChatModal';
import { TemplateConfigModal } from '../../components/modals/TemplateConfigModal';
import { DashboardCharts } from '../../components/common/DashboardCharts';

// Danh sách các nhà cung cấp dịch vụ trí tuệ nhân tạo & Cổng cấp khóa
const AI_PROVIDERS = [
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    apiKeyUrlLabel: 'Lấy khóa API tại Google AI Studio',
  },
  {
    id: 'OPENAI',
    name: 'OpenAI GPT',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyUrlLabel: 'Lấy khóa API tại OpenAI Platform',
  },
  {
    id: 'ANTHROPIC',
    name: 'Anthropic Claude',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyUrlLabel: 'Lấy khóa API tại Anthropic Console',
  },
  {
    id: 'OPENROUTER',
    name: 'OpenRouter (Multi-Provider)',
    apiKeyUrl: 'https://openrouter.ai/keys',
    apiKeyUrlLabel: 'Lấy khóa API tại OpenRouter',
  }
];

// Danh mục Kỹ năng Nghiệp vụ mặc định
const DEFAULT_SKILLS: DepartmentSkillConfigItem[] = [
  {
    id: 'legal_hierarchy',
    name: 'Đối soát Thứ bậc Hiệu lực Pháp lý',
    description: 'Tự động kiểm tra văn bản viện dẫn có phù hợp với văn bản QPPL cấp trên theo Luật Ban hành VBQPPL.',
    legalRef: 'Luật Ban hành VBQPPL 2015 & Sửa đổi 2020',
    isEnabled: true
  },
  {
    id: 'legal_validity',
    name: 'Kiểm soát Thời hạn & Hiệu lực Văn bản',
    description: 'Cảnh báo tức thì nếu điều khoản pháp lý viện dẫn đã hết hiệu lực, bãi bỏ hoặc sửa đổi bổ sung.',
    legalRef: 'Kho Dữ liệu QPPL Quốc gia',
    isEnabled: true
  },
  {
    id: 'statutory_authority',
    name: 'Thẩm định Thẩm quyền Ban hành',
    description: 'Rà soát tính đúng thẩm quyền ký duyệt và ban hành văn bản theo Luật Tổ chức chính quyền địa phương.',
    legalRef: 'Luật Tổ chức CQĐP 2015 & Sửa đổi 2019',
    isEnabled: true
  },
  {
    id: 'decree30_standards',
    name: 'Chuẩn hóa Thể thức Nghị định 30/2020',
    description: 'Tự động kiểm tra bố cục, phông chữ, cỡ chữ, số ký hiệu và trích yếu văn bản hành chính nhà nước.',
    legalRef: 'Nghị định 30/2020/NĐ-CP của Chính phủ',
    isEnabled: true
  },
  {
    id: 'sla_urgency_detection',
    name: 'Tự động Nhận diện Mức độ Khẩn & SLA',
    description: 'Tự động phát hiện công văn HỎA TỐC, THƯỢNG KHẨN và thiết lập mốc đếm ngược thời hạn giải quyết.',
    legalRef: 'Quy chế Tiếp nhận & Xử lý UBND Tỉnh',
    isEnabled: true
  }
];

// Lấy Tab ban đầu khi truy cập hoặc Refresh (F5) trên Mobile
const getInitialMobileTab = (): MobileTab => {
  if (typeof window === 'undefined') return 'report';

  const validTabs: MobileTab[] = ['report', 'docs', 'sla', 'notify', 'profile'];

  // 1. Kiểm tra URL hash (ví dụ #docs, #report, #sla, #notify, #profile)
  const hash = window.location.hash.replace(/^#\/?/, '').trim().toLowerCase();
  if (hash === 'docs' || hash === 'ho-so' || hash === 'records' || hash === 'processed') return 'docs';
  if (hash === 'sla' || hash === 'nhac-viec') return 'sla';
  if (hash === 'notify' || hash === 'thong-bao' || hash === 'notifications') return 'notify';
  if (hash === 'profile' || hash === 'can-bo' || hash === 'settings' || hash === 'cai-dat') return 'profile';
  if (hash === 'report' || hash === 'bao-cao' || hash === 'dashboard') return 'report';

  // 2. Kiểm tra pathname
  const pathname = window.location.pathname.toLowerCase();
  if (pathname.includes('processed') || pathname.includes('documents')) return 'docs';
  if (pathname.includes('settings') || pathname.includes('user')) return 'profile';

  // 3. Kiểm tra localStorage đã lưu phiên trước đó
  try {
    const saved = localStorage.getItem('gov_mobile_active_tab') as MobileTab;
    if (saved && validTabs.includes(saved)) {
      return saved;
    }
  } catch {}

  return 'report';
};

export const MobileMainView: React.FC = () => {
  const { user, logout } = useAuth();

  // Navigation & Tabs (Tự động khôi phục tab đang làm việc khi F5 / refresh)
  const [activeTab, setActiveTab] = useState<MobileTab>(getInitialMobileTab);

  const handleTabChange = (tab: MobileTab) => {
    setActiveTab(tab);
    try {
      localStorage.setItem('gov_mobile_active_tab', tab);
      window.history.replaceState(null, '', `#${tab}`);
    } catch {}
  };

  useEffect(() => {
    const handleHashChange = () => {
      const tab = getInitialMobileTab();
      setActiveTab(tab);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('gov_mobile_active_tab', activeTab);
      if (!window.location.hash || window.location.hash !== `#${activeTab}`) {
        window.history.replaceState(null, '', `#${activeTab}`);
      }
    } catch {}
  }, [activeTab]);

  // Inline Card Accordion trong danh sách hồ sơ (No Modal)
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // Time Filter cho trang Báo cáo (Tuần, Tháng, Quý, Toàn bộ)
  const [reportTimeFilter, setReportTimeFilter] = useState<'this_week' | 'this_month' | 'this_quarter' | 'all'>('this_month');

  // Data States
  const [quickReport, setQuickReport] = useState<MobileQuickReport | null>(null);
  const [statistics, setStatistics] = useState<DocumentStatistics | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [records, setRecords] = useState<ProcessedRecordItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modals
  const [isAiTestModalOpen, setIsAiTestModalOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // Search & Filter cho Tab Hồ sơ
  const [searchQuery, setSearchQuery] = useState('');
  const [docFilter, setDocFilter] = useState<'ALL' | 'URGENT' | 'CHO_XU_LY' | 'DA_KY'>('ALL');

  // Push Status
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [isSubscribingPush, setIsSubscribingPush] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Toast Notification State (Thay thế Modal trên Mobile)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'info' | 'success' | 'error'>('info');

  const showToast = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToastMessage(message);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // State Accordion của các Tiện ích trong Tab Cán bộ
  const [openSettingsCard, setOpenSettingsCard] = useState<'none' | 'notif' | 'aikey' | 'prompt' | 'skills' | 'password'>('none');

  // 1. State Cài đặt Thông báo (Notification Preferences)
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences>({
    urgentDocAlert: true,
    slaOverdueAlert: true,
    slaApproachingAlert: true,
    signedDocAlert: true,
    slaReminderHoursBefore: 2
  });
  const [isSavingNotifPrefs, setIsSavingNotifPrefs] = useState(false);

  // 2. State Cài đặt API AI Key (BYOK)
  const [aiProvider, setAiProvider] = useState('GEMINI');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [maskedApiKey, setMaskedApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSavingAiKey, setIsSavingAiKey] = useState(false);

  // 3. State Cài đặt Prompt Chuyên môn
  const [customPrompt, setCustomPrompt] = useState(
    'Thẩm định tính pháp lý và thể thức văn bản hành chính theo quy định của Luật Ban hành VBQPPL và Nghị định 30/2020/NĐ-CP. Rà soát chặt chẽ thẩm quyền ban hành, căn cứ pháp lý còn hiệu lực và đề xuất phương án xử lý tối ưu.'
  );
  const [isSavingPrompt, setIsSavingPrompt] = useState(false);

  // 4. State Cài đặt Kỹ năng Nghiệp vụ (Department Skills)
  const [skillsList, setSkillsList] = useState<DepartmentSkillConfigItem[]>(DEFAULT_SKILLS);
  const [isSavingSkills, setIsSavingSkills] = useState(false);

  // 5. State Đổi mật khẩu Inline
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  // 6. State Xác nhận Đăng xuất Inline
  const [isLogoutConfirming, setIsLogoutConfirming] = useState(false);

  // Tải cấu hình AI & Tiện ích người dùng từ Backend
  const loadUserSettings = async () => {
    try {
      const config = await api.getAiConfig();
      if (config) {
        setAiProvider(config.provider || 'GEMINI');
        setHasApiKey(config.hasApiKey);
        setMaskedApiKey(config.maskedApiKey || '');

        if (config.customPrompt) {
          setCustomPrompt(config.customPrompt);
        }

        if (config.enabledSkillsJson) {
          try {
            const parsed = JSON.parse(config.enabledSkillsJson);
            if (Array.isArray(parsed)) {
              setSkillsList(parsed);
            }
          } catch {
            // Keep default
          }
        }

        if (config.notificationPreferencesJson) {
          try {
            const parsed = JSON.parse(config.notificationPreferencesJson);
            setNotifPrefs((prev) => ({ ...prev, ...parsed }));
          } catch {
            // Keep default
          }
        }
      }
    } catch (err) {
      console.warn('Chưa nạp được cấu hình tiện ích người dùng:', err);
    }
  };

  // Tải dữ liệu Báo cáo nhanh theo kỳ thời gian
  const loadReport = async (filter: string = reportTimeFilter) => {
    try {
      const [data, stats] = await Promise.all([
        api.getMobileQuickReport(filter).catch(() => null),
        api.getDocumentStatistics(filter).catch(() => null)
      ]);
      if (data) setQuickReport(data);
      if (stats) setStatistics(stats);
    } catch (err) {
      console.error('Lỗi tải báo cáo nhanh:', err);
    }
  };

  // Tải toàn bộ dữ liệu khởi tạo
  const loadAllData = async (isSilent = false) => {
    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [reportData, statsData, notifData, docsData] = await Promise.all([
        api.getMobileQuickReport(reportTimeFilter).catch(() => null),
        api.getDocumentStatistics(reportTimeFilter).catch(() => null),
        api.getNotifications().catch(() => []),
        api.getProcessedDocuments().catch(() => [])
      ]);

      if (reportData) setQuickReport(reportData);
      if (statsData) setStatistics(statsData);
      setNotifications(notifData);
      setRecords(docsData);
      await loadUserSettings();
    } catch (err) {
      console.error('Lỗi khi tải dữ liệu mobile:', err);
      showToast('Không thể kết nối đến máy chủ. Vui lòng thử lại.', 'error');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    if (notificationService.isSupported()) {
      setPushPermission(notificationService.getPermission());
    }
  }, []);

  // Xử lý thay đổi kỳ báo cáo
  const handleTimeFilterChange = (filter: 'this_week' | 'this_month' | 'this_quarter' | 'all') => {
    setReportTimeFilter(filter);
    loadReport(filter);
  };

  // Kích hoạt thông báo đẩy Push
  const handleEnablePush = async () => {
    setIsSubscribingPush(true);
    try {
      const success = await notificationService.requestPermissionAndSubscribe(
        `Di động (${user?.fullName || 'Cán bộ'})`
      );
      if (success) {
        setPushPermission('granted');
        showToast('Đã kích hoạt thông báo đẩy thời gian thực.', 'success');
        await loadAllData(true);
      } else {
        showToast('Chưa cấp quyền nhận thông báo trên thiết bị.', 'error');
      }
    } finally {
      setIsSubscribingPush(false);
    }
  };

  // Thử nghiệm gửi Push Notification Hỏa tốc
  const handleSendTestPush = async () => {
    setIsSendingTest(true);
    try {
      const randomDocNum = Math.floor(Math.random() * 900) + 100;
      const res = await api.sendTestNotification({
        title: `HỎA TỐC: Công văn số ${randomDocNum}/UBND-VP`,
        body: 'Chỉ đạo khẩn cấp về công tác xử lý hồ sơ công vụ ngay trong ngày.',
        type: 'URGENT_DOC',
        urgencyLevel: 'HỎA TỐC',
        documentCode: `${randomDocNum}/UBND-VP`
      });

      await notificationService.showLocalNotification(res.notification.title, {
        body: res.notification.body,
        icon: '/favicon.svg'
      });

      showToast(`Đã phát thông báo thử nghiệm số ${randomDocNum}/UBND-VP`, 'success');
      await loadAllData(true);
    } catch (err) {
      console.error('Lỗi khi gửi thông báo test:', err);
      showToast('Lỗi khi gửi thông báo thử nghiệm', 'error');
    } finally {
      setIsSendingTest(false);
    }
  };

  // Đánh dấu đọc thông báo
  const handleMarkAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      showToast('Đã đánh dấu tất cả thông báo là đã đọc.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // ──────────────────────── XỬ LÝ LƯU CÁC TIỆN ÍCH TRONG TAB CÁN BỘ ────────────────────────

  // 1. Lưu Cài đặt Thông báo
  const handleSaveNotifPrefs = async () => {
    setIsSavingNotifPrefs(true);
    try {
      await api.updateAiConfig({
        notificationPreferencesJson: JSON.stringify(notifPrefs)
      });
      showToast('Đã lưu cấu hình cài đặt thông báo.', 'success');
      setOpenSettingsCard('none');
    } catch (err) {
      showToast('Lỗi khi lưu cài đặt thông báo.', 'error');
    } finally {
      setIsSavingNotifPrefs(false);
    }
  };

  // Nhận diện tự động nhà cung cấp khi cán bộ dán API Key
  const handleMobileApiKeyChange = (val: string) => {
    setApiKeyInput(val);
    const trimmed = val.trim();
    if (trimmed.startsWith('AIzaSy')) {
      setAiProvider('GEMINI');
      showToast('Đã nhận diện khóa Google Gemini!', 'info');
    } else if (trimmed.startsWith('sk-ant')) {
      setAiProvider('ANTHROPIC');
      showToast('Đã nhận diện khóa Anthropic Claude!', 'info');
    } else if (trimmed.startsWith('sk-or-')) {
      setAiProvider('OPENROUTER');
      showToast('Đã nhận diện khóa OpenRouter!', 'info');
    } else if (trimmed.startsWith('sk-')) {
      setAiProvider('OPENAI');
      showToast('Đã nhận diện khóa OpenAI!', 'info');
    }
  };

  // 2. Lưu Khóa API AI Key
  const handleSaveAiKey = async () => {
    if (!apiKeyInput.trim() && !hasApiKey) {
      showToast('Vui lòng nhập khóa API hợp lệ.', 'error');
      return;
    }

    setIsSavingAiKey(true);
    try {
      const res = await api.updateAiConfig({
        provider: aiProvider,
        model: 'auto',
        apiKey: apiKeyInput.trim() || undefined
      });
      setHasApiKey(res.hasApiKey);
      setMaskedApiKey(res.maskedApiKey || '');
      setApiKeyInput('');
      showToast('Đã lưu và mã hóa AES-256 khóa API AI thành công.', 'success');
      setOpenSettingsCard('none');
    } catch (err) {
      showToast('Lỗi khi cập nhật khóa API AI.', 'error');
    } finally {
      setIsSavingAiKey(false);
    }
  };

  const handleClearAiKey = async () => {
    setIsSavingAiKey(true);
    try {
      const res = await api.updateAiConfig({
        apiKey: ''
      });
      setHasApiKey(false);
      setMaskedApiKey('');
      setApiKeyInput('');
      showToast('Đã xóa khóa cá nhân, chuyển sang cấu hình mặc định.', 'info');
    } catch (err) {
      showToast('Lỗi khi xóa khóa API.', 'error');
    } finally {
      setIsSavingAiKey(false);
    }
  };

  // 3. Lưu Prompt Chuyên môn
  const handleSavePrompt = async () => {
    if (!customPrompt.trim()) {
      showToast('Nội dung prompt chỉ dẫn không được để trống.', 'error');
      return;
    }

    setIsSavingPrompt(true);
    try {
      await api.updateAiConfig({
        customPrompt: customPrompt.trim()
      });
      showToast('Đã lưu chỉ dẫn prompt chuyên môn.', 'success');
      setOpenSettingsCard('none');
    } catch (err) {
      showToast('Lỗi khi lưu chỉ dẫn prompt.', 'error');
    } finally {
      setIsSavingPrompt(false);
    }
  };

  const handleResetPrompt = () => {
    setCustomPrompt(
      'Thẩm định tính pháp lý và thể thức văn bản hành chính theo quy định của Luật Ban hành VBQPPL và Nghị định 30/2020/NĐ-CP. Rà soát chặt chẽ thẩm quyền ban hành, căn cứ pháp lý còn hiệu lực và đề xuất phương án xử lý tối ưu.'
    );
    showToast('Đã nạp lại mẫu prompt mặc định.', 'info');
  };

  // 4. Lưu Kỹ năng Nghiệp vụ
  const handleToggleSkill = (skillId: string) => {
    setSkillsList((prev) =>
      prev.map((s) => (s.id === skillId ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  const handleSaveSkills = async () => {
    setIsSavingSkills(true);
    try {
      await api.updateAiConfig({
        enabledSkillsJson: JSON.stringify(skillsList)
      });
      showToast('Đã lưu cấu hình kỹ năng nghiệp vụ.', 'success');
      setOpenSettingsCard('none');
    } catch (err) {
      showToast('Lỗi khi lưu danh mục kỹ năng.', 'error');
    } finally {
      setIsSavingSkills(false);
    }
  };

  // 5. Đổi mật khẩu cá nhân
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Vui lòng điền đầy đủ các thông tin mật khẩu.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Xác nhận mật khẩu mới không khớp.', 'error');
      return;
    }

    setIsChangingPass(true);
    try {
      await api.changePassword(currentPassword, newPassword, confirmPassword);
      showToast('Đổi mật khẩu thành công!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setOpenSettingsCard('none');
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra mật khẩu cũ.';
      showToast(errMsg, 'error');
    } finally {
      setIsChangingPass(false);
    }
  };

  // Sao chép số hiệu văn bản (kèm toast)
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Đã sao chép: ${code}`, 'success');
  };

  // Tính số lượng badge cho Navbar
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const slaWarningCount = (quickReport?.overdueSla || 0) + (quickReport?.expiringSoonSla || 0);

  // Lọc danh sách hồ sơ cho Tab Hồ sơ
  const filteredRecords = records.filter((rec) => {
    const matchesSearch =
      !searchQuery ||
      rec.incomingDocCode?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.subjectTitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.incomingIssuer?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (docFilter === 'URGENT') {
      return (
        rec.urgencyLevel === 'HỎA TỐC' ||
        rec.urgencyLevel === 'THƯỢNG KHẨN' ||
        rec.urgencyLevel === 'KHẨN'
      );
    }
    if (docFilter === 'CHO_XU_LY') return rec.currentStatus === 'CHO_XU_LY';
    if (docFilter === 'DA_KY') return rec.currentStatus === 'DA_KY';

    return true;
  });

  // Danh sách hồ sơ Radar SLA (quá hạn hoặc sắp hết hạn < 24h)
  const slaRadarRecords = records.filter((rec) => {
    if (rec.currentStatus === 'DA_KY') return false;
    if (!rec.slaDeadline) return false;
    const deadline = new Date(rec.slaDeadline).getTime();
    const now = Date.now();
    return deadline < now || deadline - now < 24 * 3600 * 1000;
  });

  // Helper toggle accordion card
  const toggleSettingsCard = (card: 'notif' | 'aikey' | 'prompt' | 'skills' | 'password') => {
    setOpenSettingsCard((prev) => (prev === card ? 'none' : card));
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans pb-24 select-none">
      {/* Mobile Top Header (Đơn giản, trang nghiêm, không nút desktop, không chuông trùng lặp) */}
      <MobileHeader
        onRefresh={() => loadAllData(true)}
        isRefreshing={isRefreshing}
      />

      {/* Vùng nội dung chính cuộn dọc */}
      <div className="flex-1 max-w-lg mx-auto w-full px-3.5 py-3">
        {/* =========================================================================
            TAB 1: BÁO CÁO NHANH (THUẦN BÁO CÁO TIẾN ĐỘ CÔNG VIỆC, KHÔNG PHÍM TẮT THỪA)
           ========================================================================= */}
        {activeTab === 'report' && (
          <div className="space-y-3">
            {/* Thanh tiêu đề báo cáo phẳng */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gov-primary block">
                    Báo cáo Điều hành Công vụ
                  </span>
                  <h2 className="text-sm font-black text-slate-900 mt-0.5">
                    Tiến độ Xử lý Văn bản & Hồ sơ
                  </h2>
                </div>
                <span className="text-[10px] font-bold px-2 py-1 bg-slate-100 text-slate-700 rounded-lg border border-slate-200">
                  {reportTimeFilter === 'this_week' ? 'Tuần này' : reportTimeFilter === 'this_month' ? 'Tháng này' : reportTimeFilter === 'this_quarter' ? 'Quý này' : 'Toàn bộ'}
                </span>
              </div>

              {/* Bộ lọc kỳ báo cáo */}
              <div className="grid grid-cols-4 gap-1 mt-3 pt-2.5 border-t border-slate-100">
                <button
                  onClick={() => handleTimeFilterChange('this_week')}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition ${
                    reportTimeFilter === 'this_week'
                      ? 'bg-gov-primary text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tuần này
                </button>
                <button
                  onClick={() => handleTimeFilterChange('this_month')}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition ${
                    reportTimeFilter === 'this_month'
                      ? 'bg-gov-primary text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tháng này
                </button>
                <button
                  onClick={() => handleTimeFilterChange('this_quarter')}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition ${
                    reportTimeFilter === 'this_quarter'
                      ? 'bg-gov-primary text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Quý này
                </button>
                <button
                  onClick={() => handleTimeFilterChange('all')}
                  className={`py-1.5 px-1 rounded-lg text-[11px] font-bold text-center transition ${
                    reportTimeFilter === 'all'
                      ? 'bg-gov-primary text-white shadow-sm'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Toàn bộ
                </button>
              </div>
            </div>

            {/* THẺ 1: TỔNG TIẾP NHẬN TRONG KỲ */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
                  Tổng công văn tiếp nhận trong kỳ
                </span>
                <span className="text-2xl font-black text-slate-900 mt-0.5 block">
                  {quickReport?.totalReceived ?? 0}
                  <span className="text-xs font-semibold text-slate-500 ml-1">văn bản</span>
                </span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            {/* THẺ 2: CÔNG VĂN ĐÃ XỬ LÝ (PHÂN RÃ ĐÃ KÝ VS CHỜ KÝ) */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
                    Công văn đã hoàn tất xử lý
                  </span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">
                    {(quickReport?.daXuLy ?? 0) + (quickReport?.daKy ?? 0)}
                    <span className="text-xs font-semibold text-slate-500 ml-1">
                      / {quickReport?.totalReceived ?? 0} văn bản
                    </span>
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>

              {/* 2 Khung Phân rã: Đã ký ban hành vs Đã xử lý (chờ duyệt ký) */}
              <div className="grid grid-cols-2 gap-2 mt-2 pt-2.5 border-t border-slate-100">
                <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                    Đã ký ban hành
                  </span>
                  <span className="text-lg font-black text-emerald-700 mt-0.5 block">
                    {quickReport?.daKy ?? 0}
                    <span className="text-[10px] font-semibold text-emerald-600 ml-1">văn bản</span>
                  </span>
                </div>

                <div className="p-2.5 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-[10px] font-bold text-blue-800 uppercase block">
                    Đã xử lý (Chờ ký)
                  </span>
                  <span className="text-lg font-black text-blue-700 mt-0.5 block">
                    {quickReport?.daXuLy ?? 0}
                    <span className="text-[10px] font-semibold text-blue-600 ml-1">văn bản</span>
                  </span>
                </div>
              </div>
            </div>

            {/* THẺ 3: ĐANG & CHỜ XỬ LÝ */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight block">
                    Đang & Chờ xử lý trong kỳ
                  </span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">
                    {(quickReport?.choXuLy ?? 0) + (quickReport?.dangXuLy ?? 0)}
                    <span className="text-xs font-semibold text-slate-500 ml-1">văn bản</span>
                  </span>
                </div>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2 pt-2.5 border-t border-slate-100 text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Đang thẩm định / xử lý:</span>
                  <span className="font-bold text-slate-800 text-sm">{quickReport?.dangXuLy ?? 0}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-500 block">Chờ tiếp nhận vào số:</span>
                  <span className="font-bold text-slate-800 text-sm">{quickReport?.choXuLy ?? 0}</span>
                </div>
              </div>
            </div>

            {/* THẺ 4: CHẬM TIẾN ĐỘ / QUÁ HẠN SLA */}
            <div className="bg-white rounded-xl p-3.5 border border-red-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-red-700 uppercase tracking-tight block flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-gov-danger" />
                    Chậm tiến độ / Quá hạn SLA
                  </span>
                  <span className="text-2xl font-black text-gov-danger mt-0.5 block">
                    {quickReport?.overdueSla ?? 0}
                    <span className="text-xs font-semibold text-slate-500 ml-1">văn bản trễ hạn</span>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-500 block">Tỷ lệ đúng hạn</span>
                  <span className="text-base font-black text-slate-800">
                    {quickReport?.onTimeRate ?? 100}%
                  </span>
                </div>
              </div>

              {/* Progress Bar Tỷ lệ đúng hạn */}
              <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
                <div
                  className="bg-gov-primary h-full rounded-full transition-all duration-300"
                  style={{ width: `${quickReport?.onTimeRate ?? 100}%` }}
                />
              </div>
            </div>

            {/* THẺ 5: PHÂN LOẠI MỨC ĐỘ KHẨN */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight mb-2.5">
                Phân bố mức độ khẩn cấp trong kỳ
              </h3>

              <div className="grid grid-cols-4 gap-1.5 text-center">
                <div className="p-2 rounded-lg bg-red-50 border border-red-200">
                  <span className="text-[9px] font-bold text-red-700 uppercase block">Hỏa tốc</span>
                  <span className="text-base font-black text-red-700">
                    {quickReport?.urgencyBreakdown?.['HỎA TỐC'] ?? 0}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-amber-50 border border-amber-200">
                  <span className="text-[9px] font-bold text-amber-800 uppercase block">Thượng khẩn</span>
                  <span className="text-base font-black text-amber-800">
                    {quickReport?.urgencyBreakdown?.['THƯỢNG KHẨN'] ?? 0}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-yellow-50 border border-yellow-200">
                  <span className="text-[9px] font-bold text-yellow-800 uppercase block">Khẩn</span>
                  <span className="text-base font-black text-yellow-800">
                    {quickReport?.urgencyBreakdown?.['KHẨN'] ?? 0}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-600 uppercase block">Thường</span>
                  <span className="text-base font-black text-slate-700">
                    {quickReport?.urgencyBreakdown?.['THƯỜNG'] ?? 0}
                  </span>
                </div>
              </div>
            </div>

            {/* BIỂU ĐỒ TRỰC QUAN DASHBOARD CHARTS TRÊN MOBILE */}
            {statistics && (
              <div className="pt-1">
                <DashboardCharts
                  statistics={statistics}
                  periodLabel={statistics.periodLabel}
                  isMobile={true}
                />
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: HỒ SƠ CÔNG VĂN (EXPANDABLE ACCORDION INLINE, HẠN CHẾ MODAL)
           ========================================================================= */}
        {activeTab === 'docs' && (
          <div className="space-y-2.5">
            {/* Thanh tìm kiếm */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Tìm số hiệu, trích yếu, cơ quan ban hành..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white rounded-xl border border-slate-300 text-xs focus:ring-1 focus:ring-gov-primary focus:border-gov-primary outline-none shadow-sm"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] no-scrollbar">
              <button
                onClick={() => setDocFilter('ALL')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition ${
                  docFilter === 'ALL'
                    ? 'bg-gov-primary text-white'
                    : 'bg-white text-slate-600 border border-slate-200'
                }`}
              >
                Tất cả ({records.length})
              </button>
              <button
                onClick={() => setDocFilter('URGENT')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition ${
                  docFilter === 'URGENT'
                    ? 'bg-gov-danger text-white'
                    : 'bg-white text-red-600 border border-red-200'
                }`}
              >
                Hỏa tốc / Khẩn ({quickReport?.urgentCount ?? 0})
              </button>
              <button
                onClick={() => setDocFilter('CHO_XU_LY')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition ${
                  docFilter === 'CHO_XU_LY'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-blue-700 border border-blue-200'
                }`}
              >
                Chờ xử lý ({quickReport?.choXuLy ?? 0})
              </button>
              <button
                onClick={() => setDocFilter('DA_KY')}
                className={`px-3 py-1 rounded-full whitespace-nowrap font-bold transition ${
                  docFilter === 'DA_KY'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-white text-emerald-700 border border-emerald-200'
                }`}
              >
                Đã ký ({quickReport?.daKy ?? 0})
              </button>
            </div>

            {/* Danh sách thẻ mở rộng Inline */}
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-500 font-medium">
                Đang tải danh sách công văn...
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="py-10 bg-white rounded-xl border border-slate-200 text-center p-6">
                <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Không tìm thấy công văn phù hợp</p>
                <p className="text-[11px] text-slate-400 mt-1">Vui lòng thay đổi từ khóa hoặc bộ lọc</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map((rec) => {
                  const isExpanded = expandedRecordId === rec.id;
                  const isUrgent = rec.urgencyLevel === 'HỎA TỐC' || rec.urgencyLevel === 'THƯỢNG KHẨN';
                  const isOverdue =
                    rec.slaDeadline &&
                    new Date(rec.slaDeadline) < new Date() &&
                    rec.currentStatus !== 'DA_KY';

                  return (
                    <div
                      key={rec.id}
                      className={`bg-white rounded-xl border transition shadow-sm overflow-hidden ${
                        isExpanded
                          ? 'border-gov-primary ring-1 ring-gov-primary'
                          : isUrgent
                          ? 'border-red-300 hover:border-red-400'
                          : isOverdue
                          ? 'border-amber-300 hover:border-amber-400'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                        className="p-3 cursor-pointer select-none active:bg-slate-50 transition"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                            {isUrgent && <Flame className="w-3.5 h-3.5 text-gov-danger fill-red-500" />}
                            {rec.incomingDocCode || 'Chưa vào số'}
                          </span>

                          <div className="flex items-center gap-1">
                            {rec.urgencyLevel && rec.urgencyLevel !== 'THƯỜNG' && (
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  isUrgent ? 'bg-red-600 text-white' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {rec.urgencyLevel}
                              </span>
                            )}
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                rec.currentStatus === 'DA_KY'
                                  ? 'bg-purple-100 text-purple-800'
                                  : rec.currentStatus === 'DA_XU_LY'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rec.currentStatus === 'DANG_XU_LY'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {rec.currentStatus === 'DA_KY'
                                ? 'Đã ký'
                                : rec.currentStatus === 'DA_XU_LY'
                                ? 'Đã duyệt'
                                : rec.currentStatus === 'DANG_XU_LY'
                                ? 'Đang xử lý'
                                : 'Chờ xử lý'}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-slate-400 ml-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                            )}
                          </div>
                        </div>

                        <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed">
                          {rec.subjectTitle || rec.originalFileName}
                        </h4>

                        <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                          <span className="truncate max-w-[200px]">
                            {rec.incomingIssuer || 'Văn phòng UBND'}
                          </span>
                          <span className={isOverdue ? 'text-gov-danger font-bold' : ''}>
                            {rec.slaDeadline
                              ? new Date(rec.slaDeadline).toLocaleDateString('vi-VN')
                              : 'Không SLA'}
                          </span>
                        </div>
                      </div>

                      {/* Khung chi tiết mở rộng tại chỗ */}
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/60 text-xs space-y-2.5">
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">
                              Chi tiết công văn
                            </span>
                            {rec.incomingDocCode && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyCode(rec.incomingDocCode || '');
                                }}
                                className="flex items-center gap-1 text-[11px] text-gov-primary font-bold hover:underline"
                              >
                                <Copy className="w-3 h-3" /> Sao chép số hiệu
                              </button>
                            )}
                          </div>

                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
                            <div>
                              <span className="text-slate-500">Cơ quan ban hành: </span>
                              <strong className="text-slate-800">{rec.incomingIssuer || 'Văn phòng UBND'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Cán bộ phụ trách: </span>
                              <strong className="text-slate-800">{rec.userName} ({rec.department})</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Ngày tiếp nhận: </span>
                              <strong className="text-slate-800">
                                {new Date(rec.receivedDate).toLocaleDateString('vi-VN')}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Hạn chót SLA: </span>
                              <strong className={isOverdue ? 'text-gov-danger font-bold' : 'text-slate-800'}>
                                {rec.slaDeadline
                                  ? new Date(rec.slaDeadline).toLocaleDateString('vi-VN', {
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Không ấn định hạn'}
                              </strong>
                            </div>
                          </div>

                          {isOverdue && (
                            <div className="p-2 bg-red-50 border border-red-200 rounded-lg text-[11px] text-gov-danger font-bold flex items-center gap-1.5">
                              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                              <span>Văn bản đã chậm tiến độ SLA quy định.</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => setExpandedRecordId(null)}
                            className="w-full py-1.5 text-center text-slate-500 font-bold text-[11px] hover:text-slate-800"
                          >
                            ▲ Thu gọn chi tiết
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: NHẮC VIỆC SLA (RADAR CHẬM TIẾN ĐỘ & SẮP ĐẾN HẠN, KHÔNG MODAL)
           ========================================================================= */}
        {activeTab === 'sla' && (
          <div className="space-y-3">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">
                Giám sát Tiến độ SLA
              </span>
              <h2 className="text-sm font-black text-slate-900 mt-0.5">
                Nhắc việc & Cảnh báo Chậm tiến độ
              </h2>
              <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                Các văn bản đã quá hạn hoặc sắp đến hạn trong vòng 24 giờ cần đôn đốc giải quyết.
              </p>
            </div>

            {slaRadarRecords.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-slate-800">Không có văn bản trễ hạn</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Toàn bộ công văn hiện tại đều trong hạn SLA quy định.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {slaRadarRecords.map((rec) => {
                  const isExpanded = expandedRecordId === rec.id;
                  const deadline = rec.slaDeadline ? new Date(rec.slaDeadline).getTime() : 0;
                  const now = Date.now();
                  const isOverdue = deadline < now;
                  const hoursDiff = Math.abs(Math.round((deadline - now) / (3600 * 1000)));

                  return (
                    <div
                      key={rec.id}
                      className={`bg-white rounded-xl border shadow-sm transition overflow-hidden ${
                        isOverdue ? 'border-red-300' : 'border-amber-300'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedRecordId(isExpanded ? null : rec.id)}
                        className="p-3 cursor-pointer select-none active:bg-slate-50 transition"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                              isOverdue ? 'bg-gov-danger text-white' : 'bg-amber-600 text-white'
                            }`}
                          >
                            {isOverdue ? `QUÁ HẠN ${hoursDiff}H` : `CÒN ${hoursDiff}H ĐẾN HẠN`}
                          </span>
                          <span className="text-xs font-bold text-slate-800">
                            {rec.incomingDocCode || 'Chưa vào số'}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-900 line-clamp-2 mt-1">
                          {rec.subjectTitle || rec.originalFileName}
                        </h4>

                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 text-[10px] text-slate-500">
                          <span>Cán bộ: {rec.userName}</span>
                          <span className="font-bold text-slate-700">
                            Hạn:{' '}
                            {rec.slaDeadline
                              ? new Date(rec.slaDeadline).toLocaleDateString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })
                              : 'Chưa có'}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-100 bg-slate-50/70 text-xs space-y-2">
                          <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1">
                            <div>
                              <span className="text-slate-500">Cơ quan gửi: </span>
                              <strong>{rec.incomingIssuer || 'Văn phòng UBND'}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Phòng ban phụ trách: </span>
                              <strong>{rec.department}</strong>
                            </div>
                            <div>
                              <span className="text-slate-500">Mức độ khẩn: </span>
                              <strong className="text-red-700">{rec.urgencyLevel || 'THƯỜNG'}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedRecordId(null)}
                            className="w-full py-1 text-center text-slate-500 font-bold text-[11px]"
                          >
                            ▲ Thu gọn
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: TRUNG TÂM THÔNG BÁO PUSH (NƠI NHẬN THÔNG BÁO DUY NHẤT TRÊN MOBILE)
           ========================================================================= */}
        {activeTab === 'notify' && (
          <div className="space-y-3">
            {/* Khung kích hoạt Push Notification */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-red-100 text-gov-primary flex-shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-900">
                    {pushPermission === 'granted'
                      ? 'Thông báo đẩy (Push) đã kích hoạt'
                      : 'Nhận thông báo công văn khẩn trên di động'}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                    {pushPermission === 'granted'
                      ? 'Hệ thống tự động phát cảnh báo khi có văn bản HỎA TỐC hoặc quá hạn SLA.'
                      : 'Bật thông báo để không bỏ lỡ chỉ đạo khẩn cấp từ UBND Tỉnh.'}
                  </p>

                  <div className="mt-2.5 flex items-center gap-2">
                    {pushPermission !== 'granted' ? (
                      <button
                        onClick={handleEnablePush}
                        disabled={isSubscribingPush}
                        className="py-1.5 px-3 bg-gov-primary hover:bg-gov-primary-hover active:bg-gov-primary-dark text-white text-[11px] font-bold rounded-lg transition"
                      >
                        {isSubscribingPush ? 'Đang xin quyền...' : 'Bật thông báo đẩy ngay'}
                      </button>
                    ) : (
                      <button
                        onClick={handleSendTestPush}
                        disabled={isSendingTest}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-900 text-white text-[11px] font-bold rounded-lg transition flex items-center gap-1.5"
                      >
                        <Send className="w-3 h-3" />
                        {isSendingTest ? 'Đang phát...' : 'Thử nghiệm gửi Push Hỏa tốc'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Header danh sách thông báo */}
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-tight">
                Danh sách Thông báo ({notifications.length})
              </h3>
              {notifications.some((n) => !n.isRead) && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-gov-primary font-bold hover:underline flex items-center gap-1"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Đánh dấu đã đọc tất cả
                </button>
              )}
            </div>

            {/* Feed Thông báo */}
            {notifications.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center shadow-sm">
                <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-600">Chưa có thông báo nào mới</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Các thông báo công văn khẩn và SLA sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((item) => {
                  const isUrgent = item.urgencyLevel === 'HỎA TỐC' || item.urgencyLevel === 'THƯỢNG KHẨN';
                  const isSla = item.type === 'SLA_WARNING';

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleMarkAsRead(item.id)}
                      className={`p-3 rounded-xl border transition shadow-sm ${
                        !item.isRead
                          ? isUrgent
                            ? 'bg-red-50/80 border-red-200'
                            : isSla
                            ? 'bg-amber-50/80 border-amber-200'
                            : 'bg-blue-50/70 border-blue-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${
                              isUrgent
                                ? 'bg-red-100 text-gov-danger'
                                : isSla
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isUrgent ? (
                              <Flame className="w-4 h-4" />
                            ) : isSla ? (
                              <AlertTriangle className="w-4 h-4" />
                            ) : (
                              <Bell className="w-4 h-4" />
                            )}
                          </span>

                          <div>
                            <h5
                              className={`text-xs ${
                                !item.isRead ? 'font-black text-slate-900' : 'font-bold text-slate-700'
                              }`}
                            >
                              {item.title}
                            </h5>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                              {item.body}
                            </p>
                            <span className="text-[9px] text-slate-400 block mt-1">
                              {new Date(item.createdAt).toLocaleTimeString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>

                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-gov-danger flex-shrink-0 mt-1" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 5: CÁN BỘ & TOÀN BỘ TIỆN ÍCH (THÔNG TIN, THÔNG BÁO, AI KEY, PROMPT, SKILLS)
           ========================================================================= */}
        {activeTab === 'profile' && (
          <div className="space-y-3">
            {/* THẺ 1: THÔNG TIN ĐỊNH DANH CÁN BỘ PHẲNG */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gov-primary text-white flex items-center justify-center font-black text-base shadow-sm flex-shrink-0">
                  {user?.fullName?.charAt(0) || 'CB'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 truncate">
                      {user?.fullName || 'Cán bộ Công vụ'}
                    </h3>
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-gov-primary border border-red-200">
                      {user?.role}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                    Tài khoản: @{user?.username}
                  </p>
                </div>
              </div>

              {/* Bảng thông tin chi tiết */}
              <div className="mt-3.5 pt-3 border-t border-slate-100 text-xs space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Đơn vị / Phòng ban:</span>
                  <strong className="text-slate-800 text-right">{user?.department || 'Văn phòng UBND Tỉnh'}</strong>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Vai trò cấp quyền:</span>
                  <strong className="text-slate-800">
                    {user?.role === 'ADMIN' ? 'Lãnh đạo Quản lý (Admin)' : 'Chuyên viên Tổng hợp'}
                  </strong>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Trạng thái xác thực:</span>
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Đang hoạt động
                  </span>
                </div>
              </div>
            </div>

            {/* THẺ 2: TIỆN ÍCH CÀI ĐẶT THÔNG BÁO (NOTIFICATION SETTINGS) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSettingsCard('notif')}
                className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-red-50 text-gov-primary">
                    <Bell className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Cài đặt Thông báo & Cảnh báo SLA</h5>
                    <p className="text-[10px] text-slate-500">Tùy biến điều kiện và thời gian nhắc việc công vụ</p>
                  </div>
                </div>
                {openSettingsCard === 'notif' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {openSettingsCard === 'notif' && (
                <div className="p-3.5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                  {/* Toggle 1: Văn bản Hỏa tốc */}
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="pr-3">
                      <span className="text-xs font-bold text-slate-800 block">Thông báo công văn Hỏa tốc & Khẩn</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Phát âm báo và thông báo đẩy ngay khi có công văn khẩn được tiếp nhận.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifPrefs((p) => ({ ...p, urgentDocAlert: !p.urgentDocAlert }))}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        notifPrefs.urgentDocAlert ? 'bg-gov-primary' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifPrefs.urgentDocAlert ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 2: Cảnh báo Quá hạn SLA */}
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="pr-3">
                      <span className="text-xs font-bold text-slate-800 block">Cảnh báo Chậm tiến độ SLA</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Gửi cảnh báo đỏ khi văn bản vượt quá thời hạn xử lý quy định của UBND.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifPrefs((p) => ({ ...p, slaOverdueAlert: !p.slaOverdueAlert }))}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        notifPrefs.slaOverdueAlert ? 'bg-gov-primary' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifPrefs.slaOverdueAlert ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Toggle 3: Nhắc trước hạn SLA */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="pr-3">
                        <span className="text-xs font-bold text-slate-800 block">Nhắc việc trước thời hạn SLA</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Chủ động nhắc nhở chuyên viên hoàn tất trước khi hết hạn.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNotifPrefs((p) => ({ ...p, slaApproachingAlert: !p.slaApproachingAlert }))}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                          notifPrefs.slaApproachingAlert ? 'bg-gov-primary' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            notifPrefs.slaApproachingAlert ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {notifPrefs.slaApproachingAlert && (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-[11px] text-slate-600">Thời gian nhắc trước:</span>
                        <select
                          value={notifPrefs.slaReminderHoursBefore}
                          onChange={(e) => setNotifPrefs((p) => ({ ...p, slaReminderHoursBefore: Number(e.target.value) }))}
                          className="px-2 py-1 bg-slate-50 border border-slate-300 rounded text-xs font-bold text-slate-800 outline-none"
                        >
                          <option value={1}>Trước 01 giờ</option>
                          <option value={2}>Trước 02 giờ</option>
                          <option value={6}>Trước 06 giờ</option>
                          <option value={24}>Trước 24 giờ (1 ngày)</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Toggle 4: Văn bản đã ký ban hành */}
                  <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                    <div className="pr-3">
                      <span className="text-xs font-bold text-slate-800 block">Thông báo văn bản Đã ký ban hành</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Nhận tin báo khi Lãnh đạo phê duyệt ký số và chuyển sang lưu trữ.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifPrefs((p) => ({ ...p, signedDocAlert: !p.signedDocAlert }))}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                        notifPrefs.signedDocAlert ? 'bg-gov-primary' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          notifPrefs.signedDocAlert ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Nút lưu cài đặt thông báo */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveNotifPrefs}
                      disabled={isSavingNotifPrefs}
                      className="flex-1 py-2 px-3 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingNotifPrefs ? 'Đang lưu...' : 'Lưu Cài đặt Thông báo'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenSettingsCard('none')}
                      className="py-2 px-3 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* THẺ 3: TIỆN ÍCH CÀI ĐẶT API AI KEY (BYOK) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSettingsCard('aikey')}
                className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
                    <Cpu className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Cài đặt API AI Key (BYOK)</h5>
                    <p className="text-[10px] text-slate-500">Kết nối khóa API cá nhân bảo mật AES-256</p>
                  </div>
                </div>
                {openSettingsCard === 'aikey' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {openSettingsCard === 'aikey' && (
                <div className="p-3.5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                  {/* Chọn Nhà cung cấp */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Nhà cung cấp Trợ lý AI
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {AI_PROVIDERS.map((prov) => (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => {
                            setAiProvider(prov.id);
                          }}
                          className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition ${
                            aiProvider === prov.id
                              ? 'bg-gov-primary text-white border-gov-primary shadow-2xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {prov.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Nút truy cập cổng chính thức lấy API Key */}
                  {(() => {
                    const activeProv = AI_PROVIDERS.find((p) => p.id === aiProvider) || AI_PROVIDERS[0];
                    return (
                      <div className="p-2.5 bg-slate-100/80 border border-slate-200 rounded-lg flex items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-700">
                          <span className="font-bold block text-slate-800">Cổng cấp khóa: {activeProv.name}</span>
                          <span className="text-[10px] text-slate-500">Mô hình tối ưu tự động lưu cùng khóa</span>
                        </div>
                        <a
                          href={activeProv.apiKeyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gov-primary hover:bg-gov-primary-hover text-white text-[11px] font-semibold rounded-md shadow-2xs shrink-0"
                        >
                          <span>{activeProv.apiKeyUrlLabel}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    );
                  })()}

                  {/* Trạng thái Khóa hiện tại */}
                  {hasApiKey && (
                    <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-emerald-800 uppercase block">Khóa API đã thiết lập</span>
                        <code className="text-xs font-mono font-bold text-emerald-900">{maskedApiKey}</code>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearAiKey}
                        disabled={isSavingAiKey}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Xóa khóa cá nhân"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Nhập Khóa API mới */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      {hasApiKey ? 'Thay đổi Khóa API mới (để trống nếu giữ nguyên)' : 'Nhập Khóa API cá nhân (API Key)'}
                    </label>
                    <div className="relative">
                      <input
                        type={showApiKey ? 'text' : 'password'}
                        value={apiKeyInput}
                        onChange={(e) => handleMobileApiKeyChange(e.target.value)}
                        placeholder="sk-... hoặc AIzaSy..."
                        className="w-full pl-3 pr-9 py-2 bg-white rounded-lg border border-slate-300 text-xs font-mono focus:ring-1 focus:ring-gov-primary focus:border-gov-primary outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Khóa của bạn được mã hóa AES-256-GCM bảo mật và chỉ dùng riêng cho tài khoản công vụ của bạn.
                    </p>
                  </div>

                    {/* Nút Thử Nghiệm API Key (Test AI) */}
                    <button
                      type="button"
                      onClick={() => setIsAiTestModalOpen(true)}
                      className="w-full py-2 px-3 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      <span>🧪 Thử Nghiệm API Key (Test AI)</span>
                    </button>

                    {/* Nút lưu */}
                    <div className="pt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleSaveAiKey}
                        disabled={isSavingAiKey}
                        className="flex-1 py-2 px-3 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSavingAiKey ? 'Đang lưu...' : 'Lưu Khóa API'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setOpenSettingsCard('none')}
                        className="py-2 px-3 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition"
                      >
                        Đóng
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* THẺ MẪU CƠ QUAN & TIÊU ĐỀ NGHỊ ĐỊNH 30 TRÊN MOBILE */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsTemplateModalOpen(true)}
                  className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                      <SlidersHorizontal className="w-4 h-4" />
                    </span>
                    <div>
                      <h5 className="text-xs font-bold text-slate-800">Cài đặt Header & Footer mẫu (NĐ 30)</h5>
                      <p className="text-[10px] text-slate-500">Mẫu cơ quan, Tỉnh/Thành, Chức danh người ký</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-gov-primary px-2 py-1 rounded bg-gov-subtle border border-gov-border">Cài đặt</span>
                </button>
              </div>

            {/* THẺ 4: TIỆN ÍCH CÀI ĐẶT PROMPT / CHỈ DẪN CHUYÊN MÔN */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSettingsCard('prompt')}
                className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-amber-50 text-amber-800">
                    <SlidersHorizontal className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Cài đặt Prompt & Chỉ dẫn Chuyên môn</h5>
                    <p className="text-[10px] text-slate-500">Tùy biến định hướng thẩm định theo đặc thù đơn vị</p>
                  </div>
                </div>
                {openSettingsCard === 'prompt' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {openSettingsCard === 'prompt' && (
                <div className="p-3.5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3">
                  {/* Textarea nhập chỉ dẫn chuyên môn duy nhất */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-700 uppercase">
                        Chỉ dẫn Chuyên môn (System Prompt):
                      </label>
                      <span className="text-[9px] text-slate-400 font-mono">{customPrompt.length} ký tự</span>
                    </div>
                    <textarea
                      rows={7}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Nhập yêu cầu chỉ đạo, căn cứ quy định nội bộ cơ quan, nguyên tắc thẩm định văn bản hành chính theo Nghị định 30/2020/NĐ-CP hoặc phong cách trình bày mà Trợ lý AI cần tuân thủ..."
                      className="w-full p-2.5 bg-white rounded-lg border border-slate-300 text-xs font-mono text-slate-800 leading-relaxed focus:ring-1 focus:ring-gov-primary focus:border-gov-primary outline-none resize-none shadow-2xs"
                    />
                  </div>

                  {/* Nút lưu & Khôi phục mặc định */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSavePrompt}
                      disabled={isSavingPrompt}
                      className="flex-1 py-2 px-3 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingPrompt ? 'Đang lưu...' : 'Lưu Chỉ dẫn Prompt'}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPrompt}
                      className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition flex items-center gap-1 border border-slate-300"
                      title="Khôi phục mẫu gốc"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Mặc định
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* THẺ 5: TIỆN ÍCH CÀI ĐẶT KỸ NĂNG NGHIỆP VỤ (DEPARTMENT SKILLS) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSettingsCard('skills')}
                className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-emerald-50 text-emerald-800">
                    <BookCheck className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Cài đặt Kỹ năng Nghiệp vụ (Skills)</h5>
                    <p className="text-[10px] text-slate-500">Bật/tắt các module đối soát và thẩm định pháp lý</p>
                  </div>
                </div>
                {openSettingsCard === 'skills' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {openSettingsCard === 'skills' && (
                <div className="p-3.5 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-2.5">
                  <p className="text-[10px] text-slate-500 mb-1">
                    Kích hoạt các kịch bản kiểm soát nghiệp vụ tự động khi xử lý công văn:
                  </p>

                  {skillsList.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-start justify-between gap-2.5"
                    >
                      <div className="flex-1 pr-1">
                        <span className="text-xs font-bold text-slate-800 block">{skill.name}</span>
                        <span className="text-[10px] text-slate-500 block mt-0.5 leading-relaxed">
                          {skill.description}
                        </span>
                        <span className="text-[9px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-1.5 border border-emerald-200">
                          {skill.legalRef}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleToggleSkill(skill.id)}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out mt-1 ${
                          skill.isEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            skill.isEnabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}

                  {/* Nút lưu danh mục kỹ năng */}
                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveSkills}
                      disabled={isSavingSkills}
                      className="flex-1 py-2 px-3 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSavingSkills ? 'Đang lưu...' : 'Lưu Cấu hình Kỹ năng'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenSettingsCard('none')}
                      className="py-2 px-3 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* THẺ 6: ĐỔI MẬT KHẨU TRỰC TIẾP (INLINE FORM, KHÔNG DÙNG MODAL) */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleSettingsCard('password')}
                className="w-full p-3.5 text-left flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-lg bg-slate-100 text-slate-700">
                    <KeyRound className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">Đổi mật khẩu cá nhân</h5>
                    <p className="text-[10px] text-slate-500">Cập nhật mật khẩu bảo vệ tài khoản</p>
                  </div>
                </div>
                {openSettingsCard === 'password' ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {openSettingsCard === 'password' && (
                <form onSubmit={handleChangePassword} className="p-3.5 pt-1 border-t border-slate-100 space-y-2.5 bg-slate-50/50">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Mật khẩu hiện tại
                    </label>
                    <input
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu đang dùng"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-gov-primary focus:border-gov-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Mật khẩu mới (tối thiểu 6 ký tự)
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Nhập mật khẩu mới"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-gov-primary focus:border-gov-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 uppercase block mb-1">
                      Xác nhận mật khẩu mới
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs focus:ring-1 focus:ring-gov-primary focus:border-gov-primary outline-none"
                    />
                  </div>

                  <div className="pt-1 flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={isChangingPass}
                      className="flex-1 py-2 px-3 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-lg transition"
                    >
                      {isChangingPass ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenSettingsCard('none')}
                      className="py-2 px-3 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-300 transition"
                    >
                      Hủy
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* THẺ 7: KHUNG PWA CÀI ĐẶT */}
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-lg bg-slate-100 text-slate-700">
                  <Smartphone className="w-4 h-4" />
                </span>
                <div>
                  <h5 className="text-xs font-bold text-slate-800">Cài đặt ứng dụng (PWA)</h5>
                  <p className="text-[10px] text-slate-500">Sử dụng nhanh trực tiếp trên màn hình chính</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => notificationService.triggerPwaInstall()}
                className="py-1.5 px-3 bg-slate-900 hover:bg-black text-white text-[11px] font-bold rounded-lg shadow-sm transition"
              >
                Cài đặt
              </button>
            </div>

            {/* THẺ 8: NÚT ĐĂNG XUẤT AN TOÀN (INLINE CONFIRM, KHÔNG DÙNG MODAL) */}
            <div className="bg-white rounded-xl p-3 border border-slate-200 shadow-sm">
              {!isLogoutConfirming ? (
                <button
                  type="button"
                  onClick={() => setIsLogoutConfirming(true)}
                  className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-gov-danger text-xs font-bold rounded-lg border border-red-200 flex items-center justify-center gap-2 transition"
                >
                  <LogOut className="w-4 h-4" /> Đăng xuất tài khoản cán bộ
                </button>
              ) : (
                <div className="p-2 bg-red-50 rounded-lg border border-red-200 text-center space-y-2">
                  <p className="text-xs font-bold text-gov-danger">
                    Xác nhận kết thúc phiên làm việc cán bộ?
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => logout()}
                      className="py-1.5 px-4 bg-gov-danger text-white text-xs font-bold rounded-lg shadow-sm"
                    >
                      Xác nhận Đăng xuất
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsLogoutConfirming(false)}
                      className="py-1.5 px-3 bg-slate-200 text-slate-700 text-xs font-bold rounded-lg"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TOAST THÔNG BÁO NHỎ GỌN (THAY THẾ TOÀN BỘ MODAL TRÊN MOBILE) */}
      {toastMessage && (
        <div
          className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-50 text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl border flex items-center gap-2 animate-in fade-in slide-in-from-bottom duration-200 max-w-[90vw] truncate ${
            toastType === 'success'
              ? 'bg-slate-900 text-emerald-400 border-emerald-600'
              : toastType === 'error'
              ? 'bg-slate-900 text-red-400 border-red-600'
              : 'bg-slate-900 text-white border-slate-700'
          }`}
        >
          {toastType === 'success' && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          {toastType === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Fixed Bottom Navigation Bar (Duy nhất 1 nút Thông báo có badge) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadCount={unreadCount}
        slaWarningCount={slaWarningCount}
      />

      {/* Modal Thử nghiệm API Key AI */}
      {(() => {
        const activeProv = AI_PROVIDERS.find((p) => p.id === aiProvider) || AI_PROVIDERS[0];
        return (
          <AiTestChatModal
            isOpen={isAiTestModalOpen}
            onClose={() => setIsAiTestModalOpen(false)}
            provider={aiProvider}
            providerName={activeProv.name}
            apiKeyInput={apiKeyInput}
            hasStoredApiKey={hasApiKey}
            apiKeyUrl={activeProv.apiKeyUrl}
            apiKeyUrlLabel={activeProv.apiKeyUrlLabel}
          />
        );
      })()}

      {/* Modal Cài đặt Header & Footer mẫu Nghị định 30 */}
      <TemplateConfigModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onTemplateSaved={() => showToast('Đã lưu mẫu cơ quan mặc định!', 'success')}
      />
    </div>
  );
};
