
import React, { useState, useRef, useEffect } from 'react';
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

const App: React.FC = () => {
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false, user: null });
  const [setupStep, setSetupStep] = useState<'auth' | 'integration' | 'onboarding' | 'main'>('auth');

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

  if (isProfileLoading) return <div className="h-screen bg-[#0b1120] flex items-center justify-center text-cyber-cyan">起動中...</div>;
  if (setupStep === 'auth') return <AuthScreen onAuthComplete={onAuthComplete} />;
  if (setupStep === 'integration') return <Integration />;
  if (setupStep === 'onboarding') return <Onboarding onComplete={(u, s) => { setUserProfile(u); setSecretaryProfile(s); setSetupStep('main'); }} />;

  if (!hasStarted) return (
    <>
      <SetupScreen onSelectMode={startNewSession} onOpenFileWarehouse={() => setShowFileWarehouse(true)} onOpenHistory={() => setShowHistory(true)} />
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onSelectSession={(s) => { setMessages(s.messages); setMode(s.mode); setHasStarted(true); setShowHistory(false); }} />}
      {showFileWarehouse && <FileWarehouse onClose={() => setShowFileWarehouse(false)} onUpdateDocuments={setStoredDocuments} />}
    </>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0b1120] text-gray-100 font-sans overflow-hidden">
      <div className="bg-yellow-600/20 border-b border-yellow-600/50 py-1.5 px-4 flex items-center justify-center gap-2 z-50">
        <AlertTriangle size={14} className="text-yellow-500" />
        <span className="text-[10px] font-bold text-yellow-200 uppercase tracking-widest">注意: シミュレーションモード（外部API未連携・ダミーデータ動作中）</span>
      </div>

      <LiveCallOverlay isActive={isLiveCallActive} onEndCall={() => setIsLiveCallActive(false)} secretaryProfile={secretaryProfile} />

      <header className="flex-shrink-0 bg-[#0b1120] border-b border-gray-800 h-20 flex items-center justify-between px-6 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-cyber-cyan" size={32} />
          <div>
            <h1 className="font-serif font-bold text-gray-200 text-lg tracking-widest uppercase">クラウド社長室Z</h1>
            <div className="flex items-center gap-1.5 opacity-50">
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full"></div>
              <span className="text-[9px] font-mono tracking-tighter uppercase">ローカル環境 / API未接続</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowHistory(true)} className="text-gray-400 hover:text-white transition-colors"><Clock size={24} /></button>
          <button onClick={() => setShowFileWarehouse(true)} className="text-gray-400 hover:text-white transition-colors"><FolderOpen size={24} /></button>
          <button onClick={() => setHasStarted(false)} className="text-gray-400 hover:text-white transition-colors"><Menu size={24} /></button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-4 scroll-smooth bg-[#0b1120]">
            <div className="max-w-3xl mx-auto flex flex-col gap-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} onActionSelect={submitMessage} avatarUrl={secretaryProfile?.avatarUrl} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </main>
          <footer className="flex-shrink-0 bg-[#0b1120] border-t border-gray-800 p-4">
            <div className="max-w-3xl mx-auto">
              <ModeSelector currentMode={mode} onModeChange={setMode} disabled={isLoading} />
              <div className="relative flex items-center bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl p-2 mt-3 focus-within:border-cyber-cyan transition-all">
                <button className="p-3 text-gray-500 hover:text-white"><Paperclip size={24} /></button>
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(inputValue.trim()); } }}
                  placeholder="秘書へ指示（現在はすべてダミー応答です）"
                  className="flex-1 bg-transparent text-gray-100 placeholder-gray-600 p-2 resize-none outline-none font-sans"
                  rows={1}
                />
                <button onClick={() => submitMessage(inputValue.trim())} disabled={!inputValue.trim() || isLoading} className="p-4 rounded-xl bg-cyber-cyan text-black hover:opacity-90 disabled:opacity-30 shadow-lg transition-all">
                  <Send size={20} />
                </button>
              </div>
            </div>
          </footer>
        </div>
        {showWorkspace && <WorkspacePanel mode={mode} lastAiMessage={lastAiMessage} onClose={() => setShowWorkspace(false)} onActionSelect={submitMessage} />}
      </div>
    </div>
  );
};

export default App;
