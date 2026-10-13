import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  level: number;
  active: boolean;
  accentColor: string;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({ level, active, accentColor }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let phase = 0;

    const render = () => {
      phase += 0.08;
      const w = (canvas.width = canvas.clientWidth);
      const h = (canvas.height = canvas.clientHeight);

      ctx.clearRect(0, 0, w, h);

      const bars = 48;
      const barWidth = Math.max(2, (w / bars) - 2);
      const centerY = h / 2;

      for (let i = 0; i < bars; i++) {
        const x = i * (barWidth + 2);
        const distFromCenter = Math.abs(i - bars / 2) / (bars / 2);
        const envelope = 1 - Math.pow(distFromCenter, 1.8);

        // Sinusoidal harmonics + live audio level
        const wave = Math.sin(phase + i * 0.3) * 0.5 + Math.cos(phase * 1.5 - i * 0.2) * 0.5;
        const baseHeight = active ? 4 : 2;
        const amplitude = active ? (level * (h * 0.8) * envelope + (wave * 8 * envelope)) : (Math.sin(phase + i * 0.1) * 3 + 4);
        const barHeight = Math.max(baseHeight, amplitude);

        const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
        gradient.addColorStop(0, accentColor);
        gradient.addColorStop(0.5, '#ffffff');
        gradient.addColorStop(1, accentColor);

        ctx.fillStyle = gradient;
        ctx.globalAlpha = active ? (0.6 + level * 0.4) : 0.25;

        ctx.fillRect(x, centerY - barHeight / 2, barWidth, barHeight);
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [level, active, accentColor]);

  return (
    <div className="w-full h-10 px-2 flex items-center bg-[#010d14]/70 border-t border-[#0d3347]">
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
};
