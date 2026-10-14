import React, { useState, useRef } from 'react';
import { UploadCloud, X, CheckCircle2, AlertTriangle, FileText, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../services/api';

interface QuickImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: () => void;
}

export const QuickImportModal: React.FC<QuickImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (selectedFile: File) => {
    setFile(selectedFile);
    setError(null);
    setAnalysisResult(null);

    try {
      setIsAnalyzing(true);
      const res = await api.quickImportLegalDoc(selectedFile);
      setAnalysisResult(res);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Không thể phân tích tệp tin. Vui lòng kiểm tra lại định dạng PDF/Word.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!analysisResult) return;

    try {
      setIsConfirming(true);
      // Lưu văn bản mới
      await api.addManualDoc({
        codeNumber: analysisResult.detectedCode,
        title: analysisResult.detectedTitle,
        docType: analysisResult.docType,
        issuer: analysisResult.issuer,
        effectiveDate: analysisResult.effectiveDate,
        status: 'ACTIVE',
        notes: analysisResult.extactedSummary || analysisResult.detectedTitle,
      });

      // Nếu có văn bản cũ cần bãi bỏ và có ID
      if (analysisResult.existingTargetDocId) {
        await api.updateLegalStatus(analysisResult.existingTargetDocId, 'EXPIRED');
      }

      onImportSuccess();
      onClose();
    } catch (err: any) {
      setError('Lỗi khi lưu dữ liệu văn bản vào Tủ sách Pháp lý.');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gov-border w-full max-w-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-gov-primary text-white flex items-center justify-between border-b-2 border-gov-gold">
          <div className="flex items-center gap-2.5">
            <UploadCloud className="w-5 h-5 text-gov-gold" />
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wide">
                Import tệp Luật mới (Tự động nhận diện 1-chạm)
              </h3>
              <p className="text-xs text-white/80">
                Tự động trích xuất số hiệu, thẩm quyền và đối soát quy định thay thế/bãi bỏ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-gov-danger-bg text-gov-danger border border-gov-danger-border text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Area */}
          {!analysisResult && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gov-border hover:border-gov-primary rounded-xl p-8 text-center cursor-pointer bg-gov-bg/60 hover:bg-white transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
                className="hidden"
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white shadow-sm border border-gov-border flex items-center justify-center text-gov-primary">
                {isAnalyzing ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-bold text-gov-text">
                {isAnalyzing ? 'Đang trích xuất OCR và phân tích quan hệ thay thế...' : 'Kéo thả tệp tin Nghị định/Luật (.pdf, .docx) vào đây'}
              </p>
              <p className="text-[11px] text-gov-text-secondary mt-1">
                Cán bộ không cần gõ mã kỹ thuật; hệ thống tự nhận diện câu chữ chuyển tiếp.
              </p>
            </div>
          )}

          {/* Analysis Reconciliation Panel */}
          {analysisResult && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-xl bg-gov-subtle/70 border border-gov-border">
                <div className="flex items-center gap-2 text-xs font-bold text-gov-primary uppercase mb-2">
                  <Sparkles className="w-4 h-4 text-gov-gold" />
                  Kết quả nhận diện tự động từ tệp tin
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gov-text-secondary block text-[11px]">Số ký hiệu văn bản:</span>
                    <span className="font-bold text-gov-text">{analysisResult.detectedCode}</span>
                  </div>
                  <div>
                    <span className="text-gov-text-secondary block text-[11px]">Cơ quan ban hành:</span>
                    <span className="font-semibold text-gov-text">{analysisResult.issuer}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs">
                  <span className="text-gov-text-secondary block text-[11px]">Trích yếu nội dung:</span>
                  <span className="font-semibold text-gov-text">{analysisResult.detectedTitle}</span>
                </div>
              </div>

              {/* Invalidation Alert & Suggestion */}
              {analysisResult.replacesDocCode ? (
                <div className="p-4 rounded-xl bg-gov-warning-bg/60 border border-gov-warning-border">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-gov-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-gov-warning uppercase">
                        Phát hiện quy định bãi bỏ văn bản cũ:
                      </h4>
                      <p className="text-xs text-gov-text mt-1 leading-relaxed">
                        Nội dung văn bản mới có hiệu lực thi hành thay thế văn bản:{' '}
                        <strong>{analysisResult.replacesDocCode}</strong>{' '}
                        {analysisResult.replacesDocTitle ? `(${analysisResult.replacesDocTitle})` : ''}.
                      </p>
                      <p className="text-[11px] text-gov-active font-bold mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Hệ thống sẽ tự động cập nhật văn bản {analysisResult.replacesDocCode} sang trạng thái "HẾT HIỆU LỰC".
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-gov-active-bg text-gov-active border border-gov-active-border text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Văn bản mới độc lập, không phát hiện điều khoản bãi bỏ văn bản cũ.</span>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAnalysisResult(null);
                    setFile(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border border-gov-border text-gov-text hover:bg-gov-subtle"
                >
                  Chọn lại tệp
                </button>
                <button
                  type="button"
                  disabled={isConfirming}
                  onClick={handleConfirmImport}
                  className="px-5 py-2 text-xs font-bold rounded-lg bg-gov-primary hover:bg-gov-primary-dark text-white shadow-sm flex items-center gap-1.5 transition-colors disabled:opacity-60"
                >
                  {isConfirming && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Đồng ý áp dụng & Lưu vào Tủ sách</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
