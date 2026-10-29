import React, { useEffect, useRef, useState } from 'react';
import * as docx from 'docx-preview';
import { FileText, Loader2, AlertCircle } from 'lucide-react';

interface DocxViewerProps {
  blob?: Blob | null;
  file?: File | null;
  className?: string;
}

export const DocxViewer: React.FC<DocxViewerProps> = ({ blob, file, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const targetData = file || blob;

    if (!targetData) {
      setLoading(false);
      return;
    }

    const renderDocx = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!containerRef.current) return;
        containerRef.current.innerHTML = '';

        await docx.renderAsync(targetData, containerRef.current, undefined, {
          inWrapper: false,
          ignoreWidth: true,
          ignoreHeight: true,
          renderHeaders: true,
          renderFooters: true,
          breakPages: true,
          useBase64URL: true,
        });

        if (!isCancelled) {
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Lỗi khi hiển thị tài liệu Word (docx):', err);
        if (!isCancelled) {
          setError('Không thể kết xuất giao diện Word trực tiếp. Vui lòng sử dụng nút Tải về máy để xem văn bản.');
          setLoading(false);
        }
      }
    };

    renderDocx();

    return () => {
      isCancelled = true;
    };
  }, [blob, file]);

  return (
    <div className={`relative min-h-[300px] ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xs py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gov-primary mb-2" />
          <p className="text-xs font-semibold text-slate-700">Đang tải và chuẩn bị định dạng Word đầy đủ...</p>
        </div>
      )}

      {error ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
          <AlertCircle className="w-8 h-8 mx-auto text-amber-500 mb-2" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="docx-preview-wrapper bg-white shadow-md border border-slate-200 rounded p-4 sm:p-8 overflow-x-auto text-slate-900 leading-normal"
          style={{ minHeight: '400px' }}
        />
      )}
    </div>
  );
};
