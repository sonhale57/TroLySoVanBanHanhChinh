import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  RefreshCw,
  Clock,
  Eye,
  ArrowLeft,
  Loader2,
  Calendar,
  Building,
  CheckCircle2,
  Shield,
  User,
  X,
  Download,
  Filter,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
  Layers,
  Trash2,
  MoreVertical,
  Edit3,
  FileEdit,
  ArrowRight,
  DownloadCloud,
  FileUp,
  FileCheck2,
  ExternalLink,
  ArrowUpDown
} from 'lucide-react';
import { SmartDeleteConfirmModal } from '../components/common/SmartDeleteConfirmModal';
import { ProcessedRecordItem, ProcessedRecordDetail, ProcessIncomingResult, DocumentStatistics } from '../types';
import { api, normalizeProcessIncomingResult } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ActionConfirmModal } from '../components/common/ActionConfirmModal';
import { DashboardCharts } from '../components/common/DashboardCharts';
import {
  BarChart3,
  PieChart,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface ProcessedDocumentsPageProps {
  onBackToWorkspace: () => void;
  onOpenInWorkspace: (data: ProcessIncomingResult) => void;
}

export const ProcessedDocumentsPage: React.FC<ProcessedDocumentsPageProps> = ({
  onBackToWorkspace,
  onOpenInWorkspace,
}) => {
  const { user } = useAuth();
  const [records, setRecords] = useState<ProcessedRecordItem[]>([]);
  const [statistics, setStatistics] = useState<DocumentStatistics | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'newest' | 'status' | 'urgency'>('newest');

  // Kỳ thống kê: 'month' (Theo Tháng) | 'week' (Theo Tuần) | 'all' (Toàn bộ) | 'custom' (Tùy chọn)
  const [periodType, setPeriodType] = useState<'month' | 'week' | 'all' | 'custom'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedWeekPreset, setSelectedWeekPreset] = useState<'this_week' | 'last_week'>('this_week');
  const [showCharts, setShowCharts] = useState(true);

  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<ProcessedRecordDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [confirmReprocessRecord, setConfirmReprocessRecord] = useState<ProcessedRecordItem | null>(null);
  const [deleteTargetRecord, setDeleteTargetRecord] = useState<ProcessedRecordItem | null>(null);
  const [signModalRecord, setSignModalRecord] = useState<ProcessedRecordItem | null>(null);
  const [signDateInput, setSignDateInput] = useState<string>(new Date().toISOString().substring(0, 10));
  const [editSlaRecord, setEditSlaRecord] = useState<ProcessedRecordItem | null>(null);
  const [urgencyInput, setUrgencyInput] = useState<string>('THƯỜNG');
  const [slaDeadlineInput, setSlaDeadlineInput] = useState<string>('');
  const [isSavingSla, setIsSavingSla] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Đóng dropdown thao tác khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.doc-action-menu')) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, [statusFilter, periodType, selectedYear, selectedMonth, selectedWeekPreset]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      let effectiveTimeFilter: string | undefined = undefined;
      let effectiveYear: number | undefined = undefined;
      let effectiveMonth: number | undefined = undefined;

      if (periodType === 'month') {
        effectiveYear = selectedYear;
        effectiveMonth = selectedMonth;
        params.year = selectedYear;
        params.month = selectedMonth;
        effectiveTimeFilter = `month:${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
        params.timeFilter = effectiveTimeFilter;
      } else if (periodType === 'week') {
        effectiveTimeFilter = selectedWeekPreset;
        params.timeFilter = selectedWeekPreset;
      } else if (periodType === 'custom') {
        effectiveTimeFilter = 'custom';
        params.timeFilter = 'custom';
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
      } else {
        effectiveTimeFilter = 'ALL';
        params.timeFilter = 'ALL';
      }

      const [recordData, statsData] = await Promise.all([
        api.getProcessedDocuments(params),
        api.getDocumentStatistics(effectiveTimeFilter, params.fromDate, params.toDate, effectiveYear, effectiveMonth),
      ]);

      setRecords(recordData);
      setStatistics(statsData);
    } catch (err) {
      console.error(err);
      setNotification('Không thể tải danh sách hồ sơ công vụ.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      const params: any = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      let periodLabel = 'ToanBo';
      if (periodType === 'month') {
        params.year = selectedYear;
        params.month = selectedMonth;
        params.timeFilter = `month:${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
        periodLabel = `Thang_${selectedMonth}_${selectedYear}`;
      } else if (periodType === 'week') {
        params.timeFilter = selectedWeekPreset;
        periodLabel = selectedWeekPreset === 'this_week' ? 'TuanNay' : 'TuanTruoc';
      } else if (periodType === 'custom') {
        params.timeFilter = 'custom';
        if (fromDate) params.fromDate = fromDate;
        if (toDate) params.toDate = toDate;
        periodLabel = 'TuyChon';
      } else {
        params.timeFilter = 'ALL';
      }

      const blob = await api.exportLogbookExcel(params);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SoTheoDoi_CongVan_ND30_${periodLabel}_${new Date().toISOString().substring(0, 10)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setNotification(`Đã xuất thành công Sổ theo dõi công văn chuẩn Nghị định 30 (${statistics?.periodLabel || 'Kỳ đã chọn'}) (.xlsx)!`);
    } catch (err) {
      console.error(err);
      setNotification('Không thể xuất tệp Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleConfirmSign = async () => {
    if (!signModalRecord) return;
    try {
      await api.updateSignedDate(signModalRecord.id, signDateInput);
      setNotification(`Đã cập nhật ngày ký duyệt cho văn bản ${signModalRecord.incomingDocCode || signModalRecord.originalFileName}!`);
      setSignModalRecord(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể cập nhật ngày ký.');
    }
  };

  // Cập nhật mức độ khẩn và thời hạn SLA
  const handleSaveUrgencySla = async () => {
    if (!editSlaRecord) return;
    try {
      setIsSavingSla(true);
      const res = await api.updateUrgencySla(editSlaRecord.id, {
        urgencyLevel: urgencyInput,
        slaDeadline: slaDeadlineInput ? new Date(slaDeadlineInput).toISOString() : undefined,
      });
      setNotification(`Đã cập nhật mức độ khẩn (${res.urgencyLevel}) và thời hạn SLA thành công!`);
      setEditSlaRecord(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể cập nhật hạn SLA và độ khẩn.');
    } finally {
      setIsSavingSla(false);
    }
  };

  // Đưa hồ sơ tới Bàn làm việc để xử lý và soạn thảo
  const handleSendToWorkspace = async (record: ProcessedRecordItem) => {
    try {
      setLoading(true);
      const detail = await api.getProcessedDocumentDetail(record.id);
      const parsedResult = normalizeProcessIncomingResult(detail.resultDataJson || detail, {
        id: record.id,
        incomingDocCode: record.incomingDocCode,
        incomingIssuer: record.incomingIssuer,
        subjectTitle: record.subjectTitle,
        originalFileName: record.originalFileName,
        urgencyLevel: record.urgencyLevel,
        receivedDate: record.receivedDate,
        slaDeadline: record.slaDeadline,
        currentStatus: record.currentStatus,
        draftContentHtml: detail.draftContentHtml || '',
        outputFileName: detail.outputFileName || record.outputFileName,
        outputFilePath: detail.outputFilePath || record.outputFilePath,
        storedFilePath: detail.storedFilePath || record.storedFilePath,
        isCustomOutput: detail.isCustomOutput ?? record.isCustomOutput,
      });

      onOpenInWorkspace(parsedResult);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể đưa hồ sơ tới bàn làm việc.');
    } finally {
      setLoading(false);
    }
  };

  // Mở lại hồ sơ (về DANG_XU_LY và tiếp tục sửa trong Workspace)
  const handleReopen = async (record: ProcessedRecordItem) => {
    try {
      await api.reopenDocument(record.id);
      setNotification(`Đã mở lại hồ sơ ${record.incomingDocCode || record.originalFileName} để tiếp tục chỉnh sửa!`);
      // Lấy chi tiết và mở trực tiếp sang Workspace
      const detail = await api.getProcessedDocumentDetail(record.id);
      const parsedResult = normalizeProcessIncomingResult(detail.resultDataJson || detail, {
        id: record.id,
        incomingDocCode: record.incomingDocCode,
        incomingIssuer: record.incomingIssuer,
        subjectTitle: record.subjectTitle,
        originalFileName: record.originalFileName,
        urgencyLevel: record.urgencyLevel,
        receivedDate: record.receivedDate,
        slaDeadline: record.slaDeadline,
        currentStatus: 'DANG_XU_LY',
        draftContentHtml: detail.draftContentHtml || '',
        outputFileName: detail.outputFileName || record.outputFileName,
        outputFilePath: detail.outputFilePath || record.outputFilePath,
        storedFilePath: detail.storedFilePath || record.storedFilePath,
        isCustomOutput: detail.isCustomOutput ?? record.isCustomOutput,
      });

      onOpenInWorkspace(parsedResult);
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể mở lại hồ sơ.');
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const detail = await api.getProcessedDocumentDetail(id);
      setSelectedRecord(detail);
    } catch (err) {
      console.error(err);
      setNotification('Không thể tải chi tiết hồ sơ.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDownloadIncoming = async (recordId: string, fileName?: string) => {
    try {
      await api.downloadIncomingDoc(recordId, fileName);
    } catch {
      setNotification('Không thể tải về tệp văn bản đầu vào gốc.');
    }
  };

  const handleDownloadOutput = async (recordId: string, fileName?: string) => {
    try {
      await api.downloadOutputDoc(recordId, fileName);
    } catch {
      setNotification('Không thể tải về tệp văn bản đầu ra.');
    }
  };

  const handleExecuteDeleteRecord = async (forceCascade: boolean) => {
    if (!deleteTargetRecord) return { success: false };
    try {
      const res = await api.deleteProcessedRecord(deleteTargetRecord.id, forceCascade);
      setNotification(res.message || `Đã xóa hồ sơ lưu trữ thành công.`);
      setDeleteTargetRecord(null);
      await loadData();
      return { success: true };
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.requiresCascadeConfirmation) {
        return {
          success: false,
          requiresCascade: true,
          dependencies: err.response.data.dependencies,
          message: err.response.data.message,
        };
      }
      throw err;
    }
  };

  const renderStatusBadge = (status: string, signedDate?: string) => {
    switch (status) {
      case 'CHO_XU_LY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300" title="Văn bản mới tiếp nhận vào hệ thống, chưa đưa vào soạn thảo">
            <Clock className="w-3 h-3 text-slate-500" />
            Chờ xử lý
          </span>
        );
      case 'DANG_XU_LY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300" title="Cán bộ đang trực tiếp soạn thảo dự thảo tại Bàn làm việc (Click 'Xử lý hồ sơ' để tiếp tục)">
            <FileEdit className="w-3 h-3 text-blue-600" />
            Đang xử lý
          </span>
        );
      case 'DA_XU_LY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300" title="Đã hoàn tất dự thảo/xuất bản in Word, đang trình Lãnh đạo ký duyệt bản giấy">
            <Clock className="w-3 h-3 text-amber-600" />
            Đã xử lý (chờ ký)
          </span>
        );
      case 'DA_KY':
        return (
          <div className="inline-flex flex-col items-center">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs">
              <CheckCheck className="w-3 h-3 text-emerald-600" />
              Đã ký duyệt
            </span>
            {signedDate && (
              <span className="text-[10px] text-emerald-700 font-semibold mt-1 flex items-center gap-1">
                <Calendar className="w-2.5 h-2.5" />
                Ngày ký: {new Date(signedDate).toLocaleDateString('vi-VN')}
              </span>
            )}
          </div>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const sortedRecords = [...records].sort((a, b) => {
    if (sortBy === 'newest') {
      const timeA = new Date(a.receivedDate || a.createdAt).getTime();
      const timeB = new Date(b.receivedDate || b.createdAt).getTime();
      return timeB - timeA;
    }
    if (sortBy === 'status') {
      const statusWeight: Record<string, number> = {
        'CHO_XU_LY': 1,
        'DANG_XU_LY': 2,
        'DA_XU_LY': 3,
        'DA_KY': 4
      };
      return (statusWeight[a.currentStatus] || 99) - (statusWeight[b.currentStatus] || 99);
    }
    if (sortBy === 'urgency') {
      const urgencyScore = (u?: string) => {
        if (!u) return 1;
        const upper = u.toUpperCase();
        if (upper.includes('HOA_TOC') || upper.includes('HỎA TỐC')) return 4;
        if (upper.includes('THUONG_KHAN') || upper.includes('THƯỢNG KHẨN')) return 3;
        if (upper.includes('KHAN') || upper.includes('KHẨN')) return 2;
        return 1;
      };
      return urgencyScore(b.urgencyLevel) - urgencyScore(a.urgencyLevel);
    }
    return 0;
  });

  return (
    <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5 select-none">
      {/* Top Banner Tiêu đề & Action Buttons */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gov-primary-light/60 flex items-center justify-center text-gov-primary shadow-xs">
            <BarChart3 className="w-6 h-6 text-gov-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-gov-text">
                Dashboard Thống Kê & Báo Cáo Hồ Sơ Công Văn
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gov-primary/10 text-gov-primary border border-gov-primary/30">
                <Sparkles className="w-3 h-3" /> Nghị định 30/2020
              </span>
            </div>
            <p className="text-xs text-gov-text-secondary mt-0.5">
              Thống kê linh hoạt theo <strong>Tuần / Tháng</strong> • Phân tích cơ cấu trạng thái • Giám sát hạn SLA và vòng đời công vụ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút Ẩn / Hiện Biểu đồ */}
          <button
            type="button"
            onClick={() => setShowCharts(!showCharts)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all border ${showCharts
              ? 'bg-gov-subtle text-gov-primary border-gov-primary/30 shadow-2xs'
              : 'bg-white text-slate-600 border-gov-border hover:bg-slate-50'
              }`}
            title="Bật/Tắt hiển thị biểu đồ phân tích trực quan"
          >
            <PieChart className="w-4 h-4 text-gov-primary" />
            <span className="hidden sm:inline">{showCharts ? 'Thu gọn Biểu đồ' : 'Xem Biểu đồ'}</span>
          </button>

          {/* Nút Làm mới dữ liệu */}
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 sm:px-3 bg-white hover:bg-slate-50 text-slate-700 border border-gov-border rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition"
            title="Làm mới số liệu thống kê"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-gov-primary' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {/* Nút Xuất Excel theo đúng kỳ */}
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={isExportingExcel || records.length === 0}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            title="Xuất file Excel Sổ theo dõi văn bản đến/đi theo kỳ đã chọn"
          >
            {isExportingExcel ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Xuất Sổ Excel</span>
          </button>
        </div>
      </div>

      {/* THANH CHỌN KỲ BÁO CÁO LINH HOẠT (THEO THÁNG HOẶC THEO TUẦN) */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Nhóm chọn Chế độ: Theo Tháng vs Theo Tuần vs Toàn bộ vs Tùy chọn */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mr-1">
              <Calendar className="w-4 h-4 text-gov-primary" />
              <span>Kỳ thống kê:</span>
            </span>

            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setPeriodType('month')}
                className={`px-3 py-1.5 rounded-lg transition-all ${periodType === 'month'
                  ? 'bg-gov-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                📅 Theo Tháng
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('week')}
                className={`px-3 py-1.5 rounded-lg transition-all ${periodType === 'week'
                  ? 'bg-gov-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                📆 Theo Tuần
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${periodType === 'all'
                  ? 'bg-gov-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Toàn bộ
              </button>
              <button
                type="button"
                onClick={() => setPeriodType('custom')}
                className={`px-3 py-1.5 rounded-lg transition-all ${periodType === 'custom'
                  ? 'bg-gov-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                Tùy chọn
              </button>
            </div>

            {/* Chi tiết điều khiển khi chọn Theo Tháng */}
            {periodType === 'month' && (
              <div className="flex flex-wrap items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    setSelectedMonth(now.getMonth() + 1);
                    setSelectedYear(now.getFullYear());
                  }}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition ${selectedMonth === (new Date().getMonth() + 1) && selectedYear === new Date().getFullYear()
                    ? 'bg-gov-primary text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  Tháng này
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    let m = now.getMonth();
                    let y = now.getFullYear();
                    if (m === 0) {
                      m = 12;
                      y -= 1;
                    }
                    setSelectedMonth(m);
                    setSelectedYear(y);
                  }}
                  className="px-2.5 py-1 rounded-lg font-bold text-[11px] bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition"
                >
                  Tháng trước
                </button>

                <span className="text-slate-300 mx-0.5">|</span>

                {/* Dropdown Tháng */}
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      Tháng {m}
                    </option>
                  ))}
                </select>

                {/* Dropdown Năm */}
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 outline-none"
                >
                  {[2024, 2025, 2026, 2027].map((y) => (
                    <option key={y} value={y}>
                      Năm {y}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Chi tiết điều khiển khi chọn Theo Tuần */}
            {periodType === 'week' && (
              <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-xl border border-slate-200 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedWeekPreset('this_week')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${selectedWeekPreset === 'this_week'
                    ? 'bg-gov-primary text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  Tuần này
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedWeekPreset('last_week')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition ${selectedWeekPreset === 'last_week'
                    ? 'bg-gov-primary text-white'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  Tuần trước
                </button>
              </div>
            )}

            {/* Chi tiết điều khiển khi chọn Tùy chọn ngày */}
            {periodType === 'custom' && (
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-gov-border rounded-lg bg-white"
                />
                <span className="text-slate-400">→</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="px-2.5 py-1 text-xs border border-gov-border rounded-lg bg-white"
                />
                <button
                  type="button"
                  onClick={loadData}
                  className="px-3 py-1 bg-gov-primary text-white rounded-lg text-xs font-bold"
                >
                  Lọc
                </button>
              </div>
            )}
          </div>

          {/* Huy hiệu thông báo kỳ đang áp dụng */}
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
              📌 {statistics?.periodLabel || (periodType === 'month' ? `Tháng ${selectedMonth}/${selectedYear}` : 'Kỳ hiện tại')}
            </span>
          </div>
        </div>
      </div>

      {/* DASHBOARD CARDS: Thống kê báo cáo đa chiều trong kỳ đã chọn */}
      {statistics && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Card 1: Tổng tiếp nhận trong kỳ */}
          <div className="bg-white p-4 rounded-xl shadow-card border border-gov-border">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng công văn đến</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{statistics.totalReceived}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Tiếp nhận trong kỳ</div>
          </div>

          {/* Card 2: Chờ xử lý */}
          <div className="bg-white p-4 rounded-xl shadow-card border border-slate-200">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Chờ xử lý</div>
            <div className="text-2xl font-black text-slate-700 mt-1">{statistics.choXuLy}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Mới tiếp nhận / OCR</div>
          </div>

          {/* Card 3: Đang xử lý */}
          <div className="bg-white p-4 rounded-xl shadow-card border border-blue-200 bg-blue-50/20">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Đang xử lý</div>
            <div className="text-2xl font-black text-blue-800 mt-1">{statistics.dangXuLy}</div>
            <div className="text-[10px] text-blue-600 mt-0.5">Đang soạn thảo dự thảo</div>
          </div>

          {/* Card 4: Đã xử lý (chờ ký) */}
          <div className="bg-white p-4 rounded-xl shadow-card border border-amber-200 bg-amber-50/20">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Đã xử lý (chờ ký)</div>
            <div className="text-2xl font-black text-amber-800 mt-1">{statistics.daXuLy}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Đã chốt / xuất bản in</div>
          </div>

          {/* Card 5: Đã ký duyệt */}
          <div className="bg-white p-4 rounded-xl shadow-card border border-emerald-200 bg-emerald-50/20">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Đã ký duyệt</div>
            <div className="text-2xl font-black text-emerald-800 mt-1">{statistics.daKy}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Lãnh đạo đã ký ban hành</div>
          </div>

          {/* Card 6: Quá hạn SLA */}
          <div className="bg-white p-4 rounded-xl shadow-card border border-red-200 bg-red-50/20">
            <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
              Quá hạn SLA
            </div>
            <div className="text-2xl font-black text-red-700 mt-1">{statistics.overdueSla}</div>
            <div className="text-[10px] text-red-600 mt-0.5">
              Đúng hạn: <strong>{statistics.onTimeRate ?? 100}%</strong>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD CHARTS: Biểu đồ trực quan Donut trạng thái + Bar chart tiến độ + Đồng hồ SLA */}
      {showCharts && statistics && (
        <DashboardCharts
          statistics={statistics}
          periodLabel={statistics.periodLabel}
          onFilterByStatus={(st) => setStatusFilter(st === 'OVERDUE' ? 'ALL' : st)}
        />
      )}

      {/* FILTER & SEARCH BAR: Lọc trạng thái & Tìm kiếm hồ sơ */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Lọc theo Trạng thái */}
          <div className="flex items-center gap-1 bg-gov-subtle p-1 rounded-lg border border-gov-border text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-2">Trạng thái:</span>
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'CHO_XU_LY', label: 'Chờ xử lý' },
              { id: 'DANG_XU_LY', label: 'Đang xử lý' },
              { id: 'DA_XU_LY', label: 'Đã xử lý' },
              { id: 'DA_KY', label: 'Đã ký' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`px-2.5 py-1 rounded font-bold transition-all ${statusFilter === item.id
                  ? 'bg-gov-primary text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
                  }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Sắp xếp văn bản */}
          <div className="flex items-center gap-1 bg-gov-subtle p-1 rounded-lg border border-gov-border text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3 text-slate-400" />
              Sắp xếp:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded font-semibold text-slate-700 outline-none hover:border-gov-primary focus:border-gov-primary cursor-pointer text-xs"
            >
              <option value="newest">Mới nhất</option>
              <option value="status">Theo trạng thái</option>
              <option value="urgency">Theo độ khẩn cấp</option>
            </select>
          </div>
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-gov-text-disabled absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Số hiệu, trích yếu, cơ quan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gov-border focus:ring-2 focus:ring-gov-primary bg-white text-gov-text outline-none"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 rounded-xl bg-gov-primary hover:bg-gov-primary-hover text-white text-xs font-bold shadow-sm"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Thông báo Notification */}
      {notification && (
        <div className="bg-gov-active-bg border border-gov-active-border text-gov-active text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Table Content */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-visible">
        {loading ? (
          <div className="py-20 text-center text-gov-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-gov-primary" />
            <p className="text-xs font-semibold">Đang tải danh sách hồ sơ công vụ...</p>
          </div>
        ) : sortedRecords.length === 0 ? (
          <div className="py-20 text-center text-gov-text-secondary">
            <FileText className="w-12 h-12 mx-auto mb-3 text-gov-text-disabled/50" />
            <h4 className="text-sm font-bold text-gov-text">Chưa có hồ sơ văn bản nào phù hợp bộ lọc</h4>
            <p className="text-xs text-gov-text-secondary mt-1 max-w-md mx-auto">
              Vui lòng tiếp nhận và thẩm định công văn mới tại Bàn làm việc để lưu vết hồ sơ vào hệ thống.
            </p>
          </div>
        ) : (
          <>
            {/* PHIÊN BẢN DESKTOP: Bảng quản lý đầy đủ các cột */}
            <div className="hidden md:block overflow-x-auto min-h-[300px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-gov-subtle text-gov-text font-bold uppercase text-[11px] border-b border-gov-border">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[260px]">Số hiệu & Trích yếu</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[190px]">Văn bản Vào/Ra</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[120px] text-center">Ngày tiếp nhận</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px] text-center">Trạng thái hồ sơ</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[130px] text-center">Độ khẩn & Hạn SLA</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">Cán bộ xử lý</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px] text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gov-border">
                {sortedRecords.map((rec, index) => {
                  const isOverdue = rec.slaDeadline && new Date(rec.slaDeadline) < new Date() && rec.currentStatus !== 'DA_KY';
                  const isNearBottom = index >= sortedRecords.length - 2 && sortedRecords.length > 2;

                  return (
                    <tr key={rec.id} className="hover:bg-gov-subtle/50 transition-colors">
                      {/* Số hiệu & Trích yếu */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="font-bold text-gov-primary bg-gov-primary-light/50 px-2 py-0.5 rounded text-[11px]">
                            {rec.incomingDocCode || 'Chưa có số'}
                          </span>
                          {rec.isGoldSample && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300" title="Mẫu chuẩn vàng đã được công nhận">
                              <CheckCheck className="w-3 h-3 text-amber-700" />
                              Mẫu chuẩn
                            </span>
                          )}
                          {rec.outputFileName ? (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300" title="Đã thay thế kết quả bằng văn bản cán bộ tự xử lý">
                              <FileCheck2 className="w-3 h-3 text-emerald-700" />
                              Đã có bản ra thực tế
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              Bản soạn thảo hệ thống
                            </span>
                          )}
                        </div>
                        <div className="font-semibold text-gov-text line-clamp-2 max-w-sm" title={rec.subjectTitle || rec.originalFileName}>
                          {rec.subjectTitle || rec.originalFileName}
                        </div>
                        {rec.incomingIssuer && (
                          <div className="text-[11px] text-gov-text-secondary mt-1 flex items-center gap-1 truncate max-w-sm" title={rec.incomingIssuer}>
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{rec.incomingIssuer}</span>
                          </div>
                        )}
                      </td>

                      {/* Cột VĂN BẢN VÀO/RA */}
                      <td className="px-4 py-3">
                        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px] max-w-[240px]">
                          {/* Văn bản Vào */}
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-slate-600 font-medium flex items-center gap-1 truncate" title={rec.originalFileName}>
                              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 font-bold text-[9px] rounded shrink-0">VÀO</span>
                              <span className="truncate">{rec.originalFileName}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDownloadIncoming(rec.id, rec.originalFileName)}
                              className="text-blue-700 hover:text-blue-900 flex items-center gap-0.5 font-bold shrink-0 text-[10px] hover:underline"
                              title="Tải văn bản đầu vào gốc"
                            >
                              <Download className="w-2.5 h-2.5" /> Tải
                            </button>
                          </div>

                          {/* Văn bản Ra */}
                          {rec.outputFileName ? (
                            <div className="flex items-center justify-between gap-1.5 border-t border-slate-200/60 pt-1.5">
                              <span className="text-emerald-800 font-medium flex items-center gap-1 truncate" title={rec.outputFileName}>
                                <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold text-[9px] rounded shrink-0">RA</span>
                                <span className="truncate">{rec.outputFileName}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDownloadOutput(rec.id, rec.outputFileName)}
                                className="text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 font-bold shrink-0 text-[10px] hover:underline"
                                title="Tải văn bản đầu ra thực tế của cán bộ"
                              >
                                <Download className="w-2.5 h-2.5" /> Tải
                              </button>
                            </div>
                          ) : (
                            <div className="border-t border-slate-200/50 pt-1 text-[10px] text-slate-400 italic">
                              Chưa có văn bản ra
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Cột NGÀY TIẾP NHẬN */}
                      <td className="px-4 py-3 text-center">
                        <div className="font-semibold text-slate-800">
                          {new Date(rec.receivedDate || rec.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {new Date(rec.receivedDate || rec.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Trạng thái vòng đời hồ sơ */}
                      <td className="px-4 py-3 text-center">
                        {renderStatusBadge(rec.currentStatus, rec.signedDate)}
                      </td>

                      {/* Độ khẩn & Hạn SLA */}
                      <td className="px-4 py-3 text-center">
                        {rec.urgencyLevel && rec.urgencyLevel !== 'THUONG' && rec.urgencyLevel !== 'THƯỜNG' ? (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900 border border-red-200 mb-1">
                            {rec.urgencyLevel}
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 mb-1">
                            Thường
                          </span>
                        )}
                        <div className={`text-[11px] flex items-center justify-center gap-1 ${isOverdue ? 'text-red-700 font-bold' : 'text-slate-500'}`}>
                          <Clock className="w-3 h-3" />
                          <span>{rec.slaDeadline ? new Date(rec.slaDeadline).toLocaleDateString('vi-VN') : 'Không'}</span>
                        </div>
                      </td>

                      {/* Cán bộ thụ lý */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gov-text">{rec.userName}</div>
                        <div className="text-[11px] text-gov-text-secondary truncate max-w-[130px]">{rec.department}</div>
                      </td>

                      {/* Thao tác công vụ: Gộp toàn bộ vào nút 3 chấm với dropdown đầy đủ */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="relative inline-block text-left doc-action-menu">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdownId(activeDropdownId === rec.id ? null : rec.id);
                            }}
                            className={`p-1.5 px-2.5 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 shadow-2xs ${activeDropdownId === rec.id
                                ? 'bg-gov-primary text-white border-gov-primary'
                                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                              }`}
                            title="Tùy chọn thao tác hồ sơ"
                          >
                            <MoreVertical className="w-4 h-4" />
                            <span className="text-[11px] font-semibold hidden sm:inline">Thao tác</span>
                          </button>

                          {/* DROPDOWN MENU GỒM 4 OPTION CHÍNH THEO ĐÚNG YÊU CẦU */}
                          {activeDropdownId === rec.id && (
                            <div
                              className={`absolute right-0 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 text-left animate-in fade-in zoom-in-95 duration-100 ${isNearBottom ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
                                }`}
                            >
                              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                                Tùy chọn hồ sơ công vụ
                              </div>

                              {/* 1. NÚT XỬ LÝ (Đưa hồ sơ tới Bàn làm việc để xử lý và soạn thảo) */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleSendToWorkspace(rec);
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 flex items-start gap-2.5 transition text-left"
                              >
                                <Edit3 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="leading-snug">Xử lý hồ sơ</div>
                                  <div className="text-[10px] font-normal text-slate-500">
                                    Đưa hồ sơ tới bàn làm việc để xử lý & soạn thảo
                                  </div>
                                </div>
                              </button>

                              {/* 2. NÚT XEM LẠI NỘI DUNG VĂN BẢN ĐÃ ĐƯỢC XỬ LÝ */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleViewDetail(rec.id);
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-start gap-2.5 transition text-left"
                              >
                                <Eye className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="leading-snug">Xem lại nội dung</div>
                                  <div className="text-[10px] font-normal text-slate-500">
                                    Xem thể thức & văn bản đã xử lý chính thức
                                  </div>
                                </div>
                              </button>

                              {/* TẢI VĂN BẢN ĐẦU VÀO GỐC */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  handleDownloadIncoming(rec.id, rec.originalFileName);
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50 flex items-start gap-2.5 transition text-left"
                              >
                                <Download className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="leading-snug">Tải văn bản đầu vào gốc</div>
                                  <div className="text-[10px] font-normal text-slate-500 truncate max-w-[180px]">
                                    {rec.originalFileName}
                                  </div>
                                </div>
                              </button>

                              {/* TẢI VĂN BẢN ĐẦU RA THỰC TẾ */}
                              {rec.outputFileName && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleDownloadOutput(rec.id, rec.outputFileName);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50 flex items-start gap-2.5 transition text-left"
                                >
                                  <FileCheck2 className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="leading-snug">Tải văn bản đầu ra thực tế</div>
                                    <div className="text-[10px] font-normal text-emerald-600 truncate max-w-[180px]">
                                      {rec.outputFileName}
                                    </div>
                                  </div>
                                </button>
                              )}

                              {/* 3. NÚT CHỈNH SỬA HẠN SLA & ĐỘ KHẨN */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setEditSlaRecord(rec);
                                  setUrgencyInput(rec.urgencyLevel || 'THƯỜNG');
                                  setSlaDeadlineInput(rec.slaDeadline ? rec.slaDeadline.substring(0, 16) : '');
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50 flex items-start gap-2.5 transition text-left"
                              >
                                <Clock className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="leading-snug">Chỉnh sửa SLA & Mức độ khẩn</div>
                                  <div className="text-[10px] font-normal text-slate-500">
                                    Cập nhật mức độ khẩn hoặc hạn giải quyết
                                  </div>
                                </div>
                              </button>

                              {/* 3. NÚT KÝ DUYỆT (Cập nhật ký duyệt văn bản) */}
                              {rec.currentStatus !== 'DA_KY' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    setSignModalRecord(rec);
                                    setSignDateInput(new Date().toISOString().substring(0, 10));
                                  }}
                                  className="w-full px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 flex items-start gap-2.5 transition text-left"
                                >
                                  <CheckCheck className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="leading-snug">Ký duyệt văn bản</div>
                                    <div className="text-[10px] font-normal text-slate-500">
                                      Cập nhật ngày ký duyệt ban hành ngoài bản giấy
                                    </div>
                                  </div>
                                </button>
                              )}

                              {/* 4. OPTION MỞ LẠI ĐỂ XỬ LÝ LẠI (Nếu hồ sơ đã được xử lý xong) */}
                              {(rec.currentStatus === 'DA_XU_LY' || rec.currentStatus === 'DA_KY') && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveDropdownId(null);
                                    handleReopen(rec);
                                  }}
                                  className="w-full px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-50 flex items-start gap-2.5 transition text-left"
                                >
                                  <RotateCcw className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <div className="leading-snug">Mở lại để xử lý lại</div>
                                    <div className="text-[10px] font-normal text-slate-500">
                                      Chuyển về Đang xử lý để tiếp tục chỉnh sửa
                                    </div>
                                  </div>
                                </button>
                              )}

                              {/* 5. NÚT XÓA HỒ SƠ LƯU TRỮ */}
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveDropdownId(null);
                                  setDeleteTargetRecord(rec);
                                }}
                                className="w-full px-3 py-2 text-xs font-bold text-gov-danger hover:bg-red-50 flex items-start gap-2.5 transition text-left"
                              >
                                <Trash2 className="w-4 h-4 text-gov-danger mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="leading-snug">Xóa hồ sơ lưu trữ</div>
                                  <div className="text-[10px] font-normal text-slate-500">
                                    Dọn dẹp hồ sơ khỏi cơ sở dữ liệu
                                  </div>
                                </div>
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* PHIÊN BẢN MOBILE: Thẻ hồ sơ thông minh, không tràn ngang */}
          <div className="block md:hidden divide-y divide-slate-200">
            {sortedRecords.map((rec) => {
              const isOverdue = rec.slaDeadline && new Date(rec.slaDeadline) < new Date() && rec.currentStatus !== 'DA_KY';
              return (
                <div key={rec.id} className="p-4 space-y-2.5 bg-white hover:bg-slate-50 transition-colors">
                  {/* Dòng 1: Số hiệu + Mức độ + Trạng thái */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-gov-primary bg-gov-primary-light/50 px-2 py-0.5 rounded text-[11px]">
                        {rec.incomingDocCode || 'Chưa có số'}
                      </span>
                      {rec.urgencyLevel && rec.urgencyLevel !== 'THUONG' && rec.urgencyLevel !== 'THƯỜNG' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-900 border border-red-200">
                          {rec.urgencyLevel}
                        </span>
                      )}
                      {rec.isGoldSample && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Mẫu chuẩn
                        </span>
                      )}
                    </div>
                    {renderStatusBadge(rec.currentStatus, rec.signedDate)}
                  </div>

                  {/* Dòng 2: Trích yếu */}
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-relaxed">
                    {rec.subjectTitle || rec.originalFileName}
                  </h4>

                  {/* Cặp tệp Đến và Đi trên Mobile */}
                  <div className="bg-slate-50 p-2 rounded border border-slate-200/80 text-[11px] space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-slate-600 truncate max-w-[200px]" title={rec.originalFileName}>
                        <span className="font-bold text-blue-700 mr-1">[Vào]</span>{rec.originalFileName}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadIncoming(rec.id, rec.originalFileName)}
                        className="text-blue-700 font-bold flex items-center gap-0.5 shrink-0 text-[10px]"
                      >
                        <Download className="w-3 h-3" /> Tải
                      </button>
                    </div>
                    {rec.outputFileName && (
                      <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200/60">
                        <span className="text-emerald-800 truncate max-w-[200px]" title={rec.outputFileName}>
                          <span className="font-bold text-emerald-700 mr-1">[Ra]</span>{rec.outputFileName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDownloadOutput(rec.id, rec.outputFileName)}
                          className="text-emerald-700 font-bold flex items-center gap-0.5 shrink-0 text-[10px]"
                        >
                          <Download className="w-3 h-3" /> Tải
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Dòng 3: Đơn vị + Hạn SLA */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div className="flex items-center gap-1 truncate">
                      <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{rec.incomingIssuer || 'Chưa rõ đơn vị'}</span>
                    </div>
                    <div className={`flex items-center gap-1 justify-end ${isOverdue ? 'text-red-700 font-bold' : ''}`}>
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span>Hạn: {rec.slaDeadline ? new Date(rec.slaDeadline).toLocaleDateString('vi-VN') : 'Không'}</span>
                    </div>
                  </div>

                  {/* Dòng 4: Hàng nút bấm thao tác nhanh trên Mobile */}
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleViewDetail(rec.id)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Xem</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendToWorkspace(rec)}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Xử lý</span>
                    </button>

                    {rec.currentStatus !== 'DA_KY' && (
                      <button
                        type="button"
                        onClick={() => {
                          setSignModalRecord(rec);
                          setSignDateInput(new Date().toISOString().substring(0, 10));
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold flex items-center gap-1"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Ký duyệt</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setEditSlaRecord(rec);
                        setUrgencyInput(rec.urgencyLevel || 'THƯỜNG');
                        setSlaDeadlineInput(rec.slaDeadline ? rec.slaDeadline.substring(0, 16) : '');
                      }}
                      className="p-1.5 text-indigo-700 hover:bg-indigo-50 rounded-lg"
                      title="Sửa hạn SLA"
                    >
                      <Clock className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTargetRecord(rec)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      </div>

      {/* Modal Xóa hồ sơ lưu trữ (Kiểm tra khóa ngoại 2 cấp) */}
      <SmartDeleteConfirmModal
        isOpen={!!deleteTargetRecord}
        onClose={() => setDeleteTargetRecord(null)}
        onConfirm={handleExecuteDeleteRecord}
        title="Xác nhận xóa hồ sơ công văn lưu trữ"
        itemName={deleteTargetRecord ? `${deleteTargetRecord.incomingDocCode || deleteTargetRecord.originalFileName} - ${deleteTargetRecord.subjectTitle || 'Không có trích yếu'}` : ''}
        itemTypeLabel="Hồ sơ văn bản đã xử lý"
      />

      {/* Modal Cập nhật Ngày Ký duyệt */}
      {signModalRecord && (
        <div className="fixed inset-0 !m-0 z-50 overflow-y-auto w-full h-full min-h-screen bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gov-border animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gov-border">
              <div className="flex items-center gap-2">
                <CheckCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-gov-text uppercase">
                  Xác nhận ký duyệt công văn
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSignModalRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Văn bản:</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {signModalRecord.incomingDocCode || signModalRecord.originalFileName}
                </span>
                <span className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                  {signModalRecord.subjectTitle || 'Không có trích yếu'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày ký duyệt:</label>
                <input
                  type="date"
                  value={signDateInput}
                  onChange={(e) => setSignDateInput(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gov-border">
              <button
                type="button"
                onClick={() => setSignModalRecord(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmSign}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg shadow-sm"
              >
                Xác nhận đã ký duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa Thời hạn SLA & Mức độ hồ sơ */}
      {editSlaRecord && (
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
                onClick={() => setEditSlaRecord(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-slate-500 block">Hồ sơ công văn:</span>
                <span className="font-bold text-slate-900 block mt-0.5">
                  {editSlaRecord.incomingDocCode || editSlaRecord.originalFileName}
                </span>
                <span className="text-[11px] text-slate-600 line-clamp-2 mt-1">
                  {editSlaRecord.subjectTitle || 'Không có trích yếu'}
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
                  Hệ thống sẽ dựa vào mốc thời gian này để cảnh báo hồ sơ đến hạn và quá hạn trên Radar SLA.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gov-border">
              <button
                type="button"
                onClick={() => setEditSlaRecord(null)}
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

      {/* Modal Chi tiết Hồ sơ: Quản lý song song Văn bản Đầu vào & Đầu ra Thực tế */}
      {selectedRecord && (
        <div className="fixed inset-0 !m-0 z-50 overflow-y-auto w-full h-full min-h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gov-border">
            {/* Header Modal */}
            <div className="p-4 border-b border-gov-border flex items-center justify-between bg-gov-subtle">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-gov-primary" />
                <div>
                  <h3 className="text-sm font-bold text-gov-text uppercase">
                    Hồ sơ công vụ: {selectedRecord.incomingDocCode || selectedRecord.originalFileName}
                  </h3>
                  <p className="text-[11px] text-gov-text-secondary">
                    Quản lý cặp văn bản Đầu vào (Đến) & Đầu ra thực tế (Đi) đã xử lý
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              {/* Thanh thông tin trạng thái & cán bộ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[11px]">Trạng thái hồ sơ:</span>
                  <div className="mt-1">{renderStatusBadge(selectedRecord.currentStatus)}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Cán bộ phụ trách:</span>
                  <div className="font-semibold text-slate-800 mt-1">{selectedRecord.userName}</div>
                  <div className="text-[10px] text-slate-500 truncate">{selectedRecord.department}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Ngày tiếp nhận:</span>
                  <div className="font-semibold text-slate-800 mt-1">{new Date(selectedRecord.receivedDate).toLocaleDateString('vi-VN')}</div>
                  <div className="text-[10px] text-slate-500">{new Date(selectedRecord.receivedDate).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Ngày ký ban hành:</span>
                  <div className="font-semibold text-emerald-800 mt-1">
                    {selectedRecord.signedDate ? new Date(selectedRecord.signedDate).toLocaleDateString('vi-VN') : 'Chưa ký ngoài giấy'}
                  </div>
                </div>
              </div>

              {/* KHỐI 1: VĂN BẢN ĐẦU VÀO (VĂN BẢN ĐẾN GỐC) */}
              <div className="border border-blue-200 bg-blue-50/40 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-blue-600 text-white font-bold text-[10px] rounded uppercase tracking-wider">
                      Văn bản đầu vào (Đến)
                    </span>
                    <span className="font-bold text-blue-950 text-xs">
                      {selectedRecord.incomingDocCode || 'Chưa vào số'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadIncoming(selectedRecord.id, selectedRecord.originalFileName)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải tệp đầu vào gốc</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-slate-500 font-medium">Cơ quan ban hành: </span>
                    <span className="font-bold text-slate-800">{selectedRecord.incomingIssuer || 'Chưa rõ đơn vị'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-medium">Tệp đính kèm: </span>
                    <span className="font-mono text-slate-700">{selectedRecord.originalFileName}</span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500 font-medium">Trích yếu: </span>
                    <span className="font-medium text-slate-900">{selectedRecord.subjectTitle || selectedRecord.originalFileName}</span>
                  </div>
                </div>
              </div>

              {/* KHỐI 2: VĂN BẢN ĐẦU RA THỰC TẾ (ĐÃ XỬ LÝ / VĂN BẢN ĐI) */}
              <div className="border border-emerald-300 bg-emerald-50/30 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-emerald-700 text-white font-bold text-[10px] rounded uppercase tracking-wider">
                      Văn bản đầu ra thực tế (Đi)
                    </span>
                    {selectedRecord.outputFileName ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Đã tải lên văn bản cán bộ tự xử lý
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-white px-2 py-0.5 rounded-full border border-slate-300">
                        Bản soạn thảo chính thức do cán bộ chốt
                      </span>
                    )}
                  </div>

                  {selectedRecord.outputFileName ? (
                    <button
                      type="button"
                      onClick={() => handleDownloadOutput(selectedRecord.id, selectedRecord.outputFileName)}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải văn bản đầu ra thực tế ({selectedRecord.outputFileName})</span>
                    </button>
                  ) : null}
                </div>

                {selectedRecord.outputFileName && (
                  <div className="mb-3 text-[11px] text-emerald-900 bg-emerald-100/70 p-2.5 rounded-lg border border-emerald-200 flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span>
                      Tệp lưu trữ chính thức: <strong className="font-mono">{selectedRecord.outputFileName}</strong>.
                      Kết quả này đã được cán bộ duyệt và thay thế hoàn toàn dự thảo AI ban đầu.
                    </span>
                  </div>
                )}

                {/* Khung trực quan bản văn bản đầu ra chính thức */}
                {selectedRecord.draftContentHtml ? (
                  <div>
                    <div className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Nội dung văn bản đầu ra chính thức:</span>
                      <span className="text-[10px] text-slate-500 font-normal">Định dạng chuẩn thể thức hành chính Nghị định 30/2020/NĐ-CP</span>
                    </div>
                    <div
                      className="p-5 bg-white border border-slate-300 rounded-lg max-h-80 overflow-y-auto text-justify leading-relaxed shadow-xs"
                      dangerouslySetInnerHTML={{ __html: selectedRecord.draftContentHtml }}
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-200 rounded-lg text-center text-slate-500 italic">
                    Chưa có nội dung bản soạn thảo được lưu.
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-gov-border flex items-center justify-between bg-gov-subtle">
              <button
                type="button"
                onClick={() => {
                  const rec = selectedRecord;
                  setSelectedRecord(null);
                  handleSendToWorkspace(rec);
                }}
                className="px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Mở trong Bàn làm việc</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
