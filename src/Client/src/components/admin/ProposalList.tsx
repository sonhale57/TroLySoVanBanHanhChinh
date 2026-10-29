import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  User,
  Building,
  Calendar,
  Send,
  Loader2,
  ExternalLink,
  MessageSquareQuote,
  Trash2
} from 'lucide-react';
import { SmartDeleteConfirmModal } from '../common/SmartDeleteConfirmModal';
import { LegalProposalItem } from '../../types';
import { api } from '../../services/api';

interface ProposalListProps {
  onRefreshStats?: () => void;
}

export const ProposalList: React.FC<ProposalListProps> = ({ onRefreshStats }) => {
  const [proposals, setProposals] = useState<LegalProposalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Review modal state
  const [reviewingItem, setReviewingItem] = useState<LegalProposalItem | null>(null);
  const [actionType, setActionType] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteTargetProposal, setDeleteTargetProposal] = useState<LegalProposalItem | null>(null);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getProposals();
      setProposals(data);
      if (onRefreshStats) onRefreshStats();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể tải danh sách đề xuất pháp lý.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProposals();
  }, []);

  const handleExecuteDeleteProposal = async (forceCascade: boolean) => {
    if (!deleteTargetProposal) return { success: false };
    try {
      await api.deleteProposal(deleteTargetProposal.id, forceCascade);
      setDeleteTargetProposal(null);
      await fetchProposals();
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

  const handleOpenReview = (item: LegalProposalItem, type: 'APPROVED' | 'REJECTED') => {
    setReviewingItem(item);
    setActionType(type);
    setAdminNote(type === 'APPROVED' ? 'Đồng ý chủ trương cập nhật văn bản này vào Tủ sách pháp lý.' : 'Chưa đủ cơ sở pháp lý để ban hành.');
  };

  const handleConfirmReview = async () => {
    if (!reviewingItem) return;
    try {
      setSubmitting(true);
      await api.reviewProposal(reviewingItem.id, actionType, adminNote);
      setReviewingItem(null);
      await fetchProposals();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Lỗi khi cập nhật trạng thái đề xuất.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProposals = proposals.filter((p) => {
    if (filterStatus === 'ALL') return true;
    return p.status === filterStatus;
  });

  const pendingCount = proposals.filter((p) => p.status === 'PENDING').length;
  const approvedCount = proposals.filter((p) => p.status === 'APPROVED').length;
  const rejectedCount = proposals.filter((p) => p.status === 'REJECTED').length;

  return (
    <div className="space-y-4">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`cursor-pointer p-3 rounded-xl border transition-all ${
            filterStatus === 'ALL'
              ? 'bg-white border-gov-primary shadow-md ring-2 ring-gov-primary/20'
              : 'bg-white/80 border-gov-border hover:border-gov-text-disabled'
          }`}
        >
          <div className="text-[11px] font-bold text-gov-text-secondary">Tất cả đề xuất</div>
          <div className="text-xl font-black text-gov-text mt-0.5">{proposals.length}</div>
        </div>

        <div
          onClick={() => setFilterStatus('PENDING')}
          className={`cursor-pointer p-3 rounded-xl border transition-all ${
            filterStatus === 'PENDING'
              ? 'bg-gov-warning-bg border-gov-warning shadow-md ring-2 ring-gov-warning/20'
              : 'bg-white/80 border-gov-border hover:border-gov-warning'
          }`}
        >
          <div className="text-[11px] font-bold text-gov-warning flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Đang chờ thẩm duyệt
          </div>
          <div className="text-xl font-black text-gov-warning mt-0.5">{pendingCount}</div>
        </div>

        <div
          onClick={() => setFilterStatus('APPROVED')}
          className={`cursor-pointer p-3 rounded-xl border transition-all ${
            filterStatus === 'APPROVED'
              ? 'bg-gov-active-bg border-gov-active shadow-md ring-2 ring-gov-active/20'
              : 'bg-white/80 border-gov-border hover:border-gov-active'
          }`}
        >
          <div className="text-[11px] font-bold text-gov-active flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Đã chấp thuận
          </div>
          <div className="text-xl font-black text-gov-active mt-0.5">{approvedCount}</div>
        </div>

        <div
          onClick={() => setFilterStatus('REJECTED')}
          className={`cursor-pointer p-3 rounded-xl border transition-all ${
            filterStatus === 'REJECTED'
              ? 'bg-gov-danger-bg border-gov-danger shadow-md ring-2 ring-gov-danger/20'
              : 'bg-white/80 border-gov-border hover:border-gov-danger'
          }`}
        >
          <div className="text-[11px] font-bold text-gov-danger flex items-center gap-1.5">
            <XCircle className="w-3.5 h-3.5" />
            Đã từ chối
          </div>
          <div className="text-xl font-black text-gov-danger mt-0.5">{rejectedCount}</div>
        </div>
      </div>

      {/* Main List */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden">
        <div className="p-4 border-b border-gov-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gov-subtle/50">
          <div>
            <h3 className="text-sm font-bold text-gov-text uppercase tracking-wide">
              Hộp thư Đề xuất Cập nhật Pháp luật
            </h3>
            <p className="text-xs text-gov-text-secondary mt-0.5">
              Ý kiến tham mưu, đề xuất bổ sung văn bản quy phạm từ cán bộ các phòng ban
            </p>
          </div>
          <button
            type="button"
            onClick={fetchProposals}
            disabled={loading}
            className="text-xs font-bold text-gov-primary hover:text-gov-primary-dark flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gov-border bg-white shadow-sm"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Làm mới'}
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 bg-gov-danger-bg text-gov-danger border border-gov-danger-border rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center text-gov-text-secondary text-xs">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-gov-primary mb-2" />
            Đang tải dữ liệu đề xuất tham mưu...
          </div>
        ) : filteredProposals.length === 0 ? (
          <div className="p-12 text-center text-gov-text-secondary text-xs">
            Không có đề xuất nào trong danh mục này.
          </div>
        ) : (
          <div className="divide-y divide-gov-border">
            {filteredProposals.map((item) => (
              <div key={item.id} className="p-4 sm:p-5 hover:bg-gov-bg/60 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    {/* Header info */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                          item.status === 'PENDING'
                            ? 'bg-gov-warning-bg text-gov-warning border-gov-warning-border'
                            : item.status === 'APPROVED'
                            ? 'bg-gov-active-bg text-gov-active border-gov-active-border'
                            : 'bg-gov-danger-bg text-gov-danger border-gov-danger-border'
                        }`}
                      >
                        {item.status === 'PENDING'
                          ? 'Chờ thẩm duyệt'
                          : item.status === 'APPROVED'
                          ? 'Đã chấp thuận'
                          : 'Từ chối'}
                      </span>
                      <h4 className="text-xs sm:text-sm font-bold text-gov-text">
                        {item.title}
                      </h4>
                    </div>

                    {/* Metadata Submitter */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-gov-text-secondary">
                      <span className="flex items-center gap-1 font-medium">
                        <User className="w-3.5 h-3.5 text-gov-primary" />
                        {item.submitterName}
                      </span>
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5 text-gov-gold" />
                        {item.submitterDepartment}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(item.createdAt).toLocaleDateString('vi-VN')} {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Content Notes */}
                    {item.notes && (
                      <p className="text-xs text-gov-text bg-gov-bg p-3 rounded-lg border border-gov-border/60">
                        {item.notes}
                      </p>
                    )}

                    {/* Attachment file */}
                    {item.attachmentPath && (
                      <div className="flex items-center gap-2 text-xs font-semibold text-gov-primary">
                        <FileText className="w-4 h-4 text-gov-gold" />
                        <span>Tệp đính kèm: </span>
                        <span className="underline italic">{item.attachmentPath.split('/').pop()}</span>
                      </div>
                    )}

                    {/* Admin Response Note if available */}
                    {item.adminResponseNote && (
                      <div className="mt-2 p-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2">
                        <MessageSquareQuote className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="font-bold text-[11px] uppercase tracking-wide">
                            Ý kiến Lãnh đạo thẩm duyệt {item.reviewerName ? `(${item.reviewerName})` : ''}:
                          </div>
                          <p className="mt-0.5 text-xs text-blue-950">{item.adminResponseNote}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions for Admin */}
                  <div className="flex md:flex-col items-center gap-2 flex-shrink-0">
                    {item.status === 'PENDING' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleOpenReview(item, 'APPROVED')}
                          className="px-3 py-1.5 rounded-lg bg-gov-active hover:bg-green-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Chấp thuận
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenReview(item, 'REJECTED')}
                          className="px-3 py-1.5 rounded-lg bg-gov-danger hover:bg-red-700 text-white text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Từ chối
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setDeleteTargetProposal(item)}
                      className="p-1.5 rounded-lg border border-gov-border text-gov-danger hover:bg-red-50 transition-colors"
                      title="Xóa đề xuất"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Dialog Modal */}
      {reviewingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-gov-border overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className={`px-5 py-4 text-white flex items-center justify-between ${
              actionType === 'APPROVED' ? 'bg-gov-active' : 'bg-gov-danger'
            }`}>
              <h3 className="text-sm font-bold uppercase tracking-wide flex items-center gap-2">
                {actionType === 'APPROVED' ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Chấp thuận Đề xuất Văn bản
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Từ chối Đề xuất Văn bản
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setReviewingItem(null)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <span className="text-gov-text-secondary font-medium">Nội dung đề xuất:</span>
                <p className="font-bold text-gov-text mt-0.5">{reviewingItem.title}</p>
                <p className="text-[11px] text-gov-text-secondary mt-0.5">
                  Người gửi: {reviewingItem.submitterName} ({reviewingItem.submitterDepartment})
                </p>
              </div>

              <div>
                <label className="block font-bold text-gov-text mb-1">
                  Ý kiến chỉ đạo / Phản hồi của Lãnh đạo *
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Nhập ý kiến chỉ đạo tới cán bộ đề xuất..."
                  className="w-full p-2.5 rounded-lg border border-gov-border focus:ring-2 focus:ring-gov-primary text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gov-border">
                <button
                  type="button"
                  onClick={() => setReviewingItem(null)}
                  className="px-3 py-2 rounded-lg border border-gov-border text-gov-text font-bold text-xs hover:bg-gov-bg"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={submitting || !adminNote.trim()}
                  onClick={handleConfirmReview}
                  className={`px-4 py-2 rounded-lg text-white font-bold text-xs shadow-md flex items-center gap-1.5 disabled:opacity-50 ${
                    actionType === 'APPROVED' ? 'bg-gov-active hover:bg-green-700' : 'bg-gov-danger hover:bg-red-700'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      Xác nhận {actionType === 'APPROVED' ? 'Chấp thuận' : 'Từ chối'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Smart Delete Modal cho Đề xuất */}
      <SmartDeleteConfirmModal
        isOpen={!!deleteTargetProposal}
        onClose={() => setDeleteTargetProposal(null)}
        onConfirm={handleExecuteDeleteProposal}
        title="Xác nhận xóa đề xuất pháp luật"
        itemName={deleteTargetProposal ? deleteTargetProposal.title : ''}
        itemTypeLabel="Đề xuất văn bản"
      />
    </div>
  );
};
