import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Building,
  MapPin,
  FileText,
  UserCheck,
  Check,
  RotateCcw,
  Eye,
  Sliders,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api';
import { DocumentTemplate } from '../../types';

interface TemplateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplateSaved?: (template: DocumentTemplate) => void;
}

export const DEFAULT_TEMPLATE: DocumentTemplate = {
  parentAgency: 'ỦY BAN NHÂN DÂN TỈNH',
  issuingAgency: 'VĂN PHÒNG',
  docCodeTemplate: '.../VP-UBND',
  provinceCity: 'Quảng Trị',
  signerPosition: 'CHÁNH VĂN PHÒNG',
  signerName: '',
  recipientDefault: 'Như trên; Lưu: VT, TH.'
};

export const TemplateConfigModal: React.FC<TemplateConfigModalProps> = ({
  isOpen,
  onClose,
  onTemplateSaved
}) => {
  const [template, setTemplate] = useState<DocumentTemplate>(DEFAULT_TEMPLATE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTemplate();
    }
  }, [isOpen]);

  const loadTemplate = async () => {
    try {
      setIsLoading(true);
      // Ưu tiên nạp từ API
      const remote = await api.getDocumentTemplate().catch(() => null);
      if (remote && remote.provinceCity) {
        setTemplate(remote);
        localStorage.setItem('gov_doc_template', JSON.stringify(remote));
      } else {
        // Fallback localStorage
        const cached = localStorage.getItem('gov_doc_template');
        if (cached) {
          try {
            setTemplate(JSON.parse(cached));
          } catch {
            setTemplate(DEFAULT_TEMPLATE);
          }
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await api.updateDocumentTemplate(template).catch(() => null);
      localStorage.setItem('gov_doc_template', JSON.stringify(template));
      setToastMessage('Đã lưu cấu hình mẫu thể thức thành công!');
      if (onTemplateSaved) onTemplateSaved(template);
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 900);
    } catch (err) {
      console.error(err);
      setToastMessage('Có lỗi khi lưu mẫu thể thức.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefault = () => {
    setTemplate(DEFAULT_TEMPLATE);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header Modal */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gov-primary-light flex items-center justify-center text-gov-primary shadow-xs">
              <Building className="w-5 h-5 text-gov-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                Cài Đặt Mẫu Thể Thức Cơ Quan & Địa Phương (Nghị định 30/2020)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Thiết lập thông tin cố định như Tỉnh/Thành phố, Tên cơ quan, Chức danh người ký để tự động áp dụng vào Header & Footer khi soạn thảo văn bản.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 flex items-center justify-center transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Modal */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-5">
          {toastMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tỉnh / Thành phố */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Địa danh Tỉnh / Thành phố <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={template.provinceCity}
                onChange={(e) => setTemplate({ ...template, provinceCity: e.target.value })}
                placeholder="VD: Quảng Trị, Hà Nội, Đà Nẵng, TP. Hồ Chí Minh..."
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">Xuất hiện tại dòng ngày tháng: <em>"{template.provinceCity || '...'}, ngày ... tháng ... năm ..."</em></p>
            </div>

            {/* Mẫu Số / Ký hiệu */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Ký hiệu văn bản mẫu <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={template.docCodeTemplate}
                onChange={(e) => setTemplate({ ...template, docCodeTemplate: e.target.value })}
                placeholder="VD: .../VP-UBND, .../STP-HCTP, .../UBND-VP"
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
              />
              <p className="text-[10px] text-slate-400 mt-1">Hậu tố ký hiệu cơ quan ban hành</p>
            </div>

            {/* Cơ quan chủ quản cấp trên */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>Cơ quan chủ quản cấp trên</span>
              </label>
              <input
                type="text"
                value={template.parentAgency}
                onChange={(e) => setTemplate({ ...template, parentAgency: e.target.value })}
                placeholder="VD: ỦY BAN NHÂN DÂN TỈNH QUẢNG TRỊ, BỘ TƯ PHÁP..."
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase"
              />
            </div>

            {/* Cơ quan / Đơn vị ban hành */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-blue-600" />
                <span>Cơ quan / Đơn vị trực tiếp ban hành <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={template.issuingAgency}
                onChange={(e) => setTemplate({ ...template, issuingAgency: e.target.value })}
                placeholder="VD: VĂN PHÒNG, SỞ TƯ PHÁP, UBND QUẬN..."
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase font-bold"
              />
            </div>

            {/* Chức danh người ký */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Chức danh người ký duyệt <span className="text-red-500">*</span></span>
              </label>
              <input
                type="text"
                required
                value={template.signerPosition}
                onChange={(e) => setTemplate({ ...template, signerPosition: e.target.value })}
                placeholder="VD: CHÁNH VĂN PHÒNG, KT. CHỦ TỊCH - PHÓ CHỦ TỊCH..."
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 uppercase font-bold"
              />
            </div>

            {/* Họ tên người ký mặc định */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                <span>Họ và tên người ký (tùy chọn)</span>
              </label>
              <input
                type="text"
                value={template.signerName}
                onChange={(e) => setTemplate({ ...template, signerName: e.target.value })}
                placeholder="Để trống nếu cán bộ tự ký hoặc điền sau"
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Nơi nhận mặc định */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Nơi nhận mặc định (Footer)</span>
              </label>
              <input
                type="text"
                value={template.recipientDefault}
                onChange={(e) => setTemplate({ ...template, recipientDefault: e.target.value })}
                placeholder="VD: Như trên; Chủ tịch, các PCT UBND tỉnh; Lưu: VT, TH."
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* LIVE PREVIEW BỐ CỤC NGHỊ ĐỊNH 30/2020 */}
          <div className="bg-slate-50 border border-slate-300 rounded-xl p-4 shadow-inner">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2.5 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span>Xem trước bố cục Header & Footer thực tế (Nghị định 30/2020/NĐ-CP):</span>
            </div>

            <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-xs text-xs font-serif leading-relaxed text-slate-900 space-y-4">
              {/* Header Preview */}
              <div className="grid grid-cols-2 gap-4 pb-3 border-b border-slate-200">
                <div className="text-center">
                  <div className="text-[11px] font-normal uppercase text-slate-700">{template.parentAgency || 'ỦY BAN NHÂN DÂN TỈNH'}</div>
                  <div className="font-bold text-[12px] uppercase text-slate-900 underline underline-offset-4 decoration-1">{template.issuingAgency || 'VĂN PHÒNG'}</div>
                  <div className="text-[11px] mt-1 text-slate-600 font-sans">Số: {template.docCodeTemplate || '.../VP-UBND'}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-slate-900">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[11px] underline underline-offset-4 decoration-1 text-slate-900">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="text-[11px] italic mt-1 text-slate-600 font-sans">
                    {template.provinceCity || 'Quảng Trị'}, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
                  </div>
                </div>
              </div>

              {/* Sample Body Placeholder */}
              <div className="py-2 text-center text-[11px] text-slate-400 font-sans italic">
                [... Nội dung xử lý công văn & căn cứ pháp lý do AI thẩm định ...]
              </div>

              {/* Footer Preview */}
              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                <div>
                  <div className="text-[11px] font-bold italic underline">Nơi nhận:</div>
                  <div className="text-[10px] text-slate-700 mt-0.5 whitespace-pre-wrap">{template.recipientDefault || 'Như trên;\nLưu: VT, TH.'}</div>
                </div>
                <div className="text-center">
                  <div className="font-bold uppercase text-[11px]">{template.signerPosition || 'CHÁNH VĂN PHÒNG'}</div>
                  <div className="h-10 flex items-center justify-center text-[10px] text-slate-400 italic font-sans">(Chữ ký, con dấu)</div>
                  <div className="font-bold text-[11px]">{template.signerName || '(Họ và tên người ký)'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleResetDefault}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 rounded-xl bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Đang lưu...' : 'Lưu mẫu thể thức'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
