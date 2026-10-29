import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Loader2, Database, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { ForeignKeyDependencyItem } from '../../types';

export interface SmartDeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (forceCascade: boolean) => Promise<{
    success: boolean;
    requiresCascade?: boolean;
    dependencies?: ForeignKeyDependencyItem[];
    message?: string;
  }>;
  title: string;
  itemName: string;
  itemTypeLabel?: string;
}

export const SmartDeleteConfirmModal: React.FC<SmartDeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemTypeLabel = 'Đối tượng',
}) => {
  const [step, setStep] = useState<'INITIAL' | 'CASCADE_WARNING'>('INITIAL');
  const [dependencies, setDependencies] = useState<ForeignKeyDependencyItem[]>([]);
  const [warningMessage, setWarningMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStep('INITIAL');
      setDependencies([]);
      setWarningMessage('');
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFirstConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await onConfirm(false);
      if (res.success) {
        onClose();
      } else if (res.requiresCascade) {
        setDependencies(res.dependencies || []);
        setWarningMessage(res.message || 'Phát hiện dữ liệu khóa ngoại liên quan ở các bảng khác.');
        setStep('CASCADE_WARNING');
      }
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.requiresCascadeConfirmation) {
        setDependencies(err.response.data.dependencies || []);
        setWarningMessage(err.response.data.message || 'Phát hiện dữ liệu khóa ngoại liên quan ở các bảng khác.');
        setStep('CASCADE_WARNING');
      } else {
        setError(err?.response?.data?.message || err?.message || 'Có lỗi xảy ra khi thực hiện thao tác xóa.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCascadeConfirm = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await onConfirm(true);
      if (res.success) {
        onClose();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Không thể dọn sạch dữ liệu và xóa đối tượng.');
    } finally {
      setLoading(false);
    }
  };

  const totalRelatedRecords = dependencies.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="fixed inset-0 !m-0 z-50 overflow-y-auto w-full h-full min-h-screen flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gov-border overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header Strip */}
        <div
          className={`px-5 py-4 border-b border-gov-border flex items-center justify-between transition-colors ${
            step === 'CASCADE_WARNING' ? 'bg-amber-50/80 border-amber-200' : 'bg-gov-subtle/70'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl shadow-sm border flex items-center justify-center flex-shrink-0 ${
                step === 'CASCADE_WARNING'
                  ? 'bg-amber-100 border-amber-300 text-amber-700'
                  : 'bg-red-50 border-red-200 text-gov-danger'
              }`}
            >
              {step === 'CASCADE_WARNING' ? (
                <ShieldAlert className="w-5 h-5 text-amber-700 animate-pulse" />
              ) : (
                <Trash2 className="w-5 h-5 text-gov-danger" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gov-text uppercase tracking-wide">
                  {step === 'CASCADE_WARNING'
                    ? 'Xác nhận lần 2: Dọn sạch dữ liệu liên quan'
                    : title}
                </h3>
              </div>
              <p className="text-[11px] text-gov-text-secondary mt-0.5">
                {step === 'CASCADE_WARNING'
                  ? 'Cảnh báo ràng buộc khóa ngoại (Foreign Key Cascading)'
                  : 'Xác nhận xóa đối tượng khỏi hệ thống'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="p-1.5 rounded-lg text-gov-text-disabled hover:text-gov-text hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-gov-danger-bg text-gov-danger border border-gov-danger-border text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'INITIAL' ? (
            /* =========================================================================
               BƯỚC 1: XÁC NHẬN LẦN 1 (Đối tượng đơn lẻ hoặc kiểm tra ban đầu)
               ========================================================================= */
            <div className="space-y-3.5">
              <p className="text-xs text-gov-text leading-relaxed font-medium">
                Đồng chí có chắc chắn muốn xóa {itemTypeLabel.toLowerCase()} sau không?
              </p>

              <div className="p-3.5 rounded-xl bg-gov-bg border border-gov-border text-xs flex items-start gap-2.5">
                <div className="w-2 h-2 rounded-full bg-gov-danger mt-1.5 flex-shrink-0" />
                <div className="break-all font-bold text-gov-text text-xs leading-relaxed">
                  {itemName}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
                Hệ thống sẽ kiểm tra tự động xem đối tượng này có dữ liệu phát sinh ở các bảng liên quan hay không trước khi thực thi.
              </div>
            </div>
          ) : (
            /* =========================================================================
               BƯỚC 2: XÁC NHẬN LẦN 2 (Có khóa ngoại -> Cảnh báo dọn sạch dữ liệu)
               ========================================================================= */
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
                <div className="text-xs leading-relaxed font-semibold">
                  {warningMessage ||
                    `Đối tượng "${itemName}" đang có dữ liệu phát sinh ở các bảng khác trong cơ sở dữ liệu.`}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gov-text flex items-center gap-1.5">
                    <Database className="w-4 h-4 text-gov-primary" />
                    <span>Dữ liệu khóa ngoại liên quan ({totalRelatedRecords} bản ghi):</span>
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                    Bắt buộc dọn sạch
                  </span>
                </div>

                <div className="rounded-xl border border-gov-border overflow-hidden divide-y divide-gov-border">
                  {dependencies.map((dep, idx) => (
                    <div
                      key={idx}
                      className="px-3.5 py-2.5 bg-white flex items-center justify-between text-xs hover:bg-gov-subtle/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gov-text">{dep.label}</span>
                        <code className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {dep.tableName}
                        </code>
                      </div>
                      <span className="font-extrabold text-gov-danger text-xs">
                        {dep.count} bản ghi
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-[11px] text-red-900 leading-relaxed font-medium">
                ⚠️ <strong className="font-bold text-red-950">LƯU Ý QUAN TRỌNG:</strong> Để xóa đối tượng này, hệ thống sẽ thực hiện <span className="underline decoration-red-500 font-bold">XÓA DỌN SẠCH (Cascade Delete)</span> toàn bộ các bản ghi liên quan nêu trên. Dữ liệu sau khi xóa sẽ vĩnh viễn không thể khôi phục!
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-gov-bg/60 border-t border-gov-border flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-xl border border-gov-border bg-white hover:bg-gov-subtle text-xs font-semibold text-gov-text transition-colors"
          >
            Hủy bỏ
          </button>

          {step === 'INITIAL' ? (
            <button
              type="button"
              onClick={handleFirstConfirm}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-gov-danger hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Trash2 className="w-4 h-4" />
              <span>Xác nhận xóa</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleCascadeConfirm}
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-60 ring-2 ring-red-400 ring-offset-1"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <Trash2 className="w-4 h-4" />
              <span>Xác nhận lần 2: Dọn sạch & Xóa vĩnh viễn</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
