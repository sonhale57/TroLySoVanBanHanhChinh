import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface DropzoneUploadProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
}

export const DropzoneUpload: React.FC<DropzoneUploadProps> = ({
  onFileUpload,
  isLoading,
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
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-card border border-gov-border p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider text-gov-text flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-gov-primary" />
          Tiếp nhận công văn thực tế
        </h2>
        <span className="text-[11px] text-gov-text-secondary bg-gov-subtle px-2 py-0.5 rounded font-medium">
          PDF, DOCX, TXT (Tối đa 50MB)
        </span>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-gov-primary bg-gov-primary-light/40 scale-[1.01]'
            : 'border-gov-border hover:border-gov-gold bg-gov-bg/60 hover:bg-white'
        } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt"
          onChange={handleFileInputChange}
          className="hidden"
        />

        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white shadow-sm border border-gov-border flex items-center justify-center text-gov-primary">
          {isLoading ? (
            <Loader2 className="w-7 h-7 animate-spin text-gov-primary" />
          ) : (
            <UploadCloud className="w-7 h-7 text-gov-primary" />
          )}
        </div>

        <p className="text-sm font-bold text-gov-text">
          {isLoading ? 'Đang giải mã bóc tách văn bản và tự động thẩm định...' : 'Kéo thả tệp công văn vào đây hoặc bấm để chọn tệp'}
        </p>
        <p className="text-xs text-gov-text-secondary mt-1.5 max-w-md mx-auto">
          Hệ thống bóc tách tự động 9 thành phần thể thức theo Nghị định 30/2020/NĐ-CP và kích hoạt Động cơ Thẩm định Pháp lý Tự động.
        </p>
      </div>

      {/* Security & Standard Notes */}
      <div className="mt-4 pt-3 border-t border-gov-border/60 flex items-center justify-between text-[11px] text-gov-text-secondary">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Xử lý nội bộ trên máy chủ công quyền (On-Premise Isolated)</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-gov-gold" />
          <span>Chuẩn Nghị định 30/2020/NĐ-CP</span>
        </div>
      </div>
    </div>
  );
};
