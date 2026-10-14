import React, { useState } from 'react';
import { BookOpen, ExternalLink, X, ShieldCheck } from 'lucide-react';
import { LegalBasis } from '../../types';
import { StatusBadge } from './StatusBadge';

interface EvidencePopoverProps {
  legalBasis: LegalBasis;
}

export const EvidencePopover: React.FC<EvidencePopoverProps> = ({ legalBasis }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded bg-gov-subtle hover:bg-gov-border text-gov-primary border border-gov-border transition-colors shadow-sm"
        title="Bấm để xem trích dẫn quy định pháp lý"
      >
        <BookOpen className="w-3.5 h-3.5 text-gov-primary" />
        <span>{legalBasis.docCode} ({legalBasis.article})</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 z-50 w-80 sm:w-96 p-4 bg-white rounded-lg shadow-xl border border-gov-border text-left">
            <div className="flex items-start justify-between pb-2 border-b border-gov-border">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-gov-active" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-gov-text">
                  Dẫn chứng pháp lý quy định
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-gov-text-disabled hover:text-gov-text"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gov-primary">
                  {legalBasis.docCode}
                </span>
                <StatusBadge status={legalBasis.status} size="sm" />
              </div>

              <p className="text-xs font-medium text-gov-text leading-snug">
                {legalBasis.docTitle}
              </p>

              <div className="p-2.5 bg-gov-bg rounded border border-gov-border text-xs text-gov-text-secondary leading-relaxed">
                <span className="font-semibold text-gov-text block mb-1">
                  {legalBasis.article}:
                </span>
                {legalBasis.fullExcerpt || 'Trích dẫn quy định thẩm quyền và thủ tục hành chính liên quan.'}
              </div>

              <div className="pt-2 text-[11px] text-gov-text-disabled flex items-center justify-between">
                <span>Tuân thủ Luật Ban hành VBQPPL</span>
                <span className="text-gov-active font-medium">Bảo đảm an toàn pháp lý</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
