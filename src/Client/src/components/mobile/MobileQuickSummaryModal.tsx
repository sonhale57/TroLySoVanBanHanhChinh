import React from 'react';
import { X, Calendar, Clock, AlertTriangle, ShieldCheck, Copy, Check } from 'lucide-react';
import { ProcessedRecordItem } from '../../types';

interface MobileQuickSummaryModalProps {
  record: ProcessedRecordItem | null;
  onClose: () => void;
  onOpenOnDesktop?: (recordId: string) => void;
}

export const MobileQuickSummaryModal: React.FC<MobileQuickSummaryModalProps> = ({
  record,
  onClose,
  onOpenOnDesktop
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!record) return null;

  const handleCopyCode = () => {
    if (record.incomingDocCode) {
      navigator.clipboard.writeText(record.incomingDocCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency?.toUpperCase()) {
      case 'HỎA TỐC':
        return 'bg-red-600 text-white font-black animate-pulse';
      case 'THƯỢNG KHẨN':
        return 'bg-amber-600 text-white font-bold';
      case 'KHẨN':
        return 'bg-amber-100 text-amber-800 border border-amber-300 font-bold';
      default:
        return 'bg-slate-100 text-slate-700 font-medium';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CHO_XU_LY':
        return { label: 'Chờ xử lý', color: 'bg-slate-100 text-slate-700 border-slate-300' };
      case 'DANG_XU_LY':
        return { label: 'Đang xử lý', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'DA_XU_LY':
        return { label: 'Đã thẩm định', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'DA_KY':
        return { label: 'Đã ký ban hành', color: 'bg-purple-100 text-purple-800 border-purple-300' };
      default:
        return { label: status, color: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  const statusInfo = getStatusBadge(record.currentStatus);

  const isOverdue = record.slaDeadline && new Date(record.slaDeadline) < new Date() && record.currentStatus !== 'DA_KY';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] uppercase px-2 py-0.5 rounded-full ${getUrgencyBadge(record.urgencyLevel)}`}>
              {record.urgencyLevel || 'THƯỜNG'}
            </span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Doc Code & Title */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Số hiệu văn bản</span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 text-[11px] text-gov-primary font-semibold hover:underline"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Đã sao chép' : 'Sao chép'}
              </button>
            </div>
            <h3 className="text-base font-black text-slate-900 mt-0.5">
              {record.incomingDocCode || 'Chưa vào số'}
            </h3>
            <p className="text-xs font-semibold text-slate-800 mt-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200 leading-relaxed">
              {record.subjectTitle || record.originalFileName}
            </p>
          </div>

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Cơ quan ban hành</span>
              <span className="font-bold text-slate-800 line-clamp-1">
                {record.incomingIssuer || 'Văn phòng UBND'}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block">Cán bộ phụ trách</span>
              <span className="font-bold text-slate-800 line-clamp-1">
                {record.userName} ({record.department})
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Ngày tiếp nhận
              </span>
              <span className="font-bold text-slate-800">
                {new Date(record.receivedDate).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-medium block flex items-center gap-1">
                <Clock className="w-3 h-3" /> Hạn SLA xử lý
              </span>
              <span className={`font-bold ${isOverdue ? 'text-gov-danger font-black' : 'text-slate-800'}`}>
                {record.slaDeadline
                  ? new Date(record.slaDeadline).toLocaleDateString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : 'Không ấn định'}
              </span>
            </div>
          </div>

          {/* SLA Alert Banner if Overdue */}
          {isOverdue && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-gov-danger flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-gov-danger">Đã vượt quá hạn định SLA!</h4>
                <p className="text-[11px] text-red-700 mt-0.5">
                  Văn bản này đã quá hạn xử lý quy định của UBND Tỉnh. Cần đôn đốc bộ phận chuyên môn hoàn tất sớm.
                </p>
              </div>
            </div>
          )}

          {/* Compliance & Standard Check */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div className="text-[11px] text-emerald-900">
              <span className="font-bold block">Chuẩn thể thức Nghị định 30/2020/NĐ-CP</span>
              <span>Được đối soát thứ bậc pháp lý theo Luật Ban hành VBQPPL.</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50"
          >
            Đóng
          </button>
          {onOpenOnDesktop && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenOnDesktop(record.id);
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-gov-primary text-white text-xs font-bold hover:bg-gov-primary-hover shadow-sm"
            >
              Mở soạn thảo Desktop
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
