
import React, { useState, useRef, useEffect } from 'react';
import { Send, Menu, ShieldCheck, Paperclip, Headset, Mic, FolderOpen, Clock, X } from 'lucide-react';
import { Message, Sender, AgentMode, GroundingSource, SecretaryProfile, UserProfile, StoredDocument, AuthState, AuthProvider } from './types';
import { streamGeminiResponse, initializeUserContext, COMPANY_PROFILE } from './services/geminiService';
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
  }, [messages, showWorkspace, hasStarted]);

  useEffect(() => {
    if (messages.length > 0 && hasStarted) {
      const newId = saveSession(messages, mode, sessionId);
      if (newId !== sessionId) {
        setSessionId(newId);
      }
    }
  }, [messages, mode, hasStarted]);

  const handleAuthComplete = (name: string, email: string, provider: AuthProvider, avatar?: string) => {
    const newUser: UserProfile = { 
      name, 
      email, 
      authProvider: provider,
      avatarUrl: avatar,
      isConnectedGoogle: provider === 'google' 
    };
    setAuth({ isLoggedIn: true, user: newUser });
    setUserProfile(newUser);
    setSetupStep('integration');
  };

  const handleIntegrationComplete = () => {
    if (userProfile) setUserProfile({ ...userProfile, isConnectedGoogle: true });
    setSetupStep('onboarding');
  };

  const handleOnboardingComplete = async (user: UserProfile, sec: SecretaryProfile) => {
    const finalUser = { ...userProfile, ...user, isConnectedGoogle: true };
    setUserProfile(finalUser);
    setSecretaryProfile(sec);
    initializeUserContext(finalUser.name);
    await saveUserProfile(finalUser, sec);
    setSetupStep('main');
  };

  const startNewSession = (selectedMode: AgentMode) => {
    setMode(selectedMode);
    setHasStarted(true);
    setMessages([]);
    setSessionId(undefined);

    const userName = (userProfile?.name || '橋本') + '社長';
    let greeting = `${userName}、業務を開始します。`;
    let actions: string[] = [];

    switch(selectedMode) {
      case AgentMode.SCHEDULE: 
        greeting = `${userName}、本日の予定と未読メールを確認しましょうか？`; 
        actions = ["今日の予定を詳しく", "未読メールを確認", "明日の会議は？"];
        break;
      case AgentMode.MINUTES: 
        greeting = "会議の準備ができました。録音や議事録作成を開始しますか？"; 
        actions = ["録音を開始", "議事録を作成"];
        break;
      case AgentMode.WRITER: 
        greeting = "文書作成ですね。資料室の定型を参考にすることも可能です。"; 
        actions = ["公文書の作成", "資料室の定型を確認"];
        break;
      case AgentMode.ADVISOR: 
        greeting = "ご相談ですね。経営判断や業界動向について壁打ちを承ります。"; 
        actions = ["今後の戦略", "業界トレンド"];
        break;
      case AgentMode.RESEARCHER: 
        greeting = "調査を開始します。印刷業界や最新ニュースを調べますか？"; 
        actions = ["市場調査", "最新ニュース"];
        break;
      case AgentMode.CONCIERGE: 
        greeting = "手配を承ります。会食や移動、ゴルフ場予約などお申し付けください。"; 
        actions = ["会食の予約", "ゴルフ場予約"];
        break;
      default:
        greeting = `${userName}、ご用件をどうぞ。スケジュール調整やメール確認も可能です。`;
        actions = ["予定の確認", "メールをチェック", "雑談"];
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
      text: text,
      timestamp: new Date(),
      attachment: currentAttachment ? {
        mimeType: currentAttachment.file.type,
        data: currentAttachment.preview,
        type: currentAttachment.type as 'image' | 'video'
      } : undefined
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
      text || (currentAttachment ? "このファイルを分析してください。" : ""),
      mode,
      (textChunk, groundingMetadata) => {
        fullText += textChunk;
        const groundingSources: GroundingSource[] = [];
        const placeSources: GroundingSource[] = [];
        
        if (groundingMetadata?.groundingChunks) {
            groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri) groundingSources.push({ title: chunk.web.title, uri: chunk.web.uri });
                if (chunk.maps?.uri) placeSources.push({ title: chunk.maps.title || "場所", uri: chunk.maps.uri });
            });
        }
        
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { 
          ...msg, 
          text: fullText, 
          isThinking: false,
          groundingSources: groundingSources.length ? [...groundingSources] : undefined,
          placeSources: placeSources.length ? [...placeSources] : undefined
        } : msg));
      },
      () => setIsLoading(false),
      (error) => {
        setMessages(prev => prev.map(msg => msg.id === aiMessageId ? { ...msg, text: "エラーが発生しました。", isThinking: false } : msg));
        setIsLoading(false);
      },
      currentAttachment ? { mimeType: currentAttachment.file.type, data: currentAttachment.preview.split(',')[1] } : undefined,
      storedDocuments 
    );
  }

  if (isProfileLoading) {
    return (
      <div className="h-[100dvh] bg-[#0b1120] flex items-center justify-center text-cyber-cyan font-sans text-lg">
        <div className="animate-pulse tracking-[0.5em]">システム起動中...</div>
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
        />
        {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onSelectSession={handleRestoreSession} />}
        {showFileWarehouse && <FileWarehouse onClose={() => setShowFileWarehouse(false)} onUpdateDocuments={setStoredDocuments} />}
      </>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#0b1120] text-gray-100 font-sans overflow-hidden">
      <LiveCallOverlay isActive={isLiveCallActive} onEndCall={() => setIsLiveCallActive(false)} secretaryProfile={secretaryProfile} />
      
      {showFileWarehouse && <FileWarehouse onClose={() => setShowFileWarehouse(false)} onUpdateDocuments={setStoredDocuments} />}
      {showHistory && <HistoryModal onClose={() => setShowHistory(false)} onSelectSession={handleRestoreSession} />}

      <header className="flex-shrink-0 bg-[#0b1120] border-b border-gray-800 h-20 flex items-center justify-between px-4 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <ShieldCheck className="text-cyber-cyan" size={32} />
          <div>
            <h1 className="font-serif font-bold text-gray-200 text-lg tracking-widest uppercase leading-tight">クラウド社長室Z</h1>
            <div className="flex items-center gap-1.5 opacity-50">
               <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
               <span className="text-[10px] font-mono tracking-tighter uppercase">プロトコルL5 暗号化済み</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 md:gap-3">
           <button onClick={() => setShowHistory(true)} className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800"><Clock size={24} /></button>
           <button onClick={() => setShowFileWarehouse(true)} className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800"><FolderOpen size={24} /></button>
           <button onClick={() => setIsLiveCallActive(true)} className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800"><Headset size={24} /></button>
           <button onClick={() => setHasStarted(false)} className="text-gray-400 hover:text-white p-2.5 rounded-full hover:bg-gray-800"><Menu size={24} /></button>
        </div>
      </header>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        <div className="flex-1 flex flex-col min-w-0">
           <main className="flex-1 overflow-y-auto p-4 scroll-smooth bg-[#0b1120]">
             <div className="max-w-3xl mx-auto flex flex-col gap-6 pb-2">
               {messages.map((msg) => (
                 <ChatMessage key={msg.id} message={msg} onActionSelect={(a) => submitMessage(a)} avatarUrl={secretaryProfile?.avatarUrl} />
               ))}
               <div ref={messagesEndRef} />
             </div>
           </main>

           <footer className="flex-shrink-0 bg-[#0b1120] border-t border-gray-800 p-4 z-20 pb-safe">
             <div className="max-w-3xl mx-auto">
               <ModeSelector currentMode={mode} onModeChange={setMode} disabled={isLoading} />
               <div className="relative flex flex-col bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-3xl p-3 focus-within:border-cyber-cyan transition-all mt-3">
                 <div className="flex items-center gap-3">
                   <button className="p-3 text-gray-500 hover:text-white rounded-full hover:bg-gray-800"><Paperclip size={24} /></button>
                   <textarea
                     ref={textAreaRef}
                     value={inputValue}
                     onChange={(e) => setInputValue(e.target.value)}
                     onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMessage(inputValue.trim()); } }}
                     placeholder="ご指示をどうぞ"
                     className="flex-1 bg-transparent text-gray-100 placeholder-gray-600 text-lg p-2 resize-none outline-none font-sans min-w-0"
                     rows={1}
                     disabled={isLoading}
                   />
                   <button className="p-3 text-gray-500 hover:text-white rounded-full hover:bg-gray-800"><Mic size={24} /></button>
                   <button onClick={() => submitMessage(inputValue.trim())} disabled={!inputValue.trim() || isLoading} className="p-4 rounded-2xl bg-cyber-cyan text-black hover:opacity-90 disabled:opacity-30 transition-all shadow-lg active:scale-95">
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
