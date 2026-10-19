import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  Building, 
  Calendar, 
  ShieldCheck, 
  FileText, 
  Edit3, 
  Search, 
  CheckCircle2,
  AlertTriangle,
  Scale,
  Loader2
} from 'lucide-react';
import { LegalDocumentItem, LegalClause, LegalRelation } from '../../types';
import { StatusBadge } from '../common/StatusBadge';
import { api } from '../../services/api';

interface LegalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LegalDocumentItem | null;
  onOpenEdit?: (doc: LegalDocumentItem) => void;
}

export const LegalDetailModal: React.FC<LegalDetailModalProps> = ({
  isOpen,
  onClose,
  document,
  onOpenEdit,
}) => {
  const [clauseSearch, setClauseSearch] = useState('');
  const [currentDoc, setCurrentDoc] = useState<LegalDocumentItem | null>(document);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && document) {
      setCurrentDoc(document);
      setLoading(true);
      api.getLegalDocument(document.id)
        .then((res) => {
          if (res) setCurrentDoc(res);
        })
        .catch((err) => {
          console.error('Không thể tải chi tiết văn bản:', err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const doc = currentDoc || document;
  const clauses: LegalClause[] = doc.clauses || [];
  const filteredClauses = clauses.filter((c: LegalClause) => {
    if (!clauseSearch.trim()) return true;
    const q = clauseSearch.toLowerCase();
    return (
      c.articleNumber.toLowerCase().includes(q) ||
      (c.clauseNumber && c.clauseNumber.toLowerCase().includes(q)) ||
      c.rawContent.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gov-border w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-gov-gold flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider bg-white/20 text-white px-2.5 py-0.5 rounded whitespace-nowrap">
                  {doc.codeNumber}
                </span>
                <span className="text-xs text-white/80 font-medium whitespace-nowrap">
                  {doc.docType}
                </span>
                <span className="text-xs text-white/80 whitespace-nowrap">• {doc.issuer}</span>
                {loading && (
                  <span className="flex items-center gap-1 text-[11px] text-white/90 bg-white/10 px-2 py-0.5 rounded">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Đang cập nhật...</span>
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold uppercase tracking-wide mt-1 line-clamp-1">
                {doc.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onOpenEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEdit(doc);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gov-gold hover:bg-amber-500 text-gov-text font-bold text-xs transition-colors shadow-sm whitespace-nowrap"
                title="Chỉnh sửa thông tin & điều khoản chi tiết của văn bản này"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Chỉnh sửa nội dung</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
              title="Đóng modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Metadata Card */}
          <div className="bg-gov-bg p-4 rounded-xl border border-gov-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gov-text-secondary text-[11px] font-bold block mb-1">
                  Trạng thái hiệu lực
                </span>
                <StatusBadge status={doc.status} size="sm" />
              </div>

              <div>
                <span className="text-gov-text-secondary text-[11px] font-bold block mb-1">
                  Cơ quan ban hành
                </span>
                <div className="flex items-center gap-1.5 font-bold text-gov-text">
                  <Building className="w-3.5 h-3.5 text-gov-primary flex-shrink-0" />
                  <span>{doc.issuer}</span>
                </div>
              </div>

              <div>
                <span className="text-gov-text-secondary text-[11px] font-bold block mb-1">
                  Ngày bắt đầu hiệu lực
                </span>
                <div className="flex items-center gap-1.5 font-bold text-gov-text">
                  <Calendar className="w-3.5 h-3.5 text-gov-text-disabled flex-shrink-0" />
                  <span>{new Date(doc.effectiveDate).toLocaleDateString('vi-VN')}</span>
                </div>
                {doc.expiredDate && (
                  <div className="text-[10px] text-red-700 font-bold mt-0.5">
                    Hết hiệu lực: {new Date(doc.expiredDate).toLocaleDateString('vi-VN')}
                  </div>
                )}
              </div>

              <div>
                <span className="text-gov-text-secondary text-[11px] font-bold block mb-1">
                  Thứ bậc pháp lý (Điều 156)
                </span>
                <div className="flex items-center gap-1.5 font-bold text-gov-gold">
                  <Scale className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Thứ bậc {doc.hierarchyRank}/100</span>
                </div>
              </div>
            </div>

            {/* Trích yếu đầy đủ */}
            <div className="mt-3 pt-3 border-t border-gov-border">
              <span className="text-gov-text-secondary text-[11px] font-bold block mb-1">
                Trích yếu nội dung văn bản:
              </span>
              <p className="text-xs text-gov-text leading-relaxed font-semibold">
                {doc.title}
              </p>
            </div>

            {/* Quan hệ thay thế / bãi bỏ nếu có */}
            {doc.relations && doc.relations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gov-border">
                <span className="text-red-700 text-[11px] font-bold block mb-1">
                  Văn bản bị thay thế / bãi bỏ:
                </span>
                <ul className="list-disc list-inside text-xs text-gov-text font-medium space-y-0.5">
                  {doc.relations.map((r: LegalRelation) => (
                    <li key={r.id}>
                      <span className="font-bold text-gov-primary">{r.targetCode}</span>
                      {r.targetTitle && <span className="text-gov-text-secondary"> — {r.targetTitle}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Clauses / Nội dung chi tiết từng điều khoản */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-gov-border">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-gov-primary flex-shrink-0" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-gov-text">
                  Toàn văn Nội dung Điều khoản ({clauses.length} Điều/Khoản)
                </h3>
              </div>

              {/* Ô tìm kiếm nhanh trong các điều khoản */}
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-gov-text-disabled absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={clauseSearch}
                  onChange={(e) => setClauseSearch(e.target.value)}
                  placeholder="Tìm kiếm trong các điều khoản..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                />
              </div>
            </div>

            {/* Danh sách các điều khoản */}
            {clauses.length === 0 ? (
              <div className="p-8 text-center bg-gov-bg rounded-xl border border-gov-border">
                <BookOpen className="w-8 h-8 mx-auto mb-2 text-gov-text-disabled" />
                <p className="text-xs font-semibold text-gov-text-secondary">
                  Văn bản này chưa có nội dung điều khoản chi tiết được bóc tách.
                </p>
                {onOpenEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenEdit(doc);
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white text-xs font-bold transition-colors"
                  >
                    + Thêm nội dung điều khoản ngay
                  </button>
                )}
              </div>
            ) : filteredClauses.length === 0 ? (
              <div className="p-6 text-center bg-gov-bg rounded-xl border border-gov-border text-xs text-gov-text-secondary">
                Không tìm thấy điều khoản nào khớp với từ khóa "{clauseSearch}".
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClauses.map((clause: LegalClause, idx: number) => (
                  <div
                    key={clause.id || idx}
                    className="p-4 bg-white rounded-xl border border-gov-border hover:border-gov-gold/60 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-100 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gov-primary bg-gov-primary-light/60 px-2.5 py-0.5 rounded whitespace-nowrap">
                          {clause.articleNumber}
                        </span>
                        {clause.clauseNumber && (
                          <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded whitespace-nowrap">
                            {clause.clauseNumber}
                          </span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold border whitespace-nowrap ${
                          clause.status === 'EXPIRED'
                            ? 'text-rose-800 bg-rose-50 border-rose-200'
                            : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                        }`}
                      >
                        {clause.status === 'EXPIRED' ? 'Hết hiệu lực' : 'Đang áp dụng'}
                      </span>
                    </div>

                    <p className="text-xs text-gov-text leading-relaxed whitespace-pre-wrap font-medium">
                      {clause.rawContent}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gov-subtle/50 border-t border-gov-border flex items-center justify-between text-xs">
          <span className="text-gov-text-secondary text-[11px]">
            Hệ thống hỗ trợ Xử lý Văn bản Hành chính • Dữ liệu chuẩn hóa công quyền
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white border border-gov-border hover:bg-gov-subtle font-bold text-gov-text transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
