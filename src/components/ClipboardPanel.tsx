import React from 'react';
import { Copy, X, Sparkles, Languages, FileText, HelpCircle, CheckSquare } from 'lucide-react';

interface ClipboardPanelProps {
  text: string;
  isOpen: boolean;
  onClose: () => void;
  onAction: (prompt: string) => void;
}

export const ClipboardPanel: React.FC<ClipboardPanelProps> = ({
  text,
  isOpen,
  onClose,
  onAction,
}) => {
  if (!isOpen || !text) return null;

  const preview = text.length > 55 ? text.slice(0, 55) + '…' : text;

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-40 w-96 p-2.5 rounded-lg bg-[#00080e]/95 border border-[#1a5c7a] shadow-xl font-mono select-none animate-in fade-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between mb-1.5 text-[11px]">
        <div className="flex items-center gap-1.5 text-[#ffcc00] font-bold">
          <Copy className="w-3 h-3" />
          <span>CLIPBOARD INTELLIGENCE</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#3a8a9a] hover:text-[#ff3355] transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-1.5 rounded bg-[#010f18] border border-[#0d3347] text-[11px] text-[#8ffcff] truncate mb-2">
        &quot;{preview}&quot;
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <button
          onClick={() => onAction(`Translate this text to English: "${text}"`)}
          className="flex items-center justify-center gap-1 py-1 rounded bg-[#011520] hover:bg-[#00283d] border border-[#0d3347] text-[10px] font-bold text-[#5ab8cc] hover:text-[#8ffcff] cursor-pointer transition-colors"
        >
          <Languages className="w-3 h-3" />
          <span>TRANSLATE</span>
        </button>
        <button
          onClick={() => onAction(`Summarise this text concisely: "${text}"`)}
          className="flex items-center justify-center gap-1 py-1 rounded bg-[#011520] hover:bg-[#00283d] border border-[#0d3347] text-[10px] font-bold text-[#5ab8cc] hover:text-[#8ffcff] cursor-pointer transition-colors"
        >
          <FileText className="w-3 h-3" />
          <span>SUMMARISE</span>
        </button>
        <button
          onClick={() => onAction(`Explain this concept in plain terms: "${text}"`)}
          className="flex items-center justify-center gap-1 py-1 rounded bg-[#011520] hover:bg-[#00283d] border border-[#0d3347] text-[10px] font-bold text-[#5ab8cc] hover:text-[#8ffcff] cursor-pointer transition-colors"
        >
          <HelpCircle className="w-3 h-3" />
          <span>EXPLAIN</span>
        </button>
        <button
          onClick={() => onAction(`Fix grammar, tone, and spelling in: "${text}"`)}
          className="flex items-center justify-center gap-1 py-1 rounded bg-[#011520] hover:bg-[#00283d] border border-[#0d3347] text-[10px] font-bold text-[#5ab8cc] hover:text-[#8ffcff] cursor-pointer transition-colors"
        >
          <CheckSquare className="w-3 h-3" />
          <span>FIX</span>
        </button>
      </div>
    </div>
  );
};
