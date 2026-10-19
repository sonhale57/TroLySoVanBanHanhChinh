import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ArrowRightCircle, 
  Scale, 
  ShieldCheck, 
  FileCheck, 
  ListChecks,
  AlertCircle
} from 'lucide-react';
import { AppraisalVerdict } from '../../types';
import { EvidencePopover } from '../common/EvidencePopover';

interface AppraisalVerdictCardProps {
  verdict: AppraisalVerdict;
}

export const AppraisalVerdictCard: React.FC<AppraisalVerdictCardProps> = ({ verdict }) => {
  const getVerdictStyle = (type: string) => {
    switch (type) {
      case 'APPROVED':
        return {
          badgeBg: 'bg-emerald-100 text-emerald-950 border-emerald-400 whitespace-nowrap',
          titleColor: 'text-emerald-900',
          borderColor: 'border-emerald-300',
          cardBg: 'bg-emerald-50/30',
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />,
          label: 'ĐỦ ĐIỀU KIỆN - THỐNG NHẤT CHẤP THUẬN',
        };
      case 'REQUIRE_ADDITIONAL_INFO':
        return {
          badgeBg: 'bg-amber-100 text-amber-950 border-amber-400 whitespace-nowrap',
          titleColor: 'text-amber-950',
          borderColor: 'border-amber-300',
          cardBg: 'bg-amber-50/30',
          icon: <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0" />,
          label: 'CHƯA ĐỦ ĐIỀU KIỆN - YÊU CẦU BỔ SUNG HỒ SƠ',
        };
      case 'REJECTED':
        return {
          badgeBg: 'bg-red-100 text-red-950 border-red-400 whitespace-nowrap',
          titleColor: 'text-red-950',
          borderColor: 'border-red-300',
          cardBg: 'bg-red-50/30',
          icon: <XCircle className="w-5 h-5 text-red-700 flex-shrink-0" />,
          label: 'KHÔNG ĐỦ ĐIỀU KIỆN - TỪ CHỐI GIẢI QUYẾT',
        };
      default:
        return {
          badgeBg: 'bg-slate-100 text-slate-900 border-slate-300 whitespace-nowrap',
          titleColor: 'text-slate-900',
          borderColor: 'border-slate-300',
          cardBg: 'bg-slate-50/30',
          icon: <ArrowRightCircle className="w-5 h-5 text-slate-700 flex-shrink-0" />,
          label: 'KHÔNG THUỘC THẨM QUYỀN - CHUYỂN NƠI KHÁC',
        };
    }
  };

  const style = getVerdictStyle(verdict.verdictType);

  return (
    <div className={`bg-white rounded-xl shadow-card border-2 ${style.borderColor} p-5 transition-all`}>
      {/* Top Banner Header */}
      <div className="flex items-center justify-between pb-3 border-b border-gov-border/60 mb-4">
        <div className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-gov-primary" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text">
            Kết luận Thẩm định Hành chính Tự động
          </h3>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gov-text-secondary bg-gov-subtle px-2.5 py-1 rounded font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-gov-gold" />
          <span>Tính toán độc lập theo quy định pháp luật</span>
        </div>
      </div>

      {/* Main Verdict Box */}
      <div className={`p-4 rounded-xl border ${style.borderColor} ${style.cardBg} mb-4`}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0">{style.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[11px] font-black uppercase px-2.5 py-0.5 rounded-full border shadow-xs ${style.badgeBg}`}>
                {style.label}
              </span>
              <span className="text-xs text-gov-text-secondary font-medium">
                Thẩm quyền: <strong>{verdict.statutoryAuthority}</strong>
              </span>
            </div>

            <h4 className={`text-sm font-bold ${style.titleColor} mt-1 leading-snug`}>
              {verdict.verdictTitle}
            </h4>

            <p className="text-xs text-gov-text mt-2 leading-relaxed bg-white/80 p-3 rounded-lg border border-gov-border/60">
              {verdict.verdictSummary}
            </p>
          </div>
        </div>
      </div>

      {/* Compliance Checklist Matrix */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gov-text uppercase flex items-center gap-1.5">
            <ListChecks className="w-4 h-4 text-gov-primary" />
            Ma trận Bảng kiểm Tiêu chí Điều kiện Pháp lý:
          </span>
          <span className="text-[11px] text-gov-text-secondary">
            {verdict.checklist.filter((c) => c.isPassed).length}/{verdict.checklist.length} tiêu chí Đạt
          </span>
        </div>

        <div className="space-y-2">
          {verdict.checklist.map((item, idx) => (
            <div
              key={idx}
              className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 ${
                item.isPassed
                  ? 'bg-emerald-50/40 border-emerald-200 text-gov-text'
                  : 'bg-red-50/40 border-red-200 text-red-900'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">
                {item.isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{item.criteriaName}</span>
                  <span className="text-[10px] text-gov-text-secondary bg-white px-2 py-0.5 rounded border border-gov-border">
                    {item.legalBasis}
                  </span>
                </div>
                <p className="text-[11px] text-gov-text-secondary mt-0.5">{item.evaluationNote}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Missing Requirements Box if any */}
      {verdict.missingRequirements && verdict.missingRequirements.length > 0 && (
        <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-xs">
          <div className="flex items-center gap-2 font-bold text-amber-900 mb-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>Danh mục tài liệu / điều kiện còn thiếu cần yêu cầu bổ sung:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-amber-800 text-[11px] pl-1">
            {verdict.missingRequirements.map((req, i) => (
              <li key={i}>{req}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Primary Legal Basis Popover */}
      {verdict.primaryLegalBasis && (
        <div className="pt-3 border-t border-gov-border/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-gov-gold" />
            <span className="text-xs font-bold text-gov-text">Căn cứ pháp lý chủ chốt:</span>
          </div>
          <EvidencePopover legalBasis={verdict.primaryLegalBasis} />
        </div>
      )}
    </div>
  );
};
