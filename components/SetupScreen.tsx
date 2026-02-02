
import React from 'react';
import { AgentMode } from '../types';
import { Briefcase, PenTool, CalendarClock, BrainCircuit, Globe, Bell, ShieldCheck, Users, FolderOpen, Clock } from 'lucide-react';

interface SetupScreenProps {
  onSelectMode: (mode: AgentMode) => void;
  onOpenFileWarehouse: () => void;
  onOpenHistory: () => void;
}

const SetupScreen: React.FC<SetupScreenProps> = ({ onSelectMode, onOpenFileWarehouse, onOpenHistory }) => {
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
      {/* 背景の装飾 */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-cyber-cyan/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-900/10 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-lg flex flex-col items-center z-10 animate-fadeIn">
        <div className="mb-12 text-center">
          <div className="w-20 h-20 bg-gray-900 border border-gray-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl relative">
             <ShieldCheck size={40} className="text-cyber-cyan" />
             <div className="absolute -inset-2 bg-cyber-cyan/10 blur-xl rounded-full animate-pulse"></div>
          </div>
          <h1 className="text-4xl font-serif font-bold text-white mb-2 tracking-[0.2em] uppercase">
            クラウド社長室Z
          </h1>
          <p className="text-cyber-slate text-[10px] font-mono uppercase tracking-[0.4em] opacity-60">
            AI EXECUTIVE SECRETARY AGENT
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full px-2 mb-10">
          {options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.label}
                onClick={() => opt.isAction && opt.action ? opt.action() : onSelectMode(opt.mode as AgentMode)}
                className="flex flex-col items-center justify-center p-8 bg-gray-900/40 backdrop-blur-md border border-white/5 rounded-[2rem] hover:bg-white/5 hover:border-cyber-cyan/30 transition-all active:scale-95 shadow-xl group"
              >
                <Icon size={32} className="text-gray-500 group-hover:text-cyber-cyan transition-colors mb-4" />
                <span className="text-sm font-bold text-gray-400 group-hover:text-white transition-colors">{opt.label}</span>
              </button>
            );
          })}
        </div>

        <button 
          onClick={onOpenHistory}
          className="flex items-center gap-3 px-10 py-5 bg-gray-800/50 backdrop-blur-md border border-white/5 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-all w-[90%] justify-center shadow-lg group"
        >
          <Clock size={18} className="group-hover:text-cyber-cyan transition-colors" />
          <span className="font-bold text-sm tracking-widest">履歴からセッションを再開</span>
        </button>
      </div>

      {/* ステータスバー：接続済みを強調 */}
      <div className="absolute bottom-10 left-0 right-0 flex justify-center w-full px-6">
        <div className="bg-black/60 backdrop-blur-2xl border border-white/10 p-5 rounded-[2rem] shadow-2xl flex items-center gap-6 max-w-sm w-full border-l-4 border-l-cyber-cyan animate-fadeIn">
           <div className="w-10 h-10 bg-cyber-cyan/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={20} className="text-cyber-cyan" />
           </div>
           <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                 <span className="text-[10px] text-cyber-cyan font-bold uppercase tracking-widest">Workspace Connected</span>
              </div>
              <p className="text-[10px] text-gray-500 font-sans leading-tight">
                Google Workspace 連携済み。すべての操作は暗号化され、セキュアに処理されます。
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
