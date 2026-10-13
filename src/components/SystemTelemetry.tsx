import React from 'react';
import { SystemMetrics } from '../types.ts';
import { Cpu, HardDrive, Zap, Thermometer, Wifi, Activity, BatteryCharging } from 'lucide-react';

interface SystemTelemetryProps {
  metrics: SystemMetrics;
  accentColor: string;
}

export const SystemTelemetry: React.FC<SystemTelemetryProps> = ({ metrics, accentColor }) => {
  const getMeterColor = (val: number, warn: number = 75, crit: number = 90) => {
    if (val >= crit) return '#ff3355';
    if (val >= warn) return '#ffaa00';
    return accentColor;
  };

  return (
    <div className="w-48 flex flex-col gap-2.5 p-3 bg-[#010d14]/90 border-r border-[#0d3347] font-mono text-xs select-none">
      {/* Title */}
      <div className="flex items-center justify-between pb-1 border-b border-[#0d3347]">
        <div className="flex items-center gap-1.5 text-[11px] font-bold tracking-wider text-[#8ffcff]">
          <Activity className="w-3.5 h-3.5 text-[#00d4ff] animate-pulse" />
          <span>TELEMETRY</span>
        </div>
        <span className="text-[10px] text-[#00ff88] font-bold">ONLINE</span>
      </div>

      {/* CPU Metric */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-[#3a8a9a]">
            <Cpu className="w-3 h-3" /> CPU
          </span>
          <span className="font-bold" style={{ color: getMeterColor(metrics.cpu) }}>
            {metrics.cpu.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#001f2e] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${Math.min(100, metrics.cpu)}%`,
              backgroundColor: getMeterColor(metrics.cpu),
            }}
          />
        </div>
      </div>

      {/* RAM Metric */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-[#3a8a9a]">
            <HardDrive className="w-3 h-3" /> RAM
          </span>
          <span className="font-bold" style={{ color: getMeterColor(metrics.memory) }}>
            {metrics.memory.toFixed(1)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#001f2e] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${Math.min(100, metrics.memory)}%`,
              backgroundColor: getMeterColor(metrics.memory),
            }}
          />
        </div>
      </div>

      {/* GPU Metric */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-[#3a8a9a]">
            <Zap className="w-3 h-3" /> GPU
          </span>
          <span className="font-bold" style={{ color: getMeterColor(metrics.gpu) }}>
            {metrics.gpu >= 0 ? `${metrics.gpu.toFixed(1)}%` : 'NVML OK'}
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#001f2e] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${Math.max(10, Math.min(100, metrics.gpu >= 0 ? metrics.gpu : 28))}%`,
              backgroundColor: getMeterColor(metrics.gpu >= 0 ? metrics.gpu : 28),
            }}
          />
        </div>
      </div>

      {/* Temperature Metric */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1 text-[#3a8a9a]">
            <Thermometer className="w-3 h-3" /> TEMP
          </span>
          <span className="font-bold" style={{ color: getMeterColor(metrics.temp, 70, 85) }}>
            {metrics.temp.toFixed(1)}°C
          </span>
        </div>
        <div className="w-full h-1.5 bg-[#001f2e] rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 rounded-full"
            style={{
              width: `${Math.min(100, (metrics.temp / 100) * 100)}%`,
              backgroundColor: getMeterColor(metrics.temp, 70, 85),
            }}
          />
        </div>
      </div>

      {/* Network Bandwidth */}
      <div className="pt-2 border-t border-[#0d3347] flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-[#3a8a9a]">
          <span className="flex items-center gap-1">
            <Wifi className="w-3 h-3 text-[#00d4ff]" /> NET I/O
          </span>
          <span className="text-[#8ffcff]">{(metrics.netSentMb + metrics.netRecvMb).toFixed(2)} MB/s</span>
        </div>
        <div className="flex justify-between text-[9px] text-[#3a8a9a]">
          <span>▲ {metrics.netSentMb.toFixed(2)} MB/s</span>
          <span>▼ {metrics.netRecvMb.toFixed(2)} MB/s</span>
        </div>
      </div>

      {/* Power & OS Info */}
      <div className="pt-2 border-t border-[#0d3347] flex flex-col gap-1 text-[10px]">
        <div className="flex items-center justify-between text-[#3a8a9a]">
          <span className="flex items-center gap-1">
            <BatteryCharging className="w-3 h-3 text-[#00ff88]" /> POWER
          </span>
          <span className="text-[#00ff88] font-bold">{metrics.battery}% CHARGED</span>
        </div>
        <div className="flex justify-between text-[9px] text-[#3a8a9a] mt-1">
          <span>HOST:</span>
          <span className="text-[#8ffcff]">{metrics.osName}</span>
        </div>
        <div className="flex justify-between text-[9px] text-[#3a8a9a]">
          <span>UPTIME:</span>
          <span className="text-[#8ffcff]">{metrics.uptime}</span>
        </div>
      </div>

      {/* Protocol Version Footer Badge */}
      <div className="mt-auto pt-2 border-t border-[#0d3347] text-center">
        <div className="px-1.5 py-1 rounded bg-[#011520] border border-[#0d3347] text-[9px] text-[#3a8a9a] tracking-widest font-bold">
          MARK LV • PROTOCOL 55
        </div>
      </div>
    </div>
  );
};
