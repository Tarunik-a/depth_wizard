import React from 'react';
import { Project } from '../types';
import { api } from '../api/client';
import { FileText, Download, Printer, X } from 'lucide-react';

interface ReportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  reportHtml: string | null;
}

export const ReportPreviewModal: React.FC<ReportPreviewModalProps> = ({
  isOpen,
  onClose,
  project,
  reportHtml,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && reportHtml) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleDownloadHtml = () => {
    if (!reportHtml) return;
    const blob = new Blob([reportHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name}_Elevation_Report.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6">
      <div className="glass-panel w-full max-w-4xl h-[88vh] rounded-2xl flex flex-col border border-dw-border shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-dw-surface border-b border-dw-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-dw-cyan" />
            <div>
              <h3 className="text-sm font-bold text-slate-100 font-mono">
                ELEVATION ANALYSIS REPORT PREVIEW
              </h3>
              <p className="text-xs text-slate-400">
                Project: {project.name} | Mode: {project.reconstruction_mode.toUpperCase()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dw-surface border border-dw-border text-slate-200 hover:border-dw-cyan transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
            <button
              onClick={handleDownloadHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-dw-cyan text-dw-bg font-bold hover:bg-dw-cyan/90 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download HTML</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-dw-panel ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Report Preview iFrame */}
        <div className="flex-1 bg-white overflow-hidden">
          {reportHtml ? (
            <iframe
              srcDoc={reportHtml}
              title="Report Preview"
              className="w-full h-full border-none"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-600 font-mono text-sm">
              Loading report preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
