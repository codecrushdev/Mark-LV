import React from 'react';
import { AlertTriangle, Check, X } from 'lucide-react';

interface ConfirmBannerProps {
  isOpen: boolean;
  actionTitle: string;
  actionDescription: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmBanner: React.FC<ConfirmBannerProps> = ({
  isOpen,
  actionTitle,
  actionDescription,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg p-3 rounded-lg bg-[#18080a] border-2 border-[#ff3355] shadow-2xl shadow-red-950/50 font-mono animate-in slide-in-from-top-4 select-none">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-full bg-[#ff3355]/20 text-[#ff3355] shrink-0 animate-pulse">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#ff3355] tracking-wider">
              AUTHORIZATION REQUIRED — IRREVERSIBLE ACTION
            </span>
          </div>

          <div className="text-xs font-bold text-[#ffffff] mt-1">{actionTitle}</div>
          <div className="text-[11px] text-[#ff8899] mt-0.5 leading-relaxed">{actionDescription}</div>

          <div className="flex items-center gap-2 mt-3 justify-end">
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 rounded bg-[#010d14] hover:bg-[#001f2e] border border-[#0d3347] text-xs font-bold text-[#8ffcff] cursor-pointer transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              <span>ABORT</span>
            </button>
            <button
              onClick={onConfirm}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded bg-[#ff3355] hover:bg-[#ff5577] text-xs font-bold text-[#ffffff] cursor-pointer transition-colors shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>CONFIRM ACTION</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
