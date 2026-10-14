import React, { useState, useEffect } from 'react';
import { FileEdit, X, Loader2, PlusCircle, CheckCircle2 } from 'lucide-react';
import { LegalDocumentItem } from '../../types';
import { api } from '../../services/api';

interface LegalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentToEdit: LegalDocumentItem | null;
  onSuccess: () => void;
}

export const LegalEditModal: React.FC<LegalEditModalProps> = ({
  isOpen,
  onClose,
  documentToEdit,
  onSuccess,
}) => {
  const isEditing = !!documentToEdit;
  const [codeNumber, setCodeNumber] = useState('');
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('NGHI_DINH');
  const [issuer, setIssuer] = useState('Chính phủ');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (documentToEdit) {
      setCodeNumber(documentToEdit.codeNumber);
      setTitle(documentToEdit.title);
      setDocType(documentToEdit.docType);
      setIssuer(documentToEdit.issuer);
      setEffectiveDate(documentToEdit.effectiveDate ? documentToEdit.effectiveDate.split('T')[0] : '');
      setStatus(documentToEdit.status);
    } else {
      setCodeNumber('');
      setTitle('');
      setDocType('NGHI_DINH');
      setIssuer('Chính phủ');
      setEffectiveDate(new Date().toISOString().split('T')[0]);
      setStatus('ACTIVE');
    }
    setError(null);
  }, [documentToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      if (isEditing) {
        await api.updateDoc(documentToEdit.id, {
          codeNumber,
          title,
          docType,
          issuer,
          effectiveDate,
          status,
        });
      } else {
        await api.addManualDoc({
          codeNumber,
          title,
          docType,
          issuer,
          effectiveDate,
          status,
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Lỗi khi lưu dữ liệu văn bản quy phạm pháp luật.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gov-border w-full max-w-lg overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2">
            {isEditing ? <FileEdit className="w-5 h-5 text-gov-gold" /> : <PlusCircle className="w-5 h-5 text-gov-gold" />}
            <h3 className="text-sm font-bold uppercase tracking-wide">
              {isEditing ? 'Sửa thông tin văn bản quy phạm' : 'Thêm mới văn bản thủ công'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-gov-danger-bg text-gov-danger border border-gov-danger-border text-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gov-text mb-1">Số ký hiệu *</label>
              <input
                type="text"
                required
                value={codeNumber}
                onChange={(e) => setCodeNumber(e.target.value)}
                placeholder="vd: 125/2026/NĐ-CP"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gov-text mb-1">Cơ quan ban hành *</label>
              <input
                type="text"
                required
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="Chính phủ, Quốc hội, UBND Tỉnh"
                className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gov-text mb-1">Trích yếu nội dung văn bản *</label>
            <textarea
              required
              rows={3}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập trích yếu quy định pháp luật..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gov-text mb-1">Loại văn bản</label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
              >
                <option value="NGHI_DINH">Nghị định (Chính phủ - Rank 70)</option>
                <option value="LUAT">Luật (Quốc hội - Rank 90)</option>
                <option value="THONG_TU">Thông tư (Bộ ngành - Rank 50)</option>
                <option value="QUYET_DINH_TTG">Quyết định TTg (Rank 60)</option>
                <option value="QUYET_DINH_UBND">Quyết định UBND (Rank 40)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gov-text mb-1">Ngày bắt đầu hiệu lực</label>
              <input
                type="date"
                required
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
          </div>

          <div className="bg-gov-subtle/60 p-3 rounded-xl border border-gov-border">
            <label className="block text-xs font-bold text-gov-text mb-1">
              Trạng thái hiệu lực văn bản *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text font-bold"
            >
              <option value="ACTIVE">🟢 Đang có hiệu lực (ACTIVE)</option>
              <option value="EXPIRED">🔴 Đã hết hiệu lực (EXPIRED)</option>
              <option value="EXPIRED_PARTIAL">🟡 Bãi bỏ một phần (EXPIRED_PARTIAL)</option>
              <option value="DRAFT">⚪ Dự thảo (DRAFT)</option>
            </select>
            <p className="text-[11px] text-gov-text-secondary mt-1">
              💡 Cập nhật trạng thái tại đây giúp lưu vết chuẩn xác và loại trừ nguy cơ thao tác nhầm trên danh sách.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gov-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-gov-border text-gov-text hover:bg-gov-subtle"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white shadow-sm flex items-center gap-1.5 disabled:opacity-60"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? 'Cập nhật thay đổi' : 'Thêm vào Tủ sách'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
