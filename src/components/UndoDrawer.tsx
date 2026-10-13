import React from 'react';
import { UndoAction } from '../types.ts';
import { Undo2, X, RotateCcw, CheckCircle2 } from 'lucide-react';

interface UndoDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  actions: UndoAction[];
  onUndo: (id: string) => void;
}

export const UndoDrawer: React.FC<UndoDrawerProps> = ({
  isOpen,
  onClose,
  actions,
  onUndo,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-lg bg-[#000d14] border border-[#1a5c7a] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-4 py-3 bg-[#010d14] border-b border-[#0d3347]">
          <div className="flex items-center gap-2 text-sm text-[#8ffcff]">
            <Undo2 className="w-4 h-4 text-[#00d4ff]" />
            <span className="font-bold tracking-wider">UNDO JOURNAL (ACTION AUDIT)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:text-[#ff3355] text-[#3a8a9a] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-2 bg-[#001524] border-b border-[#0d3347] text-[11px] text-[#3a8a9a]">
          Take back operations performed by JARVIS — file operations, settings changes, or scheduled reminders.
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {actions.length === 0 ? (
            <div className="text-center text-[#3a8a9a] text-xs py-8">Journal is clean. No undoable actions.</div>
          ) : (
            actions.map((act) => (
              <div
                key={act.id}
                className={`p-3 rounded-lg border flex items-center justify-between ${
                  act.undone
                    ? 'bg-[#00060a] border-[#0d3347] opacity-60'
                    : 'bg-[#010f18] border-[#0d3347] hover:border-[#1a5c7a]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#8ffcff]">{act.title}</span>
                    {act.undone && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] text-[#3a8a9a] font-bold">
                        REVERTED
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#5ab8cc] mt-0.5">{act.description}</div>
                  <div className="text-[9px] text-[#3a8a9a] mt-0.5">Recorded: {act.timestamp}</div>
                </div>

                {!act.undone && (
                  <button
                    onClick={() => onUndo(act.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#001f2e] hover:bg-[#00344d] border border-[#1a5c7a] text-xs font-bold text-[#00d4ff] cursor-pointer transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>UNDO</span>
                  </button>
                )}
                {act.undone && (
                  <CheckCircle2 className="w-4 h-4 text-[#3a8a9a]" />
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-3 bg-[#010d14] border-t border-[#0d3347] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#001f2e] hover:bg-[#00344d] border border-[#1a5c7a] text-xs font-bold text-[#8ffcff] cursor-pointer"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
};
