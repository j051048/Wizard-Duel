/**

 * TavernMode - 酒馆模式组件

 *

 * 专业游戏级设计：

 * - AI对手选择界面

 * - 难度选择和策略预览

 * - 免费练习对战

 * - 进度追踪和解锁

 */



import React, { useState } from 'react';

import { AIProfile } from '../types';
import { AI_PROFILES } from '../services/gameLogic';

import { Trophy, Target, Shield, Star, Play, ArrowLeft } from 'lucide-react';



interface TavernModeProps {

  onStartTavernDuel: (aiProfile: AIProfile) => void;

  onBackToLobby: () => void;

  playerStats?: {

    tavernWins: number;

    tavernLosses: number;

    bestStreak: number;

  };

}



export const TavernMode: React.FC<TavernModeProps> = ({

  onStartTavernDuel,

  onBackToLobby,

  playerStats = { tavernWins: 0, tavernLosses: 0, bestStreak: 0 }

}) => {

  const [selectedAI, setSelectedAI] = useState<AIProfile | null>(null);



  const getDifficultyIcon = (difficulty: string) => {

    switch (difficulty) {

      case 'easy': return <Star className="w-5 h-5 text-green-400" />;

      case 'medium': return <Target className="w-5 h-5 text-yellow-400" />;

      case 'hard': return <Trophy className="w-5 h-5 text-red-400" />;

      default: return <Star className="w-5 h-5 text-gray-400" />;

    }

  };



  const getStrategyIcon = (strategy: string) => {

    switch (strategy) {

      case 'aggressive': return <Target className="w-4 h-4 text-red-400" />;

      case 'defensive': return <Shield className="w-4 h-4 text-blue-400" />;

      case 'balanced': return <Star className="w-4 h-4 text-yellow-400" />;

      default: return <Star className="w-4 h-4 text-gray-400" />;

    }

  };



  const getDifficultyColor = (difficulty: string) => {

    switch (difficulty) {

      case 'easy': return 'border-green-400 bg-green-900/20';

      case 'medium': return 'border-yellow-400 bg-yellow-900/20';

      case 'hard': return 'border-red-400 bg-red-900/20';

      default: return 'border-gray-400 bg-gray-900/20';

    }

  };



  return (

    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex flex-col items-center justify-center p-4">

      {/* Header */}

      <div className="text-center mb-8">

        <h1 className="text-4xl font-wizard font-bold text-white mb-2">

          🏰 魔法酒馆

        </h1>

        <p className="text-gray-300 text-lg">

          选择对手进行练习对战，提升你的魔法技巧

        </p>

      </div>



      {/* Player Stats */}

      <div className="bg-slate-800/50 rounded-xl p-6 mb-8 border border-slate-600">

        <h3 className="text-xl font-bold text-white mb-4 text-center">你的战绩</h3>

        <div className="grid grid-cols-3 gap-4 text-center">

          <div>

            <div className="text-2xl font-bold text-green-400">{playerStats.tavernWins}</div>

            <div className="text-sm text-gray-400">胜利</div>

          </div>

          <div>

            <div className="text-2xl font-bold text-red-400">{playerStats.tavernLosses}</div>

            <div className="text-sm text-gray-400">失败</div>

          </div>

          <div>

            <div className="text-2xl font-bold text-yellow-400">{playerStats.bestStreak}</div>

            <div className="text-sm text-gray-400">最佳连胜</div>

          </div>

        </div>

      </div>



      {/* AI Selection */}

      <div className="grid md:grid-cols-3 gap-6 mb-8 max-w-6xl">

        {AI_PROFILES.map((ai) => (

          <div

            key={ai.name}

            className={`

              relative bg-slate-800/70 rounded-xl p-6 border-2 cursor-pointer transition-all duration-300

              hover:scale-105 hover:shadow-2xl

              ${selectedAI?.name === ai.name

                ? `${getDifficultyColor(ai.difficulty)} shadow-lg scale-105`

                : 'border-slate-600 hover:border-slate-400'

              }

            `}

            onClick={() => setSelectedAI(ai)}

          >

            {/* Difficulty Badge */}

            <div className="absolute top-3 right-3 flex items-center gap-1">

              {getDifficultyIcon(ai.difficulty)}

              <span className="text-xs font-bold uppercase tracking-wide">

                {ai.difficulty === 'easy' ? '简单' :

                 ai.difficulty === 'medium' ? '中等' : '困难'}

              </span>

            </div>



            {/* Avatar */}

            <div className="flex justify-center mb-4">

              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-3xl">

                {ai.avatar ? (

                  <img src={ai.avatar} alt={ai.name} className="w-full h-full rounded-full object-cover" />

                ) : (

                  '🤖'

                )}

              </div>

            </div>



            {/* Name and Description */}

            <h3 className="text-xl font-bold text-white text-center mb-2">{ai.name}</h3>

            <p className="text-gray-300 text-center text-sm mb-4">{ai.description}</p>



            {/* Strategy */}

            <div className="flex items-center justify-center gap-2 text-sm">

              {getStrategyIcon(ai.strategy)}

              <span className="text-gray-400 capitalize">

                {ai.strategy === 'aggressive' ? '激进' :

                 ai.strategy === 'defensive' ? '防御' : '平衡'}

              </span>

            </div>

          </div>

        ))}

      </div>



      {/* Action Buttons */}

      <div className="flex gap-4">

        <button

          onClick={onBackToLobby}

          className="flex items-center gap-2 px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"

        >

          <ArrowLeft size={20} />

          返回大厅

        </button>



        <button

          onClick={() => selectedAI && onStartTavernDuel(selectedAI)}

          disabled={!selectedAI}

          className={`

            flex items-center gap-2 px-8 py-3 rounded-lg font-bold transition-all duration-200

            ${selectedAI

              ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl'

              : 'bg-gray-600 text-gray-400 cursor-not-allowed'

            }

          `}

        >

          <Play size={20} />

          开始对战

        </button>

      </div>



      {/* Tips */}

      <div className="mt-8 text-center text-gray-400 text-sm max-w-md">

        <p>💡 提示：酒馆模式是免费的练习方式，不会消耗你的游戏内货币。</p>

        <p className="mt-1">战胜不同难度的对手可以提升你的对战技巧！</p>

      </div>

    </div>

  );

};

export default TavernMode;
