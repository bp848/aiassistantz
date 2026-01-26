
import { Message, AgentMode } from '../types';

export interface ChatSession {
  id: string;
  title: string;
  lastUpdated: string; // ISO string
  preview: string;
  mode: AgentMode;
  messages: Message[];
}

const STORAGE_KEY = 'president_app_history';

export const saveSession = (messages: Message[], mode: AgentMode, currentSessionId?: string): string => {
  if (messages.length === 0) return currentSessionId || Date.now().toString();

  const sessions = getSessions();
  const id = currentSessionId || Date.now().toString();
  
  // Create a title based on the first user message, or default
  const firstUserMsg = messages.find(m => m.sender === 'user');
  const title = firstUserMsg ? firstUserMsg.text.slice(0, 20) + (firstUserMsg.text.length > 20 ? '...' : '') : '新しい対話';
  
  // Create a preview from the last message
  const lastMsg = messages[messages.length - 1];
  const preview = lastMsg ? lastMsg.text.slice(0, 40) + (lastMsg.text.length > 40 ? '...' : '') : '...';

  const newSession: ChatSession = {
    id,
    title,
    lastUpdated: new Date().toISOString(),
    preview,
    mode,
    messages
  };

  // Update existing or add new
  const existingIndex = sessions.findIndex(s => s.id === id);
  if (existingIndex >= 0) {
    sessions[existingIndex] = newSession;
  } else {
    sessions.unshift(newSession); // Add to top
  }

  // Limit history to 50 items to save space
  if (sessions.length > 50) sessions.pop();

  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  return id;
};

export const getSessions = (): ChatSession[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("Failed to load history", e);
    return [];
  }
};

export const deleteSession = (id: string) => {
  const sessions = getSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
};

export const clearAllHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};
