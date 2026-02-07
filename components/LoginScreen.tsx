/**
 * LoginScreen - 登录/注册页面
 * 支持钱包连接、游客模式、用户协议确认
 */

import React, { useState, useMemo } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { signMessage } from '@wagmi/core';
import { config } from '../index';
import { Wallet, User, Sparkles, Shield, ChevronRight } from 'lucide-react';
import { signInWithWallet, getProfile } from '../services/supabase';
import { useUserStore } from '../stores/useUserStore';

interface LoginScreenProps {
  onLoginComplete: (address: string, isGuest: boolean) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginComplete }) => {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // 背景粒子
  const particles = useMemo(() => Array.from({ length: 30 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    delay: `${Math.random() * 3}s`,
    size: Math.random() < 0.3 ? 3 : 2,
    opacity: Math.random() * 0.5 + 0.2,
  })), []);

  const handleWalletConnect = async () => {
    if (!agreedToTerms) {
      setShowTerms(true);
      return;
    }
    
    const injectedConnector = connectors.find(c => c.id === 'injected');
    if (injectedConnector) {
      connect({ connector: injectedConnector });
    }
  };

  const handleGuestLogin = () => {
    if (!agreedToTerms) {
      setShowTerms(true);
      return;
    }
    
    setIsLoading(true);
    
    // 生成或获取游客ID
    let guestId = localStorage.getItem('wizard_guest_id');
    if (!guestId) {
      guestId = `Guest-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      localStorage.setItem('wizard_guest_id', guestId);
    }
    
    setTimeout(() => {
      onLoginComplete(guestId!, true);
    }, 500);
  };

  const handleConnectedContinue = async () => {
    if (!agreedToTerms) {
      setShowTerms(true);
      return;
    }
    
    if (address) {
      setIsLoading(true);
      try {
        const message = `Welcome to Wizard Duel!\n\nVerify your wallet to enter the arena.\n\nTimestamp: ${Date.now()}`;
        const signature = await signMessage(config, { message });
        
        if (signature) {
          await signInWithWallet(address);
          
          const userStore = useUserStore.getState();
          await userStore.login(address, false);
          
          onLoginComplete(address, false);
        }
      } catch (e) {
        console.error('Signing failed:', e);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-indigo-950 via-purple-950 to-slate-950 flex flex-col items-center justify-center z-50 overflow-hidden">
      {/* 背景粒子 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute bg-purple-400 rounded-full animate-pulse"
            style={{
              left: p.left,
              top: p.top,
              width: p.size,
              height: p.size,
              animationDelay: p.delay,
              opacity: p.opacity,
            }}
          />
        ))}
      </div>

      {/* 魔法圆环背景 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[600px] h-[600px] border border-purple-500/30 rounded-full animate-[spin_30s_linear_infinite]" />
        <div className="absolute w-[500px] h-[500px] border border-blue-500/20 rounded-full animate-[spin_25s_linear_infinite_reverse]" />
        <div className="absolute w-[400px] h-[400px] border-2 border-dashed border-purple-500/10 rounded-full animate-[spin_20s_linear_infinite]" />
      </div>

      {/* Logo */}
      <div className="relative z-10 mb-8">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl overflow-hidden border-4 border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.4)] animate-float">
          <img 
            src="/pwa-512x512.png" 
            alt="Wizard Duel Logo" 
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -inset-4 bg-purple-500/20 blur-3xl rounded-full -z-10" />
      </div>

      {/* 标题 */}
      <h1 className="text-4xl md:text-5xl font-wizard font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-300 to-cyan-400 mb-2 relative z-10">
        WIZARD DUEL
      </h1>
      <p className="text-purple-300/60 text-sm tracking-[0.3em] uppercase mb-12 font-tech">
        元素之战
      </p>

      {/* 登录选项 */}
      <div className="relative z-10 w-full max-w-sm px-6 space-y-4">
        
        {/* 已连接钱包状态 */}
        {isConnected && address ? (
          <div className="space-y-4">
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-green-400 font-bold uppercase">钱包已连接</p>
                <p className="text-white font-mono text-sm truncate">
                  {address.slice(0, 6)}...{address.slice(-4)}
                </p>
              </div>
            </div>
            
            <button
              onClick={handleConnectedContinue}
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5" />
              进入游戏
              <ChevronRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => disconnect()}
              className="w-full py-3 bg-transparent border border-white/10 rounded-xl text-gray-400 hover:text-white hover:border-white/20 transition-all text-sm"
            >
              断开连接
            </button>
          </div>
        ) : (
          <>
            {/* 钱包连接按钮 */}
            <button
              onClick={handleWalletConnect}
              disabled={isPending}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl font-bold text-white hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-purple-500/30 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Wallet className="w-5 h-5" />
              {isPending ? '连接中...' : '连接钱包'}
            </button>

            {/* 分隔线 */}
            <div className="flex items-center gap-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-gray-500 text-xs uppercase tracking-wider">或者</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* 游客登录 */}
            <button
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="w-full py-4 bg-slate-800/50 border border-white/10 rounded-xl font-bold text-white hover:bg-slate-800 hover:border-white/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <User className="w-5 h-5 text-gray-400" />
              {isLoading ? '进入中...' : '游客模式'}
            </button>
          </>
        )}

        {/* 用户协议勾选 */}
        <label className="flex items-start gap-3 cursor-pointer group mt-6">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={agreedToTerms}
              onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-5 h-5 rounded border-2 transition-all flex items-center justify-center ${
              agreedToTerms 
                ? 'bg-purple-600 border-purple-500' 
                : 'bg-transparent border-gray-600 group-hover:border-gray-500'
            }`}>
              {agreedToTerms && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-xs text-gray-400 leading-relaxed">
            我已阅读并同意{' '}
            <button 
              onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              用户协议
            </button>
            {' '}和{' '}
            <button 
              onClick={(e) => { e.preventDefault(); setShowTerms(true); }}
              className="text-purple-400 hover:text-purple-300 underline"
            >
              隐私政策
            </button>
          </span>
        </label>
      </div>

      {/* 底部信息 */}
      <div className="absolute bottom-6 text-center">
        <p className="text-gray-600 text-xs font-tech">
          v1.0.0 | Antigravity Interactive
        </p>
      </div>

      {/* 用户协议弹窗 */}
      {showTerms && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-400" />
                用户协议与隐私政策
              </h3>
              <button 
                onClick={() => setShowTerms(false)}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 text-sm text-gray-300 space-y-4">
              <section>
                <h4 className="font-bold text-white mb-2">1. 服务条款</h4>
                <p className="text-gray-400 leading-relaxed">
                  欢迎使用 Wizard Duel（以下简称"本游戏"）。在使用本游戏之前，请仔细阅读以下条款。
                  使用本游戏即表示您同意这些条款。
                </p>
              </section>
              
              <section>
                <h4 className="font-bold text-white mb-2">2. 账户安全</h4>
                <p className="text-gray-400 leading-relaxed">
                  您有责任保管好您的钱包私钥和账户信息。我们不存储您的私钥，
                  因此无法帮助您恢复丢失的账户。
                </p>
              </section>
              
              <section>
                <h4 className="font-bold text-white mb-2">3. 虚拟物品</h4>
                <p className="text-gray-400 leading-relaxed">
                  游戏内的虚拟物品（包括但不限于卡牌、货币）仅供游戏内使用，
                  不具有现实货币价值，不可转让或兑换。
                </p>
              </section>
              
              <section>
                <h4 className="font-bold text-white mb-2">4. 隐私保护</h4>
                <p className="text-gray-400 leading-relaxed">
                  我们收集的信息仅用于改善游戏体验。我们不会将您的个人信息
                  出售或分享给第三方，除非法律要求。
                </p>
              </section>
              
              <section>
                <h4 className="font-bold text-white mb-2">5. 行为准则</h4>
                <p className="text-gray-400 leading-relaxed">
                  请文明游戏，禁止使用外挂、作弊工具或任何破坏游戏平衡的行为。
                  违反者将被永久封禁。
                </p>
              </section>
            </div>
            
            <div className="p-4 border-t border-white/10 flex gap-3">
              <button
                onClick={() => setShowTerms(false)}
                className="flex-1 py-3 bg-slate-800 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  setAgreedToTerms(true);
                  setShowTerms(false);
                }}
                className="flex-1 py-3 bg-purple-600 rounded-xl text-white font-bold hover:bg-purple-500 transition-colors"
              >
                我同意
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginScreen;