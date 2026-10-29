import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, ShieldCheck, CheckCircle2, Layers, Clock } from 'lucide-react';
import { QueueTaskItem } from '../../types';

interface DropzoneUploadProps {
  onFileUpload: (file: File) => void;
  onBatchUpload?: (files: File[]) => void;
  isLoading: boolean;
  queueTasks?: QueueTaskItem[];
}

export const DropzoneUpload: React.FC<DropzoneUploadProps> = ({
  onFileUpload,
  onBatchUpload,
  isLoading,
  queueTasks = [],
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1 && onBatchUpload) {
        onBatchUpload(Array.from(e.dataTransfer.files));
      } else {
        onFileUpload(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length > 1 && onBatchUpload) {
        onBatchUpload(Array.from(e.target.files));
      } else {
        onFileUpload(e.target.files[0]);
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gov-text flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-gov-primary" />
          Tiếp nhận công văn thực tế
        </h2>
        <span className="text-[11px] text-gov-text-secondary bg-gov-subtle px-2 py-0.5 rounded font-medium flex items-center gap-1">
          <Layers className="w-3 h-3 text-gov-primary" />
          Hỗ trợ tải nhiều tệp (PDF, Word, TXT)
        </span>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all duration-200 ${isDragOver
          ? 'border-gov-primary bg-gov-primary-light/40 scale-[1.01]'
          : 'border-gov-border hover:border-gov-gold bg-gov-bg/60 hover:bg-white'
          } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="w-13 h-13 mx-auto mb-3 flex items-center justify-center text-gov-primary">
          {isLoading ? (
            <Loader2 className="w-6 h-6 animate-spin text-gov-primary" />
          ) : (
            <UploadCloud className="w-6 h-6 text-gov-primary" />
          )}
        </div>

        <p className="text-sm font-bold text-gov-text">
          {isLoading ? 'Đang bóc tách văn bản và tự động thẩm định...' : 'Kéo thả 1 hoặc nhiều tệp công văn vào đây'}
        </p>
        <p className="text-xs text-gov-text-secondary mt-1.5 max-w-md mx-auto">
          Tải hàng loạt: Tự động đưa vào Hàng đợi ngầm tuần tự (FIFO) bảo vệ tài nguyên máy chủ.
        </p>
      </div>

      {/* Live Queue Progress Indicator if batch active */}
      {queueTasks.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gov-border space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-gov-text">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gov-primary animate-pulse" />
              Tiến độ hàng đợi xử lý ngầm ({queueTasks.filter(t => t.status === 'COMPLETED').length}/{queueTasks.length})
            </span>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1.5 pr-1">
            {queueTasks.map((t) => (
              <div key={t.trackingId} className="flex items-center justify-between text-[11px] p-2 bg-slate-50 border border-slate-200 rounded">
                <span className="truncate max-w-[200px] font-medium text-slate-800">{t.fileName}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                  t.status === 'PROCESSING' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                    t.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                  {t.status === 'COMPLETED' ? '✓ Đã xong' :
                    t.status === 'PROCESSING' ? '⚡ Đang OCR...' :
                      t.status === 'FAILED' ? '✗ Lỗi' : '⏳ Chờ đến lượt'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security & Standard Notes */}
      <div className="mt-4 pt-3 border-t border-gov-border/60 flex items-center justify-between text-[11px] text-gov-text-secondary">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Hàng đợi tuần tự nội bộ (In-Memory Channel)</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-gov-gold" />
          <span>Chuẩn Nghị định 30/2020</span>
        </div>
      </div>
    </div>
  );
};
