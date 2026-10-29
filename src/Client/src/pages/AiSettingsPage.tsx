import React, { useState, useEffect } from 'react';
import {
  FileText,
  KeyRound,
  Shield,
  Eye,
  EyeOff,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  BookOpen,
  Bell,
  Scale,
  Save,
  ArrowLeft,
  Check,
  AlertTriangle,
  Sliders,
  Settings,
  HelpCircle,
  ExternalLink,
  Bot,
  Building,
  MapPin,
  Sparkles,
  Plus,
  RefreshCw,
  Edit3,
  Clock,
  Zap,
  XCircle,
  Copy,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { api } from '../services/api';
import {
  UserAiConfig,
  UserNotificationPreferences,
  DepartmentSkillConfigItem,
  DocumentTemplate,
  ApiKeyVaultItem
} from '../types';
import { AiTestChatModal } from '../components/modals/AiTestChatModal';
import { TemplateConfigModal, DEFAULT_TEMPLATE } from '../components/modals/TemplateConfigModal';

interface AiSettingsPageProps {
  onBackToWorkspace: () => void;
}

// Danh sách các nhà cung cấp dịch vụ trí tuệ nhân tạo & Cổng cấp khóa
const AI_PROVIDERS = [
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    description: 'Tối ưu nhận diện tiếng Việt, bóc tách thể thức Nghị định 30/2020 (Hỗ trợ Free Tier & Google AI Pro)',
    defaultModel: 'gemini-1.5-flash',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    apiKeyUrlLabel: 'Lấy khóa API tại Google AI Studio',
  },
  {
    id: 'OPENAI',
    name: 'OpenAI GPT',
    description: 'Mô hình lập luận ngôn ngữ tự nhiên độ chuẩn xác cao',
    defaultModel: 'gpt-4o-mini',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    apiKeyUrlLabel: 'Lấy khóa API tại OpenAI Platform',
  },
  {
    id: 'ANTHROPIC',
    name: 'Anthropic Claude',
    description: 'Văn phong hành chính mượt mà, phân tích tài liệu dài xuất sắc',
    defaultModel: 'claude-3-5-sonnet-20241022',
    apiKeyUrl: 'https://console.anthropic.com/settings/keys',
    apiKeyUrlLabel: 'Lấy khóa API tại Anthropic Console',
  },
  {
    id: 'OPENROUTER',
    name: 'OpenRouter (Multi-Provider)',
    description: 'Cổng đa mô hình hỗ trợ DeepSeek-V3, Llama 3.3, Qwen 2.5',
    defaultModel: 'deepseek/deepseek-chat',
    apiKeyUrl: 'https://openrouter.ai/keys',
    apiKeyUrlLabel: 'Lấy khóa API tại OpenRouter',
  }
];

// Chỉ dẫn chuyên môn mặc định chuẩn thể thức văn bản hành chính
const DEFAULT_SYSTEM_PROMPT =
  'Thẩm định tính pháp lý và thể thức văn bản hành chính theo quy định của Luật Ban hành văn bản quy phạm pháp luật và Nghị định 30/2020/NĐ-CP của Chính phủ. Rà soát chặt chẽ thẩm quyền ban hành, căn cứ pháp lý còn hiệu lực và đề xuất phương án giải quyết tối ưu.';

// Danh mục kỹ năng nghiệp vụ mặc định
const DEFAULT_SKILLS: DepartmentSkillConfigItem[] = [
  {
    id: 'skill-legal-hierarchy',
    name: 'Đối soát Thứ bậc Hiệu lực Pháp lý',
    description: 'Tự động kiểm tra văn bản viện dẫn có phù hợp với văn bản QPPL cấp trên theo Luật Ban hành VBQPPL.',
    isEnabled: true,
    legalRef: 'Luật Ban hành VBQPPL 2015 & Sửa đổi 2020'
  },
  {
    id: 'skill-law-validity',
    name: 'Kiểm soát Thời hạn & Hiệu lực Văn bản',
    description: 'Cảnh báo tức thì nếu điều khoản pháp lý viện dẫn đã hết hiệu lực, bãi bỏ hoặc sửa đổi bổ sung.',
    isEnabled: true,
    legalRef: 'Kho Dữ liệu QPPL Quốc gia'
  },
  {
    id: 'skill-authority-check',
    name: 'Thẩm định Thẩm quyền Ban hành',
    description: 'Rà soát tính đúng thẩm quyền ký duyệt và ban hành văn bản theo Luật Tổ chức chính quyền địa phương.',
    isEnabled: true,
    legalRef: 'Luật Tổ chức CQĐP 2015 & Sửa đổi 2019'
  },
  {
    id: 'skill-format-nd30',
    name: 'Chuẩn hóa Thể thức Nghị định 30/2020',
    description: 'Tự động kiểm tra bố cục, phông chữ, cỡ chữ, số ký hiệu và trích yếu văn bản hành chính nhà nước.',
    isEnabled: true,
    legalRef: 'Nghị định 30/2020/NĐ-CP của Chính phủ'
  },
  {
    id: 'skill-urgency-sla',
    name: 'Tự động Nhận diện Mức độ Khẩn & SLA',
    description: 'Tự động phát hiện công văn HỎA TỐC, THƯỢNG KHẨN và thiết lập mốc đếm ngược thời hạn giải quyết.',
    isEnabled: true,
    legalRef: 'Quy chế Tiếp nhận & Xử lý UBND Tỉnh'
  }
];

export const AiSettingsPage: React.FC<AiSettingsPageProps> = ({ onBackToWorkspace }) => {
  // Active AI Provider & Key State
  const [provider, setProvider] = useState<string>('GEMINI');
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [maskedKey, setMaskedKey] = useState<string | undefined>(undefined);

  // Multi-Key Vault State
  const [vaultKeys, setVaultKeys] = useState<ApiKeyVaultItem[]>([]);
  const [activatingKeyId, setActivatingKeyId] = useState<string | null>(null);
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);
  const [editingKeyId, setEditingKeyId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string>('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<boolean>(false);

  // New Key Form State
  const [newKeyProvider, setNewKeyProvider] = useState<string>('GEMINI');
  const [newKeyInput, setNewKeyInput] = useState<string>('');
  const [newKeyLabel, setNewKeyLabel] = useState<string>('');
  const [showNewKeyText, setShowNewKeyText] = useState<boolean>(false);
  const [addingKey, setAddingKey] = useState<boolean>(false);

  // Modal State for Testing specific key
  const [testModalKey, setTestModalKey] = useState<ApiKeyVaultItem | null>(null);

  // Custom Prompt State (Chỉ dẫn chuyên môn)
  const [customPrompt, setCustomPrompt] = useState<string>(DEFAULT_SYSTEM_PROMPT);
  const [detectingModels, setDetectingModels] = useState<boolean>(false);

  const handleDetectModels = async (keyToDetect?: string) => {
    try {
      setDetectingModels(true);
      const res = await api.detectGeminiModels(keyToDetect || newKeyInput.trim() || undefined);
      if (res.success && res.availableModels.length > 0) {
        showToast(`Đã nhận diện ${res.count} mô hình khả dụng! Mô hình tối ưu: ${res.recommendedModel}`, 'success');
      } else {
        showToast('Khóa API đã kích hoạt mô hình gemini-1.5-flash tối ưu cho gói Free Tier/Google AI Pro.', 'info');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể tự động dò tìm mô hình. Vui lòng kiểm tra lại API Key.', 'error');
    } finally {
      setDetectingModels(false);
    }
  };

  // Department Skills State
  const [skills, setSkills] = useState<DepartmentSkillConfigItem[]>(DEFAULT_SKILLS);

  // Notification Preferences State
  const [notifPrefs, setNotifPrefs] = useState<UserNotificationPreferences>({
    urgentDocAlert: true,
    slaOverdueAlert: true,
    slaApproachingAlert: true,
    signedDocAlert: true,
    slaReminderHoursBefore: 2
  });

  // Modal State for Testing & Template
  const [isTestChatModalOpen, setIsTestChatModalOpen] = useState<boolean>(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState<boolean>(false);
  const [docTemplate, setDocTemplate] = useState<DocumentTemplate>(DEFAULT_TEMPLATE);

  // UI State
  const [loading, setLoading] = useState<boolean>(false);
  const [savingKey, setSavingKey] = useState<boolean>(false);
  const [savingPrompt, setSavingPrompt] = useState<boolean>(false);
  const [savingSkills, setSavingSkills] = useState<boolean>(false);
  const [savingNotif, setSavingNotif] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');

  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const config: UserAiConfig = await api.getAiConfig();

      if (config.provider) setProvider(config.provider);
      setHasApiKey(config.hasApiKey);
      setMaskedKey(config.maskedApiKey);

      if (config.apiKeysVault && config.apiKeysVault.length > 0) {
        setVaultKeys(config.apiKeysVault);
      } else {
        try {
          const v = await api.getApiKeysVault();
          if (v && v.length > 0) setVaultKeys(v);
        } catch { }
      }

      if (config.customPrompt) {
        setCustomPrompt(config.customPrompt);
      }

      if (config.enabledSkillsJson) {
        try {
          const parsed = JSON.parse(config.enabledSkillsJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setSkills(parsed);
          }
        } catch { }
      }

      if (config.notificationPreferencesJson) {
        try {
          const parsed = JSON.parse(config.notificationPreferencesJson);
          if (parsed && typeof parsed === 'object') {
            setNotifPrefs((prev) => ({ ...prev, ...parsed }));
          }
        } catch { }
      }

      try {
        const tpl = await api.getDocumentTemplate().catch(() => null);
        if (tpl && tpl.provinceCity) {
          setDocTemplate(tpl);
        } else {
          const cached = localStorage.getItem('gov_doc_template');
          if (cached) {
            try {
              setDocTemplate(JSON.parse(cached));
            } catch { }
          }
        }
      } catch { }
    } catch (err: any) {
      console.error(err);
      showToast('Không thể tải cấu hình AI cá nhân từ máy chủ.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tự động nhận diện nhà cung cấp khi cán bộ dán mã API Key mới
  const handleNewKeyChange = (val: string) => {
    setNewKeyInput(val);
    const trimmed = val.trim();
    if (trimmed.startsWith('AIzaSy')) {
      if (newKeyProvider !== 'GEMINI') {
        setNewKeyProvider('GEMINI');
        showToast('Đã tự động nhận diện khóa Google Gemini!', 'info');
      }
    } else if (trimmed.startsWith('sk-ant')) {
      if (newKeyProvider !== 'ANTHROPIC') {
        setNewKeyProvider('ANTHROPIC');
        showToast('Đã tự động nhận diện khóa Anthropic Claude!', 'info');
      }
    } else if (trimmed.startsWith('sk-or-')) {
      if (newKeyProvider !== 'OPENROUTER') {
        setNewKeyProvider('OPENROUTER');
        showToast('Đã tự động nhận diện khóa OpenRouter!', 'info');
      }
    } else if (trimmed.startsWith('sk-')) {
      if (newKeyProvider !== 'OPENAI') {
        setNewKeyProvider('OPENAI');
        showToast('Đã tự động nhận diện khóa OpenAI!', 'info');
      }
    }
  };

  // Thêm API Key mới vào danh sách
  const handleAddNewKey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newKeyInput.trim()) {
      showToast('Vui lòng nhập chuỗi khóa API trước khi lưu.', 'error');
      return;
    }

    try {
      setAddingKey(true);
      const res = await api.addApiKey({
        provider: newKeyProvider,
        apiKey: newKeyInput.trim(),
        label: newKeyLabel.trim() || undefined,
        autoTestAndActivate: false
      });

      const updatedConfig = await api.getAiConfig();
      if (updatedConfig.apiKeysVault) {
        setVaultKeys(updatedConfig.apiKeysVault);
      }
      if (updatedConfig.provider) setProvider(updatedConfig.provider);
      setHasApiKey(updatedConfig.hasApiKey);
      setMaskedKey(updatedConfig.maskedApiKey);

      setNewKeyInput('');
      setNewKeyLabel('');
      setShowAddForm(false);
      showToast('Đã thêm khóa API vào danh sách thành công!', 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err?.response?.data?.message || 'Không thể thêm khóa vào danh sách.', 'error');
    } finally {
      setAddingKey(false);
    }
  };

  // Kích hoạt 1 khóa làm nguồn xử lý AI chính
  const handleActivateKey = async (item: ApiKeyVaultItem) => {
    try {
      setActivatingKeyId(item.id);
      const res = await api.activateApiKey(item.id);
      setVaultKeys(res.vault);
      setProvider(res.activeKey.provider);
      setMaskedKey(res.activeKey.maskedKey);
      setHasApiKey(true);
      showToast(res.message, 'success');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể kích hoạt khóa.', 'error');
    } finally {
      setActivatingKeyId(null);
    }
  };

  // Xóa 1 khóa khỏi két bảo mật
  const handleDeleteKey = async (item: ApiKeyVaultItem) => {
    if (!window.confirm(`Đồng chí có chắc chắn muốn xóa khóa "${item.label}" (${item.provider}) khỏi két bảo mật?`)) {
      return;
    }
    try {
      setDeletingKeyId(item.id);
      const res = await api.deleteApiKey(item.id);
      setVaultKeys(res.vault);
      const active = res.vault.find((k) => k.isActive);
      if (active) {
        setProvider(active.provider);
        setMaskedKey(active.maskedKey);
        setHasApiKey(true);
      } else {
        setHasApiKey(false);
        setMaskedKey(undefined);
      }
      showToast(res.message, 'info');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể xóa khóa.', 'error');
    } finally {
      setDeletingKeyId(null);
    }
  };

  // Đổi nhãn/tên mô tả khóa
  const handleSaveLabel = async (id: string) => {
    if (!editingLabel.trim()) {
      setEditingKeyId(null);
      return;
    }
    try {
      const res = await api.updateApiKeyLabel(id, editingLabel.trim());
      setVaultKeys((prev) =>
        prev.map((k) => (k.id === id ? { ...k, label: res.item.label } : k))
      );
      showToast('Đã đổi tên khóa thành công!');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Không thể cập nhật tên khóa.', 'error');
    } finally {
      setEditingKeyId(null);
    }
  };

  // Copy masked key
  const handleCopyMasked = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Lưu Chỉ dẫn Prompt
  const handleSavePrompt = async () => {
    try {
      setSavingPrompt(true);
      await api.updateAiConfig({
        customPrompt: customPrompt.trim()
      });
      showToast('Đã lưu chỉ dẫn prompt chuyên môn thành công!');
    } catch (err: any) {
      console.error(err);
      showToast('Không thể lưu chỉ dẫn prompt.', 'error');
    } finally {
      setSavingPrompt(false);
    }
  };

  // Lưu Kỹ năng nghiệp vụ
  const handleSaveSkills = async () => {
    try {
      setSavingSkills(true);
      await api.updateAiConfig({
        enabledSkillsJson: JSON.stringify(skills)
      });
      showToast('Đã lưu cấu hình kỹ năng nghiệp vụ thành công!');
    } catch (err: any) {
      console.error(err);
      showToast('Không thể lưu cấu hình kỹ năng.', 'error');
    } finally {
      setSavingSkills(false);
    }
  };

  // Toggle từng kỹ năng
  const handleToggleSkill = (id: string) => {
    setSkills((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  // Lưu Cài đặt thông báo
  const handleSaveNotif = async () => {
    try {
      setSavingNotif(true);
      await api.updateAiConfig({
        notificationPreferencesJson: JSON.stringify(notifPrefs)
      });
      showToast('Đã lưu cấu hình cài đặt thông báo SLA thành công!');
    } catch (err: any) {
      console.error(err);
      showToast('Không thể lưu cài đặt thông báo.', 'error');
    } finally {
      setSavingNotif(false);
    }
  };

  const selectedProviderObj = AI_PROVIDERS.find((p) => p.id === provider) || AI_PROVIDERS[0];

  return (
    <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6 select-none">
      {/* 1. TOP BANNER TIÊU ĐỀ & ACTIONS */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gov-primary-light/60 flex items-center justify-center text-gov-primary shadow-xs">
            <Sliders className="w-6 h-6 text-gov-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-gov-text">
                Cài Đặt Cấu Hình Trợ Lý AI & Chỉ Dẫn Chuyên Môn
              </h2>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold border border-blue-200">
                Bảo mật mã hóa AES-256-GCM
              </span>
            </div>
            <p className="text-xs text-gov-text-secondary mt-0.5">
              Thiết lập khóa cá nhân (BYOK), tinh chỉnh System Prompt theo ngành và kích hoạt các module đối soát quy chuẩn hành chính.
            </p>
          </div>
        </div>
      </div>

      {/* TOAST THÔNG BÁO TỨC THỜI */}
      {toastMessage && (
        <div
          className={`fixed top-20 right-6 z-50 text-xs font-bold px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 duration-200 max-w-md ${toastType === 'success'
            ? 'bg-slate-900 text-emerald-400 border-emerald-600'
            : toastType === 'error'
              ? 'bg-slate-900 text-red-400 border-red-600'
              : 'bg-slate-900 text-white border-slate-700'
            }`}
        >
          {toastType === 'success' && <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
          {toastType === 'error' && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 2. KHỐI NỘI DUNG CHÍNH (GRID 2 CỘT RESPONSIVE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* =========================================================
            KHỐI 1: KÉT BẢO MẬT & QUẢN LÝ ĐA KHÓA API (MULTI-KEY VAULT)
           ========================================================= */}
        <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden flex flex-col">
          {/* Header Khối 1 */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-blue-50 text-blue-700 shadow-2xs">
                <KeyRound className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider flex items-center gap-2">
                  <span>Quản Lý Danh Sách Khóa API (API Keys)</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {vaultKeys.length} khóa
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cài đặt danh sách các khóa AI, kích hoạt nhanh và chat thử nghiệm trực tiếp
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="px-3 py-1.5 text-xs font-bold bg-gov-primary hover:bg-gov-primary-hover text-white rounded-lg shadow-2xs transition flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showAddForm ? 'Đóng lại' : 'Thêm khóa mới'}</span>
              </button>
            </div>
          </div>

          <div className="p-5 space-y-4 flex-1">
            {/* FORM THÊM KHÓA MỚI VÀO DANH SÁCH */}
            {showAddForm && (
              <div className="p-4 bg-blue-50/40 rounded-xl border-2 border-blue-200 space-y-3.5 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-blue-600 text-white">
                      <Plus className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                      Thêm Khóa API Mới Vào Danh Sách
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                  >
                    Đóng
                  </button>
                </div>

                {/* Chọn Nhà cung cấp */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">
                    Nhà cung cấp:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {AI_PROVIDERS.map((prov) => {
                      const isSel = newKeyProvider === prov.id;
                      return (
                        <button
                          key={prov.id}
                          type="button"
                          onClick={() => setNewKeyProvider(prov.id)}
                          className={`p-2 rounded-lg border text-left text-xs transition ${isSel
                              ? 'border-blue-600 bg-blue-600 text-white font-bold shadow-2xs'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium'
                            }`}
                        >
                          <div className="truncate">{prov.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Nhập Chuỗi API Key */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase">
                      Mã Khóa API (API Key):
                    </label>
                    <a
                      href={AI_PROVIDERS.find((p) => p.id === newKeyProvider)?.apiKeyUrl || 'https://aistudio.google.com/app/apikey'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Lấy khóa chính thức</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showNewKeyText ? 'text' : 'password'}
                      value={newKeyInput}
                      onChange={(e) => handleNewKeyChange(e.target.value)}
                      placeholder="Dán mã khóa API (ví dụ: AIzaSy... hoặc sk-...)"
                      className="w-full pl-3 pr-10 py-2 bg-white rounded-xl border border-slate-300 text-xs font-mono text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewKeyText(!showNewKeyText)}
                      className="absolute right-3 top-2 text-slate-400 hover:text-slate-600"
                      title={showNewKeyText ? 'Ẩn' : 'Hiện'}
                    >
                      {showNewKeyText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Tên mô tả / Nhãn ghi nhớ */}
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 uppercase">
                    Tên gợi nhớ (Tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="Ví dụ: Google AI Pro Cá Nhân, Khóa OpenAI Văn Phòng, v.v."
                    className="w-full px-3 py-1.5 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {/* Nút Submit thêm khóa */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-blue-200">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleAddNewKey}
                    disabled={addingKey || !newKeyInput.trim()}
                    className="px-4 py-2 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-lg shadow-sm transition disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {addingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>{addingKey ? 'Đang lưu...' : 'Lưu vào danh sách'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* DANH SÁCH CÁC KHÓA (HIỂN THỊ 1 DÒNG GỌN GÀNG) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Danh sách khóa đã cài đặt ({vaultKeys.length}):
                </span>
                <span className="text-[11px] text-slate-500">
                  Bấm <strong className="text-gov-primary font-bold">Kích hoạt</strong> để đổi khóa hoặc <strong className="text-blue-700 font-bold">Chat thử</strong> để kiểm tra
                </span>
              </div>

              {vaultKeys.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-300 rounded-xl">
                  <KeyRound className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
                  <p className="text-xs font-bold text-slate-700">Chưa có khóa API nào trong danh sách</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Hãy bấm nút <strong className="text-gov-primary font-bold">"Thêm khóa mới"</strong> ở góc trên để cài đặt khóa Google AI, OpenAI, Claude hoặc OpenRouter.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(true)}
                    className="mt-3 px-3.5 py-1.5 text-xs font-bold bg-gov-primary hover:bg-gov-primary-hover text-white rounded-lg shadow-2xs transition inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm khóa đầu tiên</span>
                  </button>
                </div>
              ) : (
                vaultKeys.map((key) => {
                  const isActive = key.isActive;
                  const isError = key.status === 'ERROR';
                  const isActivating = activatingKeyId === key.id;
                  const isDeleting = deletingKeyId === key.id;

                  return (
                    <div
                      key={key.id}
                      className={`p-2.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-2.5 ${isActive
                          ? 'border-emerald-500 bg-emerald-50/20 shadow-2xs ring-1 ring-emerald-400'
                          : isError
                            ? 'border-rose-200 bg-rose-50/10 hover:border-rose-300'
                            : 'border-slate-200 bg-white hover:border-slate-300 shadow-2xs'
                        }`}
                    >
                      {/* Cột 1: Tên key + Provider */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {editingKeyId === key.id ? (
                          <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                            <input
                              type="text"
                              value={editingLabel}
                              onChange={(e) => setEditingLabel(e.target.value)}
                              className="px-2 py-0.5 text-xs font-bold border border-blue-400 rounded outline-none bg-white w-full"
                              placeholder="Tên gợi nhớ..."
                              autoFocus
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveLabel(key.id)}
                              className="px-2 py-0.5 text-[11px] font-bold bg-blue-600 text-white rounded shrink-0"
                            >
                              Lưu
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingKeyId(null)}
                              className="px-1.5 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 rounded shrink-0"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-xs font-bold text-slate-800 truncate" title={key.label}>
                              {key.label}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingKeyId(key.id);
                                setEditingLabel(key.label);
                              }}
                              className="text-slate-400 hover:text-slate-600 p-0.5 shrink-0"
                              title="Đổi tên khóa"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Các cột còn lại gom thành flex items căn phải */}
                      <div className="flex items-center flex-wrap gap-2 sm:gap-3 shrink-0">
                        {/* Cột 2: Thông tin key + nút Copy */}
                        <div className="flex items-center gap-1 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          <code className="text-[11px] font-mono text-slate-600">
                            {key.maskedKey || '••••••••••••'}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyMasked(key.id, key.maskedKey)}
                            className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition"
                            title="Sao chép khóa"
                          >
                            {copiedKeyId === key.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        {/* Cột 3: Trạng thái lỗi */}
                        {isError ? (
                          <span
                            className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 flex items-center gap-1 cursor-help"
                            title={key.lastErrorReason || 'Khóa bị lỗi kết nối hoặc hết hạn mức'}
                          >
                            <XCircle className="w-3 h-3 text-rose-600 shrink-0" />
                            <span>Lỗi</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>Bình thường</span>
                          </span>
                        )}

                        {/* Cột 4: Trạng thái Active */}
                        {isActive ? (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-2xs">
                            <CheckCircle2 className="w-3 h-3 text-white shrink-0" />
                            <span>Đang dùng</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleActivateKey(key)}
                            disabled={isActivating}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 hover:bg-emerald-100 hover:text-emerald-800 border border-slate-200 transition disabled:opacity-50"
                            title="Bấm để kích hoạt khóa này"
                          >
                            {isActivating ? 'Đang bật...' : 'Kích hoạt'}
                          </button>
                        )}

                        {/* Cột 5: Nút Chat thử */}
                        <button
                          type="button"
                          onClick={() => {
                            setTestModalKey(key);
                            setIsTestChatModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold bg-white text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-lg shadow-2xs transition flex items-center gap-1"
                          title="Chat thử nghiệm trực tiếp với khóa AI này"
                        >
                          <Bot className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Chat thử</span>
                        </button>

                        {/* Cột 6: Nút Xóa */}
                        <button
                          type="button"
                          onClick={() => handleDeleteKey(key)}
                          disabled={deletingKeyId === key.id}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition disabled:opacity-50"
                          title="Xóa khóa này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* =========================================================
            KHỐI 2: CÀI ĐẶT PROMPT & CHỈ DẪN CHUYÊN MÔN
           ========================================================= */}
        <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-gov-primary-light/50 text-gov-primary">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  2. Cài đặt Prompt & Chỉ dẫn Chuyên môn
                </h3>
                <p className="text-[11px] text-slate-500">Khung lưu trữ chỉ đạo nghiệp vụ, định hướng thẩm định theo đặc thù đơn vị</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex-1 flex flex-col">
              {/* Ô soạn thảo Chỉ dẫn Chuyên môn duy nhất */}
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase">
                  Nội dung Chỉ dẫn Chuyên môn (System Prompt):
                </label>
                <span className="text-[11px] text-slate-400">Áp dụng trực tiếp khi bóc tách & soạn thảo</span>
              </div>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={11}
                placeholder="Nhập yêu cầu chỉ đạo nghiệp vụ, căn cứ quy định nội bộ cơ quan, nguyên tắc thẩm định văn bản hành chính theo Nghị định 30/2020/NĐ-CP hoặc phong cách trình bày mà Trợ lý AI cần tuân thủ nghiêm ngặt..."
                className="w-full flex-1 min-h-[220px] p-3.5 bg-white rounded-xl border border-slate-300 text-xs text-slate-800 leading-relaxed outline-none focus:ring-2 focus:ring-gov-primary focus:border-gov-primary resize-none shadow-2xs font-mono"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span>Trợ lý AI sẽ tuân thủ nghiêm ngặt chỉ dẫn này khi xử lý & thẩm định hồ sơ</span>
                <span className="font-mono">{customPrompt.length} ký tự</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleSavePrompt}
                disabled={savingPrompt}
                className="flex-1 py-2.5 px-4 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingPrompt ? 'Đang lưu chỉ dẫn...' : 'Lưu Chỉ Dẫn Chuyên Môn'}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomPrompt(DEFAULT_SYSTEM_PROMPT);
                  showToast('Đã khôi phục chỉ dẫn chuyên môn chuẩn ban đầu.', 'info');
                }}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-300 transition"
                title="Khôi phục chỉ dẫn chuyên môn chuẩn ban đầu"
              >
                Mặc định
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            KHỐI 3: CÀI ĐẶT KỸ NĂNG NGHIỆP VỤ HÀNH CHÍNH (SKILLS)
           ========================================================= */}
        <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-amber-50 text-amber-700">
                <Scale className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  3. Kỹ Năng Nghiệp Vụ Hành Chính (Skills)
                </h3>
                <p className="text-[11px] text-slate-500">Bật/tắt các module đối soát và thẩm định pháp lý tự động</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2.5">
              {skills.map((skill) => (
                <div
                  key={skill.id}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <span className="text-xs font-bold text-slate-800 block">{skill.name}</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5 leading-relaxed">
                      {skill.description}
                    </span>
                    {skill.legalRef && (
                      <span className="inline-block mt-1 text-[10px] font-semibold text-gov-primary bg-gov-primary-light/40 px-2 py-0.5 rounded">
                        {skill.legalRef}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleSkill(skill.id)}
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${skill.isEnabled ? 'bg-gov-primary' : 'bg-slate-300'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${skill.isEnabled ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveSkills}
                disabled={savingSkills}
                className="w-full py-2.5 px-4 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingSkills ? 'Đang lưu kỹ năng...' : 'Lưu Cấu Hình Kỹ Năng'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            KHỐI 4: CÀI ĐẶT THÔNG BÁO & CẢNH BÁO SLA
           ========================================================= */}
        <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden flex flex-col">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-red-50 text-red-700">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  4. Cài Đặt Thông Báo & Cảnh Báo SLA
                </h3>
                <p className="text-[11px] text-slate-500">Tùy biến điều kiện cảnh báo đôn đốc giải quyết công văn</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-3">
              {/* Toggle 1: Văn bản Hỏa tốc */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="pr-3">
                  <span className="text-xs font-bold text-slate-800 block">Thông báo công văn Hỏa tốc & Khẩn</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Phát cảnh báo ưu tiên cao ngay khi có công văn khẩn được tiếp nhận vào sổ.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({ ...prev, urgentDocAlert: !prev.urgentDocAlert }))
                  }
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${notifPrefs.urgentDocAlert ? 'bg-gov-primary' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${notifPrefs.urgentDocAlert ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Cảnh báo Quá hạn SLA */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="pr-3">
                  <span className="text-xs font-bold text-slate-800 block">Cảnh báo Chậm tiến độ SLA</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Gửi cảnh báo đỏ khi văn bản vượt quá thời hạn giải quyết theo quy định.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({ ...prev, slaOverdueAlert: !prev.slaOverdueAlert }))
                  }
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${notifPrefs.slaOverdueAlert ? 'bg-gov-primary' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${notifPrefs.slaOverdueAlert ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Nhắc việc trước hạn SLA */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="pr-3">
                    <span className="text-xs font-bold text-slate-800 block">Nhắc việc trước thời hạn SLA</span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Chủ động nhắc nhở chuyên viên hoàn tất trước khi hết hạn.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setNotifPrefs((prev) => ({ ...prev, slaApproachingAlert: !prev.slaApproachingAlert }))
                    }
                    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${notifPrefs.slaApproachingAlert ? 'bg-gov-primary' : 'bg-slate-300'
                      }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${notifPrefs.slaApproachingAlert ? 'translate-x-4' : 'translate-x-0'
                        }`}
                    />
                  </button>
                </div>

                {notifPrefs.slaApproachingAlert && (
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-semibold">Thời gian nhắc trước:</span>
                    <select
                      value={notifPrefs.slaReminderHoursBefore}
                      onChange={(e) =>
                        setNotifPrefs((prev) => ({
                          ...prev,
                          slaReminderHoursBefore: Number(e.target.value)
                        }))
                      }
                      className="px-2.5 py-1 bg-white rounded-lg border border-slate-300 text-xs font-bold text-slate-800 outline-none"
                    >
                      <option value={1}>Trước 01 giờ</option>
                      <option value={2}>Trước 02 giờ</option>
                      <option value={6}>Trước 06 giờ</option>
                      <option value={24}>Trước 24 giờ (1 ngày)</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Toggle 4: Văn bản Đã ký */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="pr-3">
                  <span className="text-xs font-bold text-slate-800 block">Thông báo văn bản Đã ký ban hành</span>
                  <span className="text-[11px] text-slate-500 block mt-0.5">
                    Nhận thông báo khi Lãnh đạo phê duyệt ký số và chuyển sang lưu trữ.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setNotifPrefs((prev) => ({ ...prev, signedDocAlert: !prev.signedDocAlert }))
                  }
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${notifPrefs.signedDocAlert ? 'bg-gov-primary' : 'bg-slate-300'
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${notifPrefs.signedDocAlert ? 'translate-x-4' : 'translate-x-0'
                      }`}
                  />
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveNotif}
                disabled={savingNotif}
                className="w-full py-2.5 px-4 bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingNotif ? 'Đang lưu cài đặt...' : 'Lưu Cài Đặt Thông Báo'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* =========================================================
            KHỐI 5: MẪU THỂ THỨC CƠ QUAN & ĐỊA PHƯƠNG (NGHỊ ĐỊNH 30)
           ========================================================= */}
        <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden flex flex-col lg:col-span-2">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-blue-100 text-blue-800">
                <Building className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold uppercase text-slate-800 tracking-wider">
                  5. Cài Đặt Mẫu Thể Thức Cơ Quan & Địa Phương (Header & Footer Nghị định 30/2020)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Cấu hình Tỉnh/Thành phố, Tên cơ quan ban hành và chức vụ ký duyệt để lấy tự động khi bóc tách & soạn thảo văn bản
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsTemplateModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Cấu hình chi tiết</span>
            </button>
          </div>

          <div className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Địa danh Tỉnh/TP</span>
                <span className="text-xs font-bold text-blue-900 mt-1 block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                  {docTemplate.provinceCity || 'Quảng Trị'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Cơ quan ban hành</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block uppercase">
                  {docTemplate.issuingAgency || 'VĂN PHÒNG'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Số / Ký hiệu mẫu</span>
                <span className="text-xs font-mono font-bold text-slate-700 mt-1 block">
                  {docTemplate.docCodeTemplate || '.../VP-UBND'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Chức danh người ký</span>
                <span className="text-xs font-bold text-slate-800 mt-1 block uppercase">
                  {docTemplate.signerPosition || 'CHÁNH VĂN PHÒNG'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Thử nghiệm API Key và Trò chuyện với AI */}
      <AiTestChatModal
        isOpen={isTestChatModalOpen}
        onClose={() => {
          setIsTestChatModalOpen(false);
          setTestModalKey(null);
        }}
        provider={testModalKey ? testModalKey.provider : provider}
        providerName={testModalKey ? (AI_PROVIDERS.find((p) => p.id === testModalKey.provider)?.name || testModalKey.provider) : selectedProviderObj.name}
        apiKeyInput=""
        hasStoredApiKey={true}
        apiKeyUrl={selectedProviderObj.apiKeyUrl}
        apiKeyUrlLabel={selectedProviderObj.apiKeyUrlLabel}
      />

      {/* Modal Cài đặt Template Header & Footer */}
      <TemplateConfigModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onTemplateSaved={(updated) => {
          setDocTemplate(updated);
          showToast('Đã đồng bộ mẫu thể thức cơ quan thành công!', 'success');
        }}
      />
    </div>
  );
};

export default AiSettingsPage;
