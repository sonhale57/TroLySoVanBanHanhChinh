import React, { useState, useEffect } from 'react';
import { BookOpen, Search, ArrowLeft, Loader2, ShieldCheck, CheckCircle2, BookMarked } from 'lucide-react';
import { LegalDocumentItem } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';

interface LegalLookupPageProps {
  onBackToWorkspace: () => void;
}

export const LegalLookupPage: React.FC<LegalLookupPageProps> = ({ onBackToWorkspace }) => {
  const [documents, setDocuments] = useState<LegalDocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDoc, setSelectedDoc] = useState<LegalDocumentItem | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await api.getLegalDocuments();
      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDoc(docs[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = documents.filter((d) => {
    const matchesSearch =
      d.codeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.issuer.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    return d.status === statusFilter;
  });

  return (
    <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Top Banner */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-gov-gold" />
              <h2 className="text-base font-bold uppercase tracking-wider text-gov-text">
                Tra cứu Pháp luật
              </h2>
            </div>
            <p className="text-xs text-gov-text-secondary mt-0.5">
              Hệ thống tra cứu thứ bậc hiệu lực pháp lý và nội dung điều khoản phục vụ soạn thảo và thẩm định công văn hành chính
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-gov-active font-bold bg-gov-active-bg px-3.5 py-2 rounded-xl border border-gov-active-border shadow-sm">
          <ShieldCheck className="w-4 h-4 text-gov-active" />
          <span>Dữ liệu chuẩn hóa công quyền • Chỉ đọc (Read-only)</span>
        </div>
      </div>

      {/* Main Grid: 5 cols list, 7 cols detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Search & List */}
        <div className="lg:col-span-5 bg-white rounded-xl shadow-card border border-gov-border p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gov-text-disabled absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo số hiệu, trích yếu, cơ quan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 pt-1">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'ACTIVE', label: 'Còn hiệu lực' },
              { id: 'EXPIRED', label: 'Hết hiệu lực' },
            ].map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStatusFilter(btn.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === btn.id
                    ? 'bg-gov-gold text-gov-text shadow-sm'
                    : 'bg-gov-bg text-gov-text-secondary hover:text-gov-text'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-gov-text-secondary font-semibold pt-1">
            Danh mục văn bản ({filteredDocs.length})
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-12 text-center text-gov-text-secondary">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-1 text-gov-primary" />
                <span className="text-xs">Đang tải danh mục văn bản...</span>
              </div>
            ) : filteredDocs.map((doc) => {
              const isSelected = selectedDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gov-primary-light border-gov-primary text-gov-primary-dark shadow-sm ring-1 ring-gov-primary'
                      : 'bg-white hover:bg-gov-bg border-gov-border'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold text-xs text-gov-primary">
                      {doc.codeNumber}
                    </span>
                    <StatusBadge status={doc.status} size="sm" />
                  </div>
                  <div className="text-xs font-semibold text-gov-text line-clamp-2">
                    {doc.title}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gov-text-secondary mt-2">
                    <span>{doc.issuer}</span>
                    <span>Hiệu lực: {new Date(doc.effectiveDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Full Details */}
        <div className="lg:col-span-7 bg-white rounded-xl shadow-card border border-gov-border p-6 space-y-5 min-h-[500px]">
          {selectedDoc ? (
            <>
              {/* Header of details */}
              <div className="border-b border-gov-border pb-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <span className="text-sm font-black text-gov-primary bg-gov-subtle px-2.5 py-1 rounded">
                    {selectedDoc.codeNumber}
                  </span>
                  <StatusBadge status={selectedDoc.status} size="md" />
                </div>
                <h3 className="text-base font-bold text-gov-text leading-snug">
                  {selectedDoc.title}
                </h3>
              </div>

              {/* Metadata details */}
              <div className="bg-gov-bg p-4 rounded-xl border border-gov-border space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-gov-text-secondary block text-[11px]">Cơ quan ban hành:</span>
                    <span className="font-bold text-gov-text">{selectedDoc.issuer}</span>
                  </div>
                  <div>
                    <span className="text-gov-text-secondary block text-[11px]">Loại văn bản quy phạm:</span>
                    <span className="font-bold text-gov-text">{selectedDoc.docType}</span>
                  </div>
                  <div>
                    <span className="text-gov-text-secondary block text-[11px]">Ngày có hiệu lực:</span>
                    <span className="font-bold text-gov-text">{new Date(selectedDoc.effectiveDate).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div>
                    <span className="text-gov-text-secondary block text-[11px]">Thứ bậc pháp lý (Điều 156):</span>
                    <span className="font-bold text-gov-gold">{selectedDoc.hierarchyRank}/100</span>
                  </div>
                </div>

                {selectedDoc.relations && selectedDoc.relations.length > 0 && (
                  <div className="pt-2 border-t border-gov-border/60">
                    <span className="text-gov-danger font-bold block text-[11px]">Văn bản bị thay thế / bãi bỏ:</span>
                    <ul className="list-disc list-inside text-gov-text font-medium text-xs mt-0.5">
                      {selectedDoc.relations.map((r) => (
                        <li key={r.id}>
                          {r.targetCode} - {r.targetTitle}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Clause nodes */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gov-text mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-gov-primary" />
                  Các Điều khoản thi hành ({selectedDoc.clauses?.length || 0})
                </h4>

                <div className="space-y-2.5">
                  {selectedDoc.clauses && selectedDoc.clauses.length > 0 ? (
                    selectedDoc.clauses.map((c) => (
                      <div key={c.id} className="p-3 bg-gov-bg rounded-lg border border-gov-border text-xs leading-relaxed">
                        <span className="font-bold text-gov-primary block mb-1">
                          {c.articleNumber} {c.clauseNumber ? `(${c.clauseNumber})` : ''}:
                        </span>
                        <p className="text-gov-text whitespace-pre-wrap">{c.rawContent}</p>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 bg-gov-bg rounded-lg text-xs text-gov-text-secondary italic">
                      Nội dung toàn văn quy định đang được lưu trữ trong tệp hồ sơ công vụ của cơ quan.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="py-20 text-center text-gov-text-secondary text-xs">
              Chọn một văn bản bên trái để xem thông tin chi tiết.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
