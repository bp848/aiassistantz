
import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, ShieldCheck, Paperclip, Headset, Mic, FolderOpen, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Message, Sender, AgentMode, GroundingSource, SecretaryProfile, UserProfile, StoredDocument, AuthState, AuthProvider } from './types';
import { streamGeminiResponse, initializeUserContext } from './services/geminiService';
import { getUserProfile } from './services/userService';
import { supabase } from './services/supabaseClient';
import ChatMessage from './components/ChatMessage';
import ModeSelector from './components/ModeSelector';
import WorkspacePanel from './components/WorkspacePanel';
import LiveCallOverlay from './components/LiveCallOverlay';
import SetupScreen from './components/SetupScreen';
import Onboarding from './components/Onboarding';
import FileWarehouse from './components/FileWarehouse';
import HistoryModal from './components/HistoryModal';
import AuthScreen from './components/AuthScreen';
import IntegrationSetup from './components/IntegrationSetup';

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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        setIsProfileLoading(false);
        return;
      }
      const session = supabase ? (await supabase.auth.getSession()).data.session : null;
      if (session?.user) {
        const u = session.user;
        const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split('@')[0] || 'ユーザー';
        const email = u.email ?? '';
        const provider = (u.app_metadata?.provider === 'google' ? 'google' : 'email') as AuthProvider;
        const avatar = u.user_metadata?.picture || u.user_metadata?.avatar_url;
        const newUser: UserProfile = { name, email, authProvider: provider, avatarUrl: avatar, isConnectedGoogle: provider === 'google' };
        setAuth({ isLoggedIn: true, user: newUser });
        setUserProfile(newUser);
        setSecretaryProfile({ name: '秘書', tone: '丁寧' });
        setSetupStep('integration');
      } else {
        setSetupStep('auth');
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
    const newUser: UserProfile = { name, email, authProvider: provider, avatarUrl: avatar, isConnectedGoogle: true };
    setAuth({ isLoggedIn: true, user: newUser });
    setUserProfile(newUser);
    setSetupStep('integration');
  };

  const startNewSession = (selectedMode: AgentMode) => {
    setMode(selectedMode);
    setHasStarted(true);
    setMessages([]);

    const userName = (userProfile?.name || '社長') + '社長';
    const greeting = `${userName}、おはようございます。ただいま Google Workspace への同期が完了しました。本日の予定と重要メールの要約から始めましょうか？`;
    
    setMessages([{ 
      id: 'welcome', 
      sender: Sender.AI, 
      text: greeting, 
      timestamp: new Date(), 
      suggestedActions: ["本日の予定を一覧で表示", "緊急の未読メールを確認", "出張の手配状況を聞く"] 
    }]);
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
     const stopLoading = () => setIsLoading(false);
     const showError = (err: Error) => {
       setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: "同期エラー: " + err.message, isThinking: false } : msg));
       stopLoading();
     };
     try {
       await streamGeminiResponse(
         [...messages, userMessage],
         text,
         mode,
         (textChunk) => {
           fullText += textChunk;
           setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: fullText, isThinking: false } : msg));
         },
         stopLoading,
         showError,
         undefined,
         storedDocuments
       );
     } catch (e: any) {
       showError(e instanceof Error ? e : new Error(String(e)));
     }
  }

  if (isProfileLoading) return (
    <div
      className="h-screen bg-presidential-navy flex items-center justify-center text-cyber-cyan animate-pulse font-mono tracking-widest"
      style={{ minHeight: '100vh', background: '#0b1120', color: '#22d3ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}
    >
      SYSTEM INITIALIZING...
    </div>
  );
  if (setupStep === 'auth') return <AuthScreen onAuthComplete={onAuthComplete} />;
  if (setupStep === 'integration') return <IntegrationSetup onComplete={() => setSetupStep('onboarding')} />;
  if (setupStep === 'onboarding') return <Onboarding onComplete={(u, s) => { setUserProfile(u); setSecretaryProfile(s); setSetupStep('main'); }} />;

  if (!hasStarted) return (
    <>
      <SetupScreen onSelectMode={startNewSession} onOpenFileWarehouse={() => setShowFileWarehouse(true)} onOpenHistory={() => setShowHistory(true)} />
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onSelectSession={(s) => { setMessages(s.messages); setMode(s.mode); setHasStarted(true); setShowHistory(false); }} />}
      {showFileWarehouse && <FileWarehouse onClose={() => setShowFileWarehouse(false)} onUpdateDocuments={setStoredDocuments} />}
    </>
  );

  return (
    <div className="flex flex-col h-[100dvh] bg-presidential-navy text-gray-100 font-sans overflow-hidden">
      
      <LiveCallOverlay isActive={isLiveCallActive} onEndCall={() => setIsLiveCallActive(false)} secretaryProfile={secretaryProfile} />
      
      <header className="flex-shrink-0 bg-presidential-navy/95 backdrop-blur-md border-b border-white/5 h-16 flex items-center justify-between px-4 md:px-6 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <ShieldCheck className="text-cyber-cyan flex-shrink-0" size={28} aria-hidden />
          <div className="min-w-0">
            <h1 className="font-serif font-bold text-gray-100 text-base md:text-lg tracking-wide truncate">クラウド社長室Z</h1>
            <p className="text-[10px] text-gray-500 truncate">{userProfile?.name || '社長'} · 秘書と会話</p>
          </div>
        </div>
        <nav className="flex items-center gap-1 flex-shrink-0" aria-label="メイン操作">
          <button type="button" onClick={() => setShowHistory(true)} className="p-2.5 rounded-lg text-gray-400 hover:text-cyber-cyan hover:bg-white/5 transition-colors" title="履歴"><Clock size={20} /></button>
          <button type="button" onClick={() => setShowFileWarehouse(true)} className="p-2.5 rounded-lg text-gray-400 hover:text-cyber-cyan hover:bg-white/5 transition-colors" title="資料室"><FolderOpen size={20} /></button>
          <button type="button" onClick={() => setHasStarted(false)} className="p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors" title="メニュー"><Menu size={20} /></button>
        </nav>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-[#0b1120] relative">
           <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyber-cyan/5 to-transparent pointer-events-none"></div>
           
           <main className="flex-1 overflow-y-auto p-4 scroll-smooth">
             <div className="max-w-3xl mx-auto flex flex-col gap-6 py-8">
               {messages.map((msg) => (
                 <ChatMessage key={msg.id} message={msg} onActionSelect={submitMessage} avatarUrl={secretaryProfile?.avatarUrl} />
               ))}
               <div ref={messagesEndRef} />
             </div>
           </main>
           
           <footer className="flex-shrink-0 bg-presidential-navy border-t border-white/5 p-4 md:p-6">
             <div className="max-w-3xl mx-auto">
               <p className="text-[10px] text-gray-500 mb-2 px-1">モード</p>
               <ModeSelector currentMode={mode} onModeChange={setMode} disabled={isLoading} />
               <p className="text-[10px] text-gray-500 mt-4 mb-2 px-1">指示を入力</p>
               <div className="relative flex items-center bg-gray-900/90 border border-white/10 rounded-xl p-2 focus-within:border-cyber-cyan/50 focus-within:ring-1 focus-within:ring-cyber-cyan/20 transition-all">
                 <textarea
                   value={inputValue}
                   onChange={(e) => setInputValue(e.target.value)}
                   onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(inputValue.trim()); } }}
                   placeholder="例: 本日の予定を表示 / 未読メールを確認"
                   className="flex-1 bg-transparent text-gray-100 placeholder-gray-600 p-3 resize-none outline-none font-sans text-sm min-h-[44px]"
                   rows={1}
                   aria-label="秘書への指示"
                 />
                 <button
                   type="button"
                   onClick={() => submitMessage(inputValue.trim())}
                   disabled={!inputValue.trim() || isLoading}
                   className="p-3 rounded-lg bg-cyber-cyan text-black hover:bg-cyber-cyan-light disabled:opacity-30 disabled:cursor-not-allowed transition-all flex-shrink-0"
                   aria-label="送信"
                 >
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
