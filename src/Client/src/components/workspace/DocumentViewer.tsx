import React, { useState } from 'react';
import { Eye, FileCode2, ZoomIn, ZoomOut, RotateCcw, AlertCircle, FileCheck2 } from 'lucide-react';
import { DocumentInfo } from '../../types';

interface DocumentViewerProps {
  documentInfo?: DocumentInfo;
  extractedRawText?: string;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentInfo,
  extractedRawText,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'ocr'>('visual');
  const [zoomLevel, setZoomLevel] = useState(100);

  if (!documentInfo) {
    return (
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-8 text-center text-gov-text-secondary h-[450px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gov-subtle flex items-center justify-center text-gov-text-disabled mb-3">
          <Eye className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-gov-text">Chưa có văn bản nào được tải lên</p>
        <p className="text-xs text-gov-text-secondary mt-1 max-w-sm">
          Kéo thả tệp công văn hoặc chọn một hồ sơ mẫu bên trên để bắt đầu phân tích thể thức và tra cứu căn cứ pháp lý.
        </p>
      </div>
    );
  }

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 75));
  const handleResetZoom = () => setZoomLevel(100);

  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border flex flex-col h-full overflow-hidden">
      {/* Viewer Header */}
      <div className="px-4 py-2.5 bg-gov-subtle/50 border-b border-gov-border flex items-center justify-between">
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-gov-border">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded transition-colors ${
              activeTab === 'visual'
                ? 'bg-gov-primary text-white shadow-sm'
                : 'text-gov-text-secondary hover:text-gov-text'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Văn bản gốc
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ocr')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded transition-colors ${
              activeTab === 'ocr'
                ? 'bg-gov-primary text-white shadow-sm'
                : 'text-gov-text-secondary hover:text-gov-text'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" />
            Dữ liệu OCR trích xuất
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 text-xs text-gov-text-secondary">
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 rounded hover:bg-white border border-transparent hover:border-gov-border transition-colors"
            title="Thu nhỏ"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="w-12 text-center font-semibold text-[11px]">{zoomLevel}%</span>
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 rounded hover:bg-white border border-transparent hover:border-gov-border transition-colors"
            title="Phóng to"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleResetZoom}
            className="p-1 rounded hover:bg-white border border-transparent hover:border-gov-border transition-colors ml-1"
            title="Đặt lại"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Viewer Body */}
      <div className="flex-1 p-4 overflow-auto bg-[#E5E9F0]/60 flex items-start justify-center min-h-[500px]">
        {activeTab === 'visual' ? (
          documentInfo.previewUrl && documentInfo.previewUrl.includes('/api/v1/storage/file/') && documentInfo.originalFileName.toLowerCase().endsWith('.pdf') ? (
            <div className="w-full h-full min-h-[580px] bg-white rounded border border-gov-border shadow-elevation overflow-hidden">
              <iframe
                src={`http://localhost:5050${documentInfo.previewUrl}`}
                className="w-full h-[600px] border-0"
                title={`Văn bản gốc: ${documentInfo.originalFileName}`}
              />
            </div>
          ) : (
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-[560px] bg-white p-7 shadow-elevation rounded border border-gov-border text-gov-text transition-transform duration-150 font-serif"
            >
              {/* Header Document Simulation */}
              <div className="grid grid-cols-2 gap-2 text-center text-xs pb-4 border-b border-gray-300">
                <div className="border-r border-gray-200 pr-2">
                  <div className="font-normal uppercase text-[11px] leading-tight">
                    {documentInfo.issuer}
                  </div>
                  <div className="font-bold text-[12px] mt-0.5">VĂN PHÒNG</div>
                  <div className="text-[11px] mt-1 text-gray-700">
                    Số: <span className="font-bold text-gov-primary">{documentInfo.codeNumber}</span>
                  </div>
                </div>
                <div className="pl-2">
                  <div className="font-bold text-[11px] uppercase leading-tight">
                    CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
                  </div>
                  <div className="font-bold text-[12px] underline decoration-gov-gold mt-0.5">
                    Độc lập - Tự do - Hạnh phúc
                  </div>
                  <div className="text-[11px] italic mt-1 text-gray-700">
                    Bình Dương, ngày {documentInfo.issuedDate}
                  </div>
                </div>
              </div>

              {/* Urgency Stamp */}
              {documentInfo.urgency === 'HỎA TỐC' && (
                <div className="my-3 flex justify-end">
                  <div className="border-2 border-gov-danger text-gov-danger font-bold text-xs uppercase px-2.5 py-0.5 rounded tracking-widest inline-block shadow-sm rotate-[-3deg]">
                    HỎA TỐC
                  </div>
                </div>
              )}

              {/* Subject */}
              <div className="my-4 text-center">
                <div className="text-xs font-bold text-gov-text">
                  V/v {documentInfo.codeNumber}: Xử lý văn bản công vụ
                </div>
              </div>

              {/* Content text */}
              <div className="text-xs space-y-2 text-justify leading-relaxed text-gray-800">
                <p className="font-bold">Kính gửi: Thường trực Ủy ban nhân dân Tỉnh Bình Dương.</p>
                {extractedRawText ? (
                  <div className="whitespace-pre-wrap font-sans text-xs text-gray-700 bg-gov-subtle/30 p-3 rounded border border-gov-border max-h-[300px] overflow-auto">
                    {extractedRawText}
                  </div>
                ) : (
                  <p className="indent-6">
                    Hồ sơ công văn đã được tiếp nhận và xử lý theo đúng quy trình hành chính công.
                  </p>
                )}
              </div>

              {/* Footer Signatures */}
              <div className="grid grid-cols-2 gap-4 mt-8 pt-4 text-xs">
                <div>
                  <span className="font-bold italic">Nơi nhận:</span>
                  <ul className="text-[11px] text-gray-700 mt-1 space-y-0.5">
                    <li>- Như trên;</li>
                    <li>- Lưu: VT.</li>
                  </ul>
                </div>
                <div className="text-center">
                  <div className="font-bold uppercase text-[11px]">LÃNH ĐẠO ĐƠN VỊ</div>
                  <div className="h-12 flex items-center justify-center italic text-gov-danger font-sans text-xs">
                    (Đã ký & đóng dấu công vụ)
                  </div>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="w-full h-full bg-white p-4 rounded border border-gov-border font-mono text-xs text-gov-text overflow-auto whitespace-pre-wrap leading-relaxed shadow-inner">
            <div className="flex items-center gap-2 pb-2 mb-3 border-b border-gov-border text-gov-active font-sans font-bold">
              <FileCheck2 className="w-4 h-4" />
              Đã trích xuất chính xác cấu trúc văn bản công vụ:
            </div>
            {extractedRawText || 'Đang cập nhật nội dung văn bản...'}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-gov-subtle border-t border-gov-border flex items-center justify-between text-[11px] text-gov-text-secondary">
        <span>Tệp: {documentInfo.originalFileName}</span>
        <span className="flex items-center gap-1 font-semibold text-gov-active">
          <FileCheck2 className="w-3.5 h-3.5" /> Thể thức hợp lệ
        </span>
      </div>
    </div>
  );
};
