import React, { useEffect, useState, useRef } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { pvpService } from '../services/pvpService';
import { SpellType } from '../types';
import { Loader2 } from 'lucide-react';
import { useUserStore } from '../stores/useUserStore';

interface PvpStateSyncProps {
  role: 'player1' | 'player2';
  seed: number;
  myDeck: SpellType[];
  onSyncComplete: (p1Deck: SpellType[], p2Deck: SpellType[]) => void;
}

export const PvpStateSync: React.FC<PvpStateSyncProps> = ({
  role,
  seed,
  myDeck,
  onSyncComplete
}) => {
  const pvpRoomId = useUIStore(state => state.pvpRoomId);
  const activeAddress = useUserStore(state => state.activeAddress);
  
  const [status, setStatus] = useState('连接战场中...');
  const [opponentDeck, setOpponentDeck] = useState<SpellType[] | null>(null);
  
  const hasSentDeck = useRef(false);
  
  useEffect(() => {
    if (!pvpRoomId || !activeAddress) return;

    const sendDeck = () => {
      console.log('[PVP Sync] 广播我的牌组...', { role, count: myDeck.length });
      setStatus('等待对手同步...');
      
      pvpService.sendAction({
        type: 'HANDSHAKE',
        playerId: activeAddress,
        role: role,
        deck: myDeck
      });
      hasSentDeck.current = true;
    };

    const connectAndSync = () => {
      setStatus('建立加密连接...');
      
      pvpService.connect(pvpRoomId, activeAddress, (data: any) => {
        // 1. 服务端确认连接成功
        if (data.type === 'CONNECTED' || data.type === 'READY') {
          console.log('[PVP Sync] 连接已就绪，准备交换数据');
          sendDeck(); // 连接成功立刻发送
        }

        // 2. 处理握手消息 (对手发来的牌组)
        if (data.type === 'HANDSHAKE' && data.deck && Array.isArray(data.deck)) {
          // 这里加一个校验，防止误收自己的包（虽然概率低）
          if (data.playerId !== activeAddress) {
             console.log('[PVP Sync] 收到对手牌组，数量:', data.deck.length);
             setOpponentDeck(data.deck);
          }
        }
        
        // 3. 补发机制：如果有人加入（对方可能是后进来的），重新广播我的牌组
        if (data.type === 'PLAYER_JOINED' && data.playerId !== activeAddress) {
          console.log('[PVP Sync] 对手重新加入/连接，补发牌组...');
          sendDeck();
        }
      });
    };

    connectAndSync();

    // 兜底机制：如果连接成功但 3秒内没动作，尝试补发一次
    const fallbackTimer = setTimeout(() => {
        if (!opponentDeck && hasSentDeck.current) {
            console.log('[PVP Sync] 兜底补发...');
            sendDeck();
        }
    }, 3000);

    return () => {
       clearTimeout(fallbackTimer);
    };
  }, [pvpRoomId, activeAddress, role, myDeck]);

  // 当收到对手牌组，完成同步
  useEffect(() => {
    if (!opponentDeck) return;
    
    setStatus('同步完成，生成战场...');
    
    // 确定 P1 和 P2 牌组
    const p1Deck = role === 'player1' ? myDeck : opponentDeck;
    const p2Deck = role === 'player1' ? opponentDeck : myDeck;
    
    // 延迟一点以展示状态
    setTimeout(() => {
      onSyncComplete(p1Deck, p2Deck);
    }, 500);
    
  }, [opponentDeck, role, myDeck, onSyncComplete]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center font-tech text-white">
      <div className="relative mb-8">
        <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 size={32} className="text-purple-400 animate-pulse" />
        </div>
      </div>
      
      <h2 className="text-2xl font-wizard mb-2">战场同步中</h2>
      <p className="text-slate-400 animate-pulse">{status}</p>
      
      {/* Debug Info */}
      <div className="mt-8 p-4 bg-slate-900/50 rounded text-xs font-mono text-slate-600">
        <div>Room: {pvpRoomId}</div>
        <div>Role: {role}</div>
        <div>Seed: {seed}</div>
        <div>Opponent Deck: {opponentDeck ? 'Received' : 'Waiting...'}</div>
      </div>
    </div>
  );
};
