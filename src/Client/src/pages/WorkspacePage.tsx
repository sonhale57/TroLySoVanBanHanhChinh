import React, { useState } from 'react';
import { DropzoneUpload } from '../components/workspace/DropzoneUpload';
import { DocumentViewer } from '../components/workspace/DocumentViewer';
import { SummaryCard } from '../components/workspace/SummaryCard';
import { AppraisalVerdictCard } from '../components/workspace/AppraisalVerdictCard';
import { DraftPreview } from '../components/workspace/DraftPreview';
import { ProcessIncomingResult } from '../types';
import { api } from '../services/api';
import { CheckCircle2, Scale, FileText, ShieldCheck, Clock, FileCheck } from 'lucide-react';

import { ActionConfirmModal } from '../components/common/ActionConfirmModal';

interface WorkspacePageProps {
  notification: string | null;
  setNotification: (msg: string | null) => void;
  initialData?: ProcessIncomingResult | null;
}

export const WorkspacePage: React.FC<WorkspacePageProps> = ({
  notification,
  setNotification,
  initialData,
}) => {
  const [processedData, setProcessedData] = useState<ProcessIncomingResult | null>(initialData || null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isProcessConfirmOpen, setIsProcessConfirmOpen] = useState<boolean>(false);

  React.useEffect(() => {
    if (initialData) {
      setProcessedData(initialData);
    }
  }, [initialData]);

  const handleFileSelect = (file: File) => {
    setPendingFile(file);
    setIsProcessConfirmOpen(true);
  };

  const handleConfirmProcess = async () => {
    if (!pendingFile) return;
    const fileToProcess = pendingFile;
    setIsProcessConfirmOpen(false);
    await handleFileUpload(fileToProcess);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsProcessing(true);
      setNotification(null);
      const result = await api.processIncoming(file);
      setProcessedData(result);
      setNotification('Đã tiếp nhận và thẩm định công văn thành công theo quy chuẩn pháp lý!');
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || 'Không thể xử lý tệp công văn. Vui lòng kiểm tra định dạng tệp và thử lại.';
      setNotification(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadDocx = async (supplementaryNotes: string) => {
    if (!processedData) return;

    try {
      setIsDownloading(true);
      const verdict = processedData.appraisalVerdict;
      const incomingCode = processedData.documentInfo.codeNumber || 'CV';
      const cleanCode = incomingCode.replace(/[^a-zA-Z0-9]/g, '_');
      const subjectTitle = processedData.documentInfo.subjectTitle 
        ? `V/v phúc đáp văn bản ${incomingCode} về ${processedData.documentInfo.subjectTitle}`
        : `V/v phúc đáp văn bản số ${incomingCode}`;
      const recipientMain = processedData.documentInfo.issuer || 'Đơn vị gửi văn bản';

      const customParagraphs = verdict?.draftContentBullets && verdict.draftContentBullets.length > 0
        ? verdict.draftContentBullets
        : (processedData.actionOptions[0]?.draftContentBullets || [
            `Phúc đáp văn bản số ${incomingCode} của ${recipientMain}.`,
            'Đề nghị cơ quan, đơn vị thực hiện theo đúng quy định pháp luật.'
          ]);

      const primaryBasis = verdict?.primaryLegalBasis || processedData.actionOptions[0]?.legalBasis;

      const blob = await api.exportDraftDocx({
        taskId: processedData.taskId,
        selectedOptionId: verdict?.verdictType || 'OPT-01',
        subjectTitle,
        supplementaryNotes,
        docCode: `PhucDap-${incomingCode}`,
        recipientMain,
        customLegalBases: [
          'Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015',
          'Luật Ban hành văn bản quy phạm pháp luật ngày 22 tháng 6 năm 2015',
          primaryBasis?.docTitle ? `${primaryBasis.docTitle} (${primaryBasis.docCode})` : 'Quy định pháp luật chuyên ngành hiện hành',
          'Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư',
        ],
        customParagraphs,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DuThao_PhucDap_${cleanCode}_${verdict?.verdictType || 'VERDICT'}.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setNotification(`Đã xuất thành công tệp Word .docx chuẩn Nghị định 30 theo kết luận: ${verdict?.verdictTitle || 'Thẩm định'}!`);
    } catch (err) {
      console.error(err);
      setNotification('Không thể kết nối đến máy chủ để tải file Word.');
    } finally {
      setIsDownloading(false);
    }
  };

  const currentOption = processedData?.actionOptions[0] || (processedData?.appraisalVerdict ? {
    id: processedData.appraisalVerdict.verdictType,
    isRecommended: true,
    title: processedData.appraisalVerdict.verdictTitle,
    rationale: processedData.appraisalVerdict.verdictSummary,
    legalBasis: processedData.appraisalVerdict.primaryLegalBasis,
    draftContentBullets: processedData.appraisalVerdict.draftContentBullets,
  } : undefined);

  return (
    <div className="max-w-[1920px] w-full mx-auto p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {notification && (
        <div className="mb-4 bg-gov-active-bg border border-gov-active-border text-gov-active text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (5 Cột): Kéo thả tệp thực tế, Xem văn bản đến gốc */}
        <div className="lg:col-span-5 space-y-5">
          <DropzoneUpload
            onFileUpload={handleFileSelect}
            isLoading={isProcessing}
          />

          <DocumentViewer
            documentInfo={processedData?.documentInfo}
            extractedRawText={processedData?.extractedRawText}
          />
        </div>

        {/* CỘT PHẢI (7 Cột): Tóm tắt 30s, Kết luận Thẩm định Tự động, Xem trước A4 & Nút Tải Word */}
        <div className="lg:col-span-7 space-y-5">
          {processedData ? (
            <>
              <SummaryCard
                documentInfo={processedData.documentInfo}
                summary={processedData.summary}
                legalAlerts={processedData.legalAlerts}
              />

              {processedData.appraisalVerdict && (
                <AppraisalVerdictCard
                  verdict={processedData.appraisalVerdict}
                />
              )}

              {currentOption && (
                <DraftPreview
                  documentInfo={processedData.documentInfo}
                  selectedOption={currentOption}
                  onDownloadDocx={handleDownloadDocx}
                  isDownloading={isDownloading}
                />
              )}
            </>
          ) : (
            /* Empty State chuyên nghiệp khi chưa nạp văn bản thực tế */
            <div className="bg-white rounded-xl shadow-card border border-gov-border p-10 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gov-subtle border border-gov-border flex items-center justify-center text-gov-primary">
                <Scale className="w-8 h-8 text-gov-primary" />
              </div>
              <h3 className="text-base font-bold text-gov-text uppercase tracking-wide">
                Chờ tiếp nhận công văn thực tế
              </h3>
              <p className="text-xs text-gov-text-secondary mt-2 max-w-lg mx-auto leading-relaxed">
                Vui lòng kéo thả hoặc chọn tệp công văn thực tế (Scan PDF, Vector PDF, Word .docx hoặc TXT) tại bảng tiếp nhận bên trái.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8 max-w-xl mx-auto text-left">
                <div className="p-3.5 rounded-lg border border-gov-border/70 bg-gov-bg/50 flex items-start gap-2.5">
                  <FileText className="w-4 h-4 text-gov-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-gov-text">Bóc tách Thể thức NĐ 30</h5>
                    <p className="text-[11px] text-gov-text-secondary mt-0.5">Tự nhận diện Số hiệu, Cơ quan ban hành, Trích yếu và Người ký.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-gov-border/70 bg-gov-bg/50 flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-gov-gold mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-gov-text">Tính hạn SLA công vụ</h5>
                    <p className="text-[11px] text-gov-text-secondary mt-0.5">Tự động cộng ngày làm việc loại trừ Thứ Bảy và Chủ Nhật.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-gov-border/70 bg-gov-bg/50 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-gov-text">Thẩm định Tự động 4 Tầng</h5>
                    <p className="text-[11px] text-gov-text-secondary mt-0.5">Tính toán Hướng giải quyết duy nhất đúng theo luật định, triệt tiêu lỗi chọn sai.</p>
                  </div>
                </div>

                <div className="p-3.5 rounded-lg border border-gov-border/70 bg-gov-bg/50 flex items-start gap-2.5">
                  <FileCheck className="w-4 h-4 text-gov-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <h5 className="text-xs font-bold text-gov-text">Xuất Word .docx chuẩn lề mm</h5>
                    <p className="text-[11px] text-gov-text-secondary mt-0.5">Sinh file Word phúc đáp chuẩn căn lề 20-20-30-15mm Nghị định 30.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast/Modal Confirm trước khi Xử lý văn bản */}
      <ActionConfirmModal
        isOpen={isProcessConfirmOpen}
        onClose={() => {
          setIsProcessConfirmOpen(false);
          setPendingFile(null);
        }}
        onConfirm={handleConfirmProcess}
        title="Xác nhận tiếp nhận và thẩm định văn bản"
        message="Đồng chí có chắc chắn muốn đưa văn bản này vào quy trình bóc tách thể thức và thẩm định tính pháp lý tự động theo Nghị định số 30/2020/NĐ-CP?"
        detail={
          pendingFile
            ? `Tệp tin: ${pendingFile.name} • Dung lượng: ${(pendingFile.size / 1024).toFixed(1)} KB`
            : undefined
        }
        confirmText="Bắt đầu thẩm định văn bản"
        cancelText="Hủy bỏ"
        type="primary"
      />
    </div>
  );
};
