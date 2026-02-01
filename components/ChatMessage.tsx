
import React from 'react';
import { Message, Sender, EmailDraft } from '../types';
import ReactMarkdown from 'react-markdown';
import { User, Bot, MapPin, ExternalLink, Loader2, Volume2, Ticket, ChevronRight, Mail, Reply, Send, UserCheck } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  onActionSelect?: (action: string) => void;
  avatarUrl?: string; 
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, onActionSelect, avatarUrl }) => {
  const isUser = message.sender === Sender.USER;

  const handleReadAloud = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message.text);
      utterance.lang = 'ja-JP';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleReplyEmail = (emailId: string) => {
    if (onActionSelect) {
      onActionSelect(`メールID: ${emailId} への返信案を作成してください。`);
    }
  };

  const handleConfirmSend = (draft: EmailDraft) => {
    if (onActionSelect) {
      onActionSelect(`この内容でメールを送信してください：宛先 ${draft.to}, 件名 ${draft.subject}, 本文 ${draft.body}`);
    }
  };

  const renderContent = (text: string) => {
    let displayContent = text;
    const components: React.ReactNode[] = [];

    // 各種カスタムタグのパース
    const ticketRegex = /:::ticket\s*(\{.*?\})\s*:::/s;
    const ticketMatch = text.match(ticketRegex);
    let ticketData = null;
    if (ticketMatch) {
      try {
        ticketData = JSON.parse(ticketMatch[1]);
        displayContent = displayContent.replace(ticketRegex, ''); 
      } catch (e) { console.error("Ticket JSON parse error"); }
    }

    const emailRegex = /:::email\s*(\{.*?\})\s*:::/gs;
    const emailMatches = [...text.matchAll(emailRegex)];
    const emails: any[] = [];
    if (emailMatches.length > 0) {
      emailMatches.forEach(match => {
        try {
          emails.push(JSON.parse(match[1]));
          displayContent = displayContent.replace(match[0], '');
        } catch (e) { console.error("Email JSON parse error"); }
      });
    }

    const draftRegex = /:::draft\s*(\{.*?\})\s*:::/gs;
    const draftMatches = [...text.matchAll(draftRegex)];
    const drafts: EmailDraft[] = [];
    if (draftMatches.length > 0) {
      draftMatches.forEach(match => {
        try {
          drafts.push(JSON.parse(match[1]));
          displayContent = displayContent.replace(match[0], '');
        } catch (e) { console.error("Draft JSON parse error"); }
      });
    }

    components.push(
      <div key="text" className="prose prose-invert prose-base max-w-none font-sans break-words text-base leading-relaxed">
        <ReactMarkdown 
           components={{
            a: ({ node, ...props }: any) => <a {...props} target="_blank" className="text-blue-400 hover:underline" />,
           }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
    );

    if (ticketData) {
      components.push(
        <div key="ticket" className="mt-3 bg-gray-800 border border-gray-700 p-3 rounded-lg max-w-full">
           <div className="flex items-center gap-2 mb-2 border-b border-gray-700 pb-2">
             <Ticket className="text-yellow-500" size={16} />
             <span className="text-yellow-500 font-bold text-xs">手配完了通知</span>
           </div>
           <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
              <div><div className="text-gray-500">種別</div><div>{ticketData.type}</div></div>
              <div><div className="text-gray-500">番号</div><div>{ticketData.confirmationCode || '-'}</div></div>
           </div>
        </div>
      );
    }

    if (emails.length > 0) {
      components.push(
        <div key="emails" className="mt-3 flex flex-col gap-2 max-w-full">
          {emails.map((email, idx) => (
            <div key={idx} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
              <div className="flex items-start gap-2">
                <Mail size={16} className="text-gray-400 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                   <div className="flex justify-between items-start mb-1">
                     <span className="font-bold text-gray-200 text-xs truncate">{email.subject}</span>
                     {email.unread && <span className="text-[10px] bg-red-900/40 text-red-400 px-1.5 rounded ml-1 whitespace-nowrap">未読</span>}
                   </div>
                   <p className="text-[10px] text-gray-400 mb-2 truncate">{email.from}</p>
                   <button 
                     onClick={() => handleReplyEmail(email.id)}
                     className="flex items-center gap-1 text-[10px] bg-cyber-cyan/20 border border-cyber-cyan/30 hover:bg-cyber-cyan/40 px-3 py-1.5 rounded-full text-cyber-cyan transition-all"
                   >
                     <Reply size={12} /> 代理返信を作成
                   </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (drafts.length > 0) {
      components.push(
        <div key="drafts" className="mt-4 flex flex-col gap-3 max-w-full animate-fadeIn">
          {drafts.map((draft, idx) => (
            <div key={idx} className="bg-gray-900 border-2 border-cyber-cyan/50 rounded-2xl overflow-hidden shadow-2xl">
              <div className="bg-cyber-cyan/10 px-4 py-2 border-b border-cyber-cyan/20 flex items-center justify-between">
                <div className="flex items-center gap-2 text-cyber-cyan">
                  <UserCheck size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">返信案の承認待ち</span>
                </div>
              </div>
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-[60px_1fr] gap-2 text-xs">
                  <span className="text-gray-500">宛先:</span><span className="text-white font-mono">{draft.to}</span>
                  <span className="text-gray-500">件名:</span><span className="text-white font-bold">{draft.subject}</span>
                </div>
                <div className="text-sm text-gray-300 bg-black/40 p-3 rounded-xl border border-white/5 leading-relaxed whitespace-pre-wrap">
                  {draft.body}
                </div>
                <div className="pt-2 flex gap-2">
                  <button 
                    onClick={() => handleConfirmSend(draft)}
                    className="flex-1 bg-cyber-cyan text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-lg"
                  >
                    <Send size={16} /> この内容で送信する
                  </button>
                  <button 
                    onClick={() => onActionSelect?.('もう少しフォーマルな表現に変更してください。')}
                    className="px-4 py-3 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 transition-all text-xs"
                  >
                    修正指示
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    return <>{components}</>;
  };

  return (
    <div className={`flex w-full mb-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex flex-col max-w-[88%] md:max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
          
          <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border overflow-hidden ${isUser ? 'bg-gray-700 border-gray-600' : 'bg-gray-800 border-gray-700'}`}>
            {isUser ? (
              <User size={16} className="text-gray-400" /> 
            ) : avatarUrl ? (
              <img src={avatarUrl} alt="秘書" className="w-full h-full object-cover" />
            ) : (
              <Bot size={16} className="text-gray-400" />
            )}
          </div>

          <div className={`flex flex-col min-w-0 ${isUser ? 'items-end' : 'items-start'}`}>
            <div className={`px-4 py-3 rounded-xl border relative group break-words w-full ${
              isUser 
                ? 'bg-gray-800 border-gray-700 text-gray-100 rounded-tr-none' 
                : 'bg-black/20 border-gray-800 text-gray-200 rounded-tl-none'
            }`}>
               {!isUser && (
                 <button 
                   onClick={handleReadAloud}
                   className="absolute -top-2 -right-2 p-1 bg-gray-800 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 border border-gray-600"
                 >
                   <Volume2 size={12} />
                 </button>
               )}

               {message.isThinking ? (
                 <div className="flex items-center gap-2 text-gray-500 text-base">
                   <Loader2 size={16} className="animate-spin" />
                   <span>思考中...</span>
                 </div>
               ) : renderContent(message.text)}
            </div>
            
            <span className="text-[10px] text-gray-600 mt-0.5 px-1">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 ml-10">
            {message.suggestedActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => onActionSelect && onActionSelect(action)}
                className="flex items-center gap-0.5 px-4 py-2 bg-gray-800 border border-gray-700 rounded-full text-sm text-gray-300 hover:bg-white hover:text-black transition-colors"
              >
                {action}
                <ChevronRight size={14} className="opacity-50" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;
