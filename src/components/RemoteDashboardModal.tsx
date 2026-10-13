import React, { useState } from 'react';
import { Smartphone, X, QrCode, Shield, Send, Mic, Upload, CheckCircle2 } from 'lucide-react';

interface RemoteDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendRemoteCommand: (cmd: string) => void;
  accentColor: string;
}

export const RemoteDashboardModal: React.FC<RemoteDashboardModalProps> = ({
  isOpen,
  onClose,
  onSendRemoteCommand,
  accentColor,
}) => {
  const [remoteInput, setRemoteInput] = useState('');
  const [remoteConnected, setRemoteConnected] = useState(true);

  if (!isOpen) return null;

  const sessionKey = 'JK92-V82M-4L2P-99A1';
  const localUrl = 'http://192.168.1.142:8000';

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remoteInput.trim()) return;
    onSendRemoteCommand(remoteInput.trim());
    setRemoteInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-xl bg-[#000d14] border border-[#1a5c7a] rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#010d14] border-b border-[#0d3347]">
          <div className="flex items-center gap-2 text-sm text-[#8ffcff]">
            <Smartphone className="w-4 h-4 text-[#00d4ff]" />
            <span className="font-bold tracking-wider">REMOTE DASHBOARD (PHONE PAIRING &amp; HTTP)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:text-[#ff3355] text-[#3a8a9a] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Pairing Information & Simulated QR */}
        <div className="p-4 bg-[#010f18] border-b border-[#0d3347] flex items-center gap-4">
          <div className="w-24 h-24 bg-[#00060a] border border-[#1a5c7a] rounded-lg p-2 flex flex-col items-center justify-center shrink-0">
            <QrCode className="w-16 h-16 text-[#00d4ff]" />
            <span className="text-[8px] text-[#3a8a9a] mt-0.5">SCAN PAIR</span>
          </div>

          <div className="flex-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#8ffcff]">LAN ADDRESS:</span>
              <span className="px-2 py-0.5 rounded bg-[#00060a] border border-[#0d3347] text-[#00ff88] font-bold">
                {localUrl}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[#3a8a9a]">ENCRYPTION:</span>
              <span className="flex items-center gap-1 text-[10px] text-[#00ff88] font-bold">
                <Shield className="w-3 h-3" /> AES-256-CBC
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#3a8a9a]">
              <span>SESSION TOKEN:</span>
              <span className="font-mono text-[#ffaa00]">{sessionKey}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-[10px] text-[#00ff88]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>PAIRED DEVICE: Apple iPhone 15 Pro (192.168.1.108)</span>
            </div>
          </div>
        </div>

        {/* Phone Client Simulator */}
        <div className="p-4 flex-1 flex flex-col gap-3">
          <div className="text-xs font-bold text-[#8ffcff] flex items-center justify-between">
            <span>LIVE REMOTE TRANSMISSION SIMULATOR</span>
            <span className="text-[10px] text-[#3a8a9a]">HTTP/WS SYNC</span>
          </div>

          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={remoteInput}
              onChange={(e) => setRemoteInput(e.target.value)}
              placeholder="Send command from remote phone..."
              className="flex-1 bg-[#00060a] border border-[#0d3347] focus:border-[#00d4ff] rounded-lg px-3 py-2 text-xs text-[#8ffcff] outline-none"
            />
            <button
              type="submit"
              disabled={!remoteInput.trim()}
              className="px-3.5 py-2 rounded-lg bg-[#00d4ff] hover:bg-[#5ae2ff] text-[#00060a] font-bold text-xs flex items-center gap-1 cursor-pointer disabled:opacity-30"
              style={{ backgroundColor: accentColor }}
            >
              <Send className="w-3 h-3" />
              <span>DISPATCH</span>
            </button>
          </form>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => onSendRemoteCommand('Wake word trigger: Hey Jarvis')}
              className="p-2 rounded bg-[#011520] hover:bg-[#002b40] border border-[#0d3347] text-[#00ff88] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>TRIGGER REMOTE WAKE</span>
            </button>
            <button
              onClick={() => onSendRemoteCommand('File payload received from mobile: specs_v2.pdf')}
              className="p-2 rounded bg-[#011520] hover:bg-[#002b40] border border-[#0d3347] text-[#5ab8cc] flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>SIMULATE FILE DROP</span>
            </button>
          </div>
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
