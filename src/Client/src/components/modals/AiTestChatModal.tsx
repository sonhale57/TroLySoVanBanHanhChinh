import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Bot,
  User,
  Zap,
  Clock,
  ExternalLink,
  RotateCcw,
  ShieldAlert,
  KeyRound
} from 'lucide-react';
import { api } from '../../services/api';
import { TestApiKeyResult } from '../../types';

interface MessageItem {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isError?: boolean;
  latencyMs?: number;
  recommendation?: string;
  detailedError?: string;
}

interface AiTestChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: string;
  providerName: string;
  apiKeyInput?: string;
  hasStoredApiKey?: boolean;
  apiKeyUrl?: string;
  apiKeyUrlLabel?: string;
}

export const AiTestChatModal: React.FC<AiTestChatModalProps> = ({
  isOpen,
  onClose,
  provider,
  providerName,
  apiKeyInput = '',
  hasStoredApiKey = false,
  apiKeyUrl = 'https://aistudio.google.com/app/apikey',
  apiKeyUrlLabel = 'Lấy khóa API',
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'error'>('idle');
  const [lastLatency, setLastLatency] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Khởi tạo cuộc trò chuyện mẫu chào đón cán bộ
      const initialGreeting: MessageItem = {
        id: 'msg-init',
        sender: 'ai',
        text: `Xin chào đồng chí! Tôi là Trợ lý số Văn bản Hành chính (Mô hình: ${providerName}).\nCửa sổ này dùng để kiểm tra độ khả dụng của Khóa API Key và khả năng phản hồi trực tiếp của mô hình AI. Hãy nhập câu hỏi hoặc nội dung kiểm tra bên dưới để bắt đầu thử nghiệm kết nối.`,
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
      setMessages([initialGreeting]);
      setConnectionStatus('idle');
      setLastLatency(null);
    }
  }, [isOpen, provider, providerName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading) return;

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);
    setConnectionStatus('testing');

    try {
      const res: TestApiKeyResult = await api.testApiKey({
        provider,
        apiKey: apiKeyInput.trim() || undefined,
        prompt
      });

      if (res.success) {
        setConnectionStatus('connected');
        setLastLatency(res.latencyMs);

        const aiMsg: MessageItem = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: res.reply || 'Xác nhận: Khóa API hoạt động bình thường.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          latencyMs: res.latencyMs
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setConnectionStatus('error');
        setLastLatency(res.latencyMs);

        const errorMsg: MessageItem = {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text: res.errorMessage || 'Lỗi không xác định khi kết nối tới máy chủ AI.',
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          isError: true,
          recommendation: res.recommendation,
          detailedError: res.detailedError,
          latencyMs: res.latencyMs
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      setConnectionStatus('error');
      const networkErrorMsg: MessageItem = {
        id: `ai-net-err-${Date.now()}`,
        sender: 'ai',
        text: err?.response?.data?.message || err?.message || 'Lỗi mạng hoặc không thể kết nối tới máy chủ trợ lý số.',
        timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        isError: true,
        recommendation: 'Kiểm tra đường truyền Internet hoặc tường lửa cơ quan, sau đó bấm thử lại.',
        detailedError: err?.toString()
      };
      setMessages((prev) => [...prev, networkErrorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Khung Thử Nghiệm API Key & Trợ Lý AI
                </h3>
                {connectionStatus === 'connected' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    Khả dụng {lastLatency ? `(${lastLatency}ms)` : ''}
                  </span>
                )}
                {connectionStatus === 'error' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    Có lỗi kết nối
                  </span>
                )}
                {connectionStatus === 'testing' && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <Loader2 className="w-3 h-3 text-amber-600 animate-spin" />
                    Đang gọi AI...
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhà cung cấp: <strong>{providerName}</strong> • {apiKeyInput ? 'Đang test khóa vừa nhập' : (hasStoredApiKey ? 'Dùng khóa đã lưu mã hóa AES-256' : 'Chưa có khóa')}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center transition-all"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo tình trạng API Key nếu trống */}
        {!apiKeyInput && !hasStoredApiKey && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Đồng chí chưa nhập hoặc chưa lưu Khóa API Key nào vào hệ thống.</span>
            </div>
            <a
              href={apiKeyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-bold text-amber-900 underline hover:text-blue-800 ml-2"
            >
              <span>{apiKeyUrlLabel}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Khung chat tin nhắn (Cuộn tự động) */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs flex-shrink-0 mt-0.5 ${
                    msg.isError
                      ? 'bg-rose-100 text-rose-700 border border-rose-300'
                      : 'bg-blue-600 text-white'
                  }`}
                >
                  {msg.isError ? <ShieldAlert className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-xs text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : msg.isError
                    ? 'bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-none'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.text}</div>

                {/* Hướng dẫn khắc phục lỗi cụ thể */}
                {msg.isError && (
                  <div className="mt-2.5 pt-2 border-t border-rose-200 space-y-1.5 text-[11px]">
                    {msg.recommendation && (
                      <div className="text-rose-900 font-semibold flex items-start gap-1">
                        <span className="text-rose-600 font-bold">▶ Hướng dẫn xử lý:</span>
                        <span>{msg.recommendation}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={apiKeyUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-700 text-white text-[11px] font-bold hover:bg-rose-800 transition-all shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Mở cổng cấp khóa {providerName}</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Footer tin nhắn */}
                <div
                  className={`flex items-center justify-between gap-3 text-[10px] mt-1.5 ${
                    msg.sender === 'user' ? 'text-blue-200' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.latencyMs !== undefined && (
                    <span className="flex items-center gap-1 font-mono">
                      <Zap className="w-3 h-3" />
                      {msg.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>

              {msg.sender === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2.5 justify-start">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 shadow-xs text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>Đang gửi truy vấn kiểm tra tới API của {providerName}...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input gõ tin nhắn */}
        <div className="p-3.5 border-t border-slate-200 bg-white flex items-end gap-2">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nhập câu hỏi để thử nghiệm phản hồi của Trợ lý AI (Enter để gửi)..."
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl border border-slate-300 p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50"
          />
          <button
            type="button"
            disabled={!inputText.trim() || isLoading}
            onClick={() => handleSendMessage()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xs h-[42px]"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Gửi test</span>
          </button>
        </div>
      </div>
    </div>
  );
};
