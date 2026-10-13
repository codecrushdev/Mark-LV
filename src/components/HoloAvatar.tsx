import React, { useEffect, useRef } from 'react';
import { AssistantState, VideoState } from '../types.ts';
import { Video, MicOff, Volume2, VolumeX, X, Camera, Eye } from 'lucide-react';

interface HoloAvatarProps {
  state: AssistantState;
  audioLevel: number;
  accentColor: string;
  videoState: VideoState;
  onToggleVideoMute: () => void;
  onCloseVideo: () => void;
  visionActive: boolean;
  onCloseVision: () => void;
}

export const HoloAvatar: React.FC<HoloAvatarProps> = ({
  state,
  audioLevel,
  accentColor,
  videoState,
  onToggleVideoMute,
  onCloseVideo,
  visionActive,
  onCloseVision,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  const levelRef = useRef(audioLevel);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    levelRef.current = audioLevel;
  }, [audioLevel]);

  // Wireframe 3D Face Avatar generation & animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || 400);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Build canonical 3D head landmark points
    // Normalized coords: x: -1 to 1, y: -1 to 1 (crown to chin), z: depth
    const basePoints: Array<{ x: number; y: number; z: number }> = [];

    // Cranium / Head contour rings
    for (let r = 0; r < 7; r++) {
      const y = -0.85 + r * 0.25;
      const radius = Math.sqrt(Math.max(0, 1 - Math.pow(y * 1.1, 2))) * 0.75;
      for (let s = 0; s < 16; s++) {
        const theta = (s / 16) * Math.PI * 2;
        basePoints.push({
          x: Math.sin(theta) * radius * 0.85,
          y: y,
          z: Math.cos(theta) * radius * 0.95,
        });
      }
    }

    // Facial feature landmarks:
    // Left eye loop
    const eyeLeft: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * Math.PI * 2;
      eyeLeft.push({
        x: -0.28 + Math.cos(th) * 0.09,
        y: -0.08 + Math.sin(th) * 0.05,
        z: 0.65 + Math.sin(th) * 0.02,
      });
    }

    // Right eye loop
    const eyeRight: Array<{ x: number; y: number; z: number }> = [];
    for (let i = 0; i < 8; i++) {
      const th = (i / 8) * Math.PI * 2;
      eyeRight.push({
        x: 0.28 + Math.cos(th) * 0.09,
        y: -0.08 + Math.sin(th) * 0.05,
        z: 0.65 + Math.sin(th) * 0.02,
      });
    }

    // Eyebrows
    const browLeft = [
      { x: -0.42, y: -0.24, z: 0.64 },
      { x: -0.32, y: -0.28, z: 0.68 },
      { x: -0.20, y: -0.26, z: 0.70 },
      { x: -0.12, y: -0.21, z: 0.67 },
    ];
    const browRight = [
      { x: 0.12, y: -0.21, z: 0.67 },
      { x: 0.20, y: -0.26, z: 0.70 },
      { x: 0.32, y: -0.28, z: 0.68 },
      { x: 0.42, y: -0.24, z: 0.64 },
    ];

    // Nose bridge and tip
    const nose = [
      { x: 0, y: -0.18, z: 0.72 },
      { x: 0, y: 0.02, z: 0.82 },
      { x: 0, y: 0.14, z: 0.88 },
      { x: -0.08, y: 0.16, z: 0.78 },
      { x: 0.08, y: 0.16, z: 0.78 },
    ];

    // Mouth / Lips outer contour (rigged to jaw/viseme)
    const lipsOuterBase = [
      { x: -0.22, y: 0.38, z: 0.68 },
      { x: -0.11, y: 0.34, z: 0.74 },
      { x: 0, y: 0.35, z: 0.76 },
      { x: 0.11, y: 0.34, z: 0.74 },
      { x: 0.22, y: 0.38, z: 0.68 },
      { x: 0.14, y: 0.44, z: 0.72 },
      { x: 0, y: 0.46, z: 0.74 },
      { x: -0.14, y: 0.44, z: 0.72 },
    ];

    // Jawline & Chin
    const jawline = [
      { x: -0.52, y: 0.05, z: 0.2 },
      { x: -0.46, y: 0.32, z: 0.4 },
      { x: -0.28, y: 0.58, z: 0.58 },
      { x: 0, y: 0.74, z: 0.66 },
      { x: 0.28, y: 0.58, z: 0.58 },
      { x: 0.46, y: 0.32, z: 0.4 },
      { x: 0.52, y: 0.05, z: 0.2 },
    ];

    let t = 0;
    let blinkProgress = 0;
    let nextBlinkTime = 120;
    let smoothedMouthOpen = 0;
    let smoothedGazeX = 0;
    let smoothedGazeY = 0;

    const render = () => {
      t += 0.025;
      const currentState = stateRef.current;
      const targetAudio = currentState === 'speaking' || currentState === 'listening' ? levelRef.current : 0;

      // Smoothed speech mouth viseme (jaw opening)
      const targetOpen = currentState === 'speaking' ? Math.min(1.0, targetAudio * 2.5 + 0.1) : 0;
      smoothedMouthOpen += (targetOpen - smoothedMouthOpen) * 0.3;

      // Natural blinking
      if (t > nextBlinkTime) {
        blinkProgress += 0.18;
        if (blinkProgress >= Math.PI) {
          blinkProgress = 0;
          nextBlinkTime = t + 100 + Math.random() * 150;
        }
      }
      const isAsleep = currentState === 'asleep';
      const eyeOpenRatio = isAsleep ? 0.05 : 1.0 - Math.sin(blinkProgress) * 0.95;

      // Gaze saccade behavior
      let targetGazeX = 0;
      let targetGazeY = 0;
      if (currentState === 'thinking') {
        targetGazeX = -0.25;
        targetGazeY = -0.2;
      } else if (currentState === 'listening') {
        targetGazeX = 0;
        targetGazeY = 0.05;
      } else {
        targetGazeX = Math.sin(t * 0.4) * 0.08;
        targetGazeY = Math.cos(t * 0.3) * 0.05;
      }
      smoothedGazeX += (targetGazeX - smoothedGazeX) * 0.08;
      smoothedGazeY += (targetGazeY - smoothedGazeY) * 0.08;

      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const scale = Math.min(width, height) * 0.38;

      // 3D rotation angles
      const rotY = smoothedGazeX * 0.8 + Math.sin(t * 0.25) * 0.06;
      const rotX = smoothedGazeY * 0.6 + Math.cos(t * 0.2) * 0.04;

      const project = (pt: { x: number; y: number; z: number }) => {
        // Rotate Y
        const cosY = Math.cos(rotY);
        const sinY = Math.sin(rotY);
        const x1 = pt.x * cosY + pt.z * sinY;
        const z1 = -pt.x * sinY + pt.z * cosY;

        // Rotate X
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        const y2 = pt.y * cosX - z1 * sinX;
        const z2 = pt.y * sinX + z1 * cosX;

        // Perspective
        const dist = 3.5;
        const pScale = dist / (dist - z2);
        return {
          x: cx + x1 * scale * pScale,
          y: cy + y2 * scale * pScale,
          z: z2,
          pScale,
        };
      };

      // Outer holographic halo rings
      const auraPulse = Math.sin(t * 1.5) * 6 + (targetAudio * 25);
      const ringRadius = scale * 1.15 + auraPulse;

      ctx.save();
      // Outer HUD targeting arcs
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.35 + (targetAudio * 0.4);

      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, t * 0.5, t * 0.5 + Math.PI * 0.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(cx, cy, ringRadius, t * 0.5 + Math.PI, t * 0.5 + Math.PI * 1.6);
      ctx.stroke();

      // Secondary spinning reticle
      ctx.beginPath();
      ctx.setLineDash([4, 12]);
      ctx.arc(cx, cy, ringRadius * 0.9, -t * 0.8, -t * 0.8 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Draw Cranium wireframe loops
      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 0.9;

      for (let r = 0; r < 7; r++) {
        const ringPts = basePoints.slice(r * 16, (r + 1) * 16);
        ctx.beginPath();
        for (let s = 0; s < ringPts.length; s++) {
          const p = project(ringPts[s]);
          // Shading: back vertices are dimmer
          const alpha = Math.max(0.04, Math.min(0.4, (p.z + 0.9) * 0.25));
          ctx.strokeStyle = accentColor;
          ctx.globalAlpha = alpha;
          if (s === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();
      }

      // Longitudinal head contour lines
      for (let s = 0; s < 16; s += 2) {
        ctx.beginPath();
        for (let r = 0; r < 7; r++) {
          const pt = basePoints[r * 16 + s];
          const p = project(pt);
          const alpha = Math.max(0.04, Math.min(0.35, (p.z + 0.9) * 0.2));
          ctx.globalAlpha = alpha;
          if (r === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // Draw Jawline
      ctx.beginPath();
      ctx.lineWidth = 1.4;
      ctx.globalAlpha = 0.55;
      jawline.forEach((pt, idx) => {
        // Drop chin with jaw articulation
        const yOffset = idx >= 2 && idx <= 4 ? smoothedMouthOpen * 0.12 : 0;
        const p = project({ x: pt.x, y: pt.y + yOffset, z: pt.z });
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw Nose
      ctx.beginPath();
      ctx.lineWidth = 1.3;
      ctx.globalAlpha = 0.65;
      const n0 = project(nose[0]);
      const n1 = project(nose[1]);
      const n2 = project(nose[2]);
      const nL = project(nose[3]);
      const nR = project(nose[4]);
      ctx.moveTo(n0.x, n0.y);
      ctx.lineTo(n1.x, n1.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.moveTo(nL.x, nL.y);
      ctx.lineTo(n2.x, n2.y);
      ctx.lineTo(nR.x, nR.y);
      ctx.stroke();

      // Draw Eyebrows (raise slightly with tone or speaking)
      const browLift = currentState === 'speaking' ? Math.sin(t * 3) * 0.03 : 0;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = 0.85;

      ctx.beginPath();
      browLeft.forEach((pt, i) => {
        const p = project({ x: pt.x, y: pt.y - browLift, z: pt.z });
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      ctx.beginPath();
      browRight.forEach((pt, i) => {
        const p = project({ x: pt.x, y: pt.y - browLift, z: pt.z });
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw Eyes (animated blink)
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      eyeLeft.forEach((pt, i) => {
        const yScaled = -0.08 + (pt.y - (-0.08)) * eyeOpenRatio;
        const p = project({ x: pt.x, y: yScaled, z: pt.z });
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      eyeRight.forEach((pt, i) => {
        const yScaled = -0.08 + (pt.y - (-0.08)) * eyeOpenRatio;
        const p = project({ x: pt.x, y: yScaled, z: pt.z });
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Pupils / Iris glow points
      if (eyeOpenRatio > 0.3) {
        const pLeft = project({ x: -0.28 + smoothedGazeX * 0.05, y: -0.08 + smoothedGazeY * 0.03, z: 0.7 });
        const pRight = project({ x: 0.28 + smoothedGazeX * 0.05, y: -0.08 + smoothedGazeY * 0.03, z: 0.7 });
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(pLeft.x, pLeft.y, 2.5 * pLeft.pScale, 0, Math.PI * 2);
        ctx.arc(pRight.x, pRight.y, 2.5 * pRight.pScale, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Articulated Lips (reacts dynamically to audio level and visemes)
      ctx.beginPath();
      ctx.lineWidth = 1.8;
      ctx.globalAlpha = 0.9;
      lipsOuterBase.forEach((pt, idx) => {
        // Lower lip vertices drop more, upper lip moves slightly
        const isLowerLip = idx >= 4;
        const yDisp = isLowerLip ? smoothedMouthOpen * 0.16 : smoothedMouthOpen * -0.04;
        const p = project({ x: pt.x, y: pt.y + yDisp, z: pt.z });
        if (idx === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.stroke();

      // Inner mouth line
      if (smoothedMouthOpen > 0.1) {
        ctx.fillStyle = accentColor;
        ctx.globalAlpha = Math.min(0.3, smoothedMouthOpen * 0.35);
        ctx.fill();
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', handleResize);
    };
  }, [accentColor]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-[#00060a]/90 select-none">
      {/* Background HUD Matrix Grid */}
      <div className="absolute inset-0 hud-grid-bg opacity-30 pointer-events-none" />

      {/* Holographic Face Canvas */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full object-contain transition-opacity duration-300 ${
          videoState.isOpen || visionActive ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      />

      {/* HUD VIDEO PLAYER ("Where the face is") */}
      {videoState.isOpen && (
        <div className="absolute inset-0 z-20 flex flex-col bg-[#000d14] border border-[#1a5c7a] rounded-lg overflow-hidden m-2 shadow-2xl animate-in fade-in zoom-in-95">
          {/* Video Header Bar */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#010d14] border-b border-[#0d3347] text-xs">
            <div className="flex items-center gap-2 font-mono text-[#8ffcff] truncate">
              <span className="text-[#ff6b00] animate-pulse">▶</span>
              <span className="font-bold tracking-wider">{videoState.title.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Dual stream sync status */}
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#011520] border border-[#0d3347] text-[10px] text-[#3a8a9a]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                <span>DRIFT: {videoState.driftMs}ms</span>
              </div>
              {/* Auto mic mute indicator */}
              {!videoState.isMuted && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#ff3355]/15 border border-[#ff3355]/40 text-[10px] text-[#ff3355]">
                  <MicOff className="w-3 h-3" />
                  <span>MIC AUTO-MUTED</span>
                </div>
              )}
              {/* Mute / Unmute Button */}
              <button
                onClick={onToggleVideoMute}
                className="flex items-center gap-1 px-2 py-1 rounded bg-[#011520] hover:bg-[#001f2e] border border-[#1a5c7a] text-[#8ffcff] text-xs cursor-pointer transition-colors"
                title={videoState.isMuted ? 'Unmute video audio' : 'Mute video audio'}
              >
                {videoState.isMuted ? <VolumeX className="w-3.5 h-3.5 text-[#ff6b00]" /> : <Volume2 className="w-3.5 h-3.5 text-[#00ff88]" />}
                <span>{videoState.isMuted ? 'UNMUTE' : 'MUTED'}</span>
              </button>
              {/* Close Button */}
              <button
                onClick={onCloseVideo}
                className="p-1 hover:text-[#ff3355] text-[#3a8a9a] cursor-pointer transition-colors"
                title="Close video and restore avatar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Video Frame */}
          <div className="relative flex-1 w-full bg-black flex items-center justify-center">
            {videoState.url.includes('youtube.com') || videoState.url.includes('youtu.be') ? (
              <iframe
                src={`${videoState.url}${videoState.url.includes('?') ? '&' : '?'}autoplay=1&mute=${videoState.isMuted ? 1 : 0}`}
                className="w-full h-full border-0"
                allow="autoplay; encrypted-media; picture-in-picture"
                title="HUD Video Player"
              />
            ) : (
              <video
                src={videoState.url}
                autoPlay
                controls
                muted={videoState.isMuted}
                className="w-full h-full object-contain"
              />
            )}
          </div>
        </div>
      )}

      {/* VISION / WEBCAM VIEW OVERLAY ("Computer and room awareness") */}
      {visionActive && !videoState.isOpen && (
        <div className="absolute inset-0 z-20 flex flex-col bg-[#000d14] border border-[#1a5c7a] rounded-lg overflow-hidden m-2 shadow-2xl animate-in fade-in">
          <div className="flex items-center justify-between px-3 py-1.5 bg-[#010d14] border-b border-[#0d3347] text-xs">
            <div className="flex items-center gap-2 font-mono text-[#8ffcff]">
              <Camera className="w-3.5 h-3.5 text-[#00d4ff] animate-pulse" />
              <span className="font-bold tracking-wider">OPTICAL SENSORS ACTIVE — CAMERA / DESKTOP STREAM</span>
            </div>
            <button
              onClick={onCloseVision}
              className="p-1 hover:text-[#ff3355] text-[#3a8a9a] cursor-pointer transition-colors"
              title="Close camera view"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
            {/* Visualizer simulated room / screen scanning grid */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black" />
            <div className="absolute inset-0 hud-scanline" />
            
            {/* Target reticle HUD overlay */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center p-6">
              <div className="w-48 h-48 border-2 border-dashed border-[#00d4ff]/40 rounded-full flex items-center justify-center animate-spin" style={{ animationDuration: '20s' }}>
                <div className="w-40 h-40 border border-[#00d4ff]/60 rounded-full flex items-center justify-center">
                  <div className="w-4 h-4 bg-[#00d4ff] rounded-full animate-ping" />
                </div>
              </div>
              <div className="mt-4 font-mono text-xs text-[#8ffcff] tracking-widest uppercase">
                ANALYZING REAL-TIME FRAME • GEMINI VISION READY
              </div>
              <div className="text-[11px] text-[#3a8a9a] mt-1 font-mono">
                Source: Primary Optical Capture &amp; Active Display Surface
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Overlay Pill at Top Center */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex items-center gap-2 px-3 py-1 bg-[#010d14]/85 border border-[#0d3347] rounded-full backdrop-blur-sm text-[11px] font-mono tracking-widest text-[#8ffcff]">
        <span
          className={`w-2 h-2 rounded-full ${
            state === 'speaking'
              ? 'bg-[#00ff88] animate-ping'
              : state === 'listening'
              ? 'bg-[#00d4ff] animate-pulse'
              : state === 'thinking'
              ? 'bg-[#ff6b00] animate-bounce'
              : state === 'asleep'
              ? 'bg-slate-600'
              : 'bg-[#00d4ff]'
          }`}
        />
        <span className="font-bold uppercase">{state}</span>
      </div>

      {/* Decorative HUD Corner Brackets */}
      <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#1a5c7a] pointer-events-none" />
      <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#1a5c7a] pointer-events-none" />
      <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#1a5c7a] pointer-events-none" />
      <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#1a5c7a] pointer-events-none" />
    </div>
  );
};
