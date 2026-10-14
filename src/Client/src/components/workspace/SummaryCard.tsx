import React from 'react';
import { Clock, AlertTriangle, CheckCircle, ShieldAlert, Sparkles, Building2, Calendar } from 'lucide-react';
import { DocumentInfo, DocumentSummary } from '../../types';

interface SummaryCardProps {
  documentInfo: DocumentInfo;
  summary: DocumentSummary;
  legalAlerts: string[];
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  documentInfo,
  summary,
  legalAlerts,
}) => {
  const isUrgent = documentInfo.urgency === 'HỎA TỐC' || documentInfo.urgency === 'KHẨN';

  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden">
      {/* Top Banner with Urgency & SLA */}
      <div
        className={`px-5 py-3 flex flex-wrap items-center justify-between gap-3 border-b ${
          documentInfo.urgency === 'HỎA TỐC'
            ? 'bg-gov-danger-bg/70 border-gov-danger-border'
            : documentInfo.urgency === 'KHẨN'
            ? 'bg-gov-warning-bg/70 border-gov-warning-border'
            : 'bg-gov-subtle/50 border-gov-border'
        }`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
              documentInfo.urgency === 'HỎA TỐC'
                ? 'bg-gov-danger text-white shadow-sm'
                : documentInfo.urgency === 'KHẨN'
                ? 'bg-gov-warning text-white shadow-sm'
                : 'bg-gov-text-secondary text-white'
            }`}
          >
            {isUrgent && <AlertTriangle className="w-3.5 h-3.5" />}
            Mức độ: {documentInfo.urgency}
          </span>

          <span className="text-xs font-bold text-gov-text flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-gov-primary" />
            {documentInfo.issuer}
          </span>
        </div>

        {/* SLA Countdown Badge */}
        {documentInfo.slaDeadline && (
          <div className="flex items-center gap-2 bg-white px-3 py-1 rounded-lg border border-gov-border shadow-sm">
            <Clock className={`w-4 h-4 ${isUrgent ? 'text-gov-danger animate-pulse' : 'text-gov-gold'}`} />
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-gov-text-secondary block leading-none">
                Hạn chót giải quyết (SLA)
              </span>
              <span className={`text-xs font-black ${isUrgent ? 'text-gov-danger' : 'text-gov-text'}`}>
                {new Date(documentInfo.slaDeadline).toLocaleString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 30-Second Summary Section */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-gov-gold" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text">
            Tóm tắt 30 giây cho lãnh đạo & chuyên viên
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Card 1: Core Problem */}
          <div className="p-3.5 rounded-lg bg-gov-bg border border-gov-border flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-primary block mb-1">
                1. Vấn đề cốt lõi
              </span>
              <p className="text-xs font-bold text-gov-text leading-snug">
                {summary.coreProblem}
              </p>
            </div>
            <div className="mt-2 text-[11px] text-gov-text-secondary">
              Mục tiêu & Yêu cầu giải quyết
            </div>
          </div>

          {/* Card 2: Submitted Basis */}
          <div className="p-3.5 rounded-lg bg-gov-bg border border-gov-border flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-gold block mb-1">
                2. Cơ sở trình
              </span>
              <p className="text-xs font-semibold text-gov-text leading-snug">
                {summary.submittedBasis}
              </p>
            </div>
            <div className="mt-2 text-[11px] text-gov-text-secondary">
              Căn cứ & Báo cáo viện dẫn
            </div>
          </div>

          {/* Card 3: Requested Action */}
          <div className="p-3.5 rounded-lg bg-gov-bg border border-gov-border flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gov-active block mb-1">
                3. Đề xuất hành động
              </span>
              <p className="text-xs font-semibold text-gov-text leading-snug">
                {summary.requestedAction}
              </p>
            </div>
            <div className="mt-2 text-[11px] text-gov-text-secondary">
              Định hướng xử lý công vụ
            </div>
          </div>
        </div>

        {/* Legal Alerts / Guards */}
        {legalAlerts && legalAlerts.length > 0 && (
          <div className="mt-4 p-3 bg-gov-primary-light/50 border border-gov-danger-border/60 rounded-lg flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-gov-danger mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <span className="text-xs font-bold text-gov-danger block">
                Cảnh báo an toàn pháp lý (Tự động kiểm soát hiệu lực):
              </span>
              {legalAlerts.map((alert, index) => (
                <p key={index} className="text-xs text-gov-text leading-relaxed">
                  {alert}
                </p>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
