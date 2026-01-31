
import React from 'react';
import { AgentMode } from '../types';
import { Briefcase, PenTool, CalendarClock, BrainCircuit, Globe, Bell, ShieldCheck, Users, FolderOpen, Clock, AlertCircle, Mail, X, Calendar } from 'lucide-react';

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
      
      <div className="w-full max-w-lg flex flex-col items-center z-10 mb-20 md:mb-0 animate-fadeIn">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 bg-gray-900 border border-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
             <ShieldCheck size={32} className="text-cyber-cyan" />
          </div>
          <h1 className="text-3xl font-serif font-bold text-white mb-2 tracking-widest">
            クラウド社長室Z
          </h1>
          <p className="text-yellow-500 text-[10px] font-sans uppercase tracking-[0.2em] bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
            デモ・シミュレーションモード
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

      {/* Connection Status Bar - 改修：正直な表示 */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center w-full px-6">
        <div className="bg-black/40 backdrop-blur-xl border border-yellow-500/20 p-4 rounded-3xl shadow-2xl flex items-center gap-6 max-w-md w-full relative overflow-hidden">
           <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
           <div className="flex-shrink-0 opacity-40 grayscale">
              <AlertCircle size={24} className="text-yellow-500" />
           </div>
           <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                 <span className="text-[10px] text-yellow-500 font-bold uppercase tracking-wider">未連携（シミュレーション）</span>
              </div>
              <div className="flex flex-col gap-1">
                 <p className="text-[10px] text-gray-500 leading-tight">
                   Google/LINE APIは未接続です。表示されているアカウント情報はダミーです。
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SetupScreen;
