
import React, { useState, useRef, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { Send, Menu, ShieldCheck, Paperclip, Headset, Mic, FolderOpen, Clock, AlertTriangle } from 'lucide-react';
import { Message, Sender, AgentMode, GroundingSource, SecretaryProfile, UserProfile, StoredDocument, AuthState, AuthProvider } from './types';
import { streamGeminiResponse, initializeUserContext } from './services/geminiService';
import { saveUserProfile, getUserProfile } from './services/userService';
import { saveSession, ChatSession } from './services/historyService';
import ChatMessage from './components/ChatMessage';
import ModeSelector from './components/ModeSelector';
import WorkspacePanel from './components/WorkspacePanel';
import LiveCallOverlay from './components/LiveCallOverlay';
import SetupScreen from './components/SetupScreen';
import Onboarding from './components/Onboarding';
import FileWarehouse from './components/FileWarehouse';
import HistoryModal from './components/HistoryModal';
import AuthScreen from './components/AuthScreen';
import Integration from './components/Integration';
import AuthCallback from './components/AuthCallback';
import Dashboard from './components/Dashboard';
import { supabase } from './services/supabaseClient';

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false, user: null });
  const [setupStep, setSetupStep] = useState<'auth' | 'integration' | 'onboarding' | 'main'>('auth');
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [secretaryProfile, setSecretaryProfile] = useState<SecretaryProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  const [hasStarted, setHasStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<AgentMode>(AgentMode.SECRETARY);
  const [showWorkspace, setShowWorkspace] = useState(false);
  const [isLiveCallActive, setIsLiveCallActive] = useState(false);
  const [showFileWarehouse, setShowFileWarehouse] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [storedDocuments, setStoredDocuments] = useState<StoredDocument[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setAuthReady(true);
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Derive last AI message for the WorkspacePanel
  // Fix: Line 176 error - Cannot find name 'lastAiMessage'
  const lastAiMessage = [...messages].reverse().find(m => m.sender === Sender.AI);

  useEffect(() => {
    const loadProfile = async () => {
      const profile = await getUserProfile();
      if (profile) {
        setAuth({ isLoggedIn: true, user: profile.user });
        setUserProfile(profile.user);
        setSecretaryProfile(profile.secretary);
        initializeUserContext(profile.user.name);
        setSetupStep('main');
      }
      setIsProfileLoading(false);
    };
    loadProfile();
  }, []);

  useEffect(() => {
    if ([AgentMode.WRITER, AgentMode.RESEARCHER, AgentMode.ADVISOR, AgentMode.SECRETARY, AgentMode.SCHEDULE].includes(mode)) {
      setShowWorkspace(true);
    } else {
      setShowWorkspace(false);
    }
  }, [mode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showWorkspace]);

  const onAuthComplete = (name: string, email: string, provider: AuthProvider, avatar?: string) => {
    const newUser: UserProfile = { name, email, authProvider: provider, avatarUrl: avatar, isConnectedGoogle: false };
    setAuth({ isLoggedIn: true, user: newUser });
    setUserProfile(newUser);
    setSetupStep('integration');
  };

  const startNewSession = (selectedMode: AgentMode) => {
    setMode(selectedMode);
    setHasStarted(true);
    setMessages([]);
    setSessionId(undefined);

    const userName = (userProfile?.name || '橋本') + '社長';
    const greeting = `【シミュレーション開始】${userName}、現在はモックアップモードで動作しています。Google/LINE連携は機能していません。`;
    const actions = ["今日の予定（ダミー）を確認", "メール（ダミー）をチェック"];

    setMessages([{ id: 'welcome', sender: Sender.AI, text: greeting, timestamp: new Date(), suggestedActions: actions }]);
  };

  const submitMessage = async (text: string) => {
    if (!text || isLoading) return;
    const userMessage: Message = { id: Date.now().toString(), sender: Sender.USER, text: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMessageId, sender: Sender.AI, text: '', timestamp: new Date(), isThinking: true }]);
    let fullText = '';
    await streamGeminiResponse([...messages, userMessage], text, mode, (textChunk) => {
      fullText += textChunk;
      setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: fullText, isThinking: false } : msg));
    }, () => setIsLoading(false), (error) => {
      setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: "エラー: " + error.message, isThinking: false } : msg));
      setIsLoading(false);
    }, undefined, storedDocuments);
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex items-center justify-center text-white">
        認証状態を確認中…
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<AuthScreen onAuthComplete={onAuthComplete} />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/integration" element={<Integration />} />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/" replace />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
