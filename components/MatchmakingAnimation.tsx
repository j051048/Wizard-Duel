import React, { useState, useEffect, useMemo } from 'react';
import { Swords, Search, User, Clock, Zap } from 'lucide-react';

interface MatchmakingAnimationProps {
  onComplete: () => void;
  opponentName?: string;
  opponentAvatar?: string;
  isTavernMode?: boolean;
}

export const MatchmakingAnimation: React.FC<MatchmakingAnimationProps> = ({
  onComplete,
  opponentName = '神秘对手',
  opponentAvatar,
  isTavernMode = false
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // 预生成背景粒子位置（解决性能与抖动问题）
  const particles = useMemo(() => Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2 + Math.random() * 2}s`
  })), []);

  const steps = [
    { icon: Search, text: '搜索可用对手...', duration: 800 },
    { icon: User, text: '找到匹配对手', duration: 600 },
    { icon: Swords, text: '准备战斗环境', duration: 800 },
    { icon: Zap, text: '开始对战!', duration: 400 }
  ];

  useEffect(() => {
    let totalDuration = 0;
    const stepDurations = steps.map(step => step.duration);
    const totalTime = stepDurations.reduce((a, b) => a + b, 0);

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / totalTime) * 50; // 50ms interval
        if (newProgress >= 100) {
          setIsComplete(true);
          setTimeout(onComplete, 500);
          return 100;
        }
        return newProgress;
      });
    }, 50);

    let cumulativeTime = 0;
    const timeouts: NodeJS.Timeout[] = [];
    stepDurations.forEach((duration, index) => {
      cumulativeTime += duration;
      const t = setTimeout(() => setCurrentStep(index), cumulativeTime);
      timeouts.push(t);
    });

    return () => {
        clearInterval(interval);
        timeouts.forEach(t => clearTimeout(t));
    };
  }, [onComplete]);

  const currentStepData = steps[Math.min(currentStep, steps.length - 1)];
  const CurrentIcon = currentStepData.icon;

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute w-2 h-2 bg-purple-400 rounded-full animate-pulse opacity-30"
            style={{
              left: p.left,
              top: p.top,
              animationDelay: p.delay,
              animationDuration: p.duration
            }}
          />
        ))}

        {/* Pulsing circles */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-96 h-96 border-2 border-purple-500/20 rounded-full animate-ping" />
          <div className="absolute inset-4 border border-purple-400/20 rounded-full animate-ping animation-delay-300" />
          <div className="absolute inset-8 border border-purple-300/20 rounded-full animate-ping animation-delay-600" />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center space-y-8 max-w-md mx-auto px-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-wizard font-bold text-white">
            {isTavernMode ? '🏰 进入酒馆' : '⚔️ 匹配对手'}
          </h1>
          <p className="text-gray-300 text-lg">
            {isTavernMode ? '准备与AI对手对战' : '寻找合适的对手...'}
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex justify-center">
            <div className={`
              w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500
              ${isComplete
                ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-green-500/50'
                : 'bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg shadow-purple-500/30'
              }
            `}>
              <CurrentIcon
                size={32}
                className={`text-white transition-transform duration-300 ${
                  isComplete ? 'animate-bounce' : ''
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xl font-bold text-white transition-all duration-300">
              {currentStepData.text}
            </p>
            {currentStep >= 1 && !isComplete && (
              <p className="text-purple-300 text-sm">
                对手: {opponentName}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300 ease-out rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-400">
              <span>0%</span>
              <span className="font-mono">{Math.round(progress)}%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {currentStep >= 1 && (
          <div className={`
            bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-slate-600
            transition-all duration-500 transform
            ${currentStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
          `}>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-2xl overflow-hidden">
                {opponentAvatar ? (
                  <img src={opponentAvatar} alt={opponentName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">{isTavernMode ? '🤖' : '👤'}</span>
                )}
              </div>
              <div className="text-left">
                <h3 className="text-lg font-bold text-white">{opponentName}</h3>
                <p className="text-gray-400 text-sm">
                  {isTavernMode ? 'AI对手' : '人类玩家'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-purple-400 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>

        {isComplete && (
          <div className="text-center space-y-2 animate-[fade-in-up_0.5s_ease-out]">
            <div className="text-6xl animate-bounce">⚔️</div>
            <p className="text-2xl font-bold text-green-400">准备战斗!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MatchmakingAnimation;