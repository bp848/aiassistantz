
export enum Sender {
  USER = 'user',
  AI = 'ai'
}

export enum AgentMode {
  SECRETARY = 'secretary', // General Assistant
  WRITER = 'writer', // Document Creation (Split View)
  ADVISOR = 'advisor', // Complex reasoning (Split View)
  RESEARCHER = 'researcher', // Web Search (Split View)
  CONCIERGE = 'concierge', // Reservations (Maps + Tools)
  SCHEDULE = 'schedule', // Calendar (Tools)
  MINUTES = 'minutes', // Meeting Minutes & Recording
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface StoredDocument {
  id: string;
  name: string;
  url: string;
  uploadedAt: Date;
  size?: number;
}

export interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}

export interface Message {
  id: string;
  sender: Sender;
  text: string;
  timestamp: Date;
  isThinking?: boolean;
  groundingSources?: GroundingSource[];
  placeSources?: GroundingSource[];
  emailDraft?: EmailDraft;
  attachment?: {
    mimeType: string;
    data: string; // base64
    type: 'image' | 'video';
  };
  suggestedActions?: string[]; 
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  mode: AgentMode;
}

export type AuthProvider = 'google' | 'line' | 'email';

export interface UserProfile {
  name: string;
  role?: string;
  company?: string;
  email?: string;
  avatarUrl?: string;
  isConnectedGoogle?: boolean;
  authProvider?: AuthProvider;
}

export interface SecretaryProfile {
  name: string;
  tone?: string;
  avatarUrl?: string;
}

export interface AuthState {
  isLoggedIn: boolean;
  user: UserProfile | null;
}
