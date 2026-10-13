export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'asleep' | 'video' | 'vision';

export interface LogEntry {
  id: string;
  timestamp: string;
  sender: 'user' | 'jarvis' | 'sys' | 'tool';
  text: string;
  toolName?: string;
  toolOutput?: string;
  category?: string;
}

export interface ModelLadderItem {
  name: string;
  role: 'live' | 'fast' | 'smart' | 'search';
  latency: string;
  status: 'healthy' | 'active' | 'cooldown' | 'quota_exhausted' | 'fallback';
  consecutiveFailures: number;
  lastUsed?: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  temp: number;
  netSentMb: number;
  netRecvMb: number;
  battery: number;
  osName: string;
  uptime: string;
}

export interface MemoryFact {
  id: string;
  category: 'User' | 'Preferences' | 'Projects' | 'Hardware' | 'Work';
  key: string;
  value: string;
  updated: string;
}

export interface KnowledgeNode {
  id: string;
  label: string;
  type: 'concept' | 'person' | 'device' | 'project';
}

export interface KnowledgeLink {
  source: string;
  target: string;
  relation: string;
}

export interface ReminderItem {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  recurring?: string;
}

export interface UndoAction {
  id: string;
  title: string;
  timestamp: string;
  description: string;
  canUndo: boolean;
  undone: boolean;
}

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source: string;
  mode: 'search' | 'news' | 'research' | 'price' | 'compare';
}

export interface VideoState {
  isOpen: boolean;
  title: string;
  url: string;
  isMuted: boolean;
  isSplitAudio: boolean;
  driftMs: number;
}
