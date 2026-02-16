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
  //@ts-ignore - fixing type mismatch with store
  const activeAddress = useUserStore(state => state.activeAddress) || `guest_${Date.now()}`;
  
  const [status, setStatus] = useState('连接战场中...');
  const [opponentDeck, setOpponentDeck] = useState<SpellType[] | null>(null);
  
  const hasSentDeck = useRef(false);
  
  useEffect(() => {
    if (!pvpRoomId) return;

    // 清理并在连接成功后发送牌组
    const connectAndSync = () => {
      setStatus('建立加密连接...');
      
      pvpService.connect(pvpRoomId, activeAddress, (data: any) => {
        // 处理握手消息
        if (data.type === 'HANDSHAKE' && data.deck && Array.isArray(data.deck)) {
          console.log('[PVP Sync] 收到对手牌组，数量:', data.deck.length);
          setOpponentDeck(data.deck);
        }
        
        // 如果对手刚加入，重发我的牌组（为了鲁棒性，以防对手通过重连加入）
        if (data.type === 'PLAYER_JOINED') {
          console.log('[PVP Sync] 对手加入，发送牌组...');
          sendDeck();
        }
      });
      
      // 连接建立需要一点时间，简单延迟后发送
      setTimeout(() => {
        sendDeck();
      }, 1000);
    };

    const sendDeck = () => {
      console.log('[PVP Sync] 广播我的牌组...');
      setStatus('等待对手同步...');
      
      pvpService.sendAction({
        type: 'HANDSHAKE',
        playerId: activeAddress,
        role: role,
        deck: myDeck
      });
      hasSentDeck.current = true;
    };

    connectAndSync();

    return () => {
      // 在这里不断开，因为 BattleArena 还要用同一个连接？
      // 不，pvpService是单例，connect会覆盖旧连接。
      // BattleArena 会再次调用 connect，这没问题。
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
