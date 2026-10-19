import React, { useState } from 'react';
import { Eye, FileCode2, ZoomIn, ZoomOut, RotateCcw, FileCheck2, Copy, Check, ExternalLink, FileText, AlertCircle } from 'lucide-react';
import { DocumentInfo } from '../../types';

interface DocumentViewerProps {
  documentInfo?: DocumentInfo;
  extractedRawText?: string;
}

const API_SERVER_URL = import.meta.env.VITE_API_SERVER_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:5050');

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentInfo,
  extractedRawText,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'ocr'>('visual');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [isCopied, setIsCopied] = useState(false);

  if (!documentInfo) {
    return (
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-8 text-center text-gov-text-secondary h-[450px] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gov-subtle flex items-center justify-center text-gov-text-disabled mb-3">
          <Eye className="w-8 h-8" />
        </div>
        <p className="text-sm font-semibold text-gov-text">Chưa có văn bản nào được tải lên</p>
        <p className="text-xs text-gov-text-secondary mt-1 max-w-sm">
          Kéo thả tệp công văn (PDF, DOCX, TXT) để bắt đầu bóc tách thể thức và thẩm định tính pháp lý thực tế.
        </p>
      </div>
    );
  }

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 15, 160));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 15, 75));
  const handleResetZoom = () => setZoomLevel(100);

  const handleCopyText = async () => {
    if (!extractedRawText) return;
    try {
      await navigator.clipboard.writeText(extractedRawText);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Bỏ qua lỗi copy
    }
  };

  const fileNameLower = (documentInfo.originalFileName || '').toLowerCase();
  const isPdf = fileNameLower.endsWith('.pdf');
  const isImage = fileNameLower.endsWith('.png') || fileNameLower.endsWith('.jpg') || fileNameLower.endsWith('.jpeg');
  
  const fileFullUrl = documentInfo.previewUrl
    ? (documentInfo.previewUrl.startsWith('http')
        ? documentInfo.previewUrl
        : `${API_SERVER_URL}${documentInfo.previewUrl}`)
    : '';

  // Chia đoạn văn bản trích xuất sạch sẽ để hiển thị chân thực
  const rawParagraphs = (extractedRawText || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border flex flex-col h-[720px] max-h-[780px] overflow-hidden">
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
            Văn bản gốc thực tế
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
            Dữ liệu bóc tách điện tử
          </button>
        </div>

        {/* Zoom & Action Controls */}
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
            className="p-1 rounded hover:bg-white border border-transparent hover:border-gov-border transition-colors ml-0.5"
            title="Đặt lại zoom 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {fileFullUrl && (
            <a
              href={fileFullUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1 ml-1 rounded hover:bg-white border border-transparent hover:border-gov-border text-gov-primary transition-colors flex items-center"
              title="Mở tệp gốc trong tab mới"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Viewer Body */}
      <div className="flex-1 p-4 overflow-y-auto bg-[#E5E9F0]/60 flex items-start justify-center">
        {activeTab === 'visual' ? (
          isPdf && fileFullUrl ? (
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full h-full min-h-[620px] bg-white rounded border border-gov-border shadow-elevation overflow-hidden transition-transform duration-150"
            >
              <iframe
                src={fileFullUrl}
                className="w-full h-[620px] border-0"
                title={`Văn bản gốc: ${documentInfo.originalFileName}`}
              />
            </div>
          ) : isImage && fileFullUrl ? (
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="max-w-full bg-white p-4 shadow-elevation rounded border border-gov-border transition-transform duration-150 flex flex-col items-center"
            >
              <img
                src={fileFullUrl}
                alt={documentInfo.originalFileName}
                className="max-w-full h-auto object-contain rounded"
              />
            </div>
          ) : (
            /* Hiển thị văn bản thật đã bóc tách trên trang tài liệu tiêu chuẩn, KHÔNG mô phỏng giả Bình Dương */
            <div
              style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
              className="w-full max-w-[620px] bg-white p-8 shadow-elevation rounded border border-gray-300 text-gov-text transition-transform duration-150 leading-relaxed"
            >
              {/* Thanh thông tin nhận diện tài liệu thật */}
              <div className="mb-5 pb-3 border-b border-gray-200 text-xs flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gov-primary bg-gov-primary-light/50 px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                    {documentInfo.issuer || 'Cơ quan gửi'}
                  </span>
                  <span className="font-semibold text-gray-700 text-[11px] whitespace-nowrap">
                    Số: {documentInfo.codeNumber || 'Chưa có số'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-gray-600">
                  <span className="whitespace-nowrap">Ngày: {documentInfo.issuedDate}</span>
                  {documentInfo.urgency && documentInfo.urgency !== 'THƯỜNG' && (
                    <span className="bg-red-100 text-red-900 border border-red-300 font-bold px-2 py-0.5 rounded text-[10px] whitespace-nowrap">
                      {documentInfo.urgency}
                    </span>
                  )}
                </div>
              </div>

              {/* Trích yếu nhận diện thật */}
              {documentInfo.subjectTitle && (
                <div className="mb-4 text-xs font-bold text-gray-900 bg-gray-50 p-2.5 rounded border border-gray-200">
                  <span className="text-gov-primary mr-1">Trích yếu:</span>
                  {documentInfo.subjectTitle}
                </div>
              )}

              {/* Toàn văn nội dung tài liệu thật */}
              <div className="text-[13px] text-gray-800 space-y-3 leading-relaxed">
                {rawParagraphs.length > 0 ? (
                  rawParagraphs.map((para, idx) => (
                    <p key={idx} className="indent-6 text-justify whitespace-pre-wrap">
                      {para}
                    </p>
                  ))
                ) : extractedRawText ? (
                  <div className="whitespace-pre-wrap text-justify">{extractedRawText}</div>
                ) : (
                  <div className="text-center py-10 text-gray-400 text-xs">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Đang giải mã và bóc tách nội dung văn bản thực tế...
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* Tab Dữ liệu OCR / Text Bóc tách chi tiết */
          <div className="w-full h-full bg-white p-5 rounded border border-gov-border flex flex-col shadow-inner">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gov-border">
              <div className="flex items-center gap-2 text-gov-active font-bold text-xs">
                <FileCheck2 className="w-4 h-4" />
                <span>Nội dung văn bản đã bóc tách và chuẩn hóa ngắt từ:</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] text-gray-600 whitespace-nowrap">
                  {extractedRawText ? `${extractedRawText.length} ký tự` : ''}
                </span>
                <button
                  type="button"
                  onClick={handleCopyText}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded bg-gov-subtle hover:bg-gray-200 text-gov-text border border-gov-border transition-colors whitespace-nowrap"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Đã sao chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="flex-1 text-xs text-gray-800 overflow-auto whitespace-pre-wrap leading-relaxed bg-gray-50 p-4 rounded border border-gray-200">
              {extractedRawText || 'Chưa có dữ liệu trích xuất từ văn bản này.'}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-gov-subtle border-t border-gov-border flex items-center justify-between text-[11px] text-gov-text-secondary">
        <span className="truncate max-w-[280px]">Tệp: {documentInfo.originalFileName}</span>
        <span className="flex items-center gap-1 font-semibold text-gov-active">
          <FileCheck2 className="w-3.5 h-3.5" /> Thể thức văn bản hợp lệ
        </span>
      </div>
    </div>
  );
};
