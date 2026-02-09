import React, { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, X } from 'lucide-react';
import { matchmaking, ChatMessage } from '../services/matchmaking';

interface GlobalChatProps {
  userId: string;
  username: string;
  isOpen: boolean;
  onClose: () => void;
}

export const GlobalChat: React.FC<GlobalChatProps> = ({ userId, username, isOpen, onClose }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [onlineCount, setOnlineCount] = useState(0);
  const [cooldown, setCooldown] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 初始化并监听消息
        const initChat = async () => {
      const channel = await matchmaking.init(userId, username);
      if (!channel) return; // Supabase not configured
      
      channel.on('broadcast', { event: 'chat' }, (payload: { payload: ChatMessage }) => {
        setMessages(prev => [...prev.slice(-49), payload.payload]);
      });

      channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineCount(Object.keys(state).length);
      });
    };

    initChat();

    return () => {
      // matchmaking.stop(); // 暂时不停止，因为可能有全局监听
    };
  }, [isOpen, userId, username]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!inputValue.trim() || cooldown > 0) return;
    matchmaking.sendChatMessage(inputValue);
    setInputValue('');
    setCooldown(30);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-4 bottom-24 w-80 h-96 bg-slate-900/90 backdrop-blur-xl border border-purple-500/30 rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in slide-in-from-right-8 fade-in">
      {/* Header */}
      <div className="p-3 border-b border-purple-500/20 bg-purple-500/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-purple-400" />
          <span className="text-sm font-bold text-purple-100">世界频道</span>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-green-500/20 rounded-full">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-green-400 font-mono">{onlineCount}</span>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs italic">
            <span>暂无消息，开始聊天吧</span>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex flex-col ${msg.user_id === userId ? 'items-end' : 'items-start'}`}>
              <span className="text-[10px] text-slate-500 mb-1">{msg.username}</span>
              <div className={`px-3 py-2 rounded-2xl text-sm max-w-[90%] break-words ${
                msg.user_id === userId 
                  ? 'bg-purple-600 text-white rounded-tr-none' 
                  : 'bg-slate-800 text-slate-200 rounded-tl-none'
              }`}>
                {msg.text}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-purple-500/20 bg-slate-950/50">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="输入消息..."
            className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
          />
          <button 
            onClick={handleSend}
            disabled={cooldown > 0}
            className={`p-2 rounded-lg transition-colors flex items-center justify-center min-w-[40px] ${
              cooldown > 0 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {cooldown > 0 ? (
              <span className="text-xs font-mono">{cooldown}</span>
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
