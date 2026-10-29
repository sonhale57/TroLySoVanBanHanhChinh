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
  Eye,
  Filter,
  Layers,
  X
} from 'lucide-react';
import { LegalDocumentItem } from '../types';
import { api } from '../services/api';
import { StatusBadge } from '../components/common/StatusBadge';
import { QuickImportModal } from '../components/admin/QuickImportModal';
import { LegalEditModal } from '../components/admin/LegalEditModal';
import { LegalDetailModal } from '../components/admin/LegalDetailModal';
import { SmartDeleteConfirmModal } from '../components/common/SmartDeleteConfirmModal';

interface AdminLegalKBPageProps {
  onBackToWorkspace: () => void;
}

export const AdminLegalKBPage: React.FC<AdminLegalKBPageProps> = ({ onBackToWorkspace }) => {
  const [documents, setDocuments] = useState<LegalDocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [fieldCategoryFilter, setFieldCategoryFilter] = useState<string>('ALL');
  const [documentScopeFilter, setDocumentScopeFilter] = useState<string>('ALL');

  const [isQuickImportOpen, setIsQuickImportOpen] = useState(false);
  const [isFastUploadOpen, setIsFastUploadOpen] = useState(false);
  const [deleteTargetDoc, setDeleteTargetDoc] = useState<LegalDocumentItem | null>(null);
  const [fastUploadFile, setFastUploadFile] = useState<File | null>(null);
  const [fastCategory, setFastCategory] = useState<string>('QUAN_TRI_VAN_PHONG');
  const [fastScope, setFastScope] = useState<string>('HANH_CHINH');
  const [fastAgency, setFastAgency] = useState<string>('');
  const [isFastUploading, setIsFastUploading] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<LegalDocumentItem | null>(null);
  const [viewingDoc, setViewingDoc] = useState<LegalDocumentItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [fieldCategoryFilter, documentScopeFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (fieldCategoryFilter !== 'ALL') params.fieldCategory = fieldCategoryFilter;
      if (documentScopeFilter !== 'ALL') params.documentScope = documentScopeFilter;
      const docs = await api.getLegalDocuments(params);
      setDocuments(docs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleFastUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fastUploadFile) return;

    try {
      setIsFastUploading(true);
      await api.fastUploadLegalDoc(fastUploadFile, fastCategory, fastScope, fastAgency);
      setNotification(`Đã nạp nhanh văn bản "${fastUploadFile.name}" vào Tủ sách thành công mà không cần tách Điều/Khoản!`);
      setIsFastUploadOpen(false);
      setFastUploadFile(null);
      await loadDocuments();
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể nạp văn bản.');
    } finally {
      setIsFastUploading(false);
    }
  };

  const handleExecuteDeleteDoc = async (forceCascade: boolean) => {
    if (!deleteTargetDoc) return { success: false };
    try {
      const res = await api.deleteDoc(deleteTargetDoc.id, forceCascade);
      setNotification(res.message || `Đã xóa văn bản ${deleteTargetDoc.codeNumber} thành công.`);
      setDeleteTargetDoc(null);
      await loadDocuments();
      return { success: true };
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.requiresCascadeConfirmation) {
        return {
          success: false,
          requiresCascade: true,
          dependencies: err.response.data.dependencies,
          message: err.response.data.message,
        };
      }
      throw err;
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
              Quản trị Tủ sách Pháp luật & Văn bản Hành chính
            </h2>
          </div>
          <p className="text-xs text-gov-text-secondary mt-1">
            Kho ngữ cảnh pháp lý tin cậy (RAG nội bộ): Văn bản QPPL, Văn bản hành chính cá biệt, Hướng dẫn nghiệp vụ chuyên ngành.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {/* Nạp nhanh Form (Phân hệ 1.3: Nạp nhanh không bắt buộc tách Điều/Khoản) */}
          <button
            type="button"
            onClick={() => setIsFastUploadOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold shadow-sm transition-all"
            title="Tải lên công văn hướng dẫn nghiệp vụ hoặc quyết định cá biệt mà không cần tách Điều/Khoản"
          >
            <FileText className="w-4 h-4 text-emerald-200" />
            <span>Nạp nhanh Công văn / HDNV</span>
          </button>

          {/* Quick Import 1-Touch Button (Bóc tách Điều/Khoản Luật) */}
          <button
            type="button"
            onClick={() => setIsQuickImportOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4 text-white" />
            <span>Import Văn bản</span>
          </button>

          {/* Manual Add Button */}
          <button
            type="button"
            onClick={() => {
              setEditingDoc(null);
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-gov-subtle text-gov-text text-xs font-bold border border-gov-border shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-gov-gold" />
            <span>Thêm mới</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div className="p-3 rounded-lg bg-gov-active-bg text-gov-active border border-gov-active-border text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold">✕</button>
        </div>
      )}

      {/* BỘ LỌC 2 TẦNG: Lĩnh vực chuyên môn & Phạm vi văn bản (Section 1.3) */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-4 space-y-3">
        {/* Tầng 1: Lĩnh vực chuyên môn (FieldCategory) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1">Khối chuyên môn:</span>
          {[
            { id: 'ALL', label: 'Tất cả lĩnh vực' },
            { id: 'DAT_DAI_XAY_DUNG', label: 'Đất đai - Xây dựng' },
            { id: 'KINH_TE_TAI_CHINH', label: 'Kinh tế - Tài chính' },
            { id: 'NOI_VU_TO_CHUC', label: 'Nội vụ - Cán bộ' },
            { id: 'TU_PHAP_PHAP_CHE', label: 'Tư pháp - Pháp chế' },
            { id: 'THANH_TRA_KHIEU_NAI', label: 'Thanh tra - Khiếu nại' },
            { id: 'VAN_HOA_XA_HOI', label: 'Văn hóa - Xã hội' },
            { id: 'QUAN_TRI_VAN_PHONG', label: 'Quản trị - Văn phòng' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setFieldCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-all ${fieldCategoryFilter === cat.id
                ? 'bg-gov-primary text-white shadow-xs'
                : 'bg-gov-subtle text-slate-600 hover:text-slate-900'
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tầng 2: Phạm vi văn bản & Trạng thái & Tìm kiếm */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <span className="text-[11px] font-bold text-slate-500 whitespace-nowrap mr-1">Phạm vi:</span>
            {[
              { id: 'ALL', label: 'Tất cả phạm vi' },
              { id: 'QPPL', label: 'Văn bản QPPL' },
              { id: 'HANH_CHINH', label: 'Hành chính áp dụng' },
              { id: 'HUONG_DAN_NGHIEP_VU', label: 'Hướng dẫn nghiệp vụ' },
            ].map((scope) => (
              <button
                key={scope.id}
                type="button"
                onClick={() => setDocumentScopeFilter(scope.id)}
                className={`px-2.5 py-1 rounded-lg font-semibold whitespace-nowrap transition-all ${documentScopeFilter === scope.id
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                  }`}
              >
                {scope.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-72">
              <Search className="w-4 h-4 text-gov-text-disabled absolute left-3 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm số hiệu, trích yếu, cơ quan..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
            <div className="text-xs text-slate-500 font-medium whitespace-nowrap">
              Tổng số: <strong className="text-gov-primary">{filteredDocs.length}</strong> văn bản
            </div>
          </div>
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
            <p className="text-xs font-semibold text-gov-text">Không tìm thấy văn bản phù hợp bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gov-subtle text-gov-text font-bold uppercase text-[11px] border-b border-gov-border">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">Số ký hiệu</th>
                  <th className="px-4 py-3.5 min-w-[280px]">Trích yếu nội dung văn bản</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[170px]">Khối lĩnh vực / Phạm vi</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">Cơ quan ban hành</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[120px]">Ngày hiệu lực</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[130px] text-center">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right whitespace-nowrap min-w-[160px]">Thao tác cán bộ</th>
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
                        title="Bấm để xem toàn văn nội dung"
                      >
                        {doc.codeNumber}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div
                        onClick={() => setViewingDoc(doc)}
                        className="font-semibold text-gov-text max-w-md line-clamp-2 hover:text-gov-primary cursor-pointer transition-colors"
                        title="Bấm để xem chi tiết văn bản"
                      >
                        {doc.title}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 text-[11px]">{doc.fieldCategory}</div>
                      <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                        {doc.documentScope === 'QPPL' ? 'Quy phạm pháp luật' : doc.documentScope === 'HANH_CHINH' ? 'Hành chính cá biệt' : 'Hướng dẫn nghiệp vụ'}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-medium text-slate-700">{doc.issuerAgency || doc.issuer}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-slate-600">
                      {new Date(doc.effectiveDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingDoc(doc)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoc(doc);
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-gov-primary hover:bg-gov-subtle rounded-lg"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTargetDoc(doc)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Xóa văn bản"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Modal Nạp Nhanh Công Văn / HDNV (Section 1.3: Không bắt buộc bóc tách Điều/Khoản) */}
      {isFastUploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gov-border animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gov-border">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-gov-text uppercase">
                  Form nạp nhanh văn bản hành chính & hướng dẫn
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFastUploadOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFastUploadSubmit} className="py-4 space-y-3.5 text-xs">
              <p className="text-slate-500">
                Cho phép Admin tải lên công văn, quyết định cá biệt hoặc hướng dẫn nghiệp vụ mà không bắt buộc phải bóc tách cấu trúc Điều/Khoản như văn bản Luật.
              </p>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Chọn tệp văn bản (PDF, Word .docx, TXT):</label>
                <input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.txt"
                  onChange={(e) => setFastUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Khối lĩnh vực chuyên môn:</label>
                <select
                  value={fastCategory}
                  onChange={(e) => setFastCategory(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="QUAN_TRI_VAN_PHONG">Quản trị - Văn phòng tổng hợp (NĐ 30/2020)</option>
                  <option value="DAT_DAI_XAY_DUNG">Đất đai - Xây dựng - Đô thị - Môi trường</option>
                  <option value="KINH_TE_TAI_CHINH">Kinh tế - Đầu tư - Tài chính - Ngân sách</option>
                  <option value="NOI_VU_TO_CHUC">Nội vụ - Tổ chức cán bộ - Cải cách hành chính</option>
                  <option value="TU_PHAP_PHAP_CHE">Tư pháp - Pháp chế - Hộ tịch</option>
                  <option value="THANH_TRA_KHIEU_NAI">Thanh tra - Tiếp công dân - Khiếu nại, Tố cáo</option>
                  <option value="VAN_HOA_XA_HOI">Văn hóa - Xã hội - Giáo dục - Y tế</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Phạm vi văn bản:</label>
                <select
                  value={fastScope}
                  onChange={(e) => setFastScope(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                >
                  <option value="HANH_CHINH">Văn bản hành chính áp dụng (Quyết định cá biệt, Chỉ thị)</option>
                  <option value="HUONG_DAN_NGHIEP_VU">Văn bản hướng dẫn nghiệp vụ (Công văn hướng dẫn, Quy chế)</option>
                  <option value="QPPL">Văn bản quy phạm pháp luật</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Cơ quan ban hành chi tiết:</label>
                <input
                  type="text"
                  value={fastAgency}
                  onChange={(e) => setFastAgency(e.target.value)}
                  placeholder="Ví dụ: UBND tỉnh Quảng Trị, Sở Tư pháp..."
                  className="w-full p-2 border border-slate-300 rounded-lg font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gov-border">
                <button
                  type="button"
                  onClick={() => setIsFastUploadOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isFastUploading || !fastUploadFile}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold flex items-center gap-2"
                >
                  {isFastUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Nạp nhanh vào Tủ sách</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Import Modal (Bóc tách điều khoản Luật tự nhận diện) */}
      <QuickImportModal
        isOpen={isQuickImportOpen}
        onClose={() => setIsQuickImportOpen(false)}
        onImportSuccess={() => {
          setIsQuickImportOpen(false);
          setNotification('Đã import tệp Luật mới thành công!');
          loadDocuments();
        }}
      />

      {/* Manual Edit / Add Modal */}
      {isEditModalOpen && (
        <LegalEditModal
          isOpen={isEditModalOpen}
          documentToEdit={editingDoc}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setNotification(editingDoc ? 'Đã cập nhật văn bản thành công.' : 'Đã thêm văn bản mới thành công.');
            loadDocuments();
          }}
        />
      )}

      {/* View Detail Modal */}
      {viewingDoc && (
        <LegalDetailModal
          isOpen={!!viewingDoc}
          document={viewingDoc}
          onClose={() => setViewingDoc(null)}
          onOpenEdit={(doc) => {
            setViewingDoc(null);
            setEditingDoc(doc);
            setIsEditModalOpen(true);
          }}
        />
      )}

      {/* Smart Delete Modal (Xác nhận 2 cấp nếu có khóa ngoại) */}
      <SmartDeleteConfirmModal
        isOpen={!!deleteTargetDoc}
        onClose={() => setDeleteTargetDoc(null)}
        onConfirm={handleExecuteDeleteDoc}
        title="Xác nhận xóa văn bản pháp lý"
        itemName={deleteTargetDoc ? `${deleteTargetDoc.codeNumber} - ${deleteTargetDoc.title}` : ''}
        itemTypeLabel="Văn bản quy phạm pháp luật"
      />
    </div>
  );
};
