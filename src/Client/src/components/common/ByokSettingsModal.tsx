import React, { useState, useEffect } from 'react';
import {
  Cpu,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  Trash2,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { UserAiConfig } from '../../types';

interface ByokSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PROVIDER_OPTIONS = [
  {
    id: 'GEMINI',
    name: 'Google Gemini',
    description: 'Tối ưu xử lý tiếng Việt & Nghị định 30/2020/NĐ-CP',
    defaultModel: 'gemini-1.5-pro',
    models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash-exp'],
  },
  {
    id: 'OPENAI',
    name: 'OpenAI (GPT-4o)',
    description: 'Mô hình lập luận ngôn ngữ tự nhiên độ chuẩn xác cao',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1-preview'],
  },
  {
    id: 'CLAUDE',
    name: 'Anthropic Claude',
    description: 'Văn phong hành chính mượt mà, văn bản dài',
    defaultModel: 'claude-3-5-sonnet-20241022',
    models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  },
  {
    id: 'OPENROUTER',
    name: 'OpenRouter (Multi-model)',
    description: 'Hỗ trợ DeepSeek-V3, Llama 3, Qwen 2.5',
    defaultModel: 'deepseek/deepseek-chat',
    models: ['deepseek/deepseek-chat', 'meta-llama/llama-3.3-70b-instruct', 'qwen/qwen-2.5-72b-instruct'],
  },
];

export const ByokSettingsModal: React.FC<ByokSettingsModalProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState('GEMINI');
  const [model, setModel] = useState('gemini-1.5-pro');
  const [apiKey, setApiKey] = useState('');
  const [maskedKey, setMaskedKey] = useState<string | undefined>(undefined);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [department, setDepartment] = useState('');
  const [showKey, setShowKey] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadConfig();
    }
  }, [isOpen]);

  const loadConfig = async () => {
    try {
      setFetching(true);
      setError(null);
      const data: UserAiConfig = await api.getAiConfig();
      setProvider(data.provider || 'GEMINI');
      setModel(data.model || 'gemini-1.5-pro');
      setHasApiKey(data.hasApiKey);
      setMaskedKey(data.maskedApiKey);
      setDepartment(data.department || '');
      setApiKey('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải cấu hình AI cá nhân.');
    } finally {
      setFetching(false);
    }
  };

  if (!isOpen) return null;

  const handleProviderChange = (newProvider: string) => {
    setProvider(newProvider);
    const matched = PROVIDER_OPTIONS.find((p) => p.id === newProvider);
    if (matched && (!model || !matched.models.includes(model))) {
      setModel(matched.defaultModel);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      setLoading(true);
      const updated = await api.updateAiConfig({
        provider,
        model,
        apiKey: apiKey.trim() || undefined,
      });

      setHasApiKey(updated.hasApiKey);
      setMaskedKey(updated.maskedApiKey);
      setApiKey('');
      setSuccess('Đã lưu và mã hóa cấu hình AI cá nhân (AES-256-GCM) thành công!');
      setTimeout(() => {
        setSuccess(null);
      }, 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể cập nhật cấu hình AI cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearKey = async () => {
    if (!window.confirm('Đồng chí có chắc chắn muốn xóa khóa cá nhân và sử dụng khóa mặc định của hệ thống?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const updated = await api.updateAiConfig({
        provider,
        model,
        apiKey: '', // Empty string instructs backend to nullify
      });

      setHasApiKey(updated.hasApiKey);
      setMaskedKey(undefined);
      setApiKey('');
      setSuccess('Đã hủy khóa cá nhân. Hệ thống sẽ sử dụng khóa AI mặc định.');
      setTimeout(() => setSuccess(null), 2500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể xóa khóa cá nhân.');
    } finally {
      setLoading(false);
    }
  };

  const currentProviderMeta = PROVIDER_OPTIONS.find((p) => p.id === provider) || PROVIDER_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gov-border w-full max-w-xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-gov-gold" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Cấu hình AI cá nhân (BYOK - Bring Your Own Key)
              </h3>
              <p className="text-[11px] text-white/80 font-normal">
                Bảo vệ an ninh dữ liệu - Mã hóa chuẩn AES-256-GCM
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {fetching ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-gov-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-gov-primary" />
            <span className="text-xs font-semibold">Đang tải thông tin cấu hình AI...</span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-gov-danger-bg text-gov-danger border border-gov-danger-border text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-gov-active-bg text-gov-active border border-gov-active-border text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {/* Department Badge Notice */}
            <div className="p-3 rounded-xl bg-gov-subtle/50 border border-gov-border flex items-start gap-2.5">
              <Shield className="w-4 h-4 text-gov-primary flex-shrink-0 mt-0.5" />
              <div className="text-xs text-gov-text">
                <span className="font-bold">Đơn vị công tác:</span>{' '}
                <span className="text-gov-primary font-semibold">{department || 'Chưa định danh'}</span>.
                <p className="text-[11px] text-gov-text-secondary mt-0.5">
                  Cán bộ có thể chủ động cài đặt API Key riêng để tối ưu tốc độ và hạn mức quota, hoặc để trống để sử dụng hạn ngạch dùng chung của đơn vị.
                </p>
              </div>
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-bold text-gov-text mb-1.5">
                Nhà cung cấp Mô hình AI (Provider) *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDER_OPTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleProviderChange(item.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      provider === item.id
                        ? 'border-gov-primary bg-gov-primary/5 shadow-sm'
                        : 'border-gov-border bg-white hover:border-gov-primary/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gov-text">{item.name}</span>
                      {provider === item.id && (
                        <span className="w-2 h-2 rounded-full bg-gov-primary" />
                      )}
                    </div>
                    <p className="text-[10px] text-gov-text-secondary mt-1 leading-snug line-clamp-1">
                      {item.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selection / Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gov-text">
                  Phiên bản Mô hình (Model Name) *
                </label>
                <span className="text-[10px] text-gov-text-secondary">Gợi ý nhanh theo Provider</span>
              </div>
              <input
                type="text"
                required
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Nhập tên model..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text font-mono"
              />
              {/* Quick suggestion pills */}
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {currentProviderMeta.models.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      model === m
                        ? 'bg-gov-primary text-white font-bold'
                        : 'bg-gov-subtle hover:bg-gov-border text-gov-text-secondary'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* API Key Input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gov-text">
                  API Key Cá nhân (BYOK)
                </label>
                {hasApiKey && maskedKey && (
                  <span className="text-[11px] font-mono text-gov-active font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Hiện tại: {maskedKey}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasApiKey ? 'Nhập khóa mới nếu muốn thay đổi...' : 'sk-... dán khóa API của đồng chí vào đây'}
                  className="w-full px-3 py-2 pr-10 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gov-text-secondary hover:text-gov-text"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex items-center justify-between mt-1 text-[11px] text-gov-text-secondary">
                <span>{hasApiKey ? 'Để trống nếu muốn giữ nguyên khóa đã lưu.' : 'Khóa được mã hóa bằng AES-256-GCM trước khi lưu.'}</span>
                {hasApiKey && (
                  <button
                    type="button"
                    onClick={handleClearKey}
                    disabled={loading}
                    className="text-gov-danger hover:underline font-semibold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa khóa cá nhân</span>
                  </button>
                )}
              </div>
            </div>

            {/* Security Guarantee Box */}
            <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                Cơ chế bảo mật BYOK tuân thủ nguyên tắc cách ly dữ liệu: Khóa của cán bộ không bao giờ lưu trữ dạng văn bản thô (Plaintext). Mọi cuộc gọi sinh dự thảo được thực hiện trực tiếp hoặc qua cổng bảo mật nội bộ.
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center gap-2 pt-3 border-t border-gov-border">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  window.history.pushState({}, '', '/settings');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }}
                className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 flex items-center gap-1.5 transition-colors"
                title="Mở trang Cài đặt toàn diện để quản lý nhiều khóa API cùng lúc và test key"
              >
                <span>Mở Két Quản Lý Đa Khóa</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-gov-border text-gov-text hover:bg-gov-subtle transition-colors"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <KeyRound className="w-4 h-4 text-gov-gold" />
                  <span>Lưu cấu hình AI</span>
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
