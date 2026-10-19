import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  Loader2,
  Edit3,
  ShieldCheck,
  Building2,
  Check,
  MapPin,
  UserCheck,
  Save,
  RotateCcw
} from 'lucide-react';
import { ActionOption, DocumentInfo } from '../../types';

export interface AgencyConfig {
  issuerParent: string;
  issuerName: string;
  location: string;
  signerTitle: string;
  signerName: string;
}

interface DraftPreviewProps {
  documentInfo: DocumentInfo;
  selectedOption: ActionOption;
  onDownloadDocx: (params: {
    supplementaryNotes: string;
    issuerParent: string;
    issuerName: string;
    location: string;
    signerTitle: string;
    signerName: string;
  }) => Promise<void>;
  isDownloading: boolean;
}

const DEFAULT_AGENCY_CONFIG: AgencyConfig = {
  issuerParent: 'ỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI',
  issuerName: 'VĂN PHÒNG',
  location: 'Hà Nội',
  signerTitle: 'CHÁNH VĂN PHÒNG',
  signerName: 'Nguyễn Văn Hùng',
};

const PROVINCE_PRESETS: { name: string; parent: string; location: string }[] = [
  { name: 'Hà Nội', parent: 'ỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI', location: 'Hà Nội' },
  { name: 'TP. Hồ Chí Minh', parent: 'ỦY BAN NHÂN DÂN THÀNH PHỐ HỒ CHÍ MINH', location: 'Thành phố Hồ Chí Minh' },
  { name: 'Đà Nẵng', parent: 'ỦY BAN NHÂN DÂN THÀNH PHỐ ĐÀ NẴNG', location: 'Đà Nẵng' },
  { name: 'Đồng Nai', parent: 'ỦY BAN NHÂN DÂN TỈNH ĐỒNG NAI', location: 'Đồng Nai' },
  { name: 'Cần Thơ', parent: 'ỦY BAN NHÂN DÂN THÀNH PHỐ CẦN THƠ', location: 'Cần Thơ' },
  { name: 'Hải Phòng', parent: 'ỦY BAN NHÂN DÂN THÀNH PHỐ HẢI PHÒNG', location: 'Hải Phòng' },
  { name: 'Bộ ngành TW', parent: 'BỘ TƯ PHÁP', location: 'Hà Nội' },
];

export const DraftPreview: React.FC<DraftPreviewProps> = ({
  documentInfo,
  selectedOption,
  onDownloadDocx,
  isDownloading,
}) => {
  const [supplementaryNotes, setSupplementaryNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Khởi tạo cấu hình cơ quan ban hành từ LocalStorage hoặc mặc định
  const [agencyConfig, setAgencyConfig] = useState<AgencyConfig>(() => {
    try {
      const saved = localStorage.getItem('gov_agency_config');
      if (saved) {
        return JSON.parse(saved);
      }
      const userStr = localStorage.getItem('gov_user') || sessionStorage.getItem('gov_user');
      if (userStr) {
        const u = JSON.parse(userStr);
        return {
          ...DEFAULT_AGENCY_CONFIG,
          signerName: u.fullName || DEFAULT_AGENCY_CONFIG.signerName,
        };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_AGENCY_CONFIG;
  });

  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const legalBases = [
    'Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;',
    'Luật Ban hành văn bản quy phạm pháp luật ngày 22 tháng 6 năm 2015;',
    selectedOption.legalBasis?.docTitle
      ? `${selectedOption.legalBasis.docTitle} (${selectedOption.legalBasis.docCode});`
      : 'Quy định pháp luật chuyên ngành hiện hành;',
  ];

  const handleSaveConfig = () => {
    try {
      localStorage.setItem('gov_agency_config', JSON.stringify(agencyConfig));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectPreset = (preset: { parent: string; location: string }) => {
    setAgencyConfig((prev) => ({
      ...prev,
      issuerParent: preset.parent,
      location: preset.location,
    }));
  };

  const handleDownload = () => {
    onDownloadDocx({
      supplementaryNotes,
      issuerParent: agencyConfig.issuerParent,
      issuerName: agencyConfig.issuerName,
      location: agencyConfig.location,
      signerTitle: agencyConfig.signerTitle,
      signerName: agencyConfig.signerName,
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border flex flex-col overflow-hidden">
      {/* Action Header */}
      <div className="px-5 py-3.5 bg-gov-subtle/60 border-b border-gov-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gov-primary" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text">
              Dự thảo công văn hành chính
            </h3>
            <span className="text-[11px] text-gov-text-secondary flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gov-active" />
              Chuẩn thể thức ban hành • Lề: Trên 20mm • Dưới 20mm • Trái 30mm • Phải 15mm
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút Cài đặt cơ quan ban hành */}
          <button
            type="button"
            onClick={() => setShowConfigModal(!showConfigModal)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold border transition-colors shadow-sm ${
              showConfigModal
                ? 'bg-gov-primary text-white border-gov-primary'
                : 'bg-white hover:bg-gov-subtle text-gov-text border-gov-border'
            }`}
            title="Đổi cơ quan ban hành, tỉnh thành và người ký duyệt"
          >
            <Building2 className="w-3.5 h-3.5 text-gov-gold" />
            <span>{showConfigModal ? 'Đóng thiết lập cơ quan' : 'Cơ quan ban hành'}</span>
          </button>

          {/* Nút Thêm ghi chú chỉ đạo */}
          <button
            type="button"
            onClick={() => setShowNotesInput(!showNotesInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-gov-subtle text-gov-text border border-gov-border transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-gov-gold" />
            <span>{showNotesInput ? 'Ẩn ghi chú' : 'Thêm chỉ đạo'}</span>
          </button>

          {/* Primary Action Button: Export Word .docx */}
          <button
            type="button"
            disabled={isDownloading}
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white text-xs font-black uppercase tracking-wider transition-all duration-150 shadow-md hover:shadow-lg disabled:opacity-60"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang kết xuất Word...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-gov-gold" />
                <span>Tải dự thảo Word (.docx)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cấu hình cơ quan ban hành (Tỉnh thành, đơn vị, người ký) */}
      {showConfigModal && (
        <div className="p-4 bg-gradient-to-r from-gov-subtle via-white to-gov-subtle border-b border-gov-border animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gov-primary" />
              <span className="text-xs font-bold text-gov-text uppercase">
                Thiết lập Cơ quan ban hành & Địa danh công vụ
              </span>
            </div>
            <div className="flex items-center gap-2">
              {saveSuccess && (
                <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Đã lưu cấu hình mặc định
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveConfig}
                className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                title="Lưu cấu hình này cho các lần làm việc sau"
              >
                <Save className="w-3 h-3" />
                Lưu làm mặc định
              </button>
            </div>
          </div>

          {/* Chọn nhanh tỉnh thành */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-gray-500 font-medium">Chọn nhanh địa bàn:</span>
            {PROVINCE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handleSelectPreset(preset)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors ${
                  agencyConfig.location === preset.location
                    ? 'bg-gov-primary text-white border-gov-primary shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border-gray-300'
                }`}
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Cơ quan cấp trên:
              </label>
              <input
                type="text"
                value={agencyConfig.issuerParent}
                onChange={(e) => setAgencyConfig({ ...agencyConfig, issuerParent: e.target.value })}
                placeholder="VD: ỦY BAN NHÂN DÂN THÀNH PHỐ HÀ NỘI"
                className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Đơn vị ban hành:
              </label>
              <input
                type="text"
                value={agencyConfig.issuerName}
                onChange={(e) => setAgencyConfig({ ...agencyConfig, issuerName: e.target.value })}
                placeholder="VD: VĂN PHÒNG, SỞ TÀI CHÍNH..."
                className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Địa danh ngày tháng:
              </label>
              <input
                type="text"
                value={agencyConfig.location}
                onChange={(e) => setAgencyConfig({ ...agencyConfig, location: e.target.value })}
                placeholder="VD: Hà Nội, Đà Nẵng, Đồng Nai..."
                className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Chức danh ký duyệt:
              </label>
              <input
                type="text"
                value={agencyConfig.signerTitle}
                onChange={(e) => setAgencyConfig({ ...agencyConfig, signerTitle: e.target.value })}
                placeholder="VD: CHÁNH VĂN PHÒNG, GIÁM ĐỐC SỞ, PHÓ CHỦ TỊCH..."
                className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">
                Họ và tên người ký:
              </label>
              <input
                type="text"
                value={agencyConfig.signerName}
                onChange={(e) => setAgencyConfig({ ...agencyConfig, signerName: e.target.value })}
                placeholder="VD: Nguyễn Văn A"
                className="w-full px-2.5 py-1.5 rounded border border-gray-300 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-gov-primary bg-white text-gov-text"
              />
            </div>
          </div>
        </div>
      )}

      {/* Ghi chú chỉ đạo bổ sung */}
      {showNotesInput && (
        <div className="p-3 bg-gov-primary-light/40 border-b border-gov-border">
          <label className="block text-[11px] font-bold text-gov-text mb-1">
            Nội dung ý kiến chỉ đạo bổ sung của Lãnh đạo:
          </label>
          <input
            type="text"
            value={supplementaryNotes}
            onChange={(e) => setSupplementaryNotes(e.target.value)}
            placeholder="Ví dụ: Giao cơ quan chuyên môn kiểm tra thực địa và báo cáo trước ngày 20 hàng tháng..."
            className="w-full px-3 py-1.5 text-xs rounded border border-gov-border focus:outline-none focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
          />
        </div>
      )}

      {/* A4 Sheet Rendering */}
      <div className="p-6 bg-[#D8DEE9]/50 overflow-auto flex justify-center">
        <div className="a4-sheet p-8 sm:p-12 text-[#000000] border border-gray-300 shadow-xl bg-white max-w-[800px] w-full">
          {/* 1. Tiêu ngữ 2 cột chuẩn thể thức */}
          <div className="grid grid-cols-12 gap-2 text-center text-[13px] leading-tight pb-3">
            <div className="col-span-6 pr-2">
              <div className="text-[12px] font-normal uppercase tracking-wide">
                {agencyConfig.issuerParent}
              </div>
              <div className="text-[12px] font-bold uppercase mt-0.5 tracking-wide">
                {agencyConfig.issuerName}
              </div>
              <div className="w-24 h-[1px] bg-black mx-auto my-1"></div>
              <div className="text-[13px] mt-1">
                Số: <span className="font-normal italic text-gray-600">.../VP-UBND (Dự thảo)</span>
              </div>
            </div>

            <div className="col-span-6 pl-2">
              <div className="text-[12px] font-bold uppercase tracking-wide">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div className="text-[13px] font-bold mt-0.5">Độc lập - Tự do - Hạnh phúc</div>
              <div className="w-32 h-[1px] bg-black mx-auto my-1"></div>
              <div className="text-[13px] italic mt-1">
                {agencyConfig.location}, ngày {currentDateStr}
              </div>
            </div>
          </div>

          {/* 2. Trích yếu */}
          <div className="my-5 text-center">
            <div className="text-[13px] font-bold">
              {documentInfo.codeNumber &&
              documentInfo.codeNumber !== 'Chưa có số' &&
              documentInfo.codeNumber !== 'Chưa xác định'
                ? `V/v Xử lý nội dung đề nghị tại văn bản số ${documentInfo.codeNumber}`
                : `V/v Xử lý nội dung đề nghị tại văn bản của ${documentInfo.issuer || 'đơn vị gửi'}`}
            </div>
          </div>

          {/* 3. Kính gửi */}
          <div className="text-[14px] font-bold indent-6 mb-3">
            Kính gửi: {documentInfo.issuer || 'Cơ quan, đơn vị liên quan'}.
          </div>

          {/* 4. Căn cứ pháp lý (Nghiêng, 13pt) */}
          <div className="space-y-1 mb-4 text-[13px] italic text-justify leading-relaxed indent-6">
            {legalBases.map((base, idx) => (
              <p key={idx} className="mb-1">
                Căn cứ {base}
              </p>
            ))}
          </div>

          {/* 5. Nội dung văn bản (Đứng, 14pt, lùi đầu dòng, căn đều) */}
          <div className="space-y-3 text-[14px] text-justify leading-relaxed">
            <p className="indent-8">
              Xét đề nghị của {documentInfo.issuer || 'đơn vị gửi'} tại văn bản{' '}
              {documentInfo.codeNumber &&
              documentInfo.codeNumber !== 'Chưa có số' &&
              documentInfo.codeNumber !== 'Chưa xác định'
                ? `số ${documentInfo.codeNumber}`
                : 'đã tiếp nhận'}
              ; căn cứ quy chế làm việc và thẩm quyền giải quyết công vụ, {agencyConfig.issuerName.toLowerCase()}{' '}
              thông báo ý kiến chỉ đạo như sau:
            </p>

            {selectedOption.draftContentBullets?.map((bullet, idx) => (
              <p key={idx} className="indent-8">
                {bullet}
              </p>
            ))}

            {supplementaryNotes && (
              <p className="indent-8 font-semibold italic text-gov-primary-dark">
                Ý kiến chỉ đạo bổ sung: {supplementaryNotes}
              </p>
            )}

            <p className="indent-8">
              Thông báo đến {documentInfo.issuer || 'các cơ quan liên quan'} và các đơn vị biết, khẩn
              trương phối hợp triển khai thực hiện./.
            </p>
          </div>

          {/* 6. Chân trang: Nơi nhận (trái) & Chữ ký (phải) */}
          <div className="grid grid-cols-12 gap-2 mt-10 pt-4 text-[13px]">
            <div className="col-span-6">
              <div className="text-[11px] font-bold italic">Nơi nhận:</div>
              <ul className="text-[10px] space-y-0.5 mt-1 leading-snug">
                <li>- Như trên;</li>
                <li>- Lãnh đạo cơ quan;</li>
                <li>- Các phòng ban, đơn vị liên quan;</li>
                <li>- Lưu: VT.</li>
              </ul>
            </div>

            <div className="col-span-6 text-center">
              <div className="text-[13px] font-bold uppercase tracking-wide">
                {agencyConfig.signerTitle}
              </div>
              <div className="h-16 flex items-center justify-center text-gray-400 italic text-[11px]">
                (Ký, đóng dấu công vụ)
              </div>
              <div className="text-[14px] font-bold">{agencyConfig.signerName}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
