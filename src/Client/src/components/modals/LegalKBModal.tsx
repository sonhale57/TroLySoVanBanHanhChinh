import React, { useState, useEffect } from 'react';
import { BookMarked, X, Search, PlusCircle, CheckCircle2, AlertOctagon, GitBranch, ArrowRight, ShieldCheck, Loader2 } from 'lucide-react';
import { LegalDocumentItem, UserItem } from '../../types';
import { api } from '../../services/api';
import { StatusBadge } from '../common/StatusBadge';

interface LegalKBModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserItem;
}

export const LegalKBModal: React.FC<LegalKBModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [documents, setDocuments] = useState<LegalDocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  // Form thêm văn bản
  const [newCodeNumber, setNewCodeNumber] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newDocType, setNewDocType] = useState('NGHI_DINH');
  const [newIssuer, setNewIssuer] = useState('Chính phủ');
  const [newFullContent, setNewFullContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadDocuments();
    }
  }, [isOpen]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const docs = await api.getLegalDocuments();
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handle1TouchActivate = async (docId: string) => {
    try {
      setLoading(true);
      await api.updateLegalStatus(docId, 'ACTIVE');
      setMessage('Đã kích hoạt văn bản thành công! Các văn bản cũ liên quan đã tự động chuyển sang HẾT HIỆU LỰC.');
      await loadDocuments();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIngestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCodeNumber || !newTitle) return;

    try {
      setIsSubmitting(true);
      setMessage(null);
      const res = await api.ingestLegalNorm({
        codeNumber: newCodeNumber,
        title: newTitle,
        docType: newDocType,
        issuer: newIssuer,
        issuedDate: new Date().toISOString().split('T')[0],
        effectiveDate: new Date().toISOString().split('T')[0],
        status: 'ACTIVE',
        isDraft: false,
        fullContent: newFullContent,
      });

      setMessage(res.message || 'Đã thêm văn bản quy phạm pháp luật thành công!');
      setNewCodeNumber('');
      setNewTitle('');
      setNewFullContent('');
      setActiveTab('list');
      await loadDocuments();
    } catch (err) {
      console.error(err);
      setMessage('Lỗi khi tiếp nhận văn bản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredDocs = documents.filter(
    (d) =>
      d.codeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.issuer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gov-border w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2.5">
            <BookMarked className="w-5 h-5 text-gov-gold" />
            <div>
              <h2 className="text-base font-bold uppercase tracking-wide">
                Tủ sách Pháp lý & Kiểm soát Hiệu lực Văn bản QPPL
              </h2>
              <p className="text-xs text-white/80">
                Tuân thủ Điều 156 Luật Ban hành VBQPPL 2015 (sửa đổi, bổ sung 2020)
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

        {/* Tab & Search Bar */}
        <div className="px-6 py-3 bg-gov-subtle/50 border-b border-gov-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'list'
                  ? 'bg-gov-primary text-white shadow-sm'
                  : 'bg-white text-gov-text hover:bg-gov-subtle border border-gov-border'
              }`}
            >
              Danh mục Văn bản & Thứ bậc ({documents.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('add')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                activeTab === 'add'
                  ? 'bg-gov-primary text-white shadow-sm'
                  : 'bg-white text-gov-text hover:bg-gov-subtle border border-gov-border'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-gov-gold" />
              Tiếp nhận văn bản mới
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="relative min-w-[260px]">
              <Search className="w-4 h-4 text-gov-text-disabled absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm số hiệu, từ khóa..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gov-border focus:outline-none focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
          )}
        </div>

        {/* Alerts / Notice */}
        {message && (
          <div className="mx-6 mt-3 p-3 bg-gov-active-bg border border-gov-active-border rounded-lg text-xs font-semibold text-gov-active flex items-center justify-between">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)} className="text-gov-active font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' ? (
            loading ? (
              <div className="py-16 text-center text-gov-text-secondary">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gov-primary" />
                <p className="text-xs">Đang tải tủ sách pháp lý công quyền...</p>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-16 text-center text-gov-text-secondary">
                <p className="text-xs">Không tìm thấy văn bản phù hợp với từ khóa.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-gov-border bg-white hover:border-gov-gold/70 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-gov-primary bg-gov-subtle px-2 py-0.5 rounded">
                            {doc.codeNumber}
                          </span>
                          <StatusBadge status={doc.status} size="sm" />
                          <span className="text-[11px] font-bold text-gov-gold uppercase">
                            Thứ bậc: {doc.hierarchyRank}/100
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-gov-text mt-1.5 leading-snug">
                          {doc.title}
                        </h4>
                        <div className="text-[11px] text-gov-text-secondary mt-1 flex items-center gap-4">
                          <span>Ban hành: {doc.issuer} ({new Date(doc.issuedDate).toLocaleDateString('vi-VN')})</span>
                          <span>Hiệu lực từ: {new Date(doc.effectiveDate).toLocaleDateString('vi-VN')}</span>
                          {doc.expiredDate && (
                            <span className="text-gov-danger font-medium">
                              Hết hiệu lực: {new Date(doc.expiredDate).toLocaleDateString('vi-VN')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 1-touch Activate button for Admin */}
                      {currentUser.role === 'ADMIN' && doc.status !== 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => handle1TouchActivate(doc.id)}
                          className="px-3 py-1.5 rounded bg-gov-active hover:bg-emerald-700 text-white text-xs font-bold shadow-sm whitespace-nowrap transition-colors flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Kích hoạt 1 chạm
                        </button>
                      )}
                    </div>

                    {/* Relations display (REPLACES / AMENDS) */}
                    {doc.relations && doc.relations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gov-border/60">
                        <div className="text-[11px] font-bold text-gov-text-secondary flex items-center gap-1.5 mb-1">
                          <GitBranch className="w-3.5 h-3.5 text-gov-primary" />
                          Mối quan hệ thay thế / sửa đổi văn bản:
                        </div>
                        <div className="space-y-1">
                          {doc.relations.map((rel) => (
                            <div
                              key={rel.id}
                              className="text-xs p-2 rounded bg-gov-bg border border-gov-border flex items-center gap-2"
                            >
                              <span className="font-bold text-gov-danger uppercase text-[10px] bg-white px-1.5 py-0.5 rounded border border-gov-border">
                                {rel.relationType}
                              </span>
                              <span className="text-gov-text">
                                Thay thế cho: <strong>{rel.targetCode}</strong> - {rel.targetTitle}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Ingest Form */
            <form onSubmit={handleIngestSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gov-text mb-1">Số ký hiệu văn bản *</label>
                  <input
                    type="text"
                    required
                    value={newCodeNumber}
                    onChange={(e) => setNewCodeNumber(e.target.value)}
                    placeholder="Ví dụ: 124/2026/NĐ-CP"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gov-text mb-1">Cơ quan ban hành *</label>
                  <input
                    type="text"
                    required
                    value={newIssuer}
                    onChange={(e) => setNewIssuer(e.target.value)}
                    placeholder="Chính phủ, Quốc hội, UBND Tỉnh..."
                    className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-text mb-1">Tên loại văn bản</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                >
                  <option value="NGHI_DINH">Nghị định (Chính phủ - Trọng số 70)</option>
                  <option value="LUAT">Luật (Quốc hội - Trọng số 90)</option>
                  <option value="QUYET_DINH_TTG">Quyết định (Thủ tướng - Trọng số 60)</option>
                  <option value="THONG_TU">Thông tư (Bộ trưởng - Trọng số 50)</option>
                  <option value="QUYET_DINH_UBND">Quyết định (UBND Tỉnh - Trọng số 40)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-text mb-1">Trích yếu nội dung văn bản *</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Nghị định quy định về quản lý và phát triển..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gov-text mb-1">
                  Nội dung điều khoản hoặc câu điều khoản chuyển tiếp
                </label>
                <textarea
                  rows={4}
                  value={newFullContent}
                  onChange={(e) => setNewFullContent(e.target.value)}
                  placeholder="Ví dụ: Điều 20. Hiệu lực thi hành. Nghị định này thay thế Nghị định số 45/2021/NĐ-CP ngày 31 tháng 3 năm 2021 của Chính phủ..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text font-mono"
                />
                <p className="text-[11px] text-gov-text-secondary mt-1">
                  * Hệ thống sẽ tự động quét mệnh đề "thay thế Nghị định số..." để thiết lập quan hệ pháp lý và bãi bỏ văn bản cũ.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-gov-border text-gov-text hover:bg-gov-subtle"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white shadow-sm flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Lưu & Kiểm soát Hiệu lực</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
