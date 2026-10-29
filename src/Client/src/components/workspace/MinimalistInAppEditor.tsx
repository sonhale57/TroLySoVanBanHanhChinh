import React, { useRef, useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  AlignJustify,
  AlignLeft,
  AlignCenter,
  ListOrdered,
  List,
  Table as TableIcon,
  Plus,
  Trash2,
  Save,
  Download,
  ThumbsUp,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Sliders,
  Sparkles,
  SaveAll,
  FileEdit,
  UploadCloud,
  FileUp,
  FileText,
  Check,
  RotateCcw,
  DownloadCloud,
  ExternalLink,
  Layers,
  HelpCircle,
  FileSpreadsheet,
  BrainCircuit
} from 'lucide-react';
import { DocumentInfo, ActionOption, AiVerificationInfo, DocumentTemplate } from '../../types';
import { api } from '../../services/api';
import { AiVerificationBadge } from '../common/AiVerificationBadge';
import { TemplateConfigModal, DEFAULT_TEMPLATE } from '../modals/TemplateConfigModal';

interface MinimalistInAppEditorProps {
  documentInfo?: DocumentInfo;
  initialHtml?: string;
  selectedOption?: ActionOption;
  processingLogId?: string;
  aiVerification?: AiVerificationInfo;
  onSaveDraft: (html: string, metadata: {
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
  }) => Promise<void>;
  onExportDocx: (html: string, metadata: {
    subjectTitle: string;
    issuerParent: string;
    issuerName: string;
    docCode: string;
    location: string;
    docDateStr?: string;
    signerAuthority?: string;
    signerTitle: string;
    signerName: string;
    recipientMain: string;
    recipientsList?: string[];
  }) => Promise<void>;
  onRateGoldSample: (rating: number, html: string) => Promise<void>;
  isSaving?: boolean;
  isExporting?: boolean;
}

export const MinimalistInAppEditor: React.FC<MinimalistInAppEditorProps> = ({
  documentInfo,
  initialHtml,
  selectedOption,
  processingLogId,
  aiVerification,
  onSaveDraft,
  onExportDocx,
  onRateGoldSample,
  isSaving = false,
  isExporting = false,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  // 1. Thể thức Phần Đầu (Header) - Cho phép sửa toàn diện
  const [issuerParent, setIssuerParent] = useState('ỦY BAN NHÂN DÂN TỈNH');
  const [issuerName, setIssuerName] = useState('VĂN PHÒNG');
  const [docCode, setDocCode] = useState(documentInfo?.codeNumber ? `PhucDap-${documentInfo.codeNumber}` : '...../VP-UBND');
  const [countryTop, setCountryTop] = useState('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM');
  const [countrySub, setCountrySub] = useState('Độc lập - Tự do - Hạnh phúc');
  const [location, setLocation] = useState('Quảng Trị');
  const [docDateStr, setDocDateStr] = useState(`ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`);

  // 2. Trích yếu & Kính gửi
  const [subjectTitle, setSubjectTitle] = useState(
    documentInfo?.subjectTitle
      ? `V/v phúc đáp công văn số ${documentInfo.codeNumber || ''} về ${documentInfo.subjectTitle}`
      : 'V/v giải quyết nội dung đề xuất của đơn vị'
  );
  const [recipientMain, setRecipientMain] = useState(documentInfo?.issuer || 'Cơ quan gửi công văn');

  // 3. Nơi nhận (Footer Cột Trái) - Cho phép thêm/sửa/xóa dòng tự do
  const [recipients, setRecipients] = useState<string[]>([
    'Như trên',
    'Chủ tịch, các PCT UBND tỉnh',
    'Cơ quan chuyên môn liên quan',
    'Lưu: VT, TH'
  ]);
  const [newRecipientInput, setNewRecipientInput] = useState<string>('');

  // 4. Chữ ký & Thẩm quyền (Footer Cột Phải) - Cho phép sửa toàn diện
  const [signerAuthority, setSignerAuthority] = useState('TM. ỦY BAN NHÂN DÂN');
  const [signerTitle, setSignerTitle] = useState('CHÁNH VĂN PHÒNG');
  const [signerNote, setSignerNote] = useState('(Ký, ghi rõ họ tên và đóng dấu bản giấy)');
  const [signerName, setSignerName] = useState('');

  // Trạng thái hệ thống
  const [liked, setLiked] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [aiDraftBackup, setAiDraftBackup] = useState<string>('');

  // Mẫu cơ quan & Footer mẫu
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // Theo dõi trạng thái đã lưu & cảnh báo sai lệch bản in
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [lastExportedTime, setLastExportedTime] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Tự động tải Header & Footer mẫu đã lưu của đơn vị / tài khoản
  useEffect(() => {
    const loadSavedTemplate = async () => {
      try {
        const tpl = await api.getDocumentTemplate();
        if (tpl) {
          if (tpl.parentAgency) setIssuerParent(tpl.parentAgency);
          if (tpl.issuingAgency) setIssuerName(tpl.issuingAgency);
          if (tpl.provinceCity) setLocation(tpl.provinceCity);
          if (tpl.signerPosition) setSignerTitle(tpl.signerPosition);
          if (tpl.signerName) setSignerName(tpl.signerName);
        }
      } catch {
        const local = localStorage.getItem('gov_doc_template');
        if (local) {
          try {
            const parsed = JSON.parse(local);
            if (parsed.parentAgency) setIssuerParent(parsed.parentAgency);
            if (parsed.issuingAgency) setIssuerName(parsed.issuingAgency);
            if (parsed.provinceCity) setLocation(parsed.provinceCity);
            if (parsed.signerPosition) setSignerTitle(parsed.signerPosition);
            if (parsed.signerName) setSignerName(parsed.signerName);
          } catch { }
        }
      }
    };
    loadSavedTemplate();
  }, []);

  const handleTemplateApplied = (tpl: DocumentTemplate) => {
    if (tpl.parentAgency) setIssuerParent(tpl.parentAgency);
    if (tpl.issuingAgency) setIssuerName(tpl.issuingAgency);
    if (tpl.provinceCity) setLocation(tpl.provinceCity);
    if (tpl.signerPosition) setSignerTitle(tpl.signerPosition);
    if (tpl.signerName) setSignerName(tpl.signerName);
    setNotification('Đã áp dụng mẫu cơ quan & chức vụ ký mới vào dự thảo!');
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveCurrentAsDefault = async () => {
    try {
      setIsSavingTemplate(true);
      await api.updateDocumentTemplate({
        parentAgency: issuerParent,
        issuingAgency: issuerName,
        docCodeTemplate: docCode,
        provinceCity: location,
        signerPosition: signerTitle,
        signerName: signerName,
        recipientDefault: recipientMain,
      });
      setNotification('Đã lưu mẫu Header & Footer hiện tại làm mặc định cho các công văn sau!');
      setTimeout(() => setNotification(null), 4000);
    } catch {
      setNotification('Không thể lưu mẫu lên máy chủ.');
    } finally {
      setIsSavingTemplate(false);
    }
  };

  // Nạp nội dung ban đầu và sao lưu bản nháp AI
  useEffect(() => {
    if (editorRef.current) {
      if (initialHtml && initialHtml.trim().length > 0) {
        editorRef.current.innerHTML = initialHtml;
        setAiDraftBackup(initialHtml);
      } else if (selectedOption?.draftContentBullets && selectedOption.draftContentBullets.length > 0) {
        const generated = selectedOption.draftContentBullets.map(b => `<p>${b}</p>`).join('');
        editorRef.current.innerHTML = generated;
        setAiDraftBackup(generated);
      } else {
        const defaultContent = `
          <p><strong>Căn cứ Luật Tổ chức chính quyền địa phương ngày 19 tháng 6 năm 2015;</strong></p>
          <p><strong>Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05 tháng 3 năm 2020 của Chính phủ về công tác văn thư;</strong></p>
          <p>Xét đề nghị của ${recipientMain} tại văn bản số ${documentInfo?.codeNumber || 'đã tiếp nhận'};</p>
          <p>Chủ tịch Ủy ban nhân dân có ý kiến chỉ đạo như sau:</p>
          <ol>
            <li>Chấp thuận về mặt chủ trương đối với các nội dung đề nghị của đơn vị gửi văn bản theo đúng thẩm quyền quy định.</li>
            <li>Giao cơ quan chuyên môn chủ trì, phối hợp với các đơn vị liên quan hướng dẫn hoàn thiện hồ sơ theo đúng quy định.</li>
            <li>Yêu cầu tập trung triển khai thực hiện bảo đảm tiến độ, định kỳ báo cáo kết quả theo quy định.</li>
          </ol>
        `;
        editorRef.current.innerHTML = defaultContent;
        setAiDraftBackup(defaultContent);
      }
      setIsDirty(false);
    }
  }, [initialHtml, selectedOption]);

  useEffect(() => {
    if (documentInfo?.codeNumber) {
      setDocCode(`PhucDap-${documentInfo.codeNumber}`);
    }
    if (documentInfo?.issuer) {
      setRecipientMain(documentInfo.issuer);
    }
    if (documentInfo?.subjectTitle) {
      setSubjectTitle(`V/v phúc đáp công văn số ${documentInfo.codeNumber || ''} về ${documentInfo.subjectTitle}`);
    }
  }, [documentInfo]);

  // Bộ lọc dán thông minh (Clean Paste Filter)
  const handleCleanPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const plainText = e.clipboardData.getData('text/plain');
    if (!plainText) return;

    const paragraphs = plainText
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (paragraphs.length > 0) {
      const cleanHtml = paragraphs.map(p => `<p>${p}</p>`).join('');
      document.execCommand('insertHTML', false, cleanHtml);
    } else {
      document.execCommand('insertText', false, plainText);
    }
  };

  const executeCmd = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const insertTable = () => {
    const tableHtml = `
      <table style="width:100%; border-collapse: collapse; margin: 12px 0;" border="1">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">STT</th>
            <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">Nội dung</th>
            <th style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">Thời hạn</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">1</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">Nhiệm vụ trọng tâm...</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">Hàng tháng</td>
          </tr>
          <tr>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">2</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1;">Báo cáo định kỳ...</td>
            <td style="padding: 6px 10px; border: 1px solid #cbd5e1; text-align: center;">Trước ngày 25</td>
          </tr>
        </tbody>
      </table>
      <p></p>
    `;
    document.execCommand('insertHTML', false, tableHtml);
  };

  // Quản lý Nơi nhận: Thêm / Xóa dòng
  const handleAddRecipient = () => {
    if (!newRecipientInput.trim()) return;
    const formatted = newRecipientInput.trim().startsWith('-') ? newRecipientInput.trim() : newRecipientInput.trim();
    setRecipients([...recipients, formatted]);
    setNewRecipientInput('');
    setIsDirty(true);
  };

  const handleRemoveRecipient = (index: number) => {
    setRecipients(recipients.filter((_, i) => i !== index));
    setIsDirty(true);
  };

  const handleUpdateRecipient = (index: number, val: string) => {
    const updated = [...recipients];
    updated[index] = val;
    setRecipients(updated);
    setIsDirty(true);
  };

  // TÙY CHỌN: Tham khảo / Khôi phục bản thảo mẫu do AI sinh ra
  const handleRestoreAiDraft = () => {
    if (editorRef.current && aiDraftBackup) {
      editorRef.current.innerHTML = aiDraftBackup;
      setIsDirty(true);
      setNotification('Đã nạp lại dự thảo gợi ý ban đầu từ AI. Đồng chí có thể chỉnh sửa tự do theo ý muốn.');
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleSave = async () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    await onSaveDraft(html, {
      subjectTitle,
      issuerParent,
      issuerName,
      docCode,
      location,
      docDateStr,
      signerAuthority,
      signerTitle,
      signerName,
      recipientsList: recipients,
    });
    const now = new Date();
    setLastSavedTime(now);
    setIsDirty(false);
    setNotification(`Đã lưu nội dung văn bản đầu ra vào hồ sơ (lúc ${now.toLocaleTimeString('vi-VN')})! Trạng thái: Đã xử lý.`);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleExport = async () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;

    // Tự động lưu hồ sơ trước khi xuất Word
    await onSaveDraft(html, {
      subjectTitle,
      issuerParent,
      issuerName,
      docCode,
      location,
      docDateStr,
      signerAuthority,
      signerTitle,
      signerName,
      recipientsList: recipients,
    });
    const now = new Date();
    setLastSavedTime(now);
    setLastExportedTime(now);
    setIsDirty(false);

    // Xuất file Word .docx chuẩn Nghị định 30
    await onExportDocx(html, {
      subjectTitle,
      issuerParent,
      issuerName,
      docCode,
      location,
      docDateStr,
      signerAuthority,
      signerTitle,
      signerName,
      recipientMain,
      recipientsList: recipients,
    });

    setNotification(`Đã tự động lưu hồ sơ và xuất tệp Word lúc ${now.toLocaleTimeString('vi-VN')}!`);
    setTimeout(() => setNotification(null), 5000);
  };

  const handleLike = async () => {
    if (!editorRef.current || liked) return;
    const html = editorRef.current.innerHTML;
    setLiked(true);
    await onRateGoldSample(1, html);
    setNotification('Đã đánh giá Mẫu Chuẩn Vàng! Hệ thống sẽ tự động học hỏi cặp văn bản vào - ra này để nâng cao chất lượng các văn bản tiếp theo.');
    setTimeout(() => setNotification(null), 5000);
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden flex flex-col">
      {/* Toast Notification */}
      {notification && (
        <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 text-xs px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span className="font-medium">{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* THANH TIÊU ĐỀ TRÌNH SOẠN THẢO VĂN BẢN (NẰM Ở TAB THẨM ĐỊNH & SOẠN THẢO) */}
      <div className="bg-slate-900 text-white p-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-gov-primary rounded-lg text-white">
            <FileEdit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-white">
                Trình Soạn thảo Văn bản Hành chính
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Nghị định 30/2020
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              Biên tập thể thức, nội dung chỉ đạo & trích xuất công văn • Cho phép chỉnh sửa toàn diện
            </p>
          </div>
        </div>

        {/* Nút thao tác trên Header Editor */}
        <div className="flex items-center gap-2">
          {/* Tùy chọn: Tham khảo dự thảo mẫu AI */}
          <button
            type="button"
            onClick={handleRestoreAiDraft}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
            title="Nạp lại gợi ý dự thảo tự động từ AI (nếu muốn tham khảo thêm)"
          >
            <BrainCircuit className="w-3.5 h-3.5 text-amber-400" />
            <span>Xử lý với AI</span>
          </button>
        </div>
      </div>

      {/* Toolbar: Đậm, Nghiêng, Gạch chân, Căn lề, Danh sách, Bảng biểu */}
      <div className="bg-gov-subtle border-b border-gov-border p-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-white border border-gov-border rounded-lg p-1 shadow-xs">
          {/* Định dạng cốt lõi */}
          <button
            type="button"
            onClick={() => executeCmd('bold')}
            title="In đậm (Ctrl+B)"
            className="p-1.5 text-gov-text hover:bg-gov-hover rounded transition-colors"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('italic')}
            title="In nghiêng (Ctrl+I)"
            className="p-1.5 text-gov-text hover:bg-gov-hover rounded transition-colors"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('underline')}
            title="Gạch chân (Ctrl+U)"
            className="p-1.5 text-gov-text hover:bg-gov-hover rounded transition-colors"
          >
            <Underline className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-gov-border mx-1" />

          {/* Căn lề hành chính */}
          <button
            type="button"
            onClick={() => executeCmd('justifyFull')}
            title="Căn đều hai bên (Mặc định công văn)"
            className="p-1.5 text-gov-primary font-bold hover:bg-gov-hover rounded transition-colors"
          >
            <AlignJustify className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('justifyLeft')}
            title="Căn trái"
            className="p-1.5 text-gov-text hover:bg-gov-hover rounded transition-colors"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('justifyCenter')}
            title="Căn giữa"
            className="p-1.5 text-gov-text hover:bg-gov-hover rounded transition-colors"
          >
            <AlignCenter className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-gov-border mx-1" />

          {/* Danh sách */}
          <button
            type="button"
            onClick={() => executeCmd('insertOrderedList')}
            title="Danh sách số (1, 2, 3...)"
            className="p-1.5 text-gov-text hover:bg-gov-hover rounded transition-colors"
          >
            <ListOrdered className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCmd('insertUnorderedList')}
            title="Danh sách gạch đầu dòng"
            className="p-1.5 text-gov-text hover:bg-gov-hover rounded transition-colors"
          >
            <List className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-4 bg-gov-border mx-1" />

          {/* Bảng biểu */}
          <button
            type="button"
            onClick={insertTable}
            title="Chèn bảng biểu hành chính"
            className="p-1.5 text-gov-text hover:bg-gov-hover rounded transition-colors flex items-center gap-1 text-xs"
          >
            <TableIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Bảng</span>
          </button>

          <div className="w-[1px] h-4 bg-gov-border mx-1" />

          {/* Cài đặt Header & Footer mẫu cơ quan (Nghị định 30) */}
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            title="Cài đặt Header/Footer mẫu cơ quan, tỉnh thành, chức danh ký"
            className="p-1.5 text-gov-primary hover:bg-gov-subtle font-bold rounded transition-colors flex items-center gap-1 text-xs border border-gov-border/60"
          >
            <Sliders className="w-4 h-4 text-gov-primary" />
            <span className="hidden md:inline">Mẫu cơ quan</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCurrentAsDefault}
            disabled={isSavingTemplate}
            title="Lưu các thông tin cơ quan, địa danh, chức vụ ký hiện tại làm mẫu mặc định"
            className="p-1.5 text-slate-700 hover:bg-slate-100 rounded transition-colors flex items-center gap-1 text-xs"
          >
            <SaveAll className="w-4 h-4 text-slate-600" />
            <span className="hidden lg:inline">{isSavingTemplate ? 'Đang lưu...' : 'Lưu làm mẫu'}</span>
          </button>
        </div>

        {/* Trạng thái chế độ */}
        <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-gov-primary" />
          <span>Bộ lọc Clean Paste bật: Tự động giữ chuẩn phông Times New Roman NĐ 30</span>
        </div>
      </div>

      {/* Huy hiệu xác thực AI xử lý (AI Verification Check) */}
      {aiVerification && (
        <div className="p-3 bg-slate-100 border-b border-slate-200">
          <AiVerificationBadge aiVerification={aiVerification} />
        </div>
      )}

      {/* CẢNH BÁO SAI LỆCH BẢN IN NẾU CÓ CHỈNH SỬA SAU KHI XUẤT WORD */}
      {lastExportedTime && isDirty && (
        <div className="bg-amber-50 border-b border-amber-300 text-amber-950 px-4 py-2 flex items-start gap-2.5 text-xs font-medium animate-in fade-in">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <strong className="text-amber-950 font-bold">Cảnh báo sai lệch bản in: </strong>
            Văn bản đã được chỉnh sửa mới sau lần xuất Word lúc <strong>{lastExportedTime.toLocaleTimeString('vi-VN')}</strong>.
            Đồng chí vui lòng bấm <strong>"Chốt & Xuất Word (.docx)"</strong> lại để bản in khớp với hồ sơ trên hệ thống!
          </div>
        </div>
      )}

      {/* A4 DOCUMENT PAPER PREVIEW & EDITABLE ALL SECTIONS */}
      <div className="p-4 sm:p-6 lg:p-8 bg-slate-100 flex-1 overflow-y-auto max-h-[750px]">
        <div className="max-w-[780px] mx-auto bg-white shadow-md border border-slate-200 p-6 sm:p-10 text-slate-900 font-['Nunito_Sans'] leading-relaxed text-[14px]">

          {/* ═══════════════════════════════════════════════════════════════════
              1. HEADER 2 CỘT CHUẨN NGHỊ ĐỊNH 30/2020 - CHO PHÉP SỬA HẾT
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-12 gap-4 pb-6 border-b border-slate-200">
            {/* Cột trái (5/12): Cơ quan chủ quản, Cơ quan ban hành, Số & Ký hiệu */}
            <div className="col-span-5 text-center space-y-1">
              <input
                type="text"
                value={issuerParent}
                onChange={(e) => { setIssuerParent(e.target.value); setIsDirty(true); }}
                className="w-full text-center text-xs font-semibold text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1"
                placeholder="TÊN CƠ QUAN CHỦ QUẢN"
              />
              <input
                type="text"
                value={issuerName}
                onChange={(e) => { setIssuerName(e.target.value); setIsDirty(true); }}
                className="w-full text-center text-xs font-bold text-slate-900 uppercase underline decoration-slate-400 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1"
                placeholder="TÊN CƠ QUAN BAN HÀNH"
              />
              <div className="pt-2 flex items-center justify-center gap-1 text-xs text-slate-600">
                <span>Số:</span>
                <input
                  type="text"
                  value={docCode}
                  onChange={(e) => { setDocCode(e.target.value); setIsDirty(true); }}
                  className="font-medium text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1 text-center w-36"
                  placeholder=".../VP-UBND"
                />
              </div>
            </div>

            {/* Cột phải (7/12): Quốc hiệu, Tiêu ngữ, Địa danh & Ngày tháng năm */}
            <div className="col-span-7 text-center space-y-1">
              <input
                type="text"
                value={countryTop}
                onChange={(e) => { setCountryTop(e.target.value); setIsDirty(true); }}
                className="w-full text-center text-xs font-bold text-slate-900 tracking-wider bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1"
                placeholder="CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"
              />
              <input
                type="text"
                value={countrySub}
                onChange={(e) => { setCountrySub(e.target.value); setIsDirty(true); }}
                className="w-full text-center text-xs font-bold text-slate-800 underline decoration-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1"
                placeholder="Độc lập - Tự do - Hạnh phúc"
              />
              <div className="pt-2 text-xs italic text-slate-600 flex items-center justify-center gap-1">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => { setLocation(e.target.value); setIsDirty(true); }}
                  className="text-right bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1 w-24 italic"
                  placeholder="Địa danh"
                />
                <span>,</span>
                <input
                  type="text"
                  value={docDateStr}
                  onChange={(e) => { setDocDateStr(e.target.value); setIsDirty(true); }}
                  className="text-left bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1 italic w-48"
                  placeholder="ngày... tháng... năm..."
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              2. TIÊU ĐỀ TRÍCH YẾU CÔNG VĂN & KÍNH GỬI - CHO PHÉP SỬA
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="my-6 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap mt-1">Trích yếu:</span>
              <textarea
                value={subjectTitle}
                onChange={(e) => { setSubjectTitle(e.target.value); setIsDirty(true); }}
                rows={2}
                className="w-full text-xs font-semibold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded p-1.5 resize-none border border-transparent hover:border-slate-200"
                placeholder="V/v giải quyết nội dung đề nghị..."
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 whitespace-nowrap">Kính gửi:</span>
              <input
                type="text"
                value={recipientMain}
                onChange={(e) => { setRecipientMain(e.target.value); setIsDirty(true); }}
                className="w-full text-xs font-medium text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1.5 py-1 border border-transparent hover:border-slate-200"
                placeholder="Tên đơn vị, cá nhân nhận văn bản"
              />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              3. PHẦN THÂN SOẠN THẢO TRỰC TIẾP (Editable Body)
          ═══════════════════════════════════════════════════════════════════ */}
          <div
            ref={editorRef}
            contentEditable
            onPaste={handleCleanPaste}
            onInput={() => setIsDirty(true)}
            suppressContentEditableWarning
            className="min-h-[280px] p-4 border border-dashed border-slate-300 rounded-lg hover:border-gov-primary focus:border-gov-primary focus:outline-none bg-white transition-colors text-justify leading-relaxed"
            style={{ textAlign: 'justify' }}
          />

          {/* ═══════════════════════════════════════════════════════════════════
              4. CHÂN VĂN BẢN (NƠI NHẬN & CHỮ KÝ - CHO PHÉP SỬA TOÀN BỘ)
          ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-12 gap-4 mt-8 pt-6 border-t border-slate-200">
            {/* CỘT TRÁI: NƠI NHẬN (Editable List) */}
            <div className="col-span-6 text-left space-y-2">
              <div>
                <span className="text-xs font-bold text-slate-800 italic underline">Nơi nhận:</span>
              </div>

              {/* Danh sách các dòng nơi nhận */}
              <div className="space-y-1">
                {recipients.map((rec, idx) => (
                  <div key={idx} className="flex items-center gap-1 group">
                    <span className="text-[11px] text-slate-500 select-none">-</span>
                    <input
                      type="text"
                      value={rec}
                      onChange={(e) => handleUpdateRecipient(idx, e.target.value)}
                      className="w-full text-[11px] text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1 py-0.5"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(idx)}
                      title="Xóa dòng nơi nhận này"
                      className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-0.5 rounded transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Ô thêm dòng nơi nhận mới */}
              <div className="flex items-center gap-1 pt-1">
                <input
                  type="text"
                  value={newRecipientInput}
                  onChange={(e) => setNewRecipientInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddRecipient(); } }}
                  placeholder="+ Thêm nơi nhận..."
                  className="w-full text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddRecipient}
                  className="px-2 py-1 bg-slate-200 hover:bg-gov-primary hover:text-white text-slate-700 rounded text-[11px] font-bold shrink-0 transition-colors"
                >
                  Thêm
                </button>
              </div>
            </div>

            {/* CỘT PHẢI: QUYỀN HẠN, CHỨC DANH & HỌ TÊN NGƯỜI KÝ (Editable Signature) */}
            <div className="col-span-6 text-center space-y-1.5">
              {/* Quyền hạn ký (TM. ỦY BAN NHÂN DÂN / KT. CHỦ TỊCH / CHỦ TỊCH...) */}
              <div>
                <input
                  type="text"
                  value={signerAuthority}
                  onChange={(e) => { setSignerAuthority(e.target.value); setIsDirty(true); }}
                  className="w-full text-center text-xs font-black text-slate-900 uppercase bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1"
                  placeholder="TM. ỦY BAN NHÂN DÂN / KT. CHỦ TỊCH..."
                />
              </div>

              {/* Chức vụ người ký */}
              <div>
                <input
                  type="text"
                  value={signerTitle}
                  onChange={(e) => { setSignerTitle(e.target.value); setIsDirty(true); }}
                  className="w-full text-center text-xs font-bold text-slate-900 uppercase bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1"
                  placeholder="CHỨC VỤ NGƯỜI KÝ (CHÁNH VĂN PHÒNG, PHÓ CHỦ TỊCH...)"
                />
              </div>

              {/* Ghi chú ký giấy */}
              <input
                type="text"
                value={signerNote}
                onChange={(e) => { setSignerNote(e.target.value); setIsDirty(true); }}
                className="w-full text-center text-[11px] text-slate-400 italic bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1 py-4"
                placeholder="(Ký, ghi rõ họ tên và đóng dấu bản giấy)"
              />

              {/* Họ và tên người ký */}
              <div>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => { setSignerName(e.target.value); setIsDirty(true); }}
                  className="w-full text-center text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-50 focus:bg-white focus:ring-1 focus:ring-gov-primary rounded px-1 py-1 border-b border-dashed border-slate-300"
                  placeholder="Họ và tên người ký duyệt"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ACTION BAR (LƯU HỒ SƠ, XUẤT WORD, MẪU CHUẨN VÀNG) */}
      <div className="bg-white border-t border-gov-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Nút Like (Hữu ích) phục vụ Tự học & Kho mẫu chuẩn vàng */}
          <button
            type="button"
            onClick={handleLike}
            disabled={liked}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${liked
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-gov-subtle text-gov-text hover:bg-emerald-50 hover:text-emerald-700 border border-gov-border'
              }`}
            title="Đánh giá dự thảo chuẩn xác để hệ thống ghi nhớ vào Kho mẫu chuẩn vàng"
          >
            <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-emerald-600 text-emerald-600' : ''}`} />
            <span>{liked ? 'Đã lưu mẫu chuẩn' : 'Ghi nhận mẫu chuẩn'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Trạng thái đã lưu / chưa lưu */}
          {isDirty ? (
            <span className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-amber-300">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Có thay đổi chưa lưu</span>
            </span>
          ) : lastSavedTime ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã lưu hồ sơ ({lastSavedTime.toLocaleTimeString('vi-VN')})</span>
            </span>
          ) : null}

          {/* Nút Lưu văn bản chuyển sang DA_XU_LY */}
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-white border border-gov-border hover:bg-slate-50 text-gov-text rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all"
          >
            <Save className="w-4 h-4 text-gov-primary" />
            <span>{isSaving ? 'Đang lưu...' : 'Lưu hồ sơ văn bản'}</span>
          </button>

          {/* Nút Chốt & Xuất file Word .docx */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="px-5 py-2 bg-gov-primary hover:bg-gov-primary-hover text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            title="Tự động lưu nội dung dự thảo vào hệ thống và tải về tệp Word chuẩn Nghị định 30"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Đang xuất Word...' : 'Chốt & Xuất Word (.docx)'}</span>
          </button>
        </div>
      </div>

      {/* Modal Cài đặt Header & Footer mẫu Nghị định 30 */}
      <TemplateConfigModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onTemplateSaved={handleTemplateApplied}
      />
    </div>
  );
};
