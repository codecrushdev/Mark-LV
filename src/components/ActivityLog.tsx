import React, { useRef, useEffect } from 'react';
import { LogEntry, AssistantState } from '../types.ts';
import { Terminal, Bot, User, Wrench, ShieldCheck, CornerDownLeft, Mic, MicOff, Paperclip, Sparkles } from 'lucide-react';

interface ActivityLogProps {
  logs: LogEntry[];
  inputValue: string;
  onInputChange: (val: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  isListening: boolean;
  onToggleMic: () => void;
  onQuickPrompt: (prompt: string) => void;
  accentColor: string;
  state: AssistantState;
  onAttachFile: () => void;
}

export const ActivityLog: React.FC<ActivityLogProps> = ({
  logs,
  inputValue,
  onInputChange,
  onSubmit,
  isListening,
  onToggleMic,
  onQuickPrompt,
  accentColor,
  state,
  onAttachFile,
}) => {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const quickChips = [
    'Play the new Dune trailer',
    'Run system diagnostics',
    'Search latest aerospace tech news',
    'Set a reminder to review report at 5 PM',
    'What do you remember about my setup?',
    'Open terminal and check processes',
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#00060a]/95 border-l border-[#0d3347] overflow-hidden select-none">
      {/* Activity Log Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#010d14] border-b border-[#0d3347] text-xs">
        <div className="flex items-center gap-2 font-mono text-[#8ffcff]">
          <Terminal className="w-3.5 h-3.5 text-[#00d4ff]" />
          <span className="font-bold tracking-wider">CONSOLE STREAM &amp; CONVERSATION</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#3a8a9a] font-mono">
          <ShieldCheck className="w-3 h-3 text-[#00ff88]" />
          <span>ECHO-GUARD ACTIVE</span>
        </div>
      </div>

      {/* Message Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 font-mono text-xs">
        {logs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#3a8a9a] p-4">
            <Bot className="w-8 h-8 mb-2 opacity-40 text-[#00d4ff]" />
            <p className="font-bold tracking-wider text-[#8ffcff]">JARVIS MARK LV ONLINE</p>
            <p className="text-[11px] mt-1 max-w-xs">
              Push-to-talk with Ctrl+Space or say &quot;Hey Jarvis&quot;. Real-time voice, computer control, and model ladder standby.
            </p>
          </div>
        )}

        {logs.map((log) => {
          if (log.sender === 'sys') {
            return (
              <div key={log.id} className="self-center my-0.5 px-2.5 py-1 rounded bg-[#011520]/80 border border-[#0d3347] text-[10px] text-[#3a8a9a] tracking-wider max-w-[90%] text-center">
                <span className="text-[#00d4ff] font-bold">SYS // </span>
                <span>{log.text}</span>
              </div>
            );
          }

          if (log.sender === 'tool') {
            return (
              <div key={log.id} className="self-start w-[88%] p-2 rounded-md bg-[#010f18] border border-[#1a5c7a]/60 text-xs">
                <div className="flex items-center justify-between pb-1 border-b border-[#0d3347] text-[10px] text-[#ffaa00] font-bold tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-3 h-3" />
                    TOOL: {log.toolName || 'ACTION EXECUTED'}
                  </span>
                  <span className="text-[#00ff88]">SUCCESS</span>
                </div>
                <div className="text-[11px] text-[#8ffcff] mt-1.5 whitespace-pre-wrap">{log.text}</div>
                {log.toolOutput && (
                  <div className="mt-1.5 p-1.5 rounded bg-[#00060a] border border-[#0d3347] text-[10px] text-[#5ab8cc] font-mono overflow-x-auto max-h-24">
                    {log.toolOutput}
                  </div>
                )}
              </div>
            );
          }

          if (log.sender === 'user') {
            return (
              <div key={log.id} className="self-end max-w-[85%] flex flex-col items-end">
                <div className="text-[9px] text-[#3a8a9a] font-bold tracking-widest mb-0.5 flex items-center gap-1">
                  <User className="w-2.5 h-2.5" />
                  USER // {log.timestamp}
                </div>
                <div className="p-2.5 rounded-lg rounded-tr-none bg-[#011520] border border-[#1a5c7a] text-[#d8f8ff] leading-relaxed shadow-sm">
                  {log.text}
                </div>
              </div>
            );
          }

          // Jarvis Assistant Message
          return (
            <div key={log.id} className="self-start max-w-[88%] flex flex-col items-start">
              <div className="text-[9px] text-[#00d4ff] font-bold tracking-widest mb-0.5 flex items-center gap-1">
                <Bot className="w-2.5 h-2.5" />
                JARVIS // {log.timestamp}
              </div>
              <div
                className="p-2.5 rounded-lg rounded-tl-none bg-[#010d14] border border-[#0d3347] text-[#8ffcff] leading-relaxed shadow-sm"
                style={{ borderLeftColor: accentColor, borderLeftWidth: '3px' }}
              >
                {log.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-3 py-1.5 bg-[#010d14]/70 border-t border-[#0d3347] flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono no-scrollbar">
        <Sparkles className="w-3 h-3 text-[#ffaa00] shrink-0" />
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => onQuickPrompt(chip)}
            className="whitespace-nowrap px-2 py-0.5 rounded bg-[#001f2e] hover:bg-[#00344d] border border-[#0d3347] text-[#5ab8cc] hover:text-[#8ffcff] transition-colors cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Bar */}
      <form onSubmit={onSubmit} className="p-2.5 bg-[#010d14] border-t border-[#0d3347] flex items-center gap-2">
        <button
          type="button"
          onClick={onAttachFile}
          className="p-2 rounded-lg bg-[#001f2e] hover:bg-[#00344d] border border-[#0d3347] text-[#3a8a9a] hover:text-[#8ffcff] transition-colors cursor-pointer"
          title="Attach or inspect file"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={isListening ? 'Listening to voice command...' : 'Send command or query to JARVIS...'}
          className="flex-1 bg-[#000d14] border border-[#0d3347] focus:border-[#00d4ff] rounded-lg px-3 py-2 text-xs text-[#8ffcff] placeholder-[#3a8a9a] outline-none font-mono transition-colors"
        />

        {/* Microphone Toggle Button */}
        <button
          type="button"
          onClick={onToggleMic}
          className={`p-2 rounded-lg border transition-all cursor-pointer ${
            isListening
              ? 'bg-[#ff3355]/20 border-[#ff3355] text-[#ff3355] animate-pulse'
              : 'bg-[#001f2e] hover:bg-[#00344d] border-[#0d3347] text-[#8ffcff]'
          }`}
          title={isListening ? 'Stop listening' : 'Start voice input (or hold Ctrl+Space)'}
        >
          {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputValue.trim()}
          className="px-3 py-2 rounded-lg bg-[#00d4ff] hover:bg-[#5ae2ff] disabled:opacity-30 disabled:cursor-not-allowed text-[#00060a] font-bold text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
          style={{ backgroundColor: accentColor }}
        >
          <span>SEND</span>
          <CornerDownLeft className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
