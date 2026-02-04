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
  opponentName = 'Mysterious Mage',
  opponentAvatar,
  isTavernMode = false
}) => {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  // Background particles
  const particles = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${3 + Math.random() * 4}s`,
    size: Math.random() < 0.3 ? 4 : 2,
    opacity: Math.random() * 0.5 + 0.1
  })), []);

  const steps = [
    { icon: Search, text: 'Scanning Leylines...', duration: 800 },
    { icon: User, text: 'Mana Signature Detect...', duration: 700 },
    { icon: Swords, text: 'Attuning Battleground...', duration: 900 },
    { icon: Zap, text: 'Duel Starting!', duration: 500 }
  ];

  useEffect(() => {
    let totalDuration = 0;
    const stepDurations = steps.map(step => step.duration);
    const totalTime = stepDurations.reduce((a, b) => a + b, 0);

    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (100 / totalTime) * 50; 
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
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-50 overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-black z-0" />
      
      {/* Particle Field */}
      <div className="absolute inset-0 z-0">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute bg-purple-400/60 rounded-full animate-float"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              animationDelay: p.delay,
              animationDuration: p.duration
            }}
          />
        ))}
      </div>

      {/* Main Scrying Orb Container */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        
        {/* Magic Circle Animation */}
        <div className="relative w-64 h-64 md:w-96 md:h-96 mb-12 flex items-center justify-center">
           {/* Outer Ring */}
           <div className="absolute inset-0 border border-purple-500/30 rounded-full animate-[spin_10s_linear_infinite]" />
           <div className="absolute inset-0 border-2 border-dashed border-purple-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse]" />
           
           {/* Inner Runes Ring */}
           <div className="absolute inset-8 border border-blue-400/30 rounded-full animate-[spin_8s_linear_infinite]" />
           
           {/* The Scrying Orb */}
           <div className="absolute w-32 h-32 md:w-40 md:h-40 bg-gradient-to-br from-indigo-600 to-purple-800 rounded-full shadow-[0_0_50px_rgba(79,70,229,0.5)] flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-30 mix-blend-overlay animate-pulse" />
              <div className="absolute -inset-4 bg-gradient-to-t from-black/50 to-transparent z-10" />
              
              {/* Center Icon */}
              <div className="relative z-20 transition-all duration-300 transform">
                 {isComplete ? (
                    <Swords size={48} className="text-white animate-bounce drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]" />
                 ) : (
                    <CurrentIcon size={48} className="text-purple-100 animate-pulse drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
                 )}
              </div>
              
              {/* Glass Reflection */}
              <div className="absolute top-2 left-4 w-12 h-6 bg-white/10 rounded-full rotate-[-45deg] blur-sm" />
           </div>

           {/* Pulse Waves */}
           {!isComplete && (
             <>
               <div className="absolute w-32 h-32 border border-purple-400/50 rounded-full animate-ping" />
               <div className="absolute w-32 h-32 border border-blue-400/30 rounded-full animate-ping animation-delay-500" />
             </>
           )}
        </div>

        {/* Text Status */}
        <div className="text-center space-y-4 relative z-20">
           <h2 className="text-2xl md:text-3xl font-wizard text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-blue-300 drop-shadow-md animate-pulse">
              {currentStepData.text}
           </h2>
           
           {/* Opponent Found Card */}
           <div className={`
              transition-all duration-500 transform
              ${currentStep >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
           `}>
              {currentStep >= 1 && (
                  <div className="flex items-center gap-4 bg-black/40 backdrop-blur-md px-6 py-3 rounded-full border border-purple-500/30 shadow-xl">
                      <div className="w-12 h-12 rounded-full border-2 border-purple-400 overflow-hidden bg-slate-800">
                          {opponentAvatar ? (
                             <img src={opponentAvatar} className="w-full h-full object-cover" />
                          ) : (
                             <div className="w-full h-full flex items-center justify-center text-2xl">🔮</div>
                          )}
                      </div>
                      <div className="text-left">
                         <div className="text-xs text-purple-400 font-bold uppercase tracking-wider">Opponent</div>
                         <div className="text-white font-bold text-lg">{opponentName}</div>
                      </div>
                  </div>
              )}
           </div>

           {/* Loading Bar */}
           <div className="w-64 h-1 bg-slate-800 rounded-full overflow-hidden mx-auto mt-8">
              <div 
                className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500 animate-gradient-xy"
                style={{ width: `${progress}%`, transition: 'width 0.1s linear' }}
              />
           </div>
        </div>
        
      </div>
    </div>
  );
};

export default MatchmakingAnimation;