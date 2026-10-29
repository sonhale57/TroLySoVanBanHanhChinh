import React, { useState, useEffect } from 'react';
import { 
  FileEdit, 
  X, 
  Loader2, 
  PlusCircle, 
  CheckCircle2, 
  Trash2, 
  FileText, 
  Settings, 
  ListPlus,
  Info
} from 'lucide-react';
import { LegalDocumentItem } from '../../types';
import { api } from '../../services/api';

interface LegalEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentToEdit: LegalDocumentItem | null;
  onSuccess: () => void;
}

interface EditableClause {
  id?: string;
  articleNumber: string;
  clauseNumber?: string;
  rawContent: string;
  status: string;
}

export const LegalEditModal: React.FC<LegalEditModalProps> = ({
  isOpen,
  onClose,
  documentToEdit,
  onSuccess,
}) => {
  const isEditing = !!documentToEdit;
  const [activeTab, setActiveTab] = useState<'metadata' | 'clauses' | 'bulk'>('metadata');
  const [codeNumber, setCodeNumber] = useState('');
  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState('NGHI_DINH');
  const [issuer, setIssuer] = useState('Chính phủ');
  const [effectiveDate, setEffectiveDate] = useState('');
  const [status, setStatus] = useState('ACTIVE');
  const [clauses, setClauses] = useState<EditableClause[]>([]);
  const [bulkText, setBulkText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (documentToEdit) {
        setCodeNumber(documentToEdit.codeNumber);
        setTitle(documentToEdit.title);
        setDocType(documentToEdit.docType);
        setIssuer(documentToEdit.issuer);
        setEffectiveDate(documentToEdit.effectiveDate ? documentToEdit.effectiveDate.split('T')[0] : '');
        setStatus(documentToEdit.status);

        if (documentToEdit.clauses && documentToEdit.clauses.length > 0) {
          setClauses(documentToEdit.clauses.map((c) => ({ ...c })));
        } else {
          // Fetch document with clauses from backend
          api.getLegalDocument(documentToEdit.id)
            .then((res) => {
              if (res.clauses && res.clauses.length > 0) {
                setClauses(res.clauses.map((c) => ({ ...c })));
              } else {
                setClauses([
                  {
                    articleNumber: 'Điều 1',
                    clauseNumber: 'Khoản 1',
                    rawContent: '',
                    status: 'ACTIVE',
                  },
                ]);
              }
            })
            .catch(() => {
              setClauses([
                {
                  articleNumber: 'Điều 1',
                  clauseNumber: 'Khoản 1',
                  rawContent: '',
                  status: 'ACTIVE',
                },
              ]);
            });
        }
      } else {
        setCodeNumber('');
        setTitle('');
        setDocType('NGHI_DINH');
        setIssuer('Chính phủ');
        setEffectiveDate(new Date().toISOString().split('T')[0]);
        setStatus('ACTIVE');
        setClauses([
          {
            articleNumber: 'Điều 1',
            clauseNumber: 'Khoản 1',
            rawContent: '',
            status: 'ACTIVE',
          },
        ]);
      }
      setBulkText('');
      setError(null);
      setActiveTab('metadata');
    }
  }, [documentToEdit, isOpen]);

  if (!isOpen) return null;

  // Thêm điều khoản mới
  const handleAddClause = () => {
    const nextIndex = clauses.length + 1;
    setClauses([
      ...clauses,
      {
        articleNumber: `Điều ${nextIndex}`,
        clauseNumber: 'Khoản 1',
        rawContent: '',
        status: 'ACTIVE',
      },
    ]);
  };

  // Cập nhật từng trường của điều khoản
  const handleClauseChange = (index: number, field: keyof EditableClause, value: string) => {
    const updated = [...clauses];
    updated[index] = { ...updated[index], [field]: value };
    setClauses(updated);
  };

  // Xóa điều khoản
  const handleRemoveClause = (index: number) => {
    setClauses(clauses.filter((_, i) => i !== index));
  };

  // Tự động phân tách nội dung toàn văn thành các Điều khoản
  const handleParseBulkText = () => {
    if (!bulkText.trim()) return;

    // Tách văn bản theo các mẫu: "Điều 1.", "Điều 1:", "Điều 2.", ...
    const regex = /(?:^|\n)\s*(Điều\s+\d+[^:\.\n]*[:\.]?)/i;
    const parts = bulkText.split(regex).filter(p => p.trim().length > 0);

    const parsedClauses: EditableClause[] = [];
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i + 1]) {
        const articleNumber = parts[i].trim().replace(/[:\.]$/, '');
        const rawContent = parts[i + 1].trim();
        parsedClauses.push({
          articleNumber,
          clauseNumber: '',
          rawContent,
          status: 'ACTIVE',
        });
      } else if (parts[i]) {
        parsedClauses.push({
          articleNumber: `Điều ${parsedClauses.length + 1}`,
          clauseNumber: '',
          rawContent: parts[i].trim(),
          status: 'ACTIVE',
        });
      }
    }

    if (parsedClauses.length > 0) {
      setClauses(parsedClauses);
      setActiveTab('clauses');
    } else {
      // Nếu không có pattern "Điều ...", đưa nguyên khối vào 1 điều khoản
      setClauses([
        {
          articleNumber: 'Toàn văn quy định',
          clauseNumber: '',
          rawContent: bulkText.trim(),
          status: 'ACTIVE',
        },
      ]);
      setActiveTab('clauses');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Lọc bỏ các điều khoản rỗng hoàn toàn
    const validClauses = clauses.filter(
      (c) => c.articleNumber.trim() || c.rawContent.trim()
    );

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
          clauses: validClauses,
        });
      } else {
        await api.addManualDoc({
          codeNumber,
          title,
          docType,
          issuer,
          effectiveDate,
          status,
          clauses: validClauses,
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
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gov-border w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2">
            {isEditing ? <FileEdit className="w-5 h-5 text-gov-gold" /> : <PlusCircle className="w-5 h-5 text-gov-gold" />}
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide">
                {isEditing ? `Sửa văn bản & Nội dung điều khoản: ${codeNumber || documentToEdit.codeNumber}` : 'Thêm mới văn bản quy phạm pháp luật'}
              </h3>
              <p className="text-[11px] text-white/80">
                Cho phép biên tập tiêu đề, hiệu lực và toàn bộ nội dung từng Điều/Khoản trong văn bản
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

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-gov-subtle/70 border-b border-gov-border flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('metadata')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'metadata'
                ? 'bg-gov-primary text-white shadow-sm'
                : 'bg-white text-gov-text border border-gov-border hover:bg-gray-100'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>1. Thông tin văn bản & Hiệu lực</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('clauses')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'clauses'
                ? 'bg-gov-primary text-white shadow-sm'
                : 'bg-white text-gov-text border border-gov-border hover:bg-gray-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Chi tiết các Điều khoản ({clauses.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-colors ${
              activeTab === 'bulk'
                ? 'bg-gov-primary text-white shadow-sm'
                : 'bg-white text-gov-text border border-gov-border hover:bg-gray-100'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-gov-gold" />
            <span>3. Dán nhanh toàn văn</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 flex flex-col justify-between">
          <div>
            {error && (
              <div className="p-3 mb-4 rounded-lg bg-gov-danger-bg text-gov-danger border border-gov-danger-border text-xs">
                {error}
              </div>
            )}

            {/* TAB 1: THÔNG TIN VĂN BẢN & HIỆU LỰC */}
            {activeTab === 'metadata' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gov-text mb-1">
                      Số ký hiệu văn bản <span className="text-gov-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={codeNumber}
                      onChange={(e) => setCodeNumber(e.target.value)}
                      placeholder="vd: 125/2026/NĐ-CP hoặc 80/2015/QH13"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gov-text mb-1">
                      Cơ quan ban hành <span className="text-gov-danger">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={issuer}
                      onChange={(e) => setIssuer(e.target.value)}
                      placeholder="vd: Chính phủ, Quốc hội, UBND Tỉnh"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gov-text mb-1">
                    Trích yếu nội dung văn bản <span className="text-gov-danger">*</span>
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Nhập trích yếu quy định pháp luật..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gov-text mb-1">
                      Loại văn bản QPPL (Thứ bậc Điều 156)
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                    >
                      <option value="LUAT">Luật (Quốc hội - Rank 90)</option>
                      <option value="NGHI_DINH">Nghị định (Chính phủ - Rank 70)</option>
                      <option value="QUYET_DINH_TTG">Quyết định TTg (Rank 60)</option>
                      <option value="THONG_TU">Thông tư (Bộ ngành - Rank 50)</option>
                      <option value="QUYET_DINH_UBND">Quyết định UBND (Rank 40)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gov-text mb-1">
                      Ngày bắt đầu có hiệu lực <span className="text-gov-danger">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                    />
                  </div>
                </div>

                <div className="bg-gov-subtle/50 p-4 rounded-xl border border-gov-border">
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
                  <p className="text-[11px] text-gov-text-secondary mt-1.5">
                    💡 Cán bộ có thể chuyển sang tab <strong>"2. Chi tiết các Điều khoản"</strong> để thêm hoặc sửa toàn bộ nội dung từng Điều/Khoản trong văn bản.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: CHI TIẾT NỘI DUNG TỪNG ĐIỀU KHOẢN */}
            {activeTab === 'clauses' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-gov-border">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-gov-text">
                      Danh mục Điều khoản & Nội dung chi tiết
                    </h4>
                    <p className="text-[11px] text-gov-text-secondary">
                      Thêm, xóa và sửa trực tiếp nội dung quy định cụ thể của từng điều khoản
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddClause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white text-xs font-bold transition-colors shadow-sm whitespace-nowrap"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Thêm Điều khoản</span>
                  </button>
                </div>

                {clauses.length === 0 ? (
                  <div className="p-8 text-center bg-gov-bg rounded-xl border border-gov-border text-xs text-gov-text-secondary">
                    Chưa có điều khoản nào. Nhấn "+ Thêm Điều khoản" hoặc qua tab "Dán nhanh toàn văn".
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
                    {clauses.map((clause, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gov-bg/60 rounded-xl border border-gov-border space-y-3 relative group"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-40">
                              <label className="block text-[11px] font-bold text-gov-text mb-0.5">
                                Tên Điều *
                              </label>
                              <input
                                type="text"
                                value={clause.articleNumber}
                                onChange={(e) => handleClauseChange(idx, 'articleNumber', e.target.value)}
                                placeholder="vd: Điều 14"
                                className="w-full px-2.5 py-1 text-xs rounded border border-gov-border bg-white text-gov-text font-bold"
                              />
                            </div>

                            <div className="w-36">
                              <label className="block text-[11px] font-bold text-gov-text mb-0.5">
                                Khoản / Điểm
                              </label>
                              <input
                                type="text"
                                value={clause.clauseNumber || ''}
                                onChange={(e) => handleClauseChange(idx, 'clauseNumber', e.target.value)}
                                placeholder="vd: Khoản 2"
                                className="w-full px-2.5 py-1 text-xs rounded border border-gov-border bg-white text-gov-text"
                              />
                            </div>

                            <div className="w-36">
                              <label className="block text-[11px] font-bold text-gov-text mb-0.5">
                                Hiệu lực điều khoản
                              </label>
                              <select
                                value={clause.status}
                                onChange={(e) => handleClauseChange(idx, 'status', e.target.value)}
                                className="w-full px-2 py-1 text-xs rounded border border-gov-border bg-white text-gov-text font-semibold"
                              >
                                <option value="ACTIVE">Áp dụng</option>
                                <option value="EXPIRED">Bị bãi bỏ</option>
                              </select>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveClause(idx)}
                            className="p-1.5 text-gray-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Xóa điều khoản này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gov-text mb-0.5">
                            Nội dung chi tiết quy định của Điều khoản:
                          </label>
                          <textarea
                            rows={3}
                            value={clause.rawContent}
                            onChange={(e) => handleClauseChange(idx, 'rawContent', e.target.value)}
                            placeholder="Nhập toàn văn nội dung quy định chi tiết..."
                            className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text leading-relaxed"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: DÁN NHANH TOÀN VĂN & TỰ BÓC TÁCH */}
            {activeTab === 'bulk' && (
              <div className="space-y-4">
                <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-bold">Tính năng Dán nhanh toàn văn:</span>
                    <p className="mt-0.5 leading-relaxed">
                      Dán toàn văn các điều khoản từ tệp Word hoặc PDF vào khung dưới. Hệ thống sẽ tự động quét các mẫu 
                      <strong> "Điều 1.", "Điều 2.", "Điều 14."...</strong> để phân tách thành từng điều khoản riêng biệt trong tab Điều khoản.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gov-text mb-1">
                    Toàn văn nội dung các điều khoản:
                  </label>
                  <textarea
                    rows={12}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`Ví dụ:
Điều 1. Phạm vi điều chỉnh
Nghị định này quy định chi tiết thi hành một số điều của Luật Đầu tư...

Điều 2. Đối tượng áp dụng
Nghị định này áp dụng đối với cơ quan nhà nước, nhà đầu tư...`}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text leading-relaxed"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleParseBulkText}
                    disabled={!bulkText.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gov-gold hover:bg-amber-500 text-gov-text font-bold text-xs transition-colors shadow-sm disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Tự động phân tách thành các Điều khoản</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 mt-6 border-t border-gov-border text-xs">
            <span className="text-gov-text-secondary text-[11px]">
              {clauses.length} Điều/Khoản sẵn sàng lưu
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-semibold rounded-lg border border-gov-border text-gov-text hover:bg-gov-subtle transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 font-bold rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white shadow-sm flex items-center gap-1.5 disabled:opacity-60 transition-colors"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{isEditing ? 'Lưu cập nhật văn bản & Điều khoản' : 'Thêm vào Tủ sách pháp luật'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
