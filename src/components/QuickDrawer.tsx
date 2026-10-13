import React, { useState } from 'react';
import { ReminderItem, SearchResult } from '../types.ts';
import {
  AppWindow,
  Sliders,
  Bell,
  Search,
  FolderOpen,
  Power,
  RotateCcw,
  Lock,
  Volume2,
  Sun,
  Wifi,
  Moon,
  ExternalLink,
  Plus,
  CheckCircle2,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface QuickDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchApp: (appName: string) => void;
  onSystemAction: (action: string) => void;
  volume: number;
  onVolumeChange: (val: number) => void;
  brightness: number;
  onBrightnessChange: (val: number) => void;
  wifiEnabled: boolean;
  onToggleWifi: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  reminders: ReminderItem[];
  onAddReminder: (title: string, time: string) => void;
  onToggleReminder: (id: string) => void;
  searchResults: SearchResult[];
  onTriggerSearch: (query: string, mode: SearchResult['mode']) => void;
  accentColor: string;
}

export const QuickDrawer: React.FC<QuickDrawerProps> = ({
  isOpen,
  onClose,
  onLaunchApp,
  onSystemAction,
  volume,
  onVolumeChange,
  brightness,
  onBrightnessChange,
  wifiEnabled,
  onToggleWifi,
  darkMode,
  onToggleDarkMode,
  reminders,
  onAddReminder,
  onToggleReminder,
  searchResults,
  onTriggerSearch,
  accentColor,
}) => {
  const [activeTab, setActiveTab] = useState<'control' | 'reminders' | 'search' | 'files'>('control');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMode, setSearchMode] = useState<SearchResult['mode']>('search');
  const [newReminderTitle, setNewReminderTitle] = useState('');
  const [newReminderTime, setNewReminderTime] = useState('18:00');

  if (!isOpen) return null;

  const appShortcuts = [
    { name: 'Terminal / CLI', cmd: 'Terminal', icon: '⚡' },
    { name: 'Google Chrome', cmd: 'Google Chrome', icon: '🌐' },
    { name: 'VS Code Editor', cmd: 'VS Code', icon: '💻' },
    { name: 'File Explorer', cmd: 'Explorer', icon: '📁' },
    { name: 'System Settings', cmd: 'Settings', icon: '⚙️' },
    { name: 'Notes & Scratchpad', cmd: 'Notes', icon: '📝' },
  ];

  const files = [
    { name: 'quarterly_objectives.md', size: '14.2 KB', updated: 'Today, 08:30' },
    { name: 'drone_telemetry_log.json', size: '184.6 KB', updated: 'Yesterday' },
    { name: 'ai_model_benchmarks.csv', size: '42.1 KB', updated: 'Oct 11' },
    { name: 'project_jarvis_manifest.yaml', size: '8.4 KB', updated: 'Oct 10' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onTriggerSearch(searchQuery.trim(), searchMode);
  };

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderTitle.trim()) return;
    onAddReminder(newReminderTitle.trim(), newReminderTime);
    setNewReminderTitle('');
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-96 bg-[#000d14]/95 border-l border-[#1a5c7a] shadow-2xl backdrop-blur-md flex flex-col font-mono select-none animate-in slide-in-from-right duration-200">
      {/* Drawer Header & Tabs */}
      <div className="p-3 bg-[#010d14] border-b border-[#0d3347] flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#8ffcff]">
          <Sliders className="w-3.5 h-3.5 text-[#00d4ff]" />
          <span>QUICK ACTIONS DRAWER</span>
        </div>
        <button
          onClick={onClose}
          className="text-[#3a8a9a] hover:text-[#ff3355] text-xs cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#0d3347] bg-[#011520] text-[11px]">
        <button
          onClick={() => setActiveTab('control')}
          className={`flex-1 py-2 text-center transition-colors font-bold ${
            activeTab === 'control' ? 'border-b-2 border-[#00d4ff] text-[#8ffcff] bg-[#001f2e]' : 'text-[#3a8a9a]'
          }`}
        >
          SYSTEM
        </button>
        <button
          onClick={() => setActiveTab('reminders')}
          className={`flex-1 py-2 text-center transition-colors font-bold ${
            activeTab === 'reminders' ? 'border-b-2 border-[#00d4ff] text-[#8ffcff] bg-[#001f2e]' : 'text-[#3a8a9a]'
          }`}
        >
          REMINDERS
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 text-center transition-colors font-bold ${
            activeTab === 'search' ? 'border-b-2 border-[#00d4ff] text-[#8ffcff] bg-[#001f2e]' : 'text-[#3a8a9a]'
          }`}
        >
          SEARCH
        </button>
        <button
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-2 text-center transition-colors font-bold ${
            activeTab === 'files' ? 'border-b-2 border-[#00d4ff] text-[#8ffcff] bg-[#001f2e]' : 'text-[#3a8a9a]'
          }`}
        >
          FILES
        </button>
      </div>

      {/* Content Panels */}
      <div className="flex-1 overflow-y-auto p-3 text-xs">
        {/* Tab 1: System Control */}
        {activeTab === 'control' && (
          <div className="flex flex-col gap-4">
            {/* Quick App Launcher */}
            <div>
              <div className="text-[10px] text-[#3a8a9a] font-bold tracking-widest mb-1.5 flex items-center gap-1">
                <AppWindow className="w-3 h-3" /> APPS &amp; TOOLS
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {appShortcuts.map((app) => (
                  <button
                    key={app.name}
                    onClick={() => onLaunchApp(app.cmd)}
                    className="p-2 rounded bg-[#010f18] hover:bg-[#002233] border border-[#0d3347] hover:border-[#1a5c7a] flex items-center gap-2 text-left cursor-pointer transition-colors"
                  >
                    <span>{app.icon}</span>
                    <span className="text-[11px] text-[#8ffcff] truncate">{app.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Volume & Brightness */}
            <div className="p-3 rounded-lg bg-[#010f18] border border-[#0d3347] flex flex-col gap-3">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1 text-[#3a8a9a]">
                    <Volume2 className="w-3 h-3" /> AUDIO LEVEL
                  </span>
                  <span className="font-bold text-[#8ffcff]">{volume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => onVolumeChange(Number(e.target.value))}
                  className="w-full accent-[#00d4ff] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="flex items-center gap-1 text-[#3a8a9a]">
                    <Sun className="w-3 h-3" /> DISPLAY BRIGHTNESS
                  </span>
                  <span className="font-bold text-[#8ffcff]">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={brightness}
                  onChange={(e) => onBrightnessChange(Number(e.target.value))}
                  className="w-full accent-[#00d4ff] cursor-pointer"
                />
              </div>
            </div>

            {/* Quick Toggles */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onToggleWifi}
                className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                  wifiEnabled ? 'bg-[#011520] border-[#00ff88]/40 text-[#00ff88]' : 'bg-[#00060a] border-[#0d3347] text-[#3a8a9a]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">WIFI ADAPTER</span>
                </div>
                <span className="text-[9px] font-bold">{wifiEnabled ? 'ON' : 'OFF'}</span>
              </button>

              <button
                onClick={onToggleDarkMode}
                className="p-2.5 rounded-lg bg-[#011520] border border-[#0d3347] text-[#8ffcff] flex items-center justify-between cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <Moon className="w-3.5 h-3.5 text-[#00d4ff]" />
                  <span className="text-[11px] font-bold">HUD THEME</span>
                </div>
                <span className="text-[9px] text-[#00ff88] font-bold">CYBER</span>
              </button>
            </div>

            {/* Dangerous Power & Session Controls */}
            <div>
              <div className="text-[10px] text-[#ff3355] font-bold tracking-widest mb-1.5">
                PROTECTED POWER ACTIONS (CONFIRMATION REQUIRED)
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => onSystemAction('lock_workstation')}
                  className="p-2 rounded bg-[#010f18] hover:bg-[#001f2e] border border-[#0d3347] text-[#8ffcff] flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <Lock className="w-3.5 h-3.5 text-[#ffaa00]" /> Lock Workstation
                  </span>
                  <ChevronRight className="w-3 h-3 text-[#3a8a9a]" />
                </button>
                <button
                  onClick={() => onSystemAction('restart_system')}
                  className="p-2 rounded bg-[#010f18] hover:bg-[#ffaa00]/10 border border-[#0d3347] hover:border-[#ffaa00]/40 text-[#ffaa00] flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <RotateCcw className="w-3.5 h-3.5" /> Reboot Operating System
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onSystemAction('shutdown_system')}
                  className="p-2 rounded bg-[#010f18] hover:bg-[#ff3355]/10 border border-[#0d3347] hover:border-[#ff3355]/40 text-[#ff3355] flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5 text-xs">
                    <Power className="w-3.5 h-3.5" /> Power Down Computer
                  </span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Reminders */}
        {activeTab === 'reminders' && (
          <div className="flex flex-col gap-3">
            <form onSubmit={handleReminderSubmit} className="flex flex-col gap-2 p-2.5 rounded-lg bg-[#010f18] border border-[#0d3347]">
              <div className="text-[10px] text-[#3a8a9a] font-bold flex items-center gap-1">
                <Plus className="w-3 h-3" /> ADD SMART REMINDER
              </div>
              <input
                type="text"
                value={newReminderTitle}
                onChange={(e) => setNewReminderTitle(e.target.value)}
                placeholder="Reminder title..."
                className="bg-[#00060a] border border-[#0d3347] rounded px-2.5 py-1.5 text-xs text-[#8ffcff] outline-none"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newReminderTime}
                  onChange={(e) => setNewReminderTime(e.target.value)}
                  placeholder="Time (e.g. 17:30)"
                  className="w-24 bg-[#00060a] border border-[#0d3347] rounded px-2.5 py-1.5 text-xs text-[#8ffcff] outline-none"
                />
                <button
                  type="submit"
                  className="flex-1 rounded bg-[#00d4ff] hover:bg-[#5ae2ff] text-[#00060a] font-bold text-xs py-1.5 cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  SCHEDULE
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-1.5">
              {reminders.map((rem) => (
                <div
                  key={rem.id}
                  onClick={() => onToggleReminder(rem.id)}
                  className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                    rem.completed
                      ? 'bg-[#00060a] border-[#0d3347] opacity-50'
                      : 'bg-[#010f18] border-[#0d3347] hover:border-[#1a5c7a]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className={`w-4 h-4 ${rem.completed ? 'text-[#00ff88]' : 'text-[#3a8a9a]'}`} />
                    <div>
                      <div className={`text-xs font-bold ${rem.completed ? 'line-through text-[#3a8a9a]' : 'text-[#8ffcff]'}`}>
                        {rem.title}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-[#3a8a9a]">
                        <Clock className="w-2.5 h-2.5" /> {rem.time}
                        {rem.recurring && <span>• {rem.recurring}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 3: Multi-Mode Web Search */}
        {activeTab === 'search' && (
          <div className="flex flex-col gap-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col gap-2">
              <div className="flex rounded bg-[#010f18] p-0.5 border border-[#0d3347] text-[10px]">
                {(['search', 'news', 'research', 'price', 'compare'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSearchMode(m)}
                    className={`flex-1 py-1 rounded capitalize font-bold ${
                      searchMode === m ? 'bg-[#001f2e] text-[#00d4ff]' : 'text-[#3a8a9a]'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Query in ${searchMode} mode...`}
                  className="flex-1 bg-[#00060a] border border-[#0d3347] focus:border-[#00d4ff] rounded px-2.5 py-1.5 text-xs text-[#8ffcff] outline-none"
                />
                <button
                  type="submit"
                  className="px-3 rounded bg-[#00d4ff] text-[#00060a] font-bold text-xs cursor-pointer"
                  style={{ backgroundColor: accentColor }}
                >
                  <Search className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>

            <div className="flex flex-col gap-2 mt-1">
              <div className="text-[10px] text-[#3a8a9a] font-bold tracking-widest flex items-center justify-between">
                <span>GROUNDED RESULTS ({searchMode.toUpperCase()})</span>
                <span className="text-[#00ff88]">LIVE REST POOL</span>
              </div>
              {searchResults.map((res, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-[#010f18] border border-[#0d3347] flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#8ffcff] line-clamp-1">{res.title}</span>
                    <span className="text-[9px] text-[#00d4ff] uppercase">{res.source}</span>
                  </div>
                  <p className="text-[11px] text-[#5ab8cc] leading-relaxed line-clamp-3">{res.snippet}</p>
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#3a8a9a] hover:text-[#00d4ff] flex items-center gap-1 mt-0.5 truncate"
                  >
                    <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                    <span>{res.url}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: File Processor */}
        {activeTab === 'files' && (
          <div className="flex flex-col gap-3">
            <div className="text-[10px] text-[#3a8a9a] font-bold tracking-widest flex items-center justify-between">
              <span>LOCAL WORKSPACE ARTIFACTS</span>
              <span className="text-[#00d4ff]">READ &amp; PARSE</span>
            </div>

            <div className="flex flex-col gap-1.5">
              {files.map((file) => (
                <div
                  key={file.name}
                  onClick={() => onLaunchApp(`Inspect file: ${file.name}`)}
                  className="p-2 rounded bg-[#010f18] hover:bg-[#001f2e] border border-[#0d3347] hover:border-[#1a5c7a] flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#00d4ff]" />
                    <div>
                      <div className="text-xs font-bold text-[#8ffcff]">{file.name}</div>
                      <div className="text-[10px] text-[#3a8a9a]">{file.size} • {file.updated}</div>
                    </div>
                  </div>
                  <ChevronRight className="w-3 h-3 text-[#3a8a9a]" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
