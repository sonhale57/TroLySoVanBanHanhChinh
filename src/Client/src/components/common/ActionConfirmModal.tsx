import React from 'react';
import { AlertTriangle, LogOut, FileSearch, X, CheckCircle2 } from 'lucide-react';

export interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  detail?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary' | 'warning';
  isLoading?: boolean;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  detail,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'primary',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <LogOut className="w-6 h-6 text-gov-danger" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-gov-warning" />;
      case 'primary':
      default:
        return <FileSearch className="w-6 h-6 text-gov-primary" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-gov-danger hover:bg-red-700 text-white shadow-sm hover:shadow';
      case 'warning':
        return 'bg-gov-warning hover:bg-amber-700 text-white shadow-sm hover:shadow';
      case 'primary':
      default:
        return 'bg-gov-primary hover:bg-gov-primary-dark text-white shadow-sm hover:shadow';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gov-border overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
        {/* Header Strip */}
        <div className="px-5 py-4 bg-gov-subtle/70 border-b border-gov-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white shadow-sm border border-gov-border flex items-center justify-center flex-shrink-0">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gov-text uppercase tracking-wide">
                {title}
              </h3>
              <p className="text-[11px] text-gov-text-secondary">
                Xác nhận thao tác nghiệp vụ công vụ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1 rounded-lg text-gov-text-disabled hover:text-gov-text hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-3">
          <p className="text-xs text-gov-text leading-relaxed font-medium">
            {message}
          </p>

          {detail && (
            <div className="p-3 rounded-xl bg-gov-bg border border-gov-border text-xs text-gov-text-secondary flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-gov-gold mt-0.5 flex-shrink-0" />
              <div className="break-all font-mono text-[11px] text-gov-text">
                {detail}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-gov-bg/60 border-t border-gov-border flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl border border-gov-border bg-white hover:bg-gov-subtle text-xs font-semibold text-gov-text transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${getConfirmButtonClass()} disabled:opacity-60`}
          >
            {isLoading ? (
              <span>Đang xử lý...</span>
            ) : (
              <span>{confirmText}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
