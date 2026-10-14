import React from 'react';
import { CheckCircle2, ChevronRight, Award, HelpCircle } from 'lucide-react';
import { ActionOption } from '../../types';
import { EvidencePopover } from '../common/EvidencePopover';

interface ActionSelectorProps {
  options: ActionOption[];
  selectedOptionId: string;
  onSelectOption: (optionId: string) => void;
}

export const ActionSelector: React.FC<ActionSelectorProps> = ({
  options,
  selectedOptionId,
  onSelectOption,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-gov-gold" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text">
            Chọn hướng giải quyết tham mưu (Zero-Prompting)
          </h3>
        </div>
        <span className="text-[11px] text-gov-text-secondary bg-gov-subtle px-2 py-0.5 rounded font-medium">
          Dự thảo tự động thay đổi theo phương án
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {options.map((option) => {
          const isSelected = option.id === selectedOptionId;

          return (
            <div
              key={option.id}
              onClick={() => onSelectOption(option.id)}
              className={`relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-150 text-left ${
                isSelected
                  ? 'border-gov-primary bg-gov-primary-light/20 shadow-md ring-2 ring-gov-primary/10'
                  : 'border-gov-border hover:border-gov-gold/80 bg-white hover:bg-gov-subtle/30 shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected
                        ? 'border-gov-primary bg-gov-primary text-white'
                        : 'border-gov-border bg-white text-transparent'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 fill-current text-white" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4
                        className={`text-xs font-bold ${
                          isSelected ? 'text-gov-primary' : 'text-gov-text'
                        }`}
                      >
                        {option.title}
                      </h4>

                      {option.isRecommended && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gov-gold text-gov-text shadow-sm">
                          <Award className="w-3 h-3 text-gov-primary" />
                          Khuyến nghị tốt nhất
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gov-text-secondary mt-1 leading-relaxed">
                      {option.rationale}
                    </p>

                    {/* Legal Citation Popover */}
                    <div className="mt-2.5 flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] font-bold text-gov-text">Căn cứ:</span>
                      <EvidencePopover legalBasis={option.legalBasis} />
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 pt-1">
                  <ChevronRight
                    className={`w-5 h-5 transition-transform ${
                      isSelected ? 'text-gov-primary translate-x-1' : 'text-gov-text-disabled'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
