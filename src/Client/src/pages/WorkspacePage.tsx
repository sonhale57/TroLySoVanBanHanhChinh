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

  const handleDownloadDocx = async (params: {
    supplementaryNotes: string;
    issuerParent: string;
    issuerName: string;
    location: string;
    signerTitle: string;
    signerName: string;
  }) => {
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
        supplementaryNotes: params.supplementaryNotes,
        issuerParent: params.issuerParent,
        issuerName: params.issuerName,
        location: params.location,
        signerTitle: params.signerTitle,
        signerName: params.signerName,
        docCode: `PhucDap-${incomingCode}`,
        recipientMain,
        customLegalBases: [
          'Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015',
          'Luật Ban hành văn bản quy phạm pháp luật ngày 22 tháng 6 năm 2015',
          primaryBasis?.docTitle ? `${primaryBasis.docTitle} (${primaryBasis.docCode})` : 'Quy định pháp luật chuyên ngành hiện hành',
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

      setNotification(`Đã xuất thành công tệp Word .docx chuẩn thể thức văn bản hành chính theo kết luận: ${verdict?.verdictTitle || 'Thẩm định'}!`);
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
        message="Đồng chí có chắc chắn muốn đưa văn bản này vào quy trình bóc tách thể thức và thẩm định tính pháp lý tự động?"
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
