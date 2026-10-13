import React from 'react';
import { ModelLadderItem } from '../types.ts';
import { Cpu, X, CheckCircle2, Clock, AlertTriangle, ArrowDownRight, RefreshCw } from 'lucide-react';

interface ModelLadderModalProps {
  isOpen: boolean;
  onClose: () => void;
  ladder: ModelLadderItem[];
  activeModel: string;
  onSelectModel: (name: string) => void;
  onSimulateFallback: (failedModel: string) => void;
  onResetCooldowns: () => void;
  accentColor: string;
}

export const ModelLadderModal: React.FC<ModelLadderModalProps> = ({
  isOpen,
  onClose,
  ladder,
  activeModel,
  onSelectModel,
  onSimulateFallback,
  onResetCooldowns,
  accentColor,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-2xl bg-[#000d14] border border-[#1a5c7a] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#010d14] border-b border-[#0d3347]">
          <div className="flex items-center gap-2 text-sm text-[#8ffcff]">
            <Cpu className="w-4 h-4 text-[#00d4ff]" />
            <span className="font-bold tracking-wider">GEMINI MODEL LADDER (9 RUNGS)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onResetCooldowns}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#011520] hover:bg-[#001f2e] border border-[#0d3347] text-[11px] text-[#3a8a9a] hover:text-[#8ffcff] cursor-pointer transition-colors"
              title="Reset all model cooldowns"
            >
              <RefreshCw className="w-3 h-3" />
              <span>RESET COOLDOWNS</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:text-[#ff3355] text-[#3a8a9a] cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Description Banner */}
        <div className="px-4 py-2.5 bg-[#001524] border-b border-[#0d3347] text-[11px] text-[#3a8a9a] leading-relaxed">
          Mark LV channels all calls through one measured ladder of 9 Gemini models. When a model hits its quota (429) or times out (504), the next rung answers seamlessly while the dead one enters cooldown.
        </div>

        {/* Model Ladder List */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {ladder.map((m, idx) => {
            const isActive = m.name === activeModel;
            const isCooldown = m.status === 'cooldown' || m.status === 'quota_exhausted';

            return (
              <div
                key={m.name}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-[#001f2e]/90 border-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.2)]'
                    : isCooldown
                    ? 'bg-[#150a0a] border-[#ff3355]/40 opacity-70'
                    : 'bg-[#010f18] border-[#0d3347] hover:border-[#1a5c7a]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Rung Number */}
                  <span className="w-6 h-6 rounded flex items-center justify-center bg-[#011520] border border-[#0d3347] text-xs font-bold text-[#3a8a9a]">
                    #{idx + 1}
                  </span>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#8ffcff]">{m.name}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-[#00ff88]/20 border border-[#00ff88]/40 text-[9px] text-[#00ff88] font-bold">
                          ACTIVE RUNG
                        </span>
                      )}
                      {m.role === 'live' && (
                        <span className="px-1.5 py-0.5 rounded bg-[#00d4ff]/20 text-[9px] text-[#00d4ff] font-bold">
                          LIVE NATIVE AUDIO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-[#3a8a9a] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        LATENCY: {m.latency}
                      </span>
                      <span>ROLE: {m.role.toUpperCase()}</span>
                      {m.consecutiveFailures > 0 && (
                        <span className="text-[#ffaa00]">FAILS: {m.consecutiveFailures}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status and Action Buttons */}
                <div className="flex items-center gap-2">
                  {isCooldown ? (
                    <div className="flex items-center gap-1 text-[11px] text-[#ff3355] font-bold px-2 py-1 rounded bg-[#ff3355]/10 border border-[#ff3355]/30">
                      <AlertTriangle className="w-3 h-3" />
                      <span>COOLDOWN (429)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-[#00ff88] px-2 py-1 rounded bg-[#00ff88]/10 border border-[#00ff88]/30">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>HEALTHY</span>
                    </div>
                  )}

                  {!isActive && !isCooldown && (
                    <button
                      onClick={() => onSelectModel(m.name)}
                      className="px-2.5 py-1 rounded bg-[#001f2e] hover:bg-[#00344d] border border-[#1a5c7a] text-[10px] text-[#8ffcff] font-bold cursor-pointer transition-colors"
                    >
                      PROMOTE
                    </button>
                  )}

                  {/* Simulate Quota Exceeded */}
                  {!isCooldown && (
                    <button
                      onClick={() => onSimulateFallback(m.name)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-[#ff3355]/10 hover:bg-[#ff3355]/25 border border-[#ff3355]/30 text-[10px] text-[#ffaa00] cursor-pointer transition-colors"
                      title="Simulate 429 quota exhaustion to trigger failover ladder"
                    >
                      <ArrowDownRight className="w-3 h-3" />
                      <span>TEST 429</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#010d14] border-t border-[#0d3347] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#001f2e] hover:bg-[#00344d] border border-[#1a5c7a] text-xs font-bold text-[#8ffcff] cursor-pointer"
          >
            DONE
          </button>
        </div>
      </div>
    </div>
  );
};
