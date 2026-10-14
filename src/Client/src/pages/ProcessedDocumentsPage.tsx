import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  Eye,
  ArrowLeft,
  Loader2,
  Calendar,
  Building,
  CheckCircle2,
  Shield,
  User,
  X
} from 'lucide-react';
import { ProcessedRecordItem, ProcessedRecordDetail, ProcessIncomingResult } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ActionConfirmModal } from '../components/common/ActionConfirmModal';

interface ProcessedDocumentsPageProps {
  onBackToWorkspace: () => void;
  onOpenInWorkspace: (data: ProcessIncomingResult) => void;
}

export const ProcessedDocumentsPage: React.FC<ProcessedDocumentsPageProps> = ({
  onBackToWorkspace,
  onOpenInWorkspace,
}) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<ProcessedRecordItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<ProcessedRecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [confirmReprocessRecord, setConfirmReprocessRecord] = useState<ProcessedRecordItem | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async (searchTerm: string = '') => {
    try {
      setLoading(true);
      const data = await api.getProcessedDocuments(searchTerm);
      setRecords(data);
    } catch (err) {
      console.error(err);
      setNotification('Không thể tải danh sách hồ sơ đã xử lý.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadRecords(search);
  };

  const handleViewDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const detail = await api.getProcessedDocumentDetail(id);
      setSelectedRecord(detail);
    } catch (err) {
      console.error(err);
      setNotification('Không thể tải chi tiết hồ sơ.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmReprocess = async () => {
    if (!confirmReprocessRecord) return;
    const targetRecord = confirmReprocessRecord;
    setConfirmReprocessRecord(null);

    try {
      setReprocessingId(targetRecord.id);
      setNotification(null);
      const newResult = await api.reprocessDocument(targetRecord.id);
      setNotification(`Đã thẩm định lại thành công văn bản ${targetRecord.incomingDocCode || targetRecord.originalFileName}!`);
      // Tải lại danh sách
      await loadRecords(search);
      // Mở sang bàn làm việc
      onOpenInWorkspace(newResult);
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || 'Không thể xử lý lại văn bản. Vui lòng kiểm tra lại tệp gốc.';
      setNotification(msg);
    } finally {
      setReprocessingId(null);
    }
  };

  return (
    <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5">
      {/* Top Banner Tiêu đề & Nút Quay lại */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToWorkspace}
            className="p-1 rounded-lg hover:bg-gov-subtle text-gov-text-secondary hover:text-gov-text transition-colors"
            title="Quay lại bàn làm việc"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-gov-primary-light/60 flex items-center justify-center text-gov-primary">
            <FileText className="w-5 h-5 text-gov-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold uppercase tracking-wider text-gov-text">
                Kho Hồ Sơ & Văn Bản Đã Xử Lý
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gov-gold/15 text-gov-text font-black border border-gov-gold/30">
                {user?.role === 'ADMIN' ? 'Toàn cơ quan' : 'Cá nhân cán bộ'}
              </span>
            </div>
            <p className="text-xs text-gov-text-secondary mt-0.5">
              {user?.role === 'ADMIN'
                ? 'Theo dõi, tra cứu toàn bộ hồ sơ công văn do tất cả chuyên viên, phòng ban đã thẩm định'
                : 'Tra cứu danh sách công văn do đồng chí đã xử lý và hỗ trợ xử lý lại theo luật mới nhất'}
            </p>
          </div>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="w-4 h-4 text-gov-text-disabled absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo số hiệu, trích yếu, cơ quan..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gov-primary hover:bg-gov-primary-dark text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <span>Tìm kiếm</span>
          </button>
        </form>
      </div>

      {/* Thông báo Notification */}
      {notification && (
        <div className="bg-gov-active-bg border border-gov-active-border text-gov-active text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Table Content */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden">
        {loading ? (
          <div className="py-20 text-center text-gov-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gov-primary" />
            <p className="text-xs font-semibold">Đang tải danh sách hồ sơ công vụ...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="py-20 text-center text-gov-text-secondary">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gov-text-disabled/50" />
            <h4 className="text-sm font-bold text-gov-text">Chưa có hồ sơ văn bản nào được xử lý</h4>
            <p className="text-xs text-gov-text-secondary mt-1 max-w-md mx-auto">
              Vui lòng tiếp nhận và thẩm định công văn mới tại Bàn làm việc để lưu vết hồ sơ vào hệ thống.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gov-subtle text-gov-text font-bold uppercase text-[11px] border-b border-gov-border">
                <tr>
                  <th className="p-3.5">Số hiệu & Trích yếu</th>
                  <th className="p-3.5">Cơ quan ban hành</th>
                  <th className="p-3.5">Độ khẩn & Hạn SLA</th>
                  <th className="p-3.5">Cán bộ xử lý</th>
                  <th className="p-3.5">Phương án thẩm định</th>
                  <th className="p-3.5">Thời gian tiếp nhận</th>
                  <th className="p-3.5 text-right">Thao tác nghiệp vụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border">
                {records.map((item) => (
                  <tr key={item.id} className="hover:bg-gov-bg/60 transition-colors">
                    {/* Số hiệu & Trích yếu */}
                    <td className="p-3.5 max-w-xs">
                      <div className="font-bold text-gov-primary flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-gov-gold flex-shrink-0" />
                        <span>{item.incomingDocCode || 'Chưa nhận diện'}</span>
                      </div>
                      <div className="text-[11px] text-gov-text-secondary mt-0.5 line-clamp-2" title={item.subjectTitle || item.originalFileName}>
                        {item.subjectTitle || item.originalFileName}
                      </div>
                      {item.reprocessCount > 0 && (
                        <span className="inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                          Đã xử lý lại {item.reprocessCount} lần
                        </span>
                      )}
                    </td>

                    {/* Cơ quan ban hành */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 font-medium text-gov-text">
                        <Building className="w-3.5 h-3.5 text-gov-text-disabled" />
                        <span>{item.incomingIssuer || 'Đơn vị bên ngoài'}</span>
                      </div>
                      <div className="text-[10px] text-gov-text-disabled mt-0.5 truncate max-w-[150px]">
                        Tệp: {item.originalFileName}
                      </div>
                    </td>

                    {/* Độ khẩn & Hạn SLA */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.urgencyLevel === 'HỎA TỐC'
                              ? 'bg-gov-danger-bg text-gov-danger border border-gov-danger-border'
                              : item.urgencyLevel === 'KHẨN'
                              ? 'bg-gov-warning-bg text-gov-warning border border-gov-warning-border'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.urgencyLevel}
                        </span>
                      </div>
                      {item.slaDeadline && (
                        <div className="text-[11px] text-gov-danger font-medium mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Hạn: {new Date(item.slaDeadline).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                    </td>

                    {/* Cán bộ xử lý */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="font-bold text-gov-text flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-gov-primary" />
                        <span>{item.userName}</span>
                      </div>
                      <div className="text-[10px] text-gov-text-secondary mt-0.5">
                        {item.department}
                      </div>
                    </td>

                    {/* Phương án thẩm định */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="font-bold text-gov-active text-xs">
                        {item.selectedOptionId}
                      </span>
                    </td>

                    {/* Thời gian */}
                    <td className="p-3.5 whitespace-nowrap text-gov-text-secondary">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5 text-gov-text-disabled" />
                        <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="text-[10px] text-gov-text-disabled mt-0.5">
                        {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Nút thao tác */}
                    <td className="p-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Nút Xem lại chi tiết */}
                        <button
                          type="button"
                          onClick={() => handleViewDetail(item.id)}
                          className="px-2.5 py-1.5 rounded-lg border border-gov-border bg-white hover:bg-gov-subtle text-gov-text text-[11px] font-semibold flex items-center gap-1 transition-all"
                          title="Xem lại tóm tắt và căn cứ pháp lý đã thẩm định"
                        >
                          <Eye className="w-3.5 h-3.5 text-gov-primary" />
                          <span>Chi tiết</span>
                        </button>

                        {/* Nút Xử lý lại văn bản */}
                        <button
                          type="button"
                          disabled={reprocessingId === item.id || !item.hasStoredFile}
                          onClick={() => setConfirmReprocessRecord(item)}
                          className="px-2.5 py-1.5 rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white text-[11px] font-bold flex items-center gap-1 transition-all shadow-sm disabled:opacity-50"
                          title={item.hasStoredFile ? 'Thẩm định lại văn bản theo bộ luật mới nhất' : 'Không có tệp gốc để xử lý lại'}
                        >
                          {reprocessingId === item.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang thẩm định...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 text-gov-gold" />
                              <span>Xử lý lại</span>
                            </>
                          )}
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

      {/* Modal Xem chi tiết hồ sơ */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gov-border overflow-hidden max-h-[85vh] flex flex-col">
            {/* Header modal */}
            <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gov-gold" />
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide">
                    Chi tiết hồ sơ công văn: {selectedRecord.incomingDocCode || selectedRecord.originalFileName}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    Cán bộ xử lý: {selectedRecord.userName} ({selectedRecord.department}) • Ngày: {new Date(selectedRecord.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/20"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content modal */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-gov-bg rounded-xl border border-gov-border">
                <div>
                  <span className="text-[11px] font-bold text-gov-text-secondary">Số hiệu công văn:</span>
                  <div className="font-bold text-gov-primary">{selectedRecord.incomingDocCode || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gov-text-secondary">Cơ quan ban hành:</span>
                  <div className="font-semibold text-gov-text">{selectedRecord.incomingIssuer || 'N/A'}</div>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gov-text-secondary">Tên tệp gốc:</span>
                  <div className="font-mono text-gov-text truncate">{selectedRecord.originalFileName}</div>
                </div>
                <div>
                  <span className="text-[11px] font-bold text-gov-text-secondary">Độ khẩn:</span>
                  <div className="font-bold text-gov-danger">{selectedRecord.urgencyLevel}</div>
                </div>
              </div>

              {selectedRecord.subjectTitle && (
                <div>
                  <h4 className="text-xs font-bold text-gov-text mb-1">Trích yếu nội dung:</h4>
                  <p className="p-3 bg-white border border-gov-border rounded-xl text-gov-text leading-relaxed">
                    {selectedRecord.subjectTitle}
                  </p>
                </div>
              )}

              {selectedRecord.summaryDataJson && (
                <div>
                  <h4 className="text-xs font-bold text-gov-text mb-1">Tóm tắt nội dung 30s:</h4>
                  <div className="p-3 bg-gov-subtle/50 border border-gov-border rounded-xl text-gov-text space-y-1.5 font-medium leading-relaxed">
                    {(() => {
                      try {
                        const parsed = JSON.parse(selectedRecord.summaryDataJson);
                        return (
                          <>
                            {parsed.coreProblem && <div><strong>Vấn đề cốt lõi:</strong> {parsed.coreProblem}</div>}
                            {parsed.submittedBasis && <div><strong>Cơ sở gửi đến:</strong> {parsed.submittedBasis}</div>}
                            {parsed.requestedAction && <div><strong>Đề xuất xử lý:</strong> {parsed.requestedAction}</div>}
                          </>
                        );
                      } catch {
                        return <p>{selectedRecord.summaryDataJson}</p>;
                      }
                    })()}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gov-border flex items-center justify-between text-[11px] text-gov-text-secondary">
                <span>Phương án kết luận: <strong className="text-gov-primary">{selectedRecord.selectedOptionId}</strong></span>
                {selectedRecord.reprocessCount > 0 && (
                  <span>Đã xử lý lại {selectedRecord.reprocessCount} lần</span>
                )}
              </div>
            </div>

            {/* Footer modal */}
            <div className="px-6 py-3 bg-gov-bg/60 border-t border-gov-border flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-xl bg-gov-primary text-white text-xs font-bold"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Reprocess Toast/Modal */}
      <ActionConfirmModal
        isOpen={!!confirmReprocessRecord}
        onClose={() => setConfirmReprocessRecord(null)}
        onConfirm={handleConfirmReprocess}
        title="Xác nhận xử lý lại văn bản"
        message="Đồng chí có chắc chắn muốn nạp lại tệp gốc và thẩm định lại văn bản này không? Hệ thống sẽ đối chiếu với cơ sở dữ liệu Tủ sách pháp luật mới nhất và mở kết quả tại Bàn làm việc."
        detail={
          confirmReprocessRecord
            ? `Công văn: ${confirmReprocessRecord.incomingDocCode || confirmReprocessRecord.originalFileName} (${confirmReprocessRecord.incomingIssuer || 'Đơn vị gửi'})`
            : undefined
        }
        confirmText="Bắt đầu xử lý lại"
        cancelText="Hủy bỏ"
        type="primary"
      />
    </div>
  );
};

export default ProcessedDocumentsPage;
