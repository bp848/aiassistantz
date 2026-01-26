
import React from 'react';
import { AgentMode } from '../types';
import { Briefcase, PenTool, CalendarClock, BrainCircuit, Globe, Bell, ShieldCheck, Users, FolderOpen, Clock, User, Mail, Check, Calendar, LogOut } from 'lucide-react';
import { getUserProfile } from '../services/userService';

interface SetupScreenProps {
  onSelectMode: (mode: AgentMode) => void;
  onOpenFileWarehouse: () => void;
  onOpenHistory: () => void;
  onLogout: () => Promise<void>;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSelectMode, onOpenFileWarehouse, onOpenHistory, onLogout }) => {
  const [currentUser, setCurrentUser] = React.useState<{email: string} | null>(null);

  React.useEffect(() => {
    const loadUser = async () => {
      console.log('SetupScreen: Loading user profile...');
      const profile = await getUserProfile();
      console.log('SetupScreen: Profile result:', profile);
      if (profile) {
        console.log('SetupScreen: Setting current user:', profile.user.email);
        setCurrentUser({ email: profile.user.email });
      } else {
        console.log('SetupScreen: No profile found');
      }
    };
    loadUser();
  }, []);
  const options = [
    { mode: AgentMode.SCHEDULE, label: '今日の予定', icon: CalendarClock },
    { mode: AgentMode.MINUTES, label: '会議・議事録', icon: Users },
    { mode: AgentMode.CONCIERGE, label: '予約・手配', icon: Bell },
    { mode: AgentMode.WRITER, label: '文書作成', icon: PenTool },
    { mode: AgentMode.ADVISOR, label: '相談・壁打ち', icon: BrainCircuit },
    { mode: AgentMode.RESEARCHER, label: '情報収集', icon: Globe },
    { mode: AgentMode.SECRETARY, label: '会話する', icon: Briefcase },
    { mode: 'WAREHOUSE', label: '資料室', icon: FolderOpen, isAction: true, action: onOpenFileWarehouse },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0F172A] flex flex-col items-center justify-center p-4 text-gray-100 relative overflow-hidden">
      
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyber-cyan blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-lg flex flex-col items-center z-10 mb-20 md:mb-0 animate-fadeIn">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
             <ShieldCheck size={32} className="text-cyber-cyan" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-white mb-2 tracking-widest">
            クラウド社長室Z
          </h1>
          <p className="text-gray-500 text-sm font-sans uppercase tracking-[0.2em]">
            AIエグゼクティブ秘書エージェント
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full px-2 mb-8">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={() => opt.isAction && opt.action ? opt.action() : onSelectMode(opt.mode as AgentMode)}
                className="flex flex-col items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm border border-gray-800 rounded-2xl hover:bg-gray-800/60 hover:border-gray-600 transition-all active:scale-95 shadow-lg group"
              >
                <Icon size={32} className="text-gray-500 group-hover:text-cyber-cyan transition-colors mb-4" />
                <span className="text-sm font-bold text-gray-300 group-hover:text-white">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <button 
          onClick={onOpenHistory}
          className="flex items-center gap-3 px-8 py-4 bg-gray-800 border border-gray-700 rounded-full text-gray-300 hover:text-white hover:bg-gray-700 transition-all w-[90%] justify-center shadow-lg"
        >
          <Clock size={18} />
          <span className="font-bold text-sm">履歴から再開</span>
        </button>
      </div>

      {/* Connection Status Bar */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center w-full px-6">
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-3xl shadow-2xl flex items-center gap-6 max-w-md w-full">
           <div className="flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-8 h-8">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.47 2.18 2.18 4.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
           </div>
           <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">同期中</span>
                 <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-col gap-1">
                 <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-200 truncate">{currentUser?.email || '未設定'}</span>
                    <div className="flex gap-1">
                       <Mail size={10} className="text-red-500" />
                       <Calendar size={10} className="text-blue-500" />
                    </div>
                 </div>
                 <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-400 truncate opacity-60">{currentUser?.email || '未設定'}</span>
                    <Check size={10} className="text-green-500" />
                 </div>
              </div>
           </div>
        </div>
      </div>
      
      {/* Logout button */}
      <button
        onClick={onLogout}
        className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
        title="ログアウト"
      >
        <LogOut size={20} />
      </button>
    </div>
  );
};

export default SetupScreen;
