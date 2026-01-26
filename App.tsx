import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, ShieldCheck, Paperclip, Headset, Mic, FolderOpen, Clock } from 'lucide-react';
import { Message, Sender, AgentMode, GroundingSource, SecretaryProfile, UserProfile, StoredDocument, AuthState, AuthProvider } from './types';
import { streamGeminiResponse, initializeUserContext, COMPANY_PROFILE, IS_DEMO_MODE } from './services/geminiService';
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
import IntegrationSetup from './components/IntegrationSetup';

interface Attachment {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'audio';
}

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
  const [attachment, setAttachment] = useState<Attachment | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const lastAiMessage = messages.filter(m => m.sender === Sender.AI).slice(-1)[0];

  useEffect(() => {
    const loadProfile = async () => {
      // Check for existing Supabase session first
      const { supabase } = await import('./services/supabaseClient');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        console.log('Found existing session in App:', session.user.email);
        const provider = (session.user.app_metadata?.provider as AuthProvider | undefined) || 'email';
        const currentUser: UserProfile = {
          name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          authProvider: provider,
          avatarUrl: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
          isConnectedGoogle: !!session.provider_token
        };
        setAuth({ isLoggedIn: true, user: { name: currentUser.name, email: currentUser.email } });
        setUserProfile(currentUser);
        initializeUserContext(currentUser.name);
        // If Google tokens aren't available, route to integration so the user can reconnect.
        setSetupStep(session.provider_token ? 'main' : 'integration');
        setIsProfileLoading(false);
        return;
      }
      
      // SECURITY: Clear any existing data to prevent cross-user data leakage
      localStorage.clear();
      sessionStorage.clear();
      
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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, showWorkspace, hasStarted]);

  useEffect(() => {
    if (messages.length > 0 && hasStarted) {
      const newId = saveSession(messages, mode, sessionId);
      if (newId !== sessionId) setSessionId(newId);
    }
  }, [messages, mode, hasStarted]);

  useEffect(() => {
    console.log('setupStep changed to:', setupStep);
  }, [setupStep]);

  const handleAuthComplete = (name: string, email: string, provider: AuthProvider, avatar?: string) => {
    console.log('handleAuthComplete called:', { name, email, provider, avatar });
    const newUser: UserProfile = {
      name,
      email,
      authProvider: provider,
      avatarUrl: avatar,
      isConnectedGoogle: provider === 'google'
    };
    console.log('Setting auth state:', newUser);
    setAuth({ isLoggedIn: true, user: newUser });
    setUserProfile(newUser);
    initializeUserContext(name);
    console.log('Setting setupStep after auth');
    setSetupStep(provider === 'google' ? 'main' : 'integration');
  };

  const handleIntegrationComplete = (connected?: { email?: string; name?: string }) => {
    if (userProfile) {
      setUserProfile({
        ...userProfile,
        email: connected?.email || userProfile.email,
        name: connected?.name || userProfile.name,
        isConnectedGoogle: true
      });
    }
    setSetupStep('onboarding');
  };

  const handleOnboardingComplete = async (user: UserProfile, sec: SecretaryProfile) => {
    const finalUser = { ...userProfile, ...user };
    setUserProfile(finalUser);
    setSecretaryProfile(sec);
    initializeUserContext(finalUser.name);
    await saveUserProfile(finalUser, sec);
    setSetupStep('main');
  };

  const handleLogout = async () => {
    try {
      // Clear Supabase session
      const { supabase } = await import('./services/supabaseClient');
      await supabase.auth.signOut();
      
      // Clear local state
      setAuth({ isLoggedIn: false, user: null });
      setUserProfile(null);
      setSecretaryProfile(null);
      setSetupStep('auth');
      setHasStarted(false);
      setMessages([]);
      setSessionId(undefined);
      
      // Clear local storage
      localStorage.clear();
      sessionStorage.clear();
      
      console.log('Logged out successfully');
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const startNewSession = (selectedMode: AgentMode) => {
    setMode(selectedMode);
    setHasStarted(true);
    setMessages([]);
    setSessionId(undefined);

    const userName = userProfile?.name || '社長';
    let greeting = `こんにちは、${userName}。今日は何をお手伝いしますか？`;
    let actions: string[] = [];

    switch (selectedMode) {
      case AgentMode.SCHEDULE:
        greeting = `${userName}、今日の予定を整理し、必要なら新しい予定を入れます。`;
        actions = ['今日の予定を教えて', '15時に30分の打合せを入れて', '今週の空き枠を一覧で'];
        break;
      case AgentMode.MINUTES:
        greeting = '議事録モードです。録音やメモの保存を開始しましょう。';
        actions = ['議事録を取り始めて', '要点だけまとめて'];
        break;
      case AgentMode.WRITER:
        greeting = 'ライティングモードです。ドラフトを用意します。';
        actions = ['メール文案を作って', 'プレスリリースの骨子を作成'];
        break;
      case AgentMode.ADVISOR:
        greeting = 'アドバイザーモードです。根拠を示しながら提案します。';
        actions = ['意思決定の材料を整理して', 'リスクを一覧にして'];
        break;
      case AgentMode.RESEARCHER:
        greeting = 'リサーチモードです。Web検索しながら要約します。';
        actions = ['競合の最新情報を調べて', '市場規模をざっくり教えて'];
        break;
      case AgentMode.CONCIERGE:
        greeting = 'コンシェルジュモードです。予約や手配を行います。';
        actions = ['明日19時に渋谷で4名予約', '羽田→福岡の最安を探して'];
        break;
      default:
        break;
    }

    setMessages([{ id: 'welcome', sender: Sender.AI, text: greeting, timestamp: new Date(), suggestedActions: actions }]);
  };

  const handleRestoreSession = (session: ChatSession) => {
    setMessages(session.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    setMode(session.mode);
    setSessionId(session.id);
    setHasStarted(true);
    setShowHistory(false);
  };

  const submitMessage = async (text: string, currentAttachment?: Attachment | null) => {
    if (!text && !currentAttachment) return;
    if (isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: Sender.USER,
      text,
      timestamp: new Date(),
      attachment: currentAttachment
        ? {
            mimeType: currentAttachment.file.type,
            data: currentAttachment.preview,
            type: currentAttachment.type as 'image' | 'video'
          }
        : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setAttachment(null);
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: aiMessageId, sender: Sender.AI, text: '', timestamp: new Date(), isThinking: true }]);

    let fullText = '';

    await streamGeminiResponse(
      [...messages, userMessage],
      text || (currentAttachment ? 'Attachment included; please describe it.' : ''),
      mode,
      (textChunk, groundingMetadata) => {
        fullText += textChunk;
        const groundingSources: GroundingSource[] = [];
        const placeSources: GroundingSource[] = [];

        if (groundingMetadata?.groundingChunks) {
          groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web?.uri) groundingSources.push({ title: chunk.web.title, uri: chunk.web.uri });
            if (chunk.maps?.uri) placeSources.push({ title: chunk.maps.title || '場所', uri: chunk.maps.uri });
          });
        }

        setMessages(prev =>
          prev.map(msg =>
            msg.id === aiMessageId
              ? {
                  ...msg,
                  text: fullText,
                  isThinking: false,
                  groundingSources: groundingSources.length ? [...groundingSources] : undefined,
                  placeSources: placeSources.length ? [...placeSources] : undefined
                }
              : msg
          )
        );
      },
      () => setIsLoading(false),
      error => {
        setMessages(prev =>
          prev.map(msg => (msg.id === aiMessageId ? { ...msg, text: 'エラーが発生しました。もう一度お試しください。', isThinking: false } : msg))
        );
        console.error(error);
        setIsLoading(false);
      },
      currentAttachment ? { mimeType: currentAttachment.file.type, data: currentAttachment.preview.split(',')[1] } : undefined,
      storedDocuments
    );
  };

  if (isProfileLoading) {
    return (
      <div className="h-[100dvh] bg-[#0b1120] flex items-center justify-center text-cyber-cyan font-sans text-lg">
        <div className="animate-pulse tracking-[0.5em]">Loading...</div>
      </div>
    );
  }

  if (setupStep === 'auth') return <AuthScreen onAuthComplete={handleAuthComplete} />;
  if (setupStep === 'integration') return <IntegrationSetup onComplete={handleIntegrationComplete} />;
  if (setupStep === 'onboarding') return <Onboarding onComplete={handleOnboardingComplete} />;

  if (!hasStarted) {
    return (
      <>
        <SetupScreen 
          onSelectMode={startNewSession} 
          onOpenFileWarehouse={() => setShowFileWarehouse(true)} 
          onOpenHistory={() => setShowHistory(true)}
          onLogout={handleLogout}
        />
        {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onSelectSession={handleRestoreSession} />}
        {showFileWarehouse && <FileWarehouse onClose={() => setShowFileWarehouse(false)} onUpdateDocuments={setStoredDocuments} />}
      </>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0b1120] text-gray-100 font-sans overflow-hidden">
      {IS_DEMO_MODE && (
        <div className="flex justify-center bg-yellow-500/90 text-black text-xs font-semibold uppercase tracking-[0.3em] py-2">
          Demo mode: calendar/mail/auth integrations are mocked. Switch off VITE_DEMO_MODE for live calls.
        </div>
      )}
      <LiveCallOverlay isActive={isLiveCallActive} onEndCall={() => setIsLiveCallActive(false)} secretaryProfile={secretaryProfile} />

      {showFileWarehouse && <FileWarehouse onClose={() => setShowFileWarehouse(false)} onUpdateDocuments={setStoredDocuments} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onSelectSession={handleRestoreSession} />}

      <header className="flex-shrink-0 bg-[#0b1120] border-b border-gray-800 h-20 flex items-center justify-between px-4 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-cyber-cyan" size={32} />
          <div>
            <h1 className="font-serif font-bold text-gray-200 text-lg tracking-widest uppercase leading-tight">President Office Z</h1>
            <div className="flex items-center gap-1.5 opacity-50">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-[10px] font-mono tracking-tighter uppercase">Secure session</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-3">
          <button onClick={() => setShowHistory(true)} className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800">
            <Clock size={24} />
          </button>
          <button onClick={() => setShowFileWarehouse(true)} className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800">
            <FolderOpen size={24} />
          </button>
          <button onClick={() => setIsLiveCallActive(true)} className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800">
            <Headset size={24} />
          </button>
          <button onClick={() => setHasStarted(false)} className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800">
            <Menu size={24} />
          </button>
          {IS_DEMO_MODE && (
            <span className="hidden md:inline-flex items-center gap-2 px-3 py-1 bg-amber-400/90 text-black text-[11px] font-semibold rounded-full border border-amber-500">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></span>
              Demo / simulation
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-4 scroll-smooth bg-[#0b1120]">
            <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-2">
              {messages.map(msg => (
                <ChatMessage key={msg.id} message={msg} onActionSelect={a => submitMessage(a)} avatarUrl={secretaryProfile?.avatarUrl} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </main>

          <footer className="flex-shrink-0 bg-[#0b1120] border-t border-gray-800 p-4 z-20 pb-safe">
            <div className="max-w-3xl mx-auto">
              <ModeSelector currentMode={mode} onModeChange={setMode} disabled={isLoading} />
              <div className="relative flex flex-col bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-3xl p-3 focus-within:border-cyber-cyan transition-all mt-3">
                <div className="flex items-center gap-3">
                  <button className="p-3 text-gray-500 hover:text-white rounded-full hover:bg-gray-800">
                    <Paperclip size={24} />
                  </button>
                  <textarea
                    ref={textAreaRef}
                    value={inputValue}
                    onChange={e => setInputValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submitMessage(inputValue.trim());
                      }
                    }}
                    placeholder="Type a message"
                    className="flex-1 bg-transparent text-gray-100 placeholder-gray-600 text-lg p-2 resize-none outline-none font-sans min-w-0"
                    rows={1}
                    disabled={isLoading}
                  />
                  <button className="p-3 text-gray-500 hover:text-white rounded-full hover:bg-gray-800">
                    <Mic size={24} />
                  </button>
                  <button
                    onClick={() => submitMessage(inputValue.trim())}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-4 rounded-2xl bg-cyber-cyan text-black hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-95"
                  >
                    <Send size={20} />
                  </button>
                </div>
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
