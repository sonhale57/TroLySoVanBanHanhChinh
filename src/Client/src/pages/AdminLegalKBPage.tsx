import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  Plus,
  UploadCloud,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  ArrowLeft,
  Loader2,
  FileText,
  Eye
} from 'lucide-react';
import { LegalDocumentItem } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { QuickImportModal } from '../components/admin/QuickImportModal';
import { LegalEditModal } from '../components/admin/LegalEditModal';
import { LegalDetailModal } from '../components/admin/LegalDetailModal';

interface AdminLegalKBPageProps {
  onBackToWorkspace: () => void;
}

export const AdminLegalKBPage: React.FC<AdminLegalKBPageProps> = ({ onBackToWorkspace }) => {
  const [documents, setDocuments] = useState<LegalDocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isQuickImportOpen, setIsQuickImportOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocumentItem | null>(null);
  const [viewingDoc, setViewingDoc] = useState<LegalDocumentItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, []);

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

  const handleDelete = async (doc: LegalDocumentItem) => {
    if (!window.confirm(`Xác nhận xóa văn bản "${doc.codeNumber}" khỏi Tủ sách pháp lý? Hành động này không thể hoàn tác.`)) {
      return;
    }

    try {
      setLoading(true);
      await api.deleteDoc(doc.id);
      setNotification(`Đã xóa văn bản ${doc.codeNumber} thành công.`);
      await loadDocuments();
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
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookMarked className="w-5 h-5 text-gov-primary" />
            <h2 className="text-base font-bold uppercase tracking-wider text-gov-text">
              Quản trị Tủ sách Pháp luật
            </h2>
          </div>
          <p className="text-xs text-gov-text-secondary mt-1">
            Thao tác văn phòng trực quan: Kéo thả import 1-chạm tự nhận diện thay thế, chỉnh sửa nội dung và cập nhật trạng thái trong nút Sửa.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Quick Import 1-Touch Button */}
          <button
            type="button"
            onClick={() => setIsQuickImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gov-primary hover:bg-gov-primary-dark text-white text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all"
          >
            <UploadCloud className="w-4 h-4 text-gov-gold" />
            <span>+ Import tệp Luật mới (Tự nhận diện)</span>
          </button>

          {/* Manual Add Button */}
          <button
            type="button"
            onClick={() => {
              setEditingDoc(null);
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-gov-subtle text-gov-text text-xs font-bold border border-gov-border shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-gov-gold" />
            <span>+ Thêm thủ công</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 rounded-lg bg-gov-active-bg text-gov-active border border-gov-active-border text-xs font-semibold flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 text-gov-text-disabled absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo số hiệu (vd: 30/2020), trích yếu, cơ quan..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
          />
        </div>

        {/* Quick Status Filter Buttons */}
        <div className="flex items-center gap-1.5">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'ACTIVE', label: 'Còn hiệu lực' },
            { id: 'EXPIRED', label: 'Hết hiệu lực' },
            { id: 'DRAFT', label: 'Dự thảo' },
          ].map((btn) => (
            <button
              key={btn.id}
              type="button"
              onClick={() => setStatusFilter(btn.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                statusFilter === btn.id
                  ? 'bg-gov-gold text-gov-text shadow-sm'
                  : 'bg-gov-bg text-gov-text-secondary hover:text-gov-text'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-gov-text-secondary font-medium whitespace-nowrap">
          Tổng số: <strong className="text-gov-primary">{filteredDocs.length}</strong> văn bản quy phạm
        </div>
      </div>

      {/* Document Table */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gov-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gov-primary" />
            <p className="text-xs">Đang tải dữ liệu tủ sách pháp lý...</p>
          </div>
        ) : filteredDocs.length === 0 ? (
          <div className="py-20 text-center text-gov-text-secondary">
            <p className="text-xs font-semibold text-gov-text">Không tìm thấy văn bản phù hợp.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gov-subtle text-gov-text font-bold uppercase text-[11px] border-b border-gov-border">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">Số ký hiệu</th>
                  <th className="px-4 py-3.5 min-w-[280px]">Trích yếu nội dung văn bản</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">Cơ quan / Loại</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[120px]">Ngày hiệu lực</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px] text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap min-w-[220px]">Thao tác cán bộ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border">
                {filteredDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gov-bg/60 transition-colors">
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setViewingDoc(doc)}
                        className="font-bold text-gov-primary bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded text-xs border border-blue-200 whitespace-nowrap transition-colors"
                        title="Bấm để xem toàn văn nội dung & các điều khoản thi hành"
                      >
                        {doc.codeNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div 
                        onClick={() => setViewingDoc(doc)}
                        className="font-semibold text-gov-text max-w-md line-clamp-2 hover:text-gov-primary cursor-pointer transition-colors"
                        title="Bấm để xem chi tiết toàn văn văn bản"
                      >
                        {doc.title}
                      </div>
                      {doc.relations && doc.relations.length > 0 && (
                        <div className="text-[11px] text-red-700 font-bold mt-1 whitespace-nowrap">
                          ↳ Thay thế: {doc.relations.map((r) => r.targetCode).join(', ')}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-medium text-gov-text">{doc.issuer}</div>
                      <div className="text-[11px] text-gov-text-secondary">{doc.docType}</div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap font-medium text-gov-text">
                      {new Date(doc.effectiveDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <StatusBadge status={doc.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Nút Xem chi tiết: Hiển thị toàn văn & danh mục điều khoản */}
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 font-bold text-xs transition-colors shadow-sm whitespace-nowrap"
                          title="Xem toàn văn nội dung và các điều khoản thi hành"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-700 flex-shrink-0" />
                          <span>Chi tiết</span>
                        </button>

                        {/* Edit Button: Opens Edit Modal where Metadata & Clauses can be edited */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoc(doc);
                            setIsEditModalOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gov-subtle hover:bg-white text-gov-text hover:text-gov-primary border border-gov-border hover:border-gov-primary font-bold text-xs transition-colors shadow-sm whitespace-nowrap"
                          title="Sửa thông tin văn bản & nội dung từng điều khoản"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-gov-gold flex-shrink-0" />
                          <span>Sửa</span>
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDelete(doc)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-gov-danger-bg text-gov-text-secondary hover:text-gov-danger border border-transparent hover:border-gov-danger-border font-bold text-xs transition-colors whitespace-nowrap"
                          title="Xóa văn bản"
                        >
                          <Trash2 className="w-3.5 h-3.5 flex-shrink-0" />
                          <span>Xóa</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Chi tiết văn bản pháp luật & Điều khoản Modal */}
      <LegalDetailModal
        isOpen={!!viewingDoc}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
        onOpenEdit={(doc) => {
          setEditingDoc(doc);
          setIsEditModalOpen(true);
        }}
      />

      {/* Quick Import Modal */}
      <QuickImportModal
        isOpen={isQuickImportOpen}
        onClose={() => setIsQuickImportOpen(false)}
        onImportSuccess={() => {
          setNotification('Đã import tệp Luật mới và tự động cập nhật quan hệ thay thế thành công!');
          loadDocuments();
        }}
      />

      {/* Manual Add / Edit Modal (Hỗ trợ sửa chi tiết nội dung từng Điều khoản) */}
      <LegalEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        documentToEdit={editingDoc}
        onSuccess={() => {
          setNotification(editingDoc ? 'Đã cập nhật thông tin và toàn bộ nội dung điều khoản văn bản thành công.' : 'Đã thêm văn bản mới vào Tủ sách thành công.');
          loadDocuments();
        }}
      />
    </div>
  );
};
