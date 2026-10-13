import React from 'react';
import { Sliders, X, Palette, Volume2, Mic, Sun, Bell, Monitor, UserCheck } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  assistantName: string;
  onAssistantNameChange: (val: string) => void;
  userName: string;
  onUserNameChange: (val: string) => void;
  accentColor: string;
  onAccentColorChange: (val: string) => void;
  voice: string;
  onVoiceChange: (val: string) => void;
  wakeWordEnabled: boolean;
  onToggleWakeWord: () => void;
  morningBriefingEnabled: boolean;
  onToggleMorningBriefing: () => void;
  inputDevice: string;
  onInputDeviceChange: (val: string) => void;
  outputDevice: string;
  onOutputDeviceChange: (val: string) => void;
}

const THEME_PRESETS = [
  { name: 'Teal (Classic HUD)', hex: '#00d4ff' },
  { name: 'Amber Gold', hex: '#ffaa00' },
  { name: 'Neon Emerald', hex: '#00ff88' },
  { name: 'Cyberpunk Violet', hex: '#a855f7' },
  { name: 'Crimson War-Room', hex: '#ff3366' },
  { name: 'Titanium Ice', hex: '#d8f8ff' },
];

const GEMINI_VOICES = ['Puck', 'Charon', 'Aoede', 'Fenrir', 'Kore'];

const AUDIO_INPUTS = [
  'Default Microphone (Built-in Array)',
  'Focusrite Scarlett 2i2 USB Mic',
  'Shure MV7 Digital Podcast Mic',
  'AirPods Pro Bluetooth Audio',
];

const AUDIO_OUTPUTS = [
  'Default Speakers (High Definition Audio)',
  'Focusrite Scarlett 2i2 USB Monitor',
  'Audio-Technica M50x Headphones',
  'AirPods Pro Bluetooth Audio',
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  assistantName,
  onAssistantNameChange,
  userName,
  onUserNameChange,
  accentColor,
  onAccentColorChange,
  voice,
  onVoiceChange,
  wakeWordEnabled,
  onToggleWakeWord,
  morningBriefingEnabled,
  onToggleMorningBriefing,
  inputDevice,
  onInputDeviceChange,
  outputDevice,
  onOutputDeviceChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono select-none">
      <div className="w-full max-w-xl bg-[#000d14] border border-[#1a5c7a] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#010d14] border-b border-[#0d3347]">
          <div className="flex items-center gap-2 text-sm text-[#8ffcff]">
            <Sliders className="w-4 h-4 text-[#00d4ff]" />
            <span className="font-bold tracking-wider">ASSISTANT CONFIGURATION &amp; HARDWARE</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:text-[#ff3355] text-[#3a8a9a] cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Settings Body */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 text-xs">
          {/* Identity */}
          <div className="p-3 rounded-lg bg-[#010f18] border border-[#0d3347] flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8ffcff]">
              <UserCheck className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>IDENTITY &amp; PROTOCOL</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-[#3a8a9a]">ASSISTANT NAME</label>
                <input
                  type="text"
                  value={assistantName}
                  onChange={(e) => onAssistantNameChange(e.target.value)}
                  className="w-full bg-[#00060a] border border-[#0d3347] rounded px-2.5 py-1.5 text-[#8ffcff] outline-none mt-1"
                />
              </div>
              <div>
                <label className="text-[10px] text-[#3a8a9a]">USER CALLSIGN / NAME</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => onUserNameChange(e.target.value)}
                  className="w-full bg-[#00060a] border border-[#0d3347] rounded px-2.5 py-1.5 text-[#8ffcff] outline-none mt-1"
                />
              </div>
            </div>
          </div>

          {/* Theme Palette */}
          <div className="p-3 rounded-lg bg-[#010f18] border border-[#0d3347] flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8ffcff]">
              <Palette className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>LIVE HUD RETINTING &amp; ACCENT PALETTE</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {THEME_PRESETS.map((th) => (
                <button
                  key={th.hex}
                  onClick={() => onAccentColorChange(th.hex)}
                  className={`flex items-center gap-2 p-2 rounded border transition-all cursor-pointer ${
                    accentColor.toLowerCase() === th.hex.toLowerCase()
                      ? 'bg-[#001f2e] border-[#00d4ff]'
                      : 'bg-[#00060a] border-[#0d3347] hover:border-[#1a5c7a]'
                  }`}
                >
                  <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: th.hex }} />
                  <span className="text-[10px] font-bold text-[#8ffcff] truncate">{th.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Voice Synthesis */}
          <div className="p-3 rounded-lg bg-[#010f18] border border-[#0d3347] flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8ffcff]">
              <Volume2 className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>GEMINI NATIVE SYNTHESIS VOICE</span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {GEMINI_VOICES.map((v) => (
                <button
                  key={v}
                  onClick={() => onVoiceChange(v)}
                  className={`py-1.5 rounded text-center border text-[11px] font-bold cursor-pointer transition-all ${
                    voice === v
                      ? 'bg-[#001f2e] border-[#00d4ff] text-[#8ffcff]'
                      : 'bg-[#00060a] border-[#0d3347] text-[#3a8a9a] hover:text-[#8ffcff]'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* Audio Devices */}
          <div className="p-3 rounded-lg bg-[#010f18] border border-[#0d3347] flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#8ffcff]">
              <Mic className="w-3.5 h-3.5 text-[#00d4ff]" />
              <span>AUDIO HARDWARE BUSES</span>
            </div>
            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[10px] text-[#3a8a9a]">INPUT DEVICE (MICROPHONE)</label>
                <select
                  value={inputDevice}
                  onChange={(e) => onInputDeviceChange(e.target.value)}
                  className="w-full bg-[#00060a] border border-[#0d3347] rounded px-2.5 py-1.5 text-[#8ffcff] outline-none mt-1"
                >
                  {AUDIO_INPUTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-[#3a8a9a]">OUTPUT DEVICE (MONITOR / HEADPHONES)</label>
                <select
                  value={outputDevice}
                  onChange={(e) => onOutputDeviceChange(e.target.value)}
                  className="w-full bg-[#00060a] border border-[#0d3347] rounded px-2.5 py-1.5 text-[#8ffcff] outline-none mt-1"
                >
                  {AUDIO_OUTPUTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Proactive & Wake Word Toggles */}
          <div className="p-3 rounded-lg bg-[#010f18] border border-[#0d3347] flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[#8ffcff]">&quot;Hey Jarvis&quot; Wake Word Engine</div>
                <div className="text-[10px] text-[#3a8a9a]">Sleeps until called, auto-sleeps after 2 min silence</div>
              </div>
              <button
                onClick={onToggleWakeWord}
                className={`w-12 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                  wakeWordEnabled ? 'bg-[#00ff88]' : 'bg-[#0d3347]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#00060a] transition-transform ${
                    wakeWordEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="pt-2 border-t border-[#0d3347] flex items-center justify-between">
              <div>
                <div className="font-bold text-[#8ffcff]">Morning Briefing &amp; Proactive 2.0</div>
                <div className="text-[10px] text-[#3a8a9a]">First-boot greeting, schedule recap, headline alerts</div>
              </div>
              <button
                onClick={onToggleMorningBriefing}
                className={`w-12 h-6 rounded-full transition-colors cursor-pointer p-0.5 ${
                  morningBriefingEnabled ? 'bg-[#00ff88]' : 'bg-[#0d3347]'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-[#00060a] transition-transform ${
                    morningBriefingEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#010d14] border-t border-[#0d3347] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#001f2e] hover:bg-[#00344d] border border-[#1a5c7a] text-xs font-bold text-[#8ffcff] cursor-pointer"
          >
            APPLY &amp; SAVE
          </button>
        </div>
      </div>
    </div>
  );
};
