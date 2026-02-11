
import React, { useEffect, useState } from 'react';
import { AgentMode, Message } from '../types';
import { X, Calendar, Mail, RefreshCw, Clock, Brain, ChevronLeft, Reply, ExternalLink } from 'lucide-react';
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

  const refreshData = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setDashboard(getDashboardData());
      setIsSyncing(false);
    }, 600);
  };

  useEffect(() => {
    refreshData();
  }, [mode, lastAiMessage]);

  const handleReplyClick = (email: any) => {
    if (onActionSelect) {
      onActionSelect(`メール "${email.subject}" (ID: ${email.id}) への返信案を作成してください。`);
      setSelectedEmail(null);
    }
  };

  if (![AgentMode.WRITER, AgentMode.RESEARCHER, AgentMode.ADVISOR, AgentMode.SECRETARY, AgentMode.SCHEDULE].includes(mode)) return null;

  const isEmpty = dashboard && dashboard.events?.length === 0 && dashboard.emails?.length === 0;

  return (
    <div className="w-full md:w-[45%] min-w-[320px] max-w-[480px] h-full shrink-0 border-l border-white/10 bg-[#080d1a] flex flex-col shadow-2xl z-30 animate-slideInRight">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-gray-900/40 backdrop-blur-xl">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSyncing ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
          <span className="text-xs font-medium text-gray-300">予定・メール</span>
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

      <div className="flex-1 overflow-y-auto bg-[#080d1a]">
        {(mode === AgentMode.SECRETARY || mode === AgentMode.SCHEDULE) && dashboard && (
          <div className="p-5 space-y-8">
            {/* 空状態: 説明とクイックアクション */}
            {isEmpty && (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 space-y-4">
                <p className="text-sm text-gray-400 leading-relaxed">
                  ここには、秘書が取得した<strong className="text-gray-300">本日の予定</strong>と<strong className="text-gray-300">メール一覧</strong>が表示されます。
                </p>
                <p className="text-xs text-gray-500">
                  左の入力欄で例えば次のように送ると反映されます。
                </p>
                <div className="flex flex-wrap gap-2">
                  {onActionSelect && (
                    <>
                      <button type="button" onClick={() => onActionSelect('本日の予定を一覧で表示')} className="px-4 py-2 rounded-full bg-cyber-cyan/20 text-cyber-cyan text-xs font-medium hover:bg-cyber-cyan/30 transition-colors border border-cyber-cyan/30">本日の予定を表示</button>
                      <button type="button" onClick={() => onActionSelect('未読メールを確認して')} className="px-4 py-2 rounded-full bg-white/10 text-gray-300 text-xs font-medium hover:bg-white/15 transition-colors border border-white/10">未読メールを確認</button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* タイムライン・カレンダー */}
            <section className="animate-fadeIn">
              <div className="flex items-center justify-between mb-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200">
                  <Calendar size={18} className="text-cyber-cyan" />
                  本日の予定
                </h3>
                <span className="text-[10px] text-gray-500">{new Date().toLocaleDateString('ja-JP', { weekday: 'short' })}</span>
              </div>
              
              <div className="relative pl-5 space-y-4">
                <div className="absolute left-[5px] top-1 bottom-1 w-px bg-white/10" />
                
                {!isEmpty && dashboard.events?.length === 0 ? (
                  <p className="text-xs text-gray-500 py-2">予定はありません。「本日の予定を表示」と送ると取得できます。</p>
                ) : null}
                {(dashboard.events || []).map((evt: any) => (
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

            {/* メール受信トレイ */}
            <section className="animate-fadeIn">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-4">
                <Mail size={18} className="text-rose-400/90" />
                受信トレイ
              </h3>
              
              {!isEmpty && dashboard.emails?.length === 0 && !selectedEmail ? (
                <p className="text-xs text-gray-500 py-2">メール一覧はここに表示されます。「未読メールを確認」と送ってください。</p>
              ) : null}
              
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
                      <div className="pt-4 border-t border-white/5">
                        <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-sans opacity-90">
                           {selectedEmail.body}
                        </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {(dashboard.emails || []).map((mail: any) => (
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
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {/* アドバイザーモード（思考表示） */}
        {mode === AgentMode.ADVISOR && (
          <div className="p-8 space-y-8">
            <div className="bg-cyber-cyan/5 border border-cyber-cyan/20 p-6 rounded-3xl flex items-center gap-4">
               <div className="p-3 bg-cyber-cyan/10 rounded-2xl">
                 <Brain size={32} className="text-cyber-cyan animate-pulse" />
               </div>
               <div>
                 <h4 className="text-sm font-bold text-white">高度推論ロジック稼働中</h4>
                 <p className="text-[11px] text-cyber-slate uppercase tracking-widest font-mono">Gemini 3 Pro Active Mode</p>
               </div>
            </div>
            <div className="prose prose-invert prose-base max-w-none bg-black/20 p-6 rounded-3xl border border-white/5 shadow-inner leading-loose">
              <ReactMarkdown>{lastAiMessage?.text || "思考を整理しています..."}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="px-4 py-3 border-t border-white/5 bg-black/40 flex items-center justify-between text-[10px] text-gray-500">
         <span>更新: {new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
         <button type="button" onClick={refreshData} className="text-gray-500 hover:text-cyber-cyan transition-colors" title="再取得">再取得</button>
      </div>
    </div>
  );
};

export default WorkspacePanel;
