import React, { useState, useEffect, useMemo } from 'react';
import {
  History,
  ArrowLeft,
  RefreshCw,
  Search,
  Filter,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  User,
  Building,
  CheckCheck,
  RotateCcw,
  Download,
  Calendar,
  Layers,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { ProcessingLogItem } from '../types';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ActionConfirmModal } from '../components/common/ActionConfirmModal';

interface AuditLogPageProps {
  onBackToWorkspace: () => void;
}

export const AuditLogPage: React.FC<AuditLogPageProps> = ({
  onBackToWorkspace,
}) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ProcessingLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [timeFilter, setTimeFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modal xác nhận xóa nhật ký (Dành riêng cho ADMIN)
  const [deleteTargetLog, setDeleteTargetLog] = useState<ProcessingLogItem | null>(null);
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getProcessingLogs();
      setLogs(res || []);
    } catch (err: any) {
      console.error(err);
      setNotification('Không thể tải dữ liệu nhật ký công vụ.');
    } finally {
      setLoading(false);
    }
  };

  // Lọc dữ liệu nhật ký đa tiêu chí
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // 1. Tìm kiếm chuỗi
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchCode = log.incomingDocCode?.toLowerCase().includes(q) || false;
        const matchTitle = log.subjectTitle?.toLowerCase().includes(q) || false;
        const matchFile = log.originalFileName.toLowerCase().includes(q);
        const matchIssuer = log.incomingIssuer?.toLowerCase().includes(q) || false;
        const matchUser = log.userName.toLowerCase().includes(q);
        if (!matchCode && !matchTitle && !matchFile && !matchIssuer && !matchUser) {
          return false;
        }
      }

      // 2. Lọc mức độ khẩn
      if (urgencyFilter !== 'ALL') {
        const logUrgency = log.urgencyLevel?.toUpperCase() || 'THƯỜNG';
        if (urgencyFilter === 'HOA_TOC' && !logUrgency.includes('HỎA TỐC')) return false;
        if (urgencyFilter === 'THUONG_KHAN' && !logUrgency.includes('THƯỢNG KHẨN')) return false;
        if (urgencyFilter === 'KHAN' && logUrgency !== 'KHẨN') return false;
        if (urgencyFilter === 'THUONG' && logUrgency !== 'THƯỜNG' && logUrgency !== 'THUONG') return false;
      }

      // 3. Lọc trạng thái hồ sơ
      if (statusFilter !== 'ALL') {
        if (log.currentStatus !== statusFilter) return false;
      }

      // 4. Lọc thời gian
      if (timeFilter !== 'ALL') {
        const logDate = new Date(log.createdAt);
        const now = new Date();
        if (timeFilter === 'today') {
          if (
            logDate.getDate() !== now.getDate() ||
            logDate.getMonth() !== now.getMonth() ||
            logDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        } else if (timeFilter === 'this_week') {
          const oneWeekAgo = new Date();
          oneWeekAgo.setDate(now.getDate() - 7);
          if (logDate < oneWeekAgo) return false;
        } else if (timeFilter === 'this_month') {
          if (
            logDate.getMonth() !== now.getMonth() ||
            logDate.getFullYear() !== now.getFullYear()
          ) {
            return false;
          }
        }
      }

      return true;
    });
  }, [logs, search, urgencyFilter, statusFilter, timeFilter]);

  // Thống kê nhanh KPI
  const stats = useMemo(() => {
    const total = logs.length;
    const urgentCount = logs.filter((l) =>
      l.urgencyLevel === 'HỎA TỐC' || l.urgencyLevel === 'THƯỢNG KHẨN'
    ).length;
    const signedCount = logs.filter((l) => l.currentStatus === 'DA_KY').length;
    const inProgressCount = logs.filter((l) => l.currentStatus === 'DANG_XU_LY').length;
    return { total, urgentCount, signedCount, inProgressCount };
  }, [logs]);

  // Xóa 1 bản ghi nhật ký (Chỉ ADMIN)
  const handleConfirmDeleteSingle = async () => {
    if (!deleteTargetLog) return;
    try {
      setIsDeleting(true);
      await api.deleteAuditLog(deleteTargetLog.id);
      setNotification(`Đã xóa bản ghi nhật ký ${deleteTargetLog.incomingDocCode || deleteTargetLog.originalFileName} thành công.`);
      setDeleteTargetLog(null);
      await loadLogs();
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể xóa bản ghi nhật ký.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Xóa toàn bộ nhật ký thao tác (Chỉ ADMIN)
  const handleConfirmClearAll = async () => {
    try {
      setIsDeleting(true);
      const res = await api.clearAllAuditLogs();
      setNotification(res.message || 'Đã dọn sạch toàn bộ nhật ký thao tác thành công.');
      setIsClearAllModalOpen(false);
      await loadLogs();
    } catch (err: any) {
      console.error(err);
      setNotification(err?.response?.data?.message || 'Không thể xóa sạch nhật ký.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Xuất file CSV nhật ký
  const handleExportCsv = () => {
    try {
      if (filteredLogs.length === 0) return;
      const headers = ['Thời gian', 'Số hiệu', 'Trích yếu', 'Cơ quan gửi', 'Mức độ khẩn', 'Trạng thái', 'Cán bộ xử lý', 'Hạn SLA'];
      const rows = filteredLogs.map((l) => [
        new Date(l.createdAt).toLocaleString('vi-VN'),
        `"${(l.incomingDocCode || '').replace(/"/g, '""')}"`,
        `"${(l.subjectTitle || l.originalFileName).replace(/"/g, '""')}"`,
        `"${(l.incomingIssuer || '').replace(/"/g, '""')}"`,
        l.urgencyLevel || 'THƯỜNG',
        l.currentStatus || '',
        `"${l.userName.replace(/"/g, '""')}"`,
        l.slaDeadline ? new Date(l.slaDeadline).toLocaleDateString('vi-VN') : 'Không'
      ]);

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `NhatKy_CongVan_${new Date().toISOString().substring(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setNotification('Đã xuất thành công tệp nhật ký xử lý (.csv)!');
    } catch (err) {
      console.error(err);
      setNotification('Lỗi khi xuất tệp dữ liệu nhật ký.');
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'CHO_XU_LY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300">
            <Clock className="w-3 h-3 text-slate-500" /> Chờ xử lý
          </span>
        );
      case 'DANG_XU_LY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-300">
            <Clock className="w-3 h-3 text-blue-600" /> Đang xử lý
          </span>
        );
      case 'DA_XU_LY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-600" /> Đã xử lý (chờ ký)
          </span>
        );
      case 'DA_KY':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCheck className="w-3 h-3 text-emerald-600" /> Đã ký duyệt
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="max-w-[1920px] mx-auto p-4 sm:p-6 lg:p-8 space-y-5 select-none">
      {/* 1. TOP BANNER TIÊU ĐỀ & ACTIONS */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gov-primary-light/60 flex items-center justify-center text-gov-primary shadow-xs">
            <History className="w-6 h-6 text-gov-primary" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider text-gov-text">
                Nhật Ký Thao Tác & Lịch Sử Hoạt Động Người Dùng
              </h2>
            </div>
            <p className="text-xs text-gov-text-secondary mt-0.5">
              Ghi nhận dòng thời gian tác nghiệp, tài khoản thao tác, tệp xử lý và phương án hành động để phục vụ truy vết công vụ.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Nút Xóa toàn bộ nhật ký (DÀNH RIÊNG CHO ADMIN) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsClearAllModalOpen(true)}
              disabled={logs.length === 0 || loading}
              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-gov-danger rounded-xl text-xs font-bold flex items-center gap-2 border border-red-200 transition shadow-2xs disabled:opacity-50"
              title="Xóa toàn bộ lịch sử thao tác hệ thống (Chỉ Quản trị viên)"
            >
              <Trash2 className="w-4 h-4 text-gov-danger" />
              <span>Xóa sạch nhật ký</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-300 transition shadow-2xs disabled:opacity-50"
            title="Xuất danh sách nhật ký ra tệp CSV"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Xuất Nhật ký (.csv)</span>
          </button>

          <button
            type="button"
            onClick={loadLogs}
            disabled={loading}
            className="px-3.5 py-2 bg-gov-primary hover:bg-gov-primary-hover text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* 2. THẺ CHỈ SỐ KPI TỔNG QUAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-xl shadow-card border border-gov-border">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng lượt thao tác</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Bản ghi hệ thống ghi nhận</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-card border border-red-200 bg-red-50/20">
          <div className="text-[11px] font-bold text-red-700 uppercase tracking-wider">Văn bản Hỏa tốc / Khẩn</div>
          <div className="text-2xl font-black text-red-900 mt-1">{stats.urgentCount}</div>
          <div className="text-[10px] text-red-600 mt-0.5">Yêu cầu xử lý ưu tiên</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-card border border-blue-200 bg-blue-50/20">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Đang thụ lý xử lý</div>
          <div className="text-2xl font-black text-blue-900 mt-1">{stats.inProgressCount}</div>
          <div className="text-[10px] text-blue-600 mt-0.5">Đang soạn thảo & thẩm định</div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-card border border-emerald-200 bg-emerald-50/20">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Đã hoàn tất ký duyệt</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{stats.signedCount}</div>
          <div className="text-[10px] text-emerald-600 mt-0.5">Đã ban hành chính thức</div>
        </div>
      </div>

      {/* THÔNG BÁO TỨC THỜI */}
      {notification && (
        <div className="bg-gov-active-bg border border-gov-active-border text-gov-active text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{notification}</span>
          </div>
          <button type="button" onClick={() => setNotification(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* 3. THANH TÌM KIẾM & BỘ LỌC ĐA NĂNG */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo số hiệu, trích yếu, cán bộ, cơ quan..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-gov-primary bg-white text-slate-800 outline-none"
            />
          </div>

          {/* Lọc Mức độ khẩn */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-gov-primary"
          >
            <option value="ALL">Mức độ khẩn: Tất cả</option>
            <option value="HOA_TOC">Hỏa tốc</option>
            <option value="THUONG_KHAN">Thượng khẩn</option>
            <option value="KHAN">Khẩn</option>
            <option value="THUONG">Thường</option>
          </select>

          {/* Lọc Trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-gov-primary"
          >
            <option value="ALL">Trạng thái: Tất cả</option>
            <option value="CHO_XU_LY">Chờ xử lý</option>
            <option value="DANG_XU_LY">Đang xử lý</option>
            <option value="DA_XU_LY">Đã xử lý (chờ ký)</option>
            <option value="DA_KY">Đã ký duyệt</option>
          </select>

          {/* Lọc Thời gian */}
          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-gov-primary"
          >
            <option value="ALL">Kỳ báo cáo: Toàn bộ</option>
            <option value="today">Hôm nay</option>
            <option value="this_week">7 ngày qua</option>
            <option value="this_month">Tháng này</option>
          </select>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <strong>{filteredLogs.length}</strong> / {logs.length} bản ghi
        </div>
      </div>

      {/* 4. BẢNG DỮ LIỆU NHẬT KÝ CHI TIẾT (FULL PAGE, KHÔNG SỬ DỤNG MODAL) */}
      <div className="bg-white rounded-xl shadow-card border border-gov-border overflow-hidden">
        {loading ? (
          <div className="py-24 text-center text-gov-text-secondary">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gov-primary" />
            <p className="text-xs font-semibold">Đang truy xuất dữ liệu nhật ký công vụ...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-24 text-center text-slate-400">
            <History className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h4 className="text-sm font-bold text-slate-700">Không tìm thấy bản ghi nhật ký phù hợp</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Vui lòng điều chỉnh lại bộ lọc tìm kiếm hoặc tiếp nhận thêm hồ sơ mới tại Bàn làm việc.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gov-subtle text-gov-text font-bold uppercase text-[11px] border-b border-gov-border">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">Thời điểm ghi nhận</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[280px]">Số hiệu & Trích yếu thao tác</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[170px]">Cơ quan ban hành</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[120px] text-center">Độ khẩn</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px] text-center">Trạng thái hồ sơ</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[150px]">Cán bộ thực hiện</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[120px] text-center">Hạn SLA</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[120px] text-right">
                    {isAdmin ? 'Chi tiết / Xóa' : 'Chi tiết'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  const isOverdue = log.slaDeadline && new Date(log.slaDeadline) < new Date() && log.currentStatus !== 'DA_KY';
                  const logDate = new Date(log.createdAt);

                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`hover:bg-slate-50 transition-colors ${isExpanded ? 'bg-slate-50/80 font-medium' : ''}`}>
                        {/* Thời điểm ghi nhận */}
                        <td className="px-4 py-3 text-slate-800 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            {logDate.toLocaleDateString('vi-VN')}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {logDate.toLocaleTimeString('vi-VN')}
                          </div>
                        </td>

                        {/* Số hiệu & Trích yếu */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                            <span className="font-bold text-gov-primary bg-gov-primary-light/50 px-2 py-0.5 rounded text-[11px]">
                              {log.incomingDocCode || 'Chưa nhận diện số'}
                            </span>
                            {log.isOwner && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                                Của tôi
                              </span>
                            )}
                          </div>
                          <div
                            className="font-semibold text-slate-800 line-clamp-2 max-w-md leading-relaxed"
                            title={log.subjectTitle || log.originalFileName}
                          >
                            {log.subjectTitle || log.originalFileName}
                          </div>
                        </td>

                        {/* Cơ quan ban hành */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span className="truncate max-w-[160px]" title={log.incomingIssuer || 'Chưa rõ đơn vị'}>
                              {log.incomingIssuer || 'Chưa rõ đơn vị'}
                            </span>
                          </div>
                        </td>

                        {/* Mức độ khẩn */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold ${log.urgencyLevel === 'HỎA TỐC'
                                ? 'bg-red-100 text-red-900 border border-red-300'
                                : log.urgencyLevel === 'THƯỢNG KHẨN'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : log.urgencyLevel === 'KHẨN'
                                    ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                                    : 'bg-slate-100 text-slate-700 border border-slate-300'
                              }`}
                          >
                            {log.urgencyLevel || 'THƯỜNG'}
                          </span>
                        </td>

                        {/* Trạng thái hồ sơ */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {renderStatusBadge(log.currentStatus)}
                        </td>

                        {/* Cán bộ thụ lý */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-bold text-slate-800 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {log.userName}
                          </div>
                        </td>

                        {/* Hạn SLA */}
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <div className={`font-semibold ${isOverdue ? 'text-red-700 font-bold' : 'text-slate-600'}`}>
                            {log.slaDeadline ? new Date(log.slaDeadline).toLocaleDateString('vi-VN') : 'Không SLA'}
                          </div>
                          {isOverdue && (
                            <span className="text-[10px] text-red-600 font-bold block">Quá hạn SLA</span>
                          )}
                        </td>

                        {/* Thao tác Xem chi tiết & Xóa nhật ký (chỉ Admin) */}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className={`p-1.5 rounded-lg border text-xs font-bold transition flex items-center gap-1 ${isExpanded
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              title="Xem vết chi tiết thao tác"
                            >
                              <span className="text-[11px]">{isExpanded ? 'Đóng' : 'Xem'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Nút Xóa bản ghi (Dành riêng cho ADMIN) */}
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => setDeleteTargetLog(log)}
                                className="p-1.5 text-gov-danger hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 transition"
                                title="Xóa bản ghi nhật ký này (Chỉ Admin)"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* KHUNG MỞ RỘNG TẠI CHỖ (CHỈ HIỂN THỊ THÔNG TIN VẾT THAO TÁC, KHÔNG PHẢI MỞ HỒ SƠ) */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-slate-200">
                          <td colSpan={8} className="p-4 pl-8">
                            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs space-y-3">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-gov-primary" />
                                  <span className="text-xs font-bold text-slate-800 uppercase">
                                    Chi tiết vết nhật ký thao tác • ID: {log.id}
                                  </span>
                                </div>
                                <span className="text-[11px] font-semibold text-slate-500">
                                  Ghi nhận tự động từ luồng tiếp nhận & thẩm định
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Tệp đính kèm thao tác</span>
                                  <span className="font-semibold text-slate-800 break-all">{log.originalFileName}</span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Phương án hành động ghi nhận</span>
                                  <span className="font-semibold text-slate-800">{log.selectedOptionId || 'Chưa chọn phương án'}</span>
                                </div>
                                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Trạng thái tại thời điểm ghi</span>
                                  <span className="font-semibold text-slate-800">
                                    {log.currentStatus}
                                  </span>
                                </div>
                              </div>

                              <div>
                                <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                  Trích yếu nội dung ghi nhận:
                                </span>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-700 leading-relaxed text-justify">
                                  {log.subjectTitle || 'Không có trích yếu nội dung.'}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Xác nhận Xóa 1 bản ghi nhật ký (Chỉ Admin) */}
      <ActionConfirmModal
        isOpen={!!deleteTargetLog}
        onClose={() => setDeleteTargetLog(null)}
        onConfirm={handleConfirmDeleteSingle}
        title="Xác nhận xóa bản ghi nhật ký thao tác"
        message="Đồng chí có chắc chắn muốn xóa bản ghi nhật ký này khỏi hệ thống audit log không?"
        detail={deleteTargetLog ? `Bản ghi: ${deleteTargetLog.incomingDocCode || deleteTargetLog.originalFileName} (${deleteTargetLog.userName} - ${new Date(deleteTargetLog.createdAt).toLocaleString('vi-VN')})` : ''}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        type="danger"
        isLoading={isDeleting}
      />

      {/* Modal Xác nhận Xóa toàn bộ nhật ký (Chỉ Admin) */}
      <ActionConfirmModal
        isOpen={isClearAllModalOpen}
        onClose={() => setIsClearAllModalOpen(false)}
        onConfirm={handleConfirmClearAll}
        title="CẢNH BÁO: Xóa toàn bộ nhật ký thao tác"
        message="Hành động này sẽ dọn sạch toàn bộ lịch sử thao tác của tất cả cán bộ trong hệ thống. Thao tác này không thể hoàn tác!"
        detail={`Tổng số bản ghi sẽ bị xóa: ${logs.length} bản ghi.`}
        confirmText="Xóa sạch toàn bộ"
        cancelText="Hủy bỏ"
        type="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};

export default AuditLogPage;
