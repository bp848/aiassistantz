
import React, { useEffect, useState } from 'react';
import { AgentMode, Message } from '../types';
import { X, Calendar, Mail, RefreshCw, CheckCircle, Clock, Brain, Search, FileText, ChevronLeft, Reply, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { getDashboardData } from '../services/geminiService';

interface WorkspacePanelProps {
  mode: AgentMode;
  lastAiMessage: Message | undefined;
  onClose: () => void;
  onActionSelect?: (action: string) => void;
}

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ mode, lastAiMessage, onClose, onActionSelect }) => {
  const [dashboard, setDashboard] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  const refreshData = async () => {
    setIsSyncing(true);
    const data = await getDashboardData();
    setDashboard(data);
    setIsSyncing(false);
  };

  useEffect(() => {
    refreshData();
  }, [mode, lastAiMessage]);

  const handleReplyClick = (email: any) => {
    if (onActionSelect) {
      onActionSelect(`メール "${email.subject}" (ID: ${email.id}) への返信案を資料室のトーンで作成してください。`);
      setSelectedEmail(null);
    }
  };

  if (![AgentMode.WRITER, AgentMode.RESEARCHER, AgentMode.ADVISOR, AgentMode.SECRETARY, AgentMode.SCHEDULE].includes(mode)) return null;

  return (
    <div className="w-full md:w-[45%] h-full shrink-0 border-l border-white/10 bg-[#080d1a] flex flex-col shadow-2xl z-30 animate-slideInRight">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-gray-900/40 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className={`w-2.5 h-2.5 rounded-full ${isSyncing ? 'bg-yellow-500 animate-pulse' : 'bg-cyber-cyan'}`}></div>
            <div className={`absolute -inset-1 rounded-full ${isSyncing ? 'bg-yellow-500/20' : 'bg-cyber-cyan/20'} animate-ping`}></div>
          </div>
          <span className="text-[10px] font-bold text-cyber-slate tracking-[0.3em] uppercase">エグゼクティブ・ワークスペース</span>
        </div>
        <div className="flex items-center gap-4">
           <button onClick={refreshData} className={`text-gray-500 hover:text-cyber-cyan transition-all ${isSyncing ? 'animate-spin' : ''}`}>
             <RefreshCw size={18} />
           </button>
           <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
             <X size={20} />
           </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-[#080d1a] custom-scrollbar">
        {(mode === AgentMode.SECRETARY || mode === AgentMode.SCHEDULE) && dashboard && (
          <div className="p-6 space-y-10">
            {/* Timeline Calendar */}
            <section className="animate-fadeIn">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-cyber-cyan">
                  <Calendar size={20} />
                  <h3 className="font-serif font-bold text-base tracking-widest uppercase">本日のアジェンダ</h3>
                </div>
                <span className="text-[10px] text-gray-500 font-mono">{new Date().toLocaleDateString('ja-JP', { weekday: 'long' })}</span>
              </div>
              
              <div className="relative pl-6 space-y-6">
                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-gradient-to-b from-cyber-cyan/50 via-cyber-cyan/10 to-transparent"></div>
                
                {dashboard.events.map((evt: any) => (
                  <div key={evt.id} className="relative group">
                    <div className={`absolute -left-[23px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#080d1a] ${evt.account === 'personal' ? 'bg-blue-500' : 'bg-cyber-cyan'} group-hover:scale-125 transition-transform`}></div>
                    <div className={`p-4 rounded-2xl border transition-all hover:bg-white/5 ${evt.account === 'personal' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-white/[0.02] border-white/5'}`}>
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-mono text-cyber-cyan-light">{evt.time}</span>
                        <span className="text-[10px] text-gray-600 uppercase tracking-tighter">{evt.duration} 分</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-100 mb-1">{evt.title}</h4>
                      <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{evt.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Interactive Gmail Inbox */}
            <section className="animate-fadeIn" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-2 text-red-400 mb-6">
                <Mail size={20} />
                <h3 className="font-serif font-bold text-base tracking-widest uppercase">セキュア受信トレイ</h3>
              </div>
              
              {selectedEmail ? (
                <div className="bg-gray-900/60 border border-white/10 rounded-3xl overflow-hidden animate-fadeIn">
                   <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                      <button onClick={() => setSelectedEmail(null)} className="flex items-center gap-2 text-[10px] text-gray-500 hover:text-white uppercase font-bold tracking-widest">
                        <ChevronLeft size={14} /> 戻る
                      </button>
                      <button 
                        onClick={() => handleReplyClick(selectedEmail)}
                        className="flex items-center gap-2 text-[10px] bg-cyber-cyan text-black px-4 py-2 rounded-full font-bold hover:bg-cyber-cyan-light transition-all shadow-lg"
                      >
                        <Reply size={14} /> 代理返信案を作成
                      </button>
                   </div>
                   <div className="p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-gray-600 block uppercase font-bold mb-1">差出人</span>
                          <span className="text-xs text-cyber-cyan-light font-mono">{selectedEmail.from}</span>
                        </div>
                        <span className="text-[10px] text-gray-500 font-mono">{selectedEmail.date}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-600 block uppercase font-bold mb-1">件名</span>
                        <h4 className="text-base font-bold text-white">{selectedEmail.subject}</h4>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans opacity-90">
                           {selectedEmail.body}
                        </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {dashboard.emails.map((mail: any) => (
                    <div 
                      key={mail.id} 
                      onClick={() => setSelectedEmail(mail)}
                      className="group p-5 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-cyber-cyan/30 cursor-pointer transition-all relative overflow-hidden"
                    >
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-[10px] text-cyber-slate font-mono truncate max-w-[70%]">{mail.from}</span>
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] text-gray-600 font-mono">{mail.date}</span>
                           {mail.unread && <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-gray-200 group-hover:text-cyber-cyan transition-colors truncate mb-2">{mail.subject}</div>
                      <p className="text-[11px] text-gray-500 line-clamp-1 group-hover:text-gray-400 transition-colors">{mail.summary}</p>
                      
                      <div className="absolute right-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity">
                         <ExternalLink size={12} className="text-cyber-cyan" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* Advisor Mode */}
        {mode === AgentMode.ADVISOR && (
          <div className="p-8 space-y-8">
            <div className="bg-cyber-cyan/5 border border-cyber-cyan/20 p-6 rounded-3xl flex items-center gap-4">
               <div className="p-3 bg-cyber-cyan/10 rounded-2xl">
                 <Brain size={32} className="text-cyber-cyan animate-pulse" />
               </div>
               <div>
                 <h4 className="text-sm font-bold text-white">高度推論ロジック</h4>
                 <p className="text-[11px] text-cyber-slate uppercase tracking-widest font-mono">Gemini 3 Pro アクティブモード</p>
               </div>
            </div>
            <div className="prose prose-invert prose-base max-w-none bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner leading-loose">
              <ReactMarkdown>{lastAiMessage?.text || "思考を整理しています..."}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      <div className="px-6 py-4 border-t border-white/5 bg-black/60 flex items-center justify-between">
        <div className="flex items-center gap-4 text-[10px] text-gray-600 font-mono tracking-widest">
           <div className="flex items-center gap-1.5">
             <Clock size={12} />
             <span>同期時刻: {new Date().toLocaleTimeString()}</span>
           </div>
        </div>
        <div className="flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
           <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">プロトコルL5 暗号化済み</span>
        </div>
      </div>
    </div>
  );
};

export default WorkspacePanel;
