import React, { useState, useEffect, useRef } from 'react';
import { DropzoneUpload } from '../components/workspace/DropzoneUpload';
import { DocumentViewer } from '../components/workspace/DocumentViewer';
import { SummaryCard } from '../components/workspace/SummaryCard';
import { MinimalistInAppEditor } from '../components/workspace/MinimalistInAppEditor';
import { DocxViewer } from '../components/workspace/DocxViewer';
import { ProcessIncomingResult, QueueTaskItem } from '../types';
import { api } from '../services/api';
import {
  CheckCircle2,
  Scale,
  Clock,
  X,
  Loader2,
  Sparkles,
  RotateCcw,
  Building2,
  UploadCloud,
  FileCheck2,
  FileText,
  Download,
  ArrowRight,
  BrainCircuit
} from 'lucide-react';
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
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isProcessConfirmOpen, setIsProcessConfirmOpen] = useState<boolean>(false);
  const [queueTasks, setQueueTasks] = useState<QueueTaskItem[]>([]);

  // 2 Tab phân quyền hiển thị: 'UPLOAD_OUTPUT' (Tải văn bản xử lý - Mặc định) vs 'AI_PROCESS' (Thẩm định & Phân tích AI)
  const [workspaceTab, setWorkspaceTab] = useState<'UPLOAD_OUTPUT' | 'AI_PROCESS'>('UPLOAD_OUTPUT');
  const [customOutputFileName, setCustomOutputFileName] = useState<string | null>(initialData?.outputFileName || null);
  const [customOutputBlob, setCustomOutputBlob] = useState<Blob | null>(null);
  const [customOutputFile, setCustomOutputFile] = useState<File | null>(null);
  const [showReuploadDropzone, setShowReuploadDropzone] = useState<boolean>(false);
  const [customOutputHtml, setCustomOutputHtml] = useState<string | null>(
    initialData?.outputFileName ? (initialData.initialDraftHtml || null) : null
  );
  const [isUploadingOutput, setIsUploadingOutput] = useState<boolean>(false);
  const [isDraggingOverOutput, setIsDraggingOverOutput] = useState<boolean>(false);
  const outputFileInputRef = useRef<HTMLInputElement>(null);

  const [isReprocessingAi, setIsReprocessingAi] = useState<boolean>(false);
  const [showReprocessModal, setShowReprocessModal] = useState<boolean>(false);
  const [reprocessDirective, setReprocessDirective] = useState<string>('');

  // Chỉnh sửa thời hạn SLA và mức độ khẩn
  const [isEditSlaOpen, setIsEditSlaOpen] = useState<boolean>(false);
  const [urgencyInput, setUrgencyInput] = useState<string>('THƯỜNG');
  const [slaDeadlineInput, setSlaDeadlineInput] = useState<string>('');
  const [isSavingSla, setIsSavingSla] = useState<boolean>(false);

  useEffect(() => {
    if (initialData) {
      setProcessedData(initialData);
      if (initialData.outputFileName) {
        setCustomOutputFileName(initialData.outputFileName);
        setShowReuploadDropzone(false);
        if (initialData.initialDraftHtml) {
          setCustomOutputHtml(initialData.initialDraftHtml);
        }
        // Tải trước Blob của tệp đầu ra nếu là Word để preview trực tiếp
        if (initialData.processingLogId && initialData.outputFileName.toLowerCase().endsWith('.docx')) {
          api.getOutputDocBlob(initialData.processingLogId)
            .then(blob => setCustomOutputBlob(blob))
            .catch(() => {});
        }
      } else {
        setCustomOutputFileName(null);
        setCustomOutputBlob(null);
        setCustomOutputFile(null);
        setShowReuploadDropzone(false);
      }
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
      if (result.outputFileName) {
        setCustomOutputFileName(result.outputFileName);
        setCustomOutputHtml(result.initialDraftHtml || null);
      } else {
        setCustomOutputFileName(null);
        setCustomOutputHtml(null);
      }
      setNotification('Đã tiếp nhận văn bản, bóc tách thể thức và sinh dự thảo ban đầu thành công!');
    } catch (err: any) {
      console.error(err);
      const errorMsg = err?.response?.data?.message || 'Không thể xử lý tệp công văn. Vui lòng kiểm tra định dạng tệp và thử lại.';
      setNotification(errorMsg);
    } finally {
      setIsProcessing(false);
    }
  };

  // Xử lý nạp hàng loạt vào Hàng đợi ngầm tuần tự (Background Queue)
  const handleBatchUpload = async (files: File[]) => {
    try {
      setIsProcessing(true);
      setNotification(null);
      const batchRes = await api.uploadBatch(files);
      setQueueTasks(batchRes.tasks);
      setNotification(`Đã đưa ${batchRes.totalFiles} tệp vào Hàng đợi xử lý tuần tự (FIFO) ngầm.`);

      // Polling kiểm tra tiến độ các task trong hàng đợi
      const interval = setInterval(async () => {
        let allCompleted = true;
        const updatedTasks: QueueTaskItem[] = [];

        for (const task of batchRes.tasks) {
          try {
            const status = await api.getQueueStatus(task.trackingId);
            updatedTasks.push(status);
            if (status.status !== 'COMPLETED' && status.status !== 'FAILED') {
              allCompleted = false;
            }
            if (status.status === 'COMPLETED' && status.result && !processedData) {
              setProcessedData(status.result);
            }
          } catch {
            updatedTasks.push(task);
          }
        }

        setQueueTasks(updatedTasks);
        if (allCompleted) {
          clearInterval(interval);
          setIsProcessing(false);
          setNotification('Hàng đợi đã hoàn tất xử lý toàn bộ các tệp văn bản!');
        }
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể đưa tệp vào hàng đợi.');
      setIsProcessing(false);
    }
  };

  // 1-Click Field Mapping (Lớp 4: Gán nhanh thực thể khi bôi đen chữ trên DocumentViewer)
  const handleFieldMapped = (field: 'codeNumber' | 'issuer' | 'subjectTitle', value: string) => {
    if (!processedData) return;
    setProcessedData({
      ...processedData,
      documentInfo: {
        ...processedData.documentInfo,
        [field]: value,
      },
    });
  };

  // Mở modal chỉnh sửa SLA & Độ khẩn
  const handleOpenEditSla = () => {
    if (!processedData) return;
    setUrgencyInput(processedData.documentInfo.urgency || 'THƯỜNG');
    setSlaDeadlineInput(
      processedData.documentInfo.slaDeadline
        ? processedData.documentInfo.slaDeadline.substring(0, 16)
        : ''
    );
    setIsEditSlaOpen(true);
  };

  // Lưu chỉnh sửa SLA & Độ khẩn
  const handleSaveUrgencySla = async () => {
    if (!processedData?.processingLogId) return;
    try {
      setIsSavingSla(true);
      const res = await api.updateUrgencySla(processedData.processingLogId, {
        urgencyLevel: urgencyInput,
        slaDeadline: slaDeadlineInput ? new Date(slaDeadlineInput).toISOString() : undefined,
      });

      let urgencyVal: 'THƯỜNG' | 'KHẨN' | 'HỎA TỐC' = 'THƯỜNG';
      if (res.urgencyLevel === 'HỎA TỐC') urgencyVal = 'HỎA TỐC';
      else if (res.urgencyLevel === 'KHẨN' || res.urgencyLevel === 'THƯỢNG KHẨN') urgencyVal = 'KHẨN';

      setProcessedData({
        ...processedData,
        documentInfo: {
          ...processedData.documentInfo,
          urgency: urgencyVal,
          slaDeadline: res.slaDeadline || processedData.documentInfo.slaDeadline,
        },
      });
      setNotification(`Đã cập nhật mức độ hồ sơ (${res.urgencyLevel}) và thời hạn SLA thành công!`);
      setIsEditSlaOpen(false);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể cập nhật hạn SLA và độ khẩn.');
    } finally {
      setIsSavingSla(false);
    }
  };

  // Lưu dự thảo và chuyển trạng thái sang DA_XU_LY (Chờ ký)
  const handleSaveDraft = async (html: string, metadata: {
    subjectTitle: string;
    issuerParent: string;
    issuerName: string;
    docCode: string;
    location: string;
    docDateStr: string;
    signerAuthority: string;
    signerTitle: string;
    signerName: string;
    recipientsList: string[];
  }) => {
    if (!processedData?.processingLogId) return;
    try {
      setIsSaving(true);
      await api.saveDraft(processedData.processingLogId, {
        draftContentHtml: html,
        subjectTitle: metadata.subjectTitle,
        issuerParent: metadata.issuerParent,
        issuerName: metadata.issuerName,
        docCode: metadata.docCode,
        location: metadata.location,
        docDateStr: metadata.docDateStr,
        signerAuthority: metadata.signerAuthority,
        signerTitle: metadata.signerTitle,
        signerName: metadata.signerName,
        recipientsList: metadata.recipientsList,
      });
      setNotification('Đã lưu văn bản đầu ra vào hồ sơ thành công! Trạng thái: Đã xử lý (chờ ký duyệt).');
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể lưu bản thảo.');
    } finally {
      setIsSaving(false);
    }
  };

  // Xử lý tải lên văn bản xử lý thực tế (Word .docx hoặc PDF)
  const handleUploadCustomOutput = async (file: File) => {
    if (!processedData?.processingLogId) {
      setNotification('Cảnh báo: Hồ sơ công văn chưa được khởi tạo mã lưu trữ để gắn văn bản đầu ra.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'docx' && ext !== 'doc' && ext !== 'pdf') {
      setNotification('Vui lòng chỉ tải lên tệp văn bản Word (.docx, .doc) hoặc PDF.');
      return;
    }

    try {
      setIsUploadingOutput(true);
      const res = await api.uploadProcessedOutput(processedData.processingLogId, file);
      setCustomOutputFileName(res.outputFileName);
      setCustomOutputFile(file);
      setShowReuploadDropzone(false);
      if (res.draftContentHtml) {
        setCustomOutputHtml(res.draftContentHtml);
      }
      setProcessedData(prev => prev ? {
        ...prev,
        outputFileName: res.outputFileName,
        initialDraftHtml: res.draftContentHtml || prev.initialDraftHtml,
        currentStatus: res.currentStatus || 'DA_XU_LY',
      } : null);
      setNotification(`✓ ${res.message || `Đã tải lên và gắn văn bản xử lý "${res.outputFileName}" vào hồ sơ thành công!`}`);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể tải lên văn bản xử lý. Vui lòng kiểm tra định dạng tệp .docx hoặc .pdf.');
    } finally {
      setIsUploadingOutput(false);
      if (outputFileInputRef.current) {
        outputFileInputRef.current.value = '';
      }
    }
  };

  const handleOutputFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await handleUploadCustomOutput(file);
    }
  };

  const handleOutputDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOverOutput(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await handleUploadCustomOutput(files[0]);
    }
  };

  const handleDownloadCustomOutput = async () => {
    if (!processedData?.processingLogId) return;
    try {
      await api.downloadOutputDoc(processedData.processingLogId, customOutputFileName || undefined);
    } catch {
      setNotification('Không thể tải về tệp văn bản xử lý.');
    }
  };

  // AI Xử lý và phân tích lại văn bản chuyên sâu
  const handleReprocessAi = async () => {
    if (!processedData?.processingLogId) return;
    try {
      setIsReprocessingAi(true);
      const res = await api.reprocessAi(processedData.processingLogId, reprocessDirective);
      setProcessedData({
        ...processedData,
        initialDraftHtml: res.draftContentHtml,
        summary: res.summary || processedData.summary,
        actionOptions: res.actionOptions || processedData.actionOptions,
        legalAlerts: res.legalAlerts || processedData.legalAlerts,
      });
      setNotification('✓ AI đã phân tích chuyên sâu lại văn bản với đầy đủ căn cứ và nội dung chỉ đạo cụ thể!');
      setShowReprocessModal(false);
      setReprocessDirective('');
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể yêu cầu AI xử lý lại.');
    } finally {
      setIsReprocessingAi(false);
    }
  };

  // Xuất file Word .docx chuẩn Nghị định 30
  const handleExportDocx = async (html: string, metadata: {
    subjectTitle: string;
    issuerParent: string;
    issuerName: string;
    docCode: string;
    location: string;
    signerTitle: string;
    signerName: string;
    recipientMain: string;
  }) => {
    if (!processedData) return;
    try {
      setIsDownloading(true);
      const incomingCode = processedData.documentInfo.codeNumber || 'CV';
      const cleanCode = incomingCode.replace(/[^a-zA-Z0-9]/g, '_');

      const blob = await api.exportDraftDocx({
        taskId: processedData.taskId,
        selectedOptionId: processedData.appraisalVerdict?.verdictType || 'APPROVED',
        subjectTitle: metadata.subjectTitle,
        issuerParent: metadata.issuerParent,
        issuerName: metadata.issuerName,
        docCode: metadata.docCode,
        location: metadata.location,
        signerTitle: metadata.signerTitle,
        signerName: metadata.signerName,
        recipientMain: metadata.recipientMain,
        draftContentHtml: html,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `DuThao_${cleanCode}_ND30.docx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setNotification('Đã xuất thành công tệp Word .docx chuẩn thể thức Nghị định 30/2020/NĐ-CP!');
    } catch (err) {
      console.error(err);
      setNotification('Không thể kết nối đến máy chủ để tải file Word.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Đánh giá Mẫu chuẩn vàng
  const handleRateGoldSample = async (rating: number, html: string) => {
    if (!processedData?.processingLogId) return;
    try {
      await api.rateDocument(processedData.processingLogId, rating, html);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-[1920px] w-full mx-auto p-4 sm:p-6 lg:p-8">
      {/* Toast Notification */}
      {notification && (
        <div className="mb-4 bg-gov-active-bg border border-gov-active-border text-gov-active text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Split-Screen Workspace (Section 4.1: Tinh giản tối đa luồng xử lý) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (5 Cột): Kéo thả tệp thực tế, Hàng đợi & Xem văn bản gốc với 1-Click Field Mapping */}
        <div className="lg:col-span-5 space-y-5">
          <DropzoneUpload
            onFileUpload={handleFileSelect}
            onBatchUpload={handleBatchUpload}
            isLoading={isProcessing}
            queueTasks={queueTasks}
          />

          <DocumentViewer
            documentInfo={processedData?.documentInfo}
            extractedRawText={processedData?.extractedRawText}
            onFieldMapped={handleFieldMapped}
          />
        </div>

        {/* CỘT PHẢI (7 Cột): 2 Tab riêng biệt - Tab 1: Tải văn bản xử lý & Xem lại; Tab 2: Thẩm định & Phân tích AI (gồm Soạn thảo văn bản) */}
        <div className="lg:col-span-7 space-y-4">
          {processedData ? (
            <>
              {/* THANH TAB CHUYỂN ĐỔI CHẾ ĐỘ XỬ LÝ */}
              <div className="bg-white p-1.5 rounded-xl border border-gov-border shadow-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setWorkspaceTab('UPLOAD_OUTPUT')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${workspaceTab === 'UPLOAD_OUTPUT'
                      ? 'bg-gov-primary text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <UploadCloud className="w-4 h-4" />
                    <span>Tải văn bản xử lý</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded font-black uppercase ${workspaceTab === 'UPLOAD_OUTPUT' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                      Ưu tiên
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWorkspaceTab('AI_PROCESS')}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${workspaceTab === 'AI_PROCESS'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                  >
                    <BrainCircuit className="w-4 h-4 text-amber-400" />
                    <span>Thẩm định & Xử lý với AI</span>
                  </button>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════════════════
                  TAB 1: TẢI VĂN BẢN XỬ LÝ (CHỈ CÓ UPLOAD & XEM LẠI, KHÔNG CÓ AI & EDITOR)
              ═══════════════════════════════════════════════════════════════════════ */}
              {workspaceTab === 'UPLOAD_OUTPUT' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Input ẩn để chọn tệp */}
                  <input
                    ref={outputFileInputRef}
                    type="file"
                    accept=".docx,.doc,.pdf"
                    className="hidden"
                    onChange={handleOutputFileChange}
                  />

                  {/* Khối trạng thái tệp đã tải lên (nếu có) */}
                  {customOutputFileName && (
                    <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <FileCheck2 className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-emerald-950 uppercase">
                              Văn bản xử lý thực tế đã được lưu vào hồ sơ
                            </h4>
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-200 text-emerald-900">
                              ✓ Thay thế kết quả AI
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                            Tệp đính kèm: <span className="underline font-mono">{customOutputFileName}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleDownloadCustomOutput}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-xs"
                          title="Tải văn bản xử lý về máy tính"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải về máy (.docx/.pdf)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowReuploadDropzone(true);
                            setTimeout(() => outputFileInputRef.current?.click(), 50);
                          }}
                          disabled={isUploadingOutput}
                          className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition shadow-2xs"
                          title="Tải lên tệp Word/PDF khác để thay thế văn bản hiện tại"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                          <span>Thay đổi tệp khác</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Khung Kéo thả tải tệp xử lý: Ẩn bớt nếu đã có tệp đầu ra, chỉ hiển thị lại khi chưa có tệp hoặc khi bấm 'Thay đổi tệp khác' */}
                  {(!customOutputFileName || showReuploadDropzone) && (
                    <div
                      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverOutput(true); }}
                      onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingOverOutput(false); }}
                      onDrop={handleOutputDrop}
                      onClick={() => outputFileInputRef.current?.click()}
                      className={`p-6 sm:p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer text-center relative ${isDraggingOverOutput
                        ? 'border-gov-primary bg-gov-primary-light/40 scale-[1.01]'
                        : 'border-slate-300 hover:border-gov-primary bg-slate-50/60 hover:bg-white'
                        }`}
                    >
                      {customOutputFileName && showReuploadDropzone && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowReuploadDropzone(false);
                          }}
                          className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded-md bg-white border border-slate-200"
                        >
                          ✕ Thu gọn
                        </button>
                      )}
                      {isUploadingOutput ? (
                        <div className="flex flex-col items-center justify-center py-4 space-y-2">
                          <Loader2 className="w-8 h-8 animate-spin text-gov-primary" />
                          <p className="text-xs font-bold text-gov-primary">Đang tải lên và trích xuất nội dung văn bản...</p>
                          <p className="text-[11px] text-slate-500">Hệ thống đang lưu văn bản thực tế vào hồ sơ và cập nhật bản đọc</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-gov-primary shadow-xs">
                            <UploadCloud className="w-6 h-6 text-gov-primary" />
                          </div>
                          <p className="text-xs font-bold text-slate-800">
                            {customOutputFileName
                              ? 'Kéo và thả tệp Word (.docx, .doc) hoặc PDF mới vào đây để thay thế văn bản'
                              : 'Kéo và thả tệp văn bản Word (.docx, .doc) hoặc PDF đã xử lý vào đây'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            hoặc <span className="text-gov-primary font-bold underline">bấm vào đây để chọn tệp từ máy tính</span>
                          </p>
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                            Hệ thống sẽ quản lý tệp này làm văn bản đầu ra thực tế và thay thế kết quả AI
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* KHUNG XEM LẠI VĂN BẢN ĐÃ ĐƯỢC XỬ LÝ (Full format Word/PDF Viewer) */}
                  <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gov-primary" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Xem lại văn bản đã được xử lý (Định dạng Word đầy đủ)
                        </h4>
                        {customOutputFileName && (
                          <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-medium">
                            {customOutputFileName}
                          </span>
                        )}
                      </div>

                      {customOutputFileName && (
                        <button
                          type="button"
                          onClick={handleDownloadCustomOutput}
                          className="text-xs text-gov-primary hover:text-gov-primary-hover font-bold flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Tải về</span>
                        </button>
                      )}
                    </div>

                    {/* Nội dung xem lại dạng khổ giấy A4 Read-only format Word đầy đủ */}
                    <div className="p-4 sm:p-6 bg-slate-100 overflow-y-auto max-h-[750px]">
                      {customOutputFileName && (customOutputFile || customOutputBlob) ? (
                        <div className="max-w-[850px] mx-auto">
                          <DocxViewer file={customOutputFile} blob={customOutputBlob} />
                        </div>
                      ) : customOutputHtml ? (
                        <div className="max-w-[780px] mx-auto bg-white shadow-md border border-slate-200 p-8 sm:p-12 text-slate-900 font-['Nunito_Sans'] leading-relaxed text-[14px]">
                          <div
                            className="prose prose-sm max-w-none text-justify leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: customOutputHtml }}
                          />
                        </div>
                      ) : customOutputFileName ? (
                        <div className="max-w-[780px] mx-auto bg-white shadow-md border border-slate-200 p-8 text-center space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                            <FileCheck2 className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-bold text-slate-800">Tệp văn bản xử lý đã được tải lên thành công</h4>
                          <p className="text-xs text-slate-500 font-mono">Tệp: {customOutputFileName}</p>
                          <button
                            type="button"
                            onClick={handleDownloadCustomOutput}
                            className="px-4 py-2 bg-gov-primary hover:bg-gov-primary-hover text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Tải về xem chi tiết</span>
                          </button>
                        </div>
                      ) : (
                        <div className="max-w-[780px] mx-auto bg-white border border-dashed border-slate-300 rounded-xl p-8 text-center space-y-3">
                          <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center">
                            <FileText className="w-6 h-6" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-700 uppercase">
                            Chưa có văn bản xử lý thực tế được tải lên
                          </h4>
                          <p className="text-[11px] text-slate-500 max-w-md mx-auto leading-relaxed">
                            Đồng chí vui lòng kéo thả hoặc tải lên tệp Word (.docx, .doc) hoặc PDF văn bản đã xử lý ở khung bên trên để lưu hồ sơ và xem lại tại đây.
                          </p>
                          <div className="flex items-center justify-center gap-3 pt-2">
                            <button
                              type="button"
                              onClick={() => outputFileInputRef.current?.click()}
                              className="px-4 py-2 bg-gov-primary text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5 hover:bg-gov-primary-hover shadow-xs"
                            >
                              <UploadCloud className="w-3.5 h-3.5" />
                              <span>Tải văn bản xử lý lên ngay</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setWorkspaceTab('AI_PROCESS')}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                            >
                              <span>Chuyển sang Thẩm định & Soạn thảo AI</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ═══════════════════════════════════════════════════════════════════════
                  TAB 2: THẨM ĐỊNH & PHÂN TÍCH AI (GỒM TOÀN BỘ XỬ LÝ AI & SOẠN THẢO)
              ═══════════════════════════════════════════════════════════════════════ */}
              {workspaceTab === 'AI_PROCESS' && (
                <div className="space-y-4 animate-in fade-in duration-150">
                  {/* Thanh tóm tắt công văn nhanh (Mini Context Bar) */}
                  <div className="bg-white px-4 py-2.5 rounded-xl border border-gov-border shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 font-bold text-gov-primary bg-gov-primary-light/50 px-2 py-0.5 rounded">
                        <span>Số:</span>
                        <span>{processedData.documentInfo.codeNumber || 'Chưa vào số'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-700 font-medium truncate max-w-[200px]" title={processedData.documentInfo.issuer}>
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{processedData.documentInfo.issuer || 'Chưa rõ đơn vị'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${processedData.documentInfo.urgency === 'HỎA TỐC'
                          ? 'bg-red-100 text-red-900 border border-red-200'
                          : (processedData.documentInfo.urgency as string) === 'KHẨN' || (processedData.documentInfo.urgency as string) === 'THƯỢNG KHẨN'
                            ? 'bg-amber-100 text-amber-900 border border-amber-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                          {processedData.documentInfo.urgency || 'THƯỜNG'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {processedData.documentInfo.slaDeadline && (
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Hạn: {new Date(processedData.documentInfo.slaDeadline).toLocaleDateString('vi-VN')}</span>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenEditSla}
                        className="p-1 px-2 text-[11px] font-bold text-gov-primary hover:bg-slate-50 border border-slate-200 rounded"
                      >
                        Sửa SLA
                      </button>
                    </div>
                  </div>

                  {/* Banner nút xử lý lại chuyên sâu */}
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Sparkles className="w-5 h-5 text-amber-200" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wide">
                          Trợ lý AI Thẩm định & Tái tạo Dự thảo Chuyên sâu
                        </h4>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Nếu dự thảo ban đầu còn chung chung, hãy yêu cầu AI đào sâu và cụ thể hóa từng điều khoản chỉ đạo.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowReprocessModal(true)}
                      disabled={isReprocessingAi}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition"
                    >
                      {isReprocessingAi ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RotateCcw className="w-4 h-4" />
                      )}
                      <span>{isReprocessingAi ? 'Đang phân tích...' : 'AI Xử lý lại văn bản chuyên sâu'}</span>
                    </button>
                  </div>

                  {/* Card Tóm tắt 30 giây & Cảnh báo pháp lý */}
                  <SummaryCard
                    documentInfo={processedData.documentInfo}
                    summary={processedData.summary}
                    legalAlerts={processedData.legalAlerts}
                    onEditUrgencySla={handleOpenEditSla}
                  />

                  {/* Trình Quản lý & Soạn thảo Văn bản Hành chính (với đầy đủ công cụ format, mẫu cơ quan, xuất Word, lưu hồ sơ) */}
                  <MinimalistInAppEditor
                    documentInfo={processedData.documentInfo}
                    initialHtml={processedData.initialDraftHtml}
                    selectedOption={processedData.actionOptions?.[0]}
                    processingLogId={processedData.processingLogId}
                    aiVerification={processedData.aiVerification}
                    onSaveDraft={handleSaveDraft}
                    onExportDocx={handleExportDocx}
                    onRateGoldSample={handleRateGoldSample}
                    isSaving={isSaving}
                    isExporting={isDownloading}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-card border border-gov-border p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gov-subtle border border-gov-border flex items-center justify-center text-gov-primary">
                <Scale className="w-8 h-8 text-gov-primary" />
              </div>
              <h3 className="text-base font-bold text-gov-text uppercase tracking-wide">
                Chờ tiếp nhận công văn thực tế
              </h3>
              <p className="text-xs text-gov-text-secondary mt-2 max-w-lg mx-auto leading-relaxed">
                Vui lòng kéo thả hoặc chọn tệp công văn (PDF Scan, PDF Text, Word .docx hoặc TXT) tại bảng bên trái.
                Hệ thống sẽ tự động bóc tách và tạo bản thảo chuẩn Nghị định 30 trên trình soạn thảo trực tiếp.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Confirm trước khi Xử lý văn bản */}
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

      {/* Modal Chỉnh sửa Hạn SLA & Mức độ khẩn trực tiếp trên Bàn làm việc */}
      {isEditSlaOpen && processedData && (
        <div className="fixed inset-0 !m-0 z-50 overflow-y-auto w-full h-full min-h-screen bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gov-border animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gov-border">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-gov-text uppercase">
                  Chỉnh sửa Mức độ & Hạn SLA
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditSlaOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Hồ sơ đang xử lý:</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {processedData.documentInfo.codeNumber || 'Chưa có số'} - {processedData.documentInfo.issuer}
                </span>
                <span className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                  {processedData.documentInfo.subjectTitle}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mức độ khẩn của hồ sơ:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['THƯỜNG', 'KHẨN', 'THƯỢNG KHẨN', 'HỎA TỐC'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setUrgencyInput(lvl)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition ${urgencyInput === lvl
                        ? lvl === 'HỎA TỐC'
                          ? 'bg-red-700 text-white border-red-700 shadow-sm'
                          : lvl === 'THƯỢNG KHẨN' || lvl === 'KHẨN'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                            : 'bg-gov-primary text-white border-gov-primary shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Hạn chót giải quyết (SLA Deadline):
                </label>
                <input
                  type="datetime-local"
                  value={slaDeadlineInput}
                  onChange={(e) => setSlaDeadlineInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Hệ thống sẽ dựa vào mốc thời gian này để cảnh báo hồ sơ đến hạn và quá hạn trên thanh thông báo.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gov-border">
              <button
                type="button"
                onClick={() => setIsEditSlaOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveUrgencySla}
                disabled={isSavingSla}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSavingSla ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>{isSavingSla ? 'Đang lưu...' : 'Lưu mức độ & Hạn SLA'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Yêu cầu AI Xử lý lại văn bản */}
      {showReprocessModal && (
        <div className="fixed inset-0 !m-0 z-50 overflow-y-auto w-full h-full min-h-screen bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 border border-gov-border animate-in zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gov-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-gov-text uppercase">
                  Yêu cầu AI xử lý lại văn bản chuyên sâu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReprocessModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống sẽ tái thẩm định toàn diện văn bản đến, trích lọc căn cứ pháp lý chuyên ngành, và sinh dự thảo chi tiết hóa từng điều khoản chỉ đạo (phân công nhiệm vụ cụ thể, ấn định thời hạn SLA rõ ràng, loại bỏ hoàn toàn các câu chung chung).
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chỉ đạo bổ sung của cán bộ (Tùy chọn):
              </label>
              <textarea
                value={reprocessDirective}
                onChange={(e) => setReprocessDirective(e.target.value)}
                rows={3}
                placeholder="Ví dụ: Yêu cầu rà soát kỹ tính pháp lý của quy hoạch đất đai, giao Sở TN&MT kiểm tra thực địa và báo cáo trước ngày 20/11..."
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Nếu để trống, AI sẽ tự động phân tích sâu toàn bộ nội dung công văn theo chuẩn Nghị định 30.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gov-border">
              <button
                type="button"
                onClick={() => setShowReprocessModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleReprocessAi}
                disabled={isReprocessingAi}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                {isReprocessingAi ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>{isReprocessingAi ? 'AI đang phân tích lại...' : 'Bắt đầu xử lý lại'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
