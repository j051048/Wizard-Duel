import { useState, useEffect, useRef, useCallback } from 'react';
import { DuelPhase } from '../types';
import { 
  TURN_DURATION_SECONDS, MULLIGAN_DURATION_SECONDS, TURN_BANNER_DEFAULT_DURATION 
} from '../config/timing';

const TURN_DURATION = TURN_DURATION_SECONDS;
const MULLIGAN_DURATION = MULLIGAN_DURATION_SECONDS;

interface UseTurnManagerReturn {
  phase: DuelPhase;
  turnTimeLeft: number;
  turnBanner: 'player' | 'opponent' | null;
  setPhase: (p: DuelPhase) => void;
  setTurnTimeLeft: (t: number) => void;
  showTurnBanner: (type: 'player' | 'opponent') => void;
  resetTurnManager: () => void;
}

export function useTurnManager(
  initialPhase: DuelPhase = 'DRAFT_PHASE',
  onTurnTimeout?: () => void
): UseTurnManagerReturn {
  const [phase, setPhase] = useState<DuelPhase>(initialPhase);
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_DURATION);
  const [turnBanner, setTurnBanner] = useState<'player' | 'opponent' | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onTimeoutRef = useRef(onTurnTimeout);

  useEffect(() => {
    onTimeoutRef.current = onTurnTimeout;
  }, [onTurnTimeout]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback((duration: number) => {
    stopTimer();
    setTurnTimeLeft(duration);
    
    timerRef.current = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          stopTimer();
          if (onTimeoutRef.current) onTimeoutRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  // 阶段切换时自动处理计时器
  const updatePhase = useCallback((newPhase: DuelPhase) => {
    setPhase(newPhase);
    
    // 根据阶段自动启动/停止计时
    if (newPhase === 'PLAYER_TURN') {
      startTimer(TURN_DURATION);
    } else if (newPhase === 'MULLIGAN_PHASE') {
      startTimer(MULLIGAN_DURATION);
    } else {
      stopTimer();
    }
  }, [startTimer, stopTimer]);

    // 显示横幅
  const showTurnBanner = useCallback((type: 'player' | 'opponent') => {
    setTurnBanner(type);
    setTimeout(() => setTurnBanner(null), TURN_BANNER_DEFAULT_DURATION);
  }, []);

  const resetTurnManager = useCallback(() => {
    stopTimer();
    setPhase('DRAFT_PHASE');
    setTurnBanner(null);
    setTurnTimeLeft(TURN_DURATION);
  }, [stopTimer]);

  useEffect(() => {
    return () => stopTimer();
  }, [stopTimer]);

  return {
    phase,
    turnTimeLeft,
    turnBanner,
    setPhase: updatePhase,
    setTurnTimeLeft,
    showTurnBanner,
    resetTurnManager
  };
}
