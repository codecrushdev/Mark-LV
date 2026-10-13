# ⚙️ MARK LV — React Personal AI Assistant HUD

A web-native, cross-platform personal AI assistant HUD rewritten in React + TypeScript with Vite and Tailwind CSS. Built with the full Mark LV protocol features including the 3D holographic avatar, real-time voice lip-sync, the ladder of nine Gemini models, hardware telemetry, video integration in the HUD, memory and knowledge graphs, and remote dashboard companion pairing.

---

## ✨ Features Ported

### 🧑‍🎤 Holographic AI Head & HUD Surface
- **3D Wireframe Avatar**: Rendered via software canvas with facial anatomy (cranium loops, brow lifts, eyes, nose, articulated lips).
- **Audio Viseme Lip-Sync**: Articulates jaw drop and lip contours in real time with speech synthesis and voice input.
- **Saccadic Gaze & Blinking**: Natural eye blinking and gaze tracking, glancing away during thinking states and direct focus during listening.
- **HUD Video Player**: Seamlessly swaps the video player into the center ("where the face was") upon command (e.g. trailer or YouTube media), starts muted with audio sync drift metrics and automatic mic muting to preserve echo isolation.
- **Optical Sensors (Vision)**: Mode to preview webcam and desktop vision scanning.
- **Reactive Audio Waveform**: Live frequency spectrum visualizer synced to speech input/output.

### 🪜 Gemini 9-Model Ladder
- Channels requests across the 9-model ladder:
  1. `live` (Gemini Live API native audio)
  2. `gemini-2.5-flash-lite` (0.74s)
  3. `gemini-3.5-flash-lite` (0.56s)
  4. `gemini-3.1-flash-lite` (0.60s)
  5. `gemini-flash-lite-latest` (0.60s)
  6. `gemini-2.5-flash` (0.67s)
  7. `gemini-3.5-flash` (1.13s)
  8. `gemini-3.6-flash` (1.45s)
  9. `gemini-3-flash-preview` (1.80s)
- Live failover testing (429 quota exhaustion simulation) with cooldown tracking and manual rung promotion.

### 📊 System Telemetry & Hardware Gauges
- Real-time CPU, RAM, GPU (NVML probe emulation), thermal core temperature (°C), network bandwidth I/O (MB/s), power battery level, and system uptime counters.

### 🛡️ Safety Confirmation Gate & Undo Journal
- **Confirmation Gate**: Protected power and system operations (lock, reboot, shutdown) require explicit operator authorization banners.
- **Undo Journal**: Records actionable operations with single-click undo.

### 🧠 Recallable Memory & Knowledge Graph
- "What JARVIS Remembers" overlay with categorised user facts (User, Preferences, Hardware, Projects, Work) and 1-click forget/delete.
- Knowledge Graph visualizer linking entities and relationships.

### 📱 Remote Dashboard & Companion Pairing
- Phone pairing simulator with AES-256-CBC token encryption, local LAN endpoints, remote command dispatch, remote wake trigger, and mobile file drops.

### ⚡ Quick Actions & Tools
- App launcher (Terminal, Chrome, VS Code, Notes, Explorer).
- Sliders for audio volume and display brightness.
- Multi-mode grounded web search (`search`, `news`, `research`, `price`, `compare`).
- Smart reminders scheduler.
- Floating clipboard intelligence panel (Translate, Summarise, Explain, Fix).
- Live theme accent recoloring (Teal HUD, Amber Gold, Neon Emerald, Cyberpunk Violet, Crimson, Titanium Ice).

---

## 🛠️ Development & Build

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```
