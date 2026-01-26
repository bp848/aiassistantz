
import React, { useEffect, useState } from 'react';
import { X, Clock, Trash2, MessageSquare, ChevronRight, Calendar } from 'lucide-react';
import { ChatSession, getSessions, deleteSession } from '../services/historyService';
import { AgentMode } from '../types';

interface HistoryModalProps {
  onClose: () => void;
  onSelectSession: (session: ChatSession) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ onClose, onSelectSession }) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    setSessions(getSessions());
  }, []);

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('この履歴を削除しますか？')) {
      deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    }
  };

  const formatMode = (mode: AgentMode) => {
    switch(mode) {
      case AgentMode.SECRETARY: return '会話';
      case AgentMode.WRITER: return '作成';
      case AgentMode.ADVISOR: return '相談';
      case AgentMode.RESEARCHER: return '調査';
      case AgentMode.CONCIERGE: return '手配';
      case AgentMode.SCHEDULE: return '予定';
      case AgentMode.MINUTES: return '会議';
      default: return 'その他';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-[#0b1120] border border-gray-700 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50 rounded-t-2xl">
          <div className="flex items-center gap-2 text-presidential-gold">
            <Clock size={20} />
            <h2 className="text-lg font-serif font-bold tracking-wide">対話履歴</h2>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-full hover:bg-gray-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 bg-[#0b1120]">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
              <MessageSquare size={48} className="opacity-20" />
              <p>履歴はありません</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  onClick={() => onSelectSession(session)}
                  className="group relative flex flex-col gap-1 p-4 bg-gray-900/50 border border-gray-800 rounded-xl hover:bg-gray-800 hover:border-gray-600 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-800 text-gray-300 rounded border border-gray-700">
                        {formatMode(session.mode)}
                      </span>
                      <span className="text-[10px] text-gray-500 flex items-center gap-1">
                        <Calendar size={10} />
                        {new Date(session.lastUpdated).toLocaleString('ja-JP')}
                      </span>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(e, session.id)}
                      className="text-gray-600 hover:text-red-500 p-1.5 -mt-2 -mr-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  
                  <h3 className="text-sm font-bold text-gray-200 truncate pr-4">{session.title}</h3>
                  <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                    {session.preview}
                  </p>
                  
                  <ChevronRight size={16} className="absolute right-4 bottom-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-gray-800 bg-gray-900/30 text-center">
          <p className="text-[10px] text-gray-600">履歴はブラウザに保存されています</p>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;
