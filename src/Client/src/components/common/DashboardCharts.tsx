import React, { useState } from 'react';
import {
  PieChart,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldCheck,
  FileText,
  FileCheck2,
  Zap,
  Flame
} from 'lucide-react';
import { DocumentStatistics, DailyChartPoint } from '../../types';

interface DashboardChartsProps {
  statistics: DocumentStatistics;
  periodLabel?: string;
  onFilterByStatus?: (status: string) => void;
  isMobile?: boolean;
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  statistics,
  periodLabel,
  onFilterByStatus,
  isMobile = false
}) => {
  const [activeTooltip, setActiveTooltip] = useState<{
    x: number;
    y: number;
    label: string;
    value: number;
    percent?: string;
    extra?: string;
  } | null>(null);

  const [activeSlice, setActiveSlice] = useState<string | null>(null);

  const total = statistics.totalReceived || 0;
  const choXuLy = statistics.choXuLy || 0;
  const dangXuLy = statistics.dangXuLy || 0;
  const daXuLy = statistics.daXuLy || 0;
  const daKy = statistics.daKy || 0;
  const overdue = statistics.overdueSla || 0;
  const onTimeRate = statistics.onTimeRate ?? (total > 0 ? Math.round(((total - overdue) * 100) / total) : 100);

  // Dữ liệu cho Donut Chart
  const statusSlices = [
    { id: 'CHO_XU_LY', label: 'Chờ xử lý', count: choXuLy, color: '#64748b', textColor: 'text-slate-600', bgBadge: 'bg-slate-100' },
    { id: 'DANG_XU_LY', label: 'Đang xử lý', count: dangXuLy, color: '#2563eb', textColor: 'text-blue-600', bgBadge: 'bg-blue-100' },
    { id: 'DA_XU_LY', label: 'Đã xử lý (chờ ký)', count: daXuLy, color: '#d97706', textColor: 'text-amber-600', bgBadge: 'bg-amber-100' },
    { id: 'DA_KY', label: 'Đã ký duyệt', count: daKy, color: '#059669', textColor: 'text-emerald-600', bgBadge: 'bg-emerald-100' },
    { id: 'OVERDUE', label: 'Quá hạn SLA', count: overdue, color: '#dc2626', textColor: 'text-rose-600', bgBadge: 'bg-rose-100' },
  ].filter((s) => s.count > 0 || total === 0);

  // Tính toán góc cho SVG Donut Chart
  const radius = 64;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  // Dữ liệu Timeline Bar Chart
  const timeline: DailyChartPoint[] = statistics.timelineBreakdown && statistics.timelineBreakdown.length > 0
    ? statistics.timelineBreakdown
    : [
        { label: 'Thứ 2', dateKey: '1', receivedCount: Math.ceil(total * 0.15), processedCount: Math.ceil(daKy * 0.1), signedCount: Math.ceil(daKy * 0.1), overdueCount: 0 },
        { label: 'Thứ 3', dateKey: '2', receivedCount: Math.ceil(total * 0.25), processedCount: Math.ceil(daKy * 0.2), signedCount: Math.ceil(daKy * 0.15), overdueCount: 0 },
        { label: 'Thứ 4', dateKey: '3', receivedCount: Math.ceil(total * 0.2), processedCount: Math.ceil(daKy * 0.25), signedCount: Math.ceil(daKy * 0.25), overdueCount: 0 },
        { label: 'Thứ 5', dateKey: '4', receivedCount: Math.ceil(total * 0.18), processedCount: Math.ceil(daKy * 0.2), signedCount: Math.ceil(daKy * 0.2), overdueCount: 0 },
        { label: 'Thứ 6', dateKey: '5', receivedCount: Math.ceil(total * 0.12), processedCount: Math.ceil(daKy * 0.15), signedCount: Math.ceil(daKy * 0.15), overdueCount: 0 },
        { label: 'Thứ 7', dateKey: '6', receivedCount: Math.ceil(total * 0.06), processedCount: Math.ceil(daKy * 0.05), signedCount: Math.ceil(daKy * 0.05), overdueCount: 0 },
        { label: 'CN', dateKey: '7', receivedCount: Math.ceil(total * 0.04), processedCount: Math.ceil(daKy * 0.05), signedCount: Math.ceil(daKy * 0.05), overdueCount: 0 },
      ];

  const maxBarValue = Math.max(1, ...timeline.map((t) => Math.max(t.receivedCount, t.processedCount, t.signedCount)));

  return (
    <div className="space-y-4">
      {/* KHUNG THỐNG KÊ CHI TIẾT & BIỂU ĐỒ TRỰC QUAN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* CHART 1: Donut Chart phân bổ trạng thái (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-4 sm:p-5 rounded-2xl shadow-card border border-gov-border flex flex-col justify-between">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Cơ Cấu Trạng Thái Văn Bản
              </h4>
            </div>
            {periodLabel && (
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                {periodLabel}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-4">
            {/* SVG Donut */}
            <div className="relative w-40 h-40 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 160 160">
                <circle
                  cx="80"
                  cy="80"
                  r={radius}
                  className="text-slate-100"
                  strokeWidth={strokeWidth}
                  stroke="currentColor"
                  fill="transparent"
                />
                {total === 0 ? (
                  <circle
                    cx="80"
                    cy="80"
                    r={radius}
                    className="text-slate-200"
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                  />
                ) : (
                  statusSlices.map((slice) => {
                    const percent = slice.count / total;
                    const strokeDasharray = `${percent * circumference} ${circumference}`;
                    const strokeDashoffset = -accumulatedPercent * circumference;
                    accumulatedPercent += percent;

                    const isHovered = activeSlice === slice.id;

                    return (
                      <circle
                        key={slice.id}
                        cx="80"
                        cy="80"
                        r={radius}
                        stroke={slice.color}
                        strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                        strokeDasharray={strokeDasharray}
                        strokeDashoffset={strokeDashoffset}
                        fill="transparent"
                        className="transition-all duration-300 cursor-pointer"
                        onMouseEnter={() => setActiveSlice(slice.id)}
                        onMouseLeave={() => setActiveSlice(null)}
                        onClick={() => onFilterByStatus && onFilterByStatus(slice.id)}
                      />
                    );
                  })
                )}
              </svg>

              {/* Tâm Donut */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tổng số</span>
                <span className="text-2xl font-black text-slate-900 leading-none mt-0.5">{total}</span>
                <span className="text-[10px] text-slate-500 mt-0.5">Văn bản</span>
              </div>
            </div>

            {/* Chú thích Legend */}
            <div className="space-y-1.5 w-full sm:w-auto">
              {statusSlices.map((slice) => {
                const percent = total > 0 ? ((slice.count / total) * 100).toFixed(1) : '0';
                return (
                  <button
                    key={slice.id}
                    type="button"
                    onClick={() => onFilterByStatus && onFilterByStatus(slice.id)}
                    className={`flex items-center justify-between gap-3 px-2 py-1 rounded-lg text-xs w-full text-left transition-all ${
                      activeSlice === slice.id ? 'bg-slate-100 font-bold' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: slice.color }} />
                      <span className="text-slate-700 text-[11px]">{slice.label}:</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                      <span>{slice.count}</span>
                      <span className="text-[10px] text-slate-400 font-normal font-mono">({percent}%)</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SLA Performance Meter */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="font-bold text-slate-700 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tỷ lệ hoàn thành đúng hạn (SLA):</span>
              </span>
              <span className="font-black text-emerald-700">{onTimeRate}%</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden flex">
              <div
                className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, onTimeRate))}%` }}
              />
              {overdue > 0 && (
                <div
                  className="bg-rose-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (overdue / total) * 100)}%` }}
                />
              )}
            </div>
          </div>
        </div>

        {/* CHART 2: Interactive Bar Chart theo Mốc thời gian (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-4 sm:p-5 rounded-2xl shadow-card border border-gov-border flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                Tiến Độ Xử Lý & Xu Hướng Tiếp Nhận
              </h4>
            </div>

            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-blue-500" />
                <span className="text-slate-600">Công văn đến</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
                <span className="text-slate-600">Đã xử lý / ký</span>
              </span>
            </div>
          </div>

          {/* Khung Biểu đồ Cột SVG */}
          <div className="py-4">
            <div className="h-44 flex items-end justify-between gap-2 sm:gap-3 pt-6 pb-2 px-2 border-b border-slate-200">
              {timeline.map((point, idx) => {
                const receivedHeight = Math.max(4, Math.round((point.receivedCount / maxBarValue) * 120));
                const processedHeight = Math.max(4, Math.round((point.processedCount / maxBarValue) * 120));

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                    {/* Tooltip Hover */}
                    <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center bg-slate-900 text-white text-[10px] px-2 py-1.5 rounded-lg shadow-lg whitespace-nowrap pointer-events-none animate-in fade-in">
                      <span className="font-bold text-amber-300">{point.label}</span>
                      <span>Đến: {point.receivedCount} • Xử lý: {point.processedCount}</span>
                      <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-1 mt-0.5" />
                    </div>

                    {/* Bars Container */}
                    <div className="flex items-end gap-1 w-full max-w-[36px] justify-center">
                      {/* Bar 1: Received */}
                      <div
                        className="w-1/2 bg-blue-500 hover:bg-blue-600 rounded-t-sm transition-all duration-300 relative"
                        style={{ height: `${receivedHeight}px` }}
                      >
                        {point.receivedCount > 0 && (
                          <span className="absolute -top-4 inset-x-0 text-center text-[9px] font-bold text-slate-500">
                            {point.receivedCount}
                          </span>
                        )}
                      </div>

                      {/* Bar 2: Processed / Signed */}
                      <div
                        className="w-1/2 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all duration-300 relative"
                        style={{ height: `${processedHeight}px` }}
                      >
                        {point.processedCount > 0 && (
                          <span className="absolute -top-4 inset-x-0 text-center text-[9px] font-bold text-emerald-700">
                            {point.processedCount}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Trục X Label */}
                    <span className="text-[10px] font-medium text-slate-500 mt-2 truncate max-w-full text-center">
                      {isMobile ? point.label.split(' ')[0] : point.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Bar Chart Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Công văn đến</div>
              <div className="text-base font-black text-blue-700 mt-0.5">{total}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Đã xử lý</div>
              <div className="text-base font-black text-amber-700 mt-0.5">{daXuLy}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Đã ký duyệt</div>
              <div className="text-base font-black text-emerald-700 mt-0.5">{daKy}</div>
            </div>
            <div className="bg-slate-50 p-2 rounded-xl border border-slate-100">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Quá hạn SLA</div>
              <div className={`text-base font-black mt-0.5 ${overdue > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                {overdue}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
