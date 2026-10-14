import React, { useState, useEffect } from 'react';
import { History, X, Clock, FileText, CheckCircle2, AlertTriangle, ShieldCheck, Loader2, Shield, User } from 'lucide-react';
import { ProcessingLogItem } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ProcessingLogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLogs();
    }
  }, [isOpen]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getProcessingLogs();
      setLogs(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isAdmin = user?.role === 'ADMIN';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gov-border w-full max-w-5xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2.5">
            <History className="w-5 h-5 text-gov-gold" />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold uppercase tracking-wide">
                  Nhật Ký Xử Lý Công Văn Hành Chính (Audit Log Bất Biến)
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gov-gold text-gov-text font-black">
                  {isAdmin ? 'Toàn cơ quan' : 'Cá nhân & Hồ sơ liên quan'}
                </span>
              </div>
              <p className="text-xs text-white/80 mt-0.5">
                {isAdmin
                  ? 'Theo dõi toàn bộ lịch sử thao tác của tất cả cán bộ, chuyên viên trên hệ thống'
                  : 'Chỉ hiển thị lịch sử thao tác của đồng chí và các thao tác liên quan đến hồ sơ đồng chí đã tải lên'}
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

        {/* Info Banner Phân quyền */}
        <div className="px-6 py-2.5 bg-gov-subtle/70 border-b border-gov-border flex items-center justify-between text-xs text-gov-text-secondary">
          <div className="flex items-center gap-1.5 font-medium">
            <ShieldCheck className="w-4 h-4 text-gov-active" />
            <span>
              {isAdmin
                ? `Đang hiển thị dòng thời gian xử lý toàn cơ quan (${logs.length} bản ghi gần nhất)`
                : `Bảo mật công vụ: Đang hiển thị lịch sử của đồng chí @${user?.username} và các hồ sơ liên quan (${logs.length} bản ghi)`}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-gov-text-disabled">Chuẩn Nghị định 30/2020/NĐ-CP</span>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="py-16 text-center text-gov-text-secondary">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gov-primary" />
              <p className="text-xs">Đang tải nhật ký công vụ...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-16 text-center text-gov-text-secondary">
              <History className="w-10 h-10 mx-auto mb-2 text-gov-text-disabled/60" />
              <p className="text-xs font-semibold">Chưa có nhật ký xử lý công văn nào phù hợp.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-gov-border">
                <thead className="bg-gov-subtle text-gov-text font-bold uppercase text-[11px] border-b border-gov-border">
                  <tr>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Số hiệu & Trích yếu</th>
                    <th className="p-3">Cơ quan ban hành</th>
                    <th className="p-3">Mức độ khẩn</th>
                    <th className="p-3">Cán bộ xử lý</th>
                    <th className="p-3">Phương án</th>
                    <th className="p-3">Hạn SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gov-border">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gov-bg/60 transition-colors">
                      <td className="p-3 text-gov-text font-medium whitespace-nowrap">
                        <div className="font-semibold">{new Date(log.createdAt).toLocaleDateString('vi-VN')}</div>
                        <div className="text-[10px] text-gov-text-disabled">
                          {new Date(log.createdAt).toLocaleTimeString('vi-VN')}
                        </div>
                      </td>
                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-gov-primary flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-gov-gold flex-shrink-0" />
                          <span>{log.incomingDocCode || 'Chưa nhận diện'}</span>
                          {log.isOwner && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-gov-active-bg text-gov-active font-bold border border-gov-active-border">
                              Của tôi
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gov-text-secondary mt-0.5 line-clamp-2" title={log.subjectTitle || log.originalFileName}>
                          {log.subjectTitle || log.originalFileName}
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap text-gov-text">
                        {log.incomingIssuer || 'Đơn vị gửi'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.urgencyLevel === 'HỎA TỐC'
                              ? 'bg-gov-danger-bg text-gov-danger border border-gov-danger-border'
                              : log.urgencyLevel === 'KHẨN'
                              ? 'bg-gov-warning-bg text-gov-warning border border-gov-warning-border'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {log.urgencyLevel}
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-semibold text-gov-text">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gov-text-disabled" />
                          <span>{log.userName}</span>
                        </div>
                      </td>
                      <td className="p-3 whitespace-nowrap font-bold text-gov-active">
                        {log.selectedOptionId}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        {log.slaDeadline ? (
                          <span className="text-gov-danger font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{new Date(log.slaDeadline).toLocaleDateString('vi-VN')}</span>
                          </span>
                        ) : (
                          <span className="text-gov-text-disabled">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default AuditLogModal;
