import React, { useState } from 'react';
import { FileUp, X, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';

interface SubmitProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubmitProposalModal: React.FC<SubmitProposalModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Vui lòng nhập tiêu đề văn bản hoặc nội dung đề xuất.');
      return;
    }

    try {
      setLoading(true);
      await api.submitProposal(title, notes, file || undefined);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setTitle('');
        setNotes('');
        setFile(null);
        onSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Có lỗi xảy ra khi gửi đề xuất.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-gov-border overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header Ribbon */}
        <div className="bg-gov-primary px-6 py-4 text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <FileUp className="w-4 h-4 text-gov-gold" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Gửi Đề xuất Cập nhật Pháp luật
              </h3>
              <p className="text-[11px] text-white/80">
                Ý kiến tham mưu gửi Lãnh đạo bổ sung văn bản vào Tủ sách số
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-gov-danger-bg text-gov-danger border border-gov-danger-border rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-gov-active-bg text-gov-active border border-gov-active-border rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>Gửi đề xuất thành công! Đang chuyển tiếp tới Lãnh đạo thẩm duyệt...</span>
            </div>
          )}

          <div>
            <label className="block font-bold text-gov-text mb-1">
              Tiêu đề đề xuất / Số hiệu văn bản quy phạm *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Vd: Đề xuất cập nhật Thông tư số 05/2026/TT-BNV về tuyển dụng công chức"
              className="w-full p-2.5 rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-gov-text mb-1">
              Lý do tham mưu & Căn cứ thực tiễn áp dụng
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nêu rõ lý do cần bổ sung (vd: phục vụ thẩm định hồ sơ công văn số..., quy định mới bãi bỏ quy định cũ...)"
              className="w-full p-2.5 rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
            />
          </div>

          <div>
            <label className="block font-bold text-gov-text mb-1">
              Tệp văn bản đính kèm (PDF / Word)
            </label>
            <div className="border-2 border-dashed border-gov-border hover:border-gov-primary rounded-xl p-4 text-center cursor-pointer transition-colors bg-gov-bg/50">
              <input
                type="file"
                id="proposal-file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="proposal-file" className="cursor-pointer">
                <FileUp className="w-6 h-6 text-gov-primary mx-auto mb-1" />
                {file ? (
                  <span className="font-bold text-gov-primary block text-xs">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                ) : (
                  <>
                    <span className="text-gov-text font-bold block text-xs">
                      Nhấn để chọn tệp scan hoặc dự thảo
                    </span>
                    <span className="text-gov-text-secondary text-[11px] block mt-0.5">
                      Hỗ trợ định dạng PDF, DOCX tối đa 50MB
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-gov-border">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gov-border text-gov-text font-bold text-xs hover:bg-gov-bg"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-5 py-2 rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white font-bold text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Gửi đề xuất tới Lãnh đạo
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
