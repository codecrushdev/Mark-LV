import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AssistantState,
  LogEntry,
  ModelLadderItem,
  SystemMetrics,
  MemoryFact,
  KnowledgeNode,
  KnowledgeLink,
  ReminderItem,
  UndoAction,
  SearchResult,
  VideoState,
} from './types.ts';
import { HoloAvatar } from './components/HoloAvatar.tsx';
import { AudioWaveform } from './components/AudioWaveform.tsx';
import { SystemTelemetry } from './components/SystemTelemetry.tsx';
import { ActivityLog } from './components/ActivityLog.tsx';
import { ModelLadderModal } from './components/ModelLadderModal.tsx';
import { MemoryOverlay } from './components/MemoryOverlay.tsx';
import { ConfirmBanner } from './components/ConfirmBanner.tsx';
import { UndoDrawer } from './components/UndoDrawer.tsx';
import { ClipboardPanel } from './components/ClipboardPanel.tsx';
import { RemoteDashboardModal } from './components/RemoteDashboardModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { QuickDrawer } from './components/QuickDrawer.tsx';
import {
  Cpu,
  Brain,
  Sliders,
  Smartphone,
  Undo2,
  Camera,
  Video,
  Mic,
  MicOff,
  Sun,
  Shield,
  Radio,
  Zap,
} from 'lucide-react';

const INITIAL_LADDER: ModelLadderItem[] = [
  { name: 'live', role: 'live', latency: '0.24s', status: 'active', consecutiveFailures: 0 },
  { name: 'gemini-2.5-flash-lite', role: 'fast', latency: '0.74s', status: 'healthy', consecutiveFailures: 0 },
  { name: 'gemini-3.5-flash-lite', role: 'fast', latency: '0.56s', status: 'healthy', consecutiveFailures: 0 },
  { name: 'gemini-3.1-flash-lite', role: 'fast', latency: '0.60s', status: 'healthy', consecutiveFailures: 0 },
  { name: 'gemini-flash-lite-latest', role: 'fast', latency: '0.60s', status: 'healthy', consecutiveFailures: 0 },
  { name: 'gemini-2.5-flash', role: 'smart', latency: '0.67s', status: 'healthy', consecutiveFailures: 0 },
  { name: 'gemini-3.5-flash', role: 'smart', latency: '1.13s', status: 'healthy', consecutiveFailures: 0 },
  { name: 'gemini-3.6-flash', role: 'smart', latency: '1.45s', status: 'healthy', consecutiveFailures: 0 },
  { name: 'gemini-3-flash-preview', role: 'smart', latency: '1.80s', status: 'healthy', consecutiveFailures: 0 },
];

const INITIAL_FACTS: MemoryFact[] = [
  { id: '1', category: 'User', key: 'preferred_title', value: 'Sir / Commander', updated: 'Today, 09:12' },
  { id: '2', category: 'Preferences', key: 'coffee_protocol', value: 'Double espresso, aeropress single-origin', updated: 'Oct 12' },
  { id: '3', category: 'Hardware', key: 'gpu_device', value: 'NVIDIA RTX 4090 (NVML direct probe)', updated: 'Oct 10' },
  { id: '4', category: 'Projects', key: 'active_mission', value: 'Mark LV Cross-Platform Personal AI Suite', updated: 'Today, 07:45' },
  { id: '5', category: 'Work', key: 'primary_editor', value: 'VS Code with dark modern scheme', updated: 'Oct 09' },
];

const INITIAL_NODES: KnowledgeNode[] = [
  { id: 'user', label: 'Operator (Sir)', type: 'person' },
  { id: 'jarvis', label: 'JARVIS Mark LV', type: 'concept' },
  { id: 'gpu', label: 'RTX 4090 GPU', type: 'device' },
  { id: 'project_lv', label: 'Mark LV Suite', type: 'project' },
];

const INITIAL_LINKS: KnowledgeLink[] = [
  { source: 'jarvis', target: 'user', relation: 'assists' },
  { source: 'user', target: 'project_lv', relation: 'leads' },
  { source: 'jarvis', target: 'gpu', relation: 'monitors' },
];

const INITIAL_REMINDERS: ReminderItem[] = [
  { id: '1', title: 'Verify Gemini Live API token quota pool', time: '14:30', completed: false, recurring: 'Daily' },
  { id: '2', title: 'Review morning flight prices to Geneva', time: '17:00', completed: false },
  { id: '3', title: 'Nightly git backup & model ladder calibration', time: '23:00', completed: true, recurring: 'Daily' },
];

export const App: React.FC = () => {
  // HUD Core State
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [assistantName, setAssistantName] = useState('JARVIS');
  const [userName, setUserName] = useState('Sir');
  const [accentColor, setAccentColor] = useState('#00d4ff');
  const [voice, setVoice] = useState('Puck');
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [morningBriefingEnabled, setMorningBriefingEnabled] = useState(true);
  const [inputDevice, setInputDevice] = useState('Default Microphone (Built-in Array)');
  const [outputDevice, setOutputDevice] = useState('Default Speakers (High Definition Audio)');
  const [isMuted, setIsMuted] = useState(false);

  // Audio level and speech synthesis
  const [audioLevel, setAudioLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');

  // Video and Vision
  const [videoState, setVideoState] = useState<VideoState>({
    isOpen: false,
    title: 'Dune: Part Two — Official Trailer',
    url: 'https://www.youtube-nocookie.com/embed/Way9Dexny3w',
    isMuted: true,
    isSplitAudio: true,
    driftMs: 14,
  });
  const [visionActive, setVisionActive] = useState(false);

  // Telemetry metrics
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 24.5,
    memory: 48.2,
    gpu: 31.0,
    temp: 46.5,
    netSentMb: 1.25,
    netRecvMb: 4.82,
    battery: 100,
    osName: 'Linux / Posix 6.8',
    uptime: '14h 22m',
  });

  // Model ladder
  const [ladder, setLadder] = useState<ModelLadderItem[]>(INITIAL_LADDER);
  const [activeModel, setActiveModel] = useState('live');

  // Activity logs
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 'init-1',
      timestamp: '09:55:01',
      sender: 'sys',
      text: 'MARK LV runtime initialized. Echo-Guard active. Model ladder engaged.',
    },
    {
      id: 'init-2',
      timestamp: '09:55:02',
      sender: 'jarvis',
      text: 'Online and standing by, Sir. All nine model rungs are verified and optical sensors are calibrated.',
    },
  ]);

  // Modals & Panels
  const [ladderModalOpen, setLadderModalOpen] = useState(false);
  const [memoryOpen, setMemoryOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [undoOpen, setUndoOpen] = useState(false);

  // Features data
  const [memoryFacts, setMemoryFacts] = useState<MemoryFact[]>(INITIAL_FACTS);
  const [knowledgeNodes, setKnowledgeNodes] = useState<KnowledgeNode[]>(INITIAL_NODES);
  const [knowledgeLinks, setKnowledgeLinks] = useState<KnowledgeLink[]>(INITIAL_LINKS);
  const [reminders, setReminders] = useState<ReminderItem[]>(INITIAL_REMINDERS);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([
    {
      id: 'u1',
      title: 'Brightness Adjustment',
      timestamp: '09:40:12',
      description: 'Modified system display brightness to 90%',
      canUndo: true,
      undone: false,
    },
  ]);

  // Confirmation banner
  const [confirmBanner, setConfirmBanner] = useState<{
    isOpen: boolean;
    title: string;
    desc: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    desc: '',
    onConfirm: () => {},
  });

  // Clipboard intelligence
  const [clipboard, setClipboard] = useState<{ isOpen: boolean; text: string }>({
    isOpen: false,
    text: '',
  });

  // Quick system settings
  const [volume, setVolume] = useState(75);
  const [brightness, setBrightness] = useState(85);
  const [wifiEnabled, setWifiEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(true);

  // Search Results
  const [searchResults, setSearchResults] = useState<SearchResult[]>([
    {
      title: 'Gemini 3.1 Flash Live API Performance Metrics',
      snippet: 'Ultra-low latency real-time voice streaming architecture with bidirectional audio transport.',
      url: 'https://ai.google.dev/gemini-api/docs/live',
      source: 'Google AI Grounding',
      mode: 'news',
    },
    {
      title: 'Aerospace autonomous flight controllers with neural telemetry',
      snippet: 'Real-time telemetry analysis and failover ladders for safety-critical edge architectures.',
      url: 'https://arxiv.org/abs/2405.aerospace',
      source: 'Research Portal',
      mode: 'research',
    },
  ]);

  // Apply theme accent color dynamically to CSS variables
  useEffect(() => {
    document.documentElement.style.setProperty('--pri', accentColor);
    document.documentElement.style.setProperty('--text', accentColor);
  }, [accentColor]);

  // Background metric fluctuation loop
  useEffect(() => {
    const timer = setInterval(() => {
      setMetrics((prev) => ({
        ...prev,
        cpu: Math.max(5, Math.min(95, prev.cpu + (Math.random() * 6 - 3))),
        memory: Math.max(20, Math.min(90, prev.memory + (Math.random() * 2 - 1))),
        gpu: Math.max(10, Math.min(90, prev.gpu + (Math.random() * 4 - 2))),
        temp: Math.max(38, Math.min(82, prev.temp + (Math.random() * 1.5 - 0.75))),
        netSentMb: Math.max(0.1, prev.netSentMb + (Math.random() * 0.4 - 0.2)),
        netRecvMb: Math.max(0.5, prev.netRecvMb + (Math.random() * 0.8 - 0.4)),
      }));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  // Web Speech Synthesis with synchronized mouth viseme levels
  const speakText = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setAssistantState('speaking');
        setTimeout(() => setAssistantState('idle'), 2500);
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;

      // Find suitable voice if available
      const voices = window.speechSynthesis.getVoices();
      const match = voices.find((v) => v.name.toLowerCase().includes('google') || v.name.toLowerCase().includes('en'));
      if (match) utterance.voice = match;

      let visemeTimer: any = null;

      utterance.onstart = () => {
        setAssistantState('speaking');
        // Produce simulated speech viseme amplitude schedule
        visemeTimer = setInterval(() => {
          setAudioLevel(0.3 + Math.random() * 0.65);
        }, 50);
      };

      utterance.onend = () => {
        clearInterval(visemeTimer);
        setAudioLevel(0);
        setAssistantState('idle');
      };

      utterance.onerror = () => {
        clearInterval(visemeTimer);
        setAudioLevel(0);
        setAssistantState('idle');
      };

      window.speechSynthesis.speak(utterance);
    },
    []
  );

  // Instant Acknowledgment logic ("Speaks a short context-aware reply in your language the instant a longer task starts")
  const announceAndExecute = (acknowledgment: string, execution: () => void) => {
    // Add SYS notice
    setLogs((prev) => [
      ...prev,
      {
        id: `ack-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        sender: 'sys',
        text: `Instant Acknowledgment: "${acknowledgment}"`,
      },
    ]);
    speakText(acknowledgment);
    setTimeout(execution, 800);
  };

  // Process user request & action routing
  const handleProcessCommand = (command: string) => {
    const timeStr = new Date().toLocaleTimeString();
    const cleanCmd = command.trim().toLowerCase();

    // Append user message
    setLogs((prev) => [
      ...prev,
      {
        id: `u-${Date.now()}`,
        timestamp: timeStr,
        sender: 'user',
        text: command,
      },
    ]);

    setAssistantState('thinking');

    // 1. Play video / trailer command
    if (cleanCmd.includes('dune') || cleanCmd.includes('trailer') || cleanCmd.includes('play video') || cleanCmd.includes('play youtube')) {
      announceAndExecute('Pulling up the trailer on the main display now, Sir.', () => {
        setVideoState({
          isOpen: true,
          title: 'Dune: Part Two — Official Trailer',
          url: 'https://www.youtube-nocookie.com/embed/Way9Dexny3w',
          isMuted: true,
          isSplitAudio: true,
          driftMs: 12,
        });
        setAssistantState('video');
        setLogs((prev) => [
          ...prev,
          {
            id: `v-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            sender: 'tool',
            text: 'Loaded video stream into central HUD viewport. Audio muted by default to preserve speech echo-guard.',
            toolName: 'video_player.py',
            toolOutput: 'Format: 1080p60 • Stream Sync: 12ms drift • Audio split stream active',
          },
          {
            id: `j-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            sender: 'jarvis',
            text: 'The trailer is queued where my face was. Audio is muted as per protocol — say "unmute" or tap the header button whenever you wish to hear the soundtrack.',
          },
        ]);
      });
      return;
    }

    // 2. Camera / Vision command
    if (cleanCmd.includes('camera') || cleanCmd.includes('look') || cleanCmd.includes('see') || cleanCmd.includes('vision') || cleanCmd.includes('screen')) {
      announceAndExecute('Engaging primary optical sensors and display inspection.', () => {
        setVisionActive(true);
        setAssistantState('vision');
        setLogs((prev) => [
          ...prev,
          {
            id: `c-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            sender: 'tool',
            text: 'Screen capture and optical webcam feed routed into active Gemini multimodal buffer.',
            toolName: 'screen_processor.py',
            toolOutput: 'Resolution: 1920x1080 • Frame rate: 30 FPS • Object detection: active',
          },
          {
            id: `j-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            sender: 'jarvis',
            text: 'I have visual awareness active on both your workspace and the room sensor.',
          },
        ]);
      });
      return;
    }

    // 3. Telemetry & Diagnostics
    if (cleanCmd.includes('diagnostic') || cleanCmd.includes('status') || cleanCmd.includes('telemetry') || cleanCmd.includes('system')) {
      announceAndExecute('Scanning hardware buses and thermal sensors.', () => {
        const reply = `Systems are nominal, ${userName}. CPU load is at ${metrics.cpu.toFixed(1)}%, memory at ${metrics.memory.toFixed(1)}%, and GPU core temperature is steady at ${metrics.temp.toFixed(1)}°C.`;
        setLogs((prev) => [
          ...prev,
          {
            id: `t-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            sender: 'tool',
            text: 'Retrieved kernel performance counters via NVML and psutil.',
            toolName: 'system_monitor.py',
            toolOutput: `CPU: ${metrics.cpu}% | RAM: ${metrics.memory}% | GPU: ${metrics.gpu}% | Temp: ${metrics.temp}°C`,
          },
          {
            id: `j-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            sender: 'jarvis',
            text: reply,
          },
        ]);
        speakText(reply);
      });
      return;
    }

    // 4. Memory Inspection
    if (cleanCmd.includes('memory') || cleanCmd.includes('remember') || cleanCmd.includes('recall')) {
      setMemoryOpen(true);
      const reply = `I have ${memoryFacts.length} long-term facts stored in local memory. You can review or delete any fact from the memory overlay.`;
      setLogs((prev) => [
        ...prev,
        {
          id: `m-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          sender: 'jarvis',
          text: reply,
        },
      ]);
      speakText(reply);
      setAssistantState('idle');
      return;
    }

    // 5. Model ladder inspection
    if (cleanCmd.includes('model') || cleanCmd.includes('ladder') || cleanCmd.includes('gemini') || cleanCmd.includes('quota')) {
      setLadderModalOpen(true);
      const reply = `Active model is currently "${activeModel}". All nine ladder rungs are ready for instant failover if quota limits are encountered.`;
      setLogs((prev) => [
        ...prev,
        {
          id: `l-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          sender: 'jarvis',
          text: reply,
        },
      ]);
      speakText(reply);
      setAssistantState('idle');
      return;
    }

    // 6. Dangerous power actions (confirmation banner)
    if (cleanCmd.includes('shutdown') || cleanCmd.includes('restart') || cleanCmd.includes('reboot') || cleanCmd.includes('lock')) {
      setAssistantState('idle');
      const actionName = cleanCmd.includes('shutdown')
        ? 'Power Down Computer'
        : cleanCmd.includes('restart') || cleanCmd.includes('reboot')
        ? 'Reboot Operating System'
        : 'Lock Workstation';

      setConfirmBanner({
        isOpen: true,
        title: actionName,
        desc: 'This is an irreversible computer control action. As per MARK LV safety protocol, you must manually authorize execution.',
        onConfirm: () => {
          setConfirmBanner((prev) => ({ ...prev, isOpen: false }));
          setLogs((prev) => [
            ...prev,
            {
              id: `p-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              sender: 'tool',
              text: `Operator confirmed execution: ${actionName}`,
              toolName: 'computer_control.py',
              toolOutput: 'Signal sent to OS kernel.',
            },
            {
              id: `pj-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              sender: 'jarvis',
              text: `Acknowledged, ${userName}. Executing ${actionName.toLowerCase()} now.`,
            },
          ]);
          speakText(`Executing ${actionName.toLowerCase()}.`);
        },
      });
      return;
    }

    // 7. Web search / research
    if (cleanCmd.includes('search') || cleanCmd.includes('news') || cleanCmd.includes('price') || cleanCmd.includes('weather')) {
      announceAndExecute(`Checking live sources for "${command}".`, () => {
        setDrawerOpen(true);
        const reply = `I've fetched grounded results and displayed them in the dynamic drawer.`;
        setLogs((prev) => [
          ...prev,
          {
            id: `s-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            sender: 'tool',
            text: `Executed REST grounded search via active Gemini search rung.`,
            toolName: 'web_search.py',
            toolOutput: 'Candidates: 5 • Grounding metadata attached',
          },
          {
            id: `sj-${Date.now()}`,
            timestamp: new Date().toLocaleTimeString(),
            sender: 'jarvis',
            text: reply,
          },
        ]);
        speakText(reply);
      });
      return;
    }

    // Default conversational reply
    setTimeout(() => {
      const reply = `Understood, ${userName}. Working with the active ladder model to process your request. Everything is logged in the console.`;
      setLogs((prev) => [
        ...prev,
        {
          id: `ans-${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          sender: 'jarvis',
          text: reply,
        },
      ]);
      speakText(reply);
    }, 600);
  };

  // Form submit
  const handleInputSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;
    const cmd = inputText;
    setInputText('');
    handleProcessCommand(cmd);
  };

  // Voice Recognition Handler (Push-to-Talk and Wake Word)
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setAssistantState('idle');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsListening(true);
      setAssistantState('listening');
      // Simulated voice prompt if browser lacks speech recognition
      setTimeout(() => {
        setIsListening(false);
        handleProcessCommand('Play the new Dune trailer');
      }, 2500);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setAssistantState('listening');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setIsListening(false);
        handleProcessCommand(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setAssistantState('idle');
      };

      recognition.onend = () => {
        setIsListening(false);
        if (assistantState === 'listening') setAssistantState('idle');
      };

      recognition.start();
    } catch {
      setIsListening(false);
      setAssistantState('idle');
    }
  };

  // Keyboard Push-to-Talk shortcut listener (Space holding or Ctrl+Space)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.code === 'Space') || e.code === 'F4') {
        if (e.code === 'F4') {
          setIsMuted((prev) => !prev);
          return;
        }
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Simulate failover ladder (Testing 429 quota exhaustion)
  const handleSimulateFallback = (failedName: string) => {
    setLadder((prev) => {
      const updated = prev.map((item) =>
        item.name === failedName
          ? { ...item, status: 'cooldown' as const, consecutiveFailures: item.consecutiveFailures + 1 }
          : item
      );
      // Promote next healthy model
      const nextHealthy = updated.find((m) => m.status === 'healthy' || m.status === 'active');
      if (nextHealthy) {
        setActiveModel(nextHealthy.name);
      }
      return updated;
    });

    setLogs((prev) => [
      ...prev,
      {
        id: `fail-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        sender: 'sys',
        text: `Rung "${failedName}" returned 429 RESOURCE_EXHAUSTED. Shifted to next ladder rung seamlessly.`,
      },
    ]);
  };

  const handleResetCooldowns = () => {
    setLadder((prev) =>
      prev.map((item, idx) => ({
        ...item,
        status: idx === 0 ? 'active' : 'healthy',
        consecutiveFailures: 0,
      }))
    );
    setActiveModel('live');
  };

  // Clipboard simulation
  const handleTriggerClipboard = (txt: string) => {
    setClipboard({ isOpen: true, text: txt });
  };

  return (
    <div className="relative w-screen h-screen flex flex-col bg-[#00060a] text-[#8ffcff] font-mono select-none overflow-hidden">
      {/* HUD CRT Scanline Overlay */}
      <div className="absolute inset-0 hud-scanline pointer-events-none z-30" />

      {/* TOP HEADER BAR */}
      <header className="h-12 px-4 bg-[#010d14]/95 border-b border-[#0d3347] flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#00d4ff] shadow-[0_0_8px_#00d4ff]" />
            <h1 className="text-sm font-black tracking-[0.25em] text-[#d8f8ff]">
              MARK <span className="text-[#00d4ff]">LV</span>
            </h1>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#011520] border border-[#0d3347] text-[#3a8a9a] font-bold">
              BUILD 55.0
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-[#0d3347] text-xs">
            <span className="text-[#3a8a9a]">ACTIVE RUNG:</span>
            <button
              onClick={() => setLadderModalOpen(true)}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#001f2e] hover:bg-[#00344d] border border-[#1a5c7a] text-[11px] font-bold text-[#8ffcff] cursor-pointer transition-colors"
            >
              <Cpu className="w-3 h-3 text-[#00d4ff]" />
              <span>{activeModel.toUpperCase()}</span>
            </button>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Push to talk status badge */}
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded bg-[#011520] border border-[#0d3347] text-[10px] text-[#3a8a9a]">
            <Radio className="w-3 h-3 text-[#00ff88]" />
            <span>PUSH-TO-TALK: CTRL+SPACE</span>
          </div>

          {/* Quick Actions / Computer Control Drawer */}
          <button
            onClick={() => setDrawerOpen(!drawerOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#011520] hover:bg-[#001f2e] border border-[#0d3347] hover:border-[#1a5c7a] text-xs text-[#8ffcff] cursor-pointer transition-colors"
            title="Open system controls and action drawer"
          >
            <Zap className="w-3.5 h-3.5 text-[#ffaa00]" />
            <span className="hidden sm:inline">ACTIONS</span>
          </button>

          {/* Optical Camera Mode */}
          <button
            onClick={() => setVisionActive(!visionActive)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded border text-xs cursor-pointer transition-colors ${
              visionActive
                ? 'bg-[#001f2e] border-[#00d4ff] text-[#00d4ff]'
                : 'bg-[#011520] hover:bg-[#001f2e] border-[#0d3347] text-[#3a8a9a] hover:text-[#8ffcff]'
            }`}
            title="Toggle webcam / computer optical vision"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">VISION</span>
          </button>

          {/* Memory Overlay */}
          <button
            onClick={() => setMemoryOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#011520] hover:bg-[#001f2e] border border-[#0d3347] hover:border-[#1a5c7a] text-xs text-[#8ffcff] cursor-pointer transition-colors"
            title="Inspect long-term memory facts"
          >
            <Brain className="w-3.5 h-3.5 text-[#00d4ff]" />
            <span className="hidden sm:inline">MEMORY</span>
          </button>

          {/* Undo Stack */}
          <button
            onClick={() => setUndoOpen(true)}
            className="p-1.5 rounded bg-[#011520] hover:bg-[#001f2e] border border-[#0d3347] text-[#3a8a9a] hover:text-[#8ffcff] cursor-pointer transition-colors"
            title="Undo Journal"
          >
            <Undo2 className="w-4 h-4" />
          </button>

          {/* Remote Phone Dashboard */}
          <button
            onClick={() => setDashboardOpen(true)}
            className="p-1.5 rounded bg-[#011520] hover:bg-[#001f2e] border border-[#0d3347] text-[#3a8a9a] hover:text-[#8ffcff] cursor-pointer transition-colors"
            title="Remote Phone Dashboard Pairing"
          >
            <Smartphone className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 rounded bg-[#011520] hover:bg-[#001f2e] border border-[#0d3347] text-[#3a8a9a] hover:text-[#8ffcff] cursor-pointer transition-colors"
            title="Settings & Audio Devices"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN HUD BODY */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: System Telemetry (Hardware, CPU, Temp, GPU, Battery) */}
        <SystemTelemetry metrics={metrics} accentColor={accentColor} />

        {/* Center: Holographic Face / Video HUD / Optical Sensors */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-[#00060a]">
          <HoloAvatar
            state={assistantState}
            audioLevel={audioLevel}
            accentColor={accentColor}
            videoState={videoState}
            onToggleVideoMute={() =>
              setVideoState((prev) => ({ ...prev, isMuted: !prev.isMuted }))
            }
            onCloseVideo={() => {
              setVideoState((prev) => ({ ...prev, isOpen: false }));
              setAssistantState('idle');
            }}
            visionActive={visionActive}
            onCloseVision={() => {
              setVisionActive(false);
              setAssistantState('idle');
            }}
          />

          {/* Real-time reactive Audio Waveform Bar */}
          <AudioWaveform
            level={audioLevel}
            active={assistantState === 'speaking' || isListening}
            accentColor={accentColor}
          />
        </div>

        {/* Right Side: Activity Log & Conversation Console */}
        <div className="w-96 flex flex-col h-full z-10">
          <ActivityLog
            logs={logs}
            inputValue={inputText}
            onInputChange={setInputText}
            onSubmit={handleInputSubmit}
            isListening={isListening}
            onToggleMic={toggleListening}
            onQuickPrompt={handleProcessCommand}
            accentColor={accentColor}
            state={assistantState}
            onAttachFile={() =>
              handleProcessCommand('Inspect local repository code and manifest')
            }
          />
        </div>
      </div>

      {/* FLOATING ACTION DRAWERS AND MODALS */}
      <QuickDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLaunchApp={(app) => handleProcessCommand(`Launch application ${app}`)}
        onSystemAction={(act) => handleProcessCommand(act)}
        volume={volume}
        onVolumeChange={setVolume}
        brightness={brightness}
        onBrightnessChange={setBrightness}
        wifiEnabled={wifiEnabled}
        onToggleWifi={() => setWifiEnabled(!wifiEnabled)}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        reminders={reminders}
        onAddReminder={(title, time) => {
          setReminders((prev) => [
            ...prev,
            { id: Date.now().toString(), title, time, completed: false },
          ]);
        }}
        onToggleReminder={(id) => {
          setReminders((prev) =>
            prev.map((r) => (r.id === id ? { ...r, completed: !r.completed } : r))
          );
        }}
        searchResults={searchResults}
        onTriggerSearch={(q, mode) => {
          setSearchResults((prev) => [
            {
              title: `Grounded synthesis for: ${q}`,
              snippet: `Live extraction from ${mode} index through Gemini REST grounded search.`,
              url: `https://search.local/${encodeURIComponent(q)}`,
              source: mode.toUpperCase(),
              mode: mode,
            },
            ...prev,
          ]);
        }}
        accentColor={accentColor}
      />

      {/* Model Ladder Modal */}
      <ModelLadderModal
        isOpen={ladderModalOpen}
        onClose={() => setLadderModalOpen(false)}
        ladder={ladder}
        activeModel={activeModel}
        onSelectModel={(name) => {
          setActiveModel(name);
          setLadderModalOpen(false);
          setLogs((prev) => [
            ...prev,
            {
              id: `switch-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              sender: 'sys',
              text: `Operator promoted model ladder rung to: ${name}`,
            },
          ]);
        }}
        onSimulateFallback={handleSimulateFallback}
        onResetCooldowns={handleResetCooldowns}
        accentColor={accentColor}
      />

      {/* Memory Facts & Knowledge Graph Overlay */}
      <MemoryOverlay
        isOpen={memoryOpen}
        onClose={() => setMemoryOpen(false)}
        facts={memoryFacts}
        onForgetFact={(id) => {
          setMemoryFacts((prev) => prev.filter((f) => f.id !== id));
          setLogs((prev) => [
            ...prev,
            {
              id: `forget-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              sender: 'sys',
              text: 'Deleted memory fact from long-term storage.',
            },
          ]);
        }}
        onAddFact={(category, key, value) => {
          setMemoryFacts((prev) => [
            {
              id: Date.now().toString(),
              category,
              key,
              value,
              updated: 'Just now',
            },
            ...prev,
          ]);
        }}
        nodes={knowledgeNodes}
        links={knowledgeLinks}
        accentColor={accentColor}
      />

      {/* Safety Confirmation Banner */}
      <ConfirmBanner
        isOpen={confirmBanner.isOpen}
        actionTitle={confirmBanner.title}
        actionDescription={confirmBanner.desc}
        onConfirm={confirmBanner.onConfirm}
        onCancel={() => setConfirmBanner((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Undo Drawer */}
      <UndoDrawer
        isOpen={undoOpen}
        onClose={() => setUndoOpen(false)}
        actions={undoStack}
        onUndo={(id) => {
          setUndoStack((prev) =>
            prev.map((a) => (a.id === id ? { ...a, undone: true } : a))
          );
          setLogs((prev) => [
            ...prev,
            {
              id: `undo-${Date.now()}`,
              timestamp: new Date().toLocaleTimeString(),
              sender: 'sys',
              text: 'Reverted action via Undo Journal.',
            },
          ]);
        }}
      />

      {/* Clipboard Intelligence Panel */}
      <ClipboardPanel
        isOpen={clipboard.isOpen}
        text={clipboard.text}
        onClose={() => setClipboard({ isOpen: false, text: '' })}
        onAction={(cmd) => {
          setClipboard({ isOpen: false, text: '' });
          handleProcessCommand(cmd);
        }}
      />

      {/* Remote Dashboard Modal */}
      <RemoteDashboardModal
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        onSendRemoteCommand={(cmd) => handleProcessCommand(cmd)}
        accentColor={accentColor}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        assistantName={assistantName}
        onAssistantNameChange={setAssistantName}
        userName={userName}
        onUserNameChange={setUserName}
        accentColor={accentColor}
        onAccentColorChange={setAccentColor}
        voice={voice}
        onVoiceChange={setVoice}
        wakeWordEnabled={wakeWordEnabled}
        onToggleWakeWord={() => setWakeWordEnabled(!wakeWordEnabled)}
        morningBriefingEnabled={morningBriefingEnabled}
        onToggleMorningBriefing={() => setMorningBriefingEnabled(!morningBriefingEnabled)}
        inputDevice={inputDevice}
        onInputDeviceChange={setInputDevice}
        outputDevice={outputDevice}
        onOutputDeviceChange={setOutputDevice}
      />
    </div>
  );
};

export default App;
