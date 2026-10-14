import React, { useState } from 'react';
import { Download, FileText, CheckCircle, Loader2, Edit3, ShieldCheck, Printer } from 'lucide-react';
import { ActionOption, DocumentInfo } from '../../types';

interface DraftPreviewProps {
  documentInfo: DocumentInfo;
  selectedOption: ActionOption;
  onDownloadDocx: (supplementaryNotes: string) => Promise<void>;
  isDownloading: boolean;
}

export const DraftPreview: React.FC<DraftPreviewProps> = ({
  documentInfo,
  selectedOption,
  onDownloadDocx,
  isDownloading,
}) => {
  const [supplementaryNotes, setSupplementaryNotes] = useState('');
  const [showNotesInput, setShowNotesInput] = useState(false);

  const currentDateStr = new Date().toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const legalBases = [
    'Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;',
    'Luật Đầu tư ngày 17 tháng 6 năm 2020;',
    `${selectedOption.legalBasis.docTitle} (${selectedOption.legalBasis.docCode});`,
    'Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư.',
  ];

  const handleDownload = () => {
    onDownloadDocx(supplementaryNotes);
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border flex flex-col overflow-hidden">
      {/* Action Header */}
      <div className="px-5 py-3.5 bg-gov-subtle/60 border-b border-gov-border flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gov-primary" />
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gov-text">
              Dự thảo công văn hành chính (Chuẩn Nghị định 30/2020/NĐ-CP)
            </h3>
            <span className="text-[11px] text-gov-text-secondary flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-gov-active" />
              Lề trang: Trên 20mm • Dưới 20mm • Trái 30mm • Phải 15mm
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotesInput(!showNotesInput)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white hover:bg-gov-subtle text-gov-text border border-gov-border transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5 text-gov-gold" />
            <span>{showNotesInput ? 'Ẩn ghi chú bổ sung' : 'Thêm ghi chú chỉ đạo'}</span>
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

      {/* Optional Supplementary Notes Bar */}
      {showNotesInput && (
        <div className="p-3 bg-gov-primary-light/40 border-b border-gov-border">
          <label className="block text-[11px] font-bold text-gov-text mb-1">
            Nội dung ý kiến bổ sung của Lãnh đạo UBND Tỉnh:
          </label>
          <input
            type="text"
            value={supplementaryNotes}
            onChange={(e) => setSupplementaryNotes(e.target.value)}
            placeholder="Ví dụ: Giao Sở Tài nguyên rà soát thực địa trước ngày 20/10/2026..."
            className="w-full px-3 py-1.5 text-xs rounded border border-gov-border focus:outline-none focus:ring-2 focus:ring-gov-primary bg-white text-gov-text"
          />
        </div>
      )}

      {/* A4 Sheet Rendering conforming to Decree 30 */}
      <div className="p-6 bg-[#D8DEE9]/50 overflow-auto flex justify-center">
        <div className="a4-sheet p-8 sm:p-12 text-[#000000] border border-gray-300">
          {/* 1. Header 2-column borderless table */}
          <div className="grid grid-cols-12 gap-2 text-center text-[13px] leading-tight pb-3">
            <div className="col-span-6 pr-2">
              <div className="text-[12px] font-normal uppercase">ỦY BAN NHÂN DÂN TỈNH BÌNH DƯƠNG</div>
              <div className="text-[12px] font-bold uppercase mt-0.5">VĂN PHÒNG</div>
              <div className="w-24 h-[1px] bg-black mx-auto my-1"></div>
              <div className="text-[13px] mt-1">
                Số: <span className="font-normal italic text-gray-600">.../VP-UBND (Dự thảo)</span>
              </div>
            </div>

            <div className="col-span-6 pl-2">
              <div className="text-[12px] font-bold uppercase">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="text-[13px] font-bold mt-0.5">Độc lập - Tự do - Hạnh phúc</div>
              <div className="w-32 h-[1px] bg-black mx-auto my-1"></div>
              <div className="text-[13px] italic mt-1">
                Bình Dương, ngày {currentDateStr}
              </div>
            </div>
          </div>

          {/* 2. Trích yếu */}
          <div className="my-5 text-center">
            <div className="text-[13px] font-bold">
              {documentInfo.codeNumber && documentInfo.codeNumber !== 'Chưa có số' && documentInfo.codeNumber !== 'Chưa xác định'
                ? `V/v Xử lý nội dung đề nghị tại văn bản số ${documentInfo.codeNumber}`
                : `V/v Xử lý nội dung đề nghị tại văn bản của ${documentInfo.issuer}`}
            </div>
          </div>

          {/* 3. Kính gửi */}
          <div className="text-[14px] font-bold indent-6 mb-3">
            Kính gửi: {documentInfo.issuer}.
          </div>

          {/* 4. Căn cứ pháp lý (Italic, 13pt) */}
          <div className="space-y-1 mb-4 text-[13px] italic text-justify leading-relaxed indent-6">
            {legalBases.map((base, idx) => (
              <p key={idx} className="mb-1">
                Căn cứ {base}
              </p>
            ))}
          </div>

          {/* 5. Nội dung văn bản (Regular, 14pt, indent 1.25cm, justify) */}
          <div className="space-y-3 text-[14px] text-justify leading-relaxed">
            <p className="indent-8">
              Xét đề nghị của {documentInfo.issuer} tại văn bản {documentInfo.codeNumber && documentInfo.codeNumber !== 'Chưa có số' && documentInfo.codeNumber !== 'Chưa xác định' ? `số ${documentInfo.codeNumber}` : 'đã tiếp nhận'}; căn cứ quy chế làm việc và thẩm quyền giải quyết công vụ, Văn phòng thông báo ý kiến chỉ đạo như sau:
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
              Thông báo đến {documentInfo.issuer} và các cơ quan, đơn vị liên quan biết, khẩn trương phối hợp triển khai thực hiện./.
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
              <div className="text-[13px] font-bold uppercase">CHÁNH VĂN PHÒNG</div>
              <div className="h-16 flex items-center justify-center text-gray-400 italic text-[11px]">
                (Ký, đóng dấu công vụ)
              </div>
              <div className="text-[14px] font-bold">Nguyễn Văn Hùng</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
