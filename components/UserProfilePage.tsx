/**
 * UserProfilePage - 用户个人信息页面
 * 
 * 功能:
 * - 修改昵称
 * - 查看天梯积分 & 段位
 * - 战绩统计图
 * - 钻石(法力)余额
 * - 链上捐赠(捐赠 X Layer 代币获取积分)
 */

import React, { useState, useMemo, useCallback } from 'react';
import { 
  ArrowLeft, Edit3, Check, X, Crown, Gem, TrendingUp, 
  Trophy, Swords, Target, Zap, Wallet, ExternalLink, Loader2 
} from 'lucide-react';
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { BattleRecord, Rank } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

// X Layer Chain ID
const XLAYER_CHAIN_ID = 196;

// 合约地址
const DONATION_TOKEN_ADDRESS = '0xdcc83b32b6b4e95a61951bfcc9d71967515c0fca' as const;
const TREASURY_ADDRESS = '0xbd8aa43f0e2fe80d24bf80f3ee45a8f233ce04f7' as const;

// ERC20 Transfer ABI (简化)
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

// 预设捐赠选项
const DONATION_OPTIONS = [
  { amount: 10, label: '10', popular: false },
  { amount: 50, label: '50', popular: true },
  { amount: 100, label: '100', popular: false },
  { amount: 500, label: '500', popular: false },
];

interface UserProfilePageProps {
  onBack: () => void;
  balance: number;
  userRank: Rank;
  rankScore: number;
  history: BattleRecord[];
  activeAddress: string | null;
  isGuest: boolean;
  onUpdateBalance: (newBalance: number) => void;
  onUpdateName: (name: string) => void;
  displayName: string;
}

// 段位颜色映射
const RANK_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  Iron:    { text: 'text-gray-400',   bg: 'bg-gray-500/20',   border: 'border-gray-500/30',   glow: '' },
  Bronze:  { text: 'text-amber-600',  bg: 'bg-amber-600/20',  border: 'border-amber-600/30',  glow: '' },
  Silver:  { text: 'text-slate-300',  bg: 'bg-slate-300/20',  border: 'border-slate-300/30',  glow: '' },
  Gold:    { text: 'text-yellow-400', bg: 'bg-yellow-400/20', border: 'border-yellow-400/30', glow: 'shadow-[0_0_20px_rgba(250,204,21,0.2)]' },
  Diamond: { text: 'text-cyan-400',   bg: 'bg-cyan-400/20',   border: 'border-cyan-400/30',   glow: 'shadow-[0_0_20px_rgba(34,211,238,0.3)]' },
  Legend:  { text: 'text-amber-300',  bg: 'bg-amber-300/20',  border: 'border-amber-300/30',  glow: 'shadow-[0_0_30px_rgba(252,211,77,0.4)]' },
};

const UserProfilePage: React.FC<UserProfilePageProps> = ({
  onBack,
  balance,
  userRank,
  rankScore,
  history,
  activeAddress,
  isGuest,
  onUpdateBalance,
  onUpdateName,
  displayName,
}) => {
  const isMobile = useIsMobile();
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();

  // 编辑昵称
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(displayName);
  
  // 捐赠
  const [donateAmount, setDonateAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');
  const [showDonatePanel, setShowDonatePanel] = useState(false);

  // 合约交互
  const { writeContract, data: txHash, isPending: isSending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // 战绩统计
  const stats = useMemo(() => {
    const wins = history.filter(h => h.result === 'WIN').length;
    const losses = history.filter(h => h.result === 'LOSS').length;
    const draws = history.filter(h => h.result === 'DRAW').length;
    const total = history.length;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const totalEarnings = history.reduce((sum, h) => sum + (h.amount || 0), 0);
    
    // 最近10场胜率
    const recent = history.slice(0, 10);
    const recentWins = recent.filter(h => h.result === 'WIN').length;
    const recentWinRate = recent.length > 0 ? Math.round((recentWins / recent.length) * 100) : 0;

    return { wins, losses, draws, total, winRate, totalEarnings, recentWinRate, recent };
  }, [history]);

  const rankStyle = RANK_COLORS[userRank] || RANK_COLORS.Iron;

  // 保存昵称
  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed && trimmed.length <= 20) {
      onUpdateName(trimmed);
      localStorage.setItem('wizard_display_name', trimmed);
      setIsEditingName(false);
    }
  };

  // 发起链上捐赠
  const handleDonate = useCallback(async () => {
    const rawAmount = customAmount ? parseFloat(customAmount) : donateAmount;
    const finalAmount = Math.floor(rawAmount); // 取整，只接受整数
    if (!finalAmount || finalAmount <= 0) return;
    
    // 检查是否在 X Layer 链上
    if (chainId !== XLAYER_CHAIN_ID) {
      try {
        switchChain({ chainId: XLAYER_CHAIN_ID });
      } catch {
        alert('请先切换到 X Layer 网络');
      }
      return;
    }

    try {
      writeContract({
        address: DONATION_TOKEN_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [TREASURY_ADDRESS, parseUnits(String(finalAmount), 18)],
      });
    } catch (err) {
      console.error('Donation failed:', err);
    }
  }, [chainId, donateAmount, customAmount, switchChain, writeContract]);

  // 监听交易确认 → 增加余额（含本地去重，防止刷新后重复计入）
  const confirmedTxRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (isConfirmed && txHash && confirmedTxRef.current !== txHash) {
      // 检查本地是否已记录过此交易
      const processedTxs: string[] = JSON.parse(localStorage.getItem('wizard_processed_txs') || '[]');
      if (processedTxs.includes(txHash)) return;

      confirmedTxRef.current = txHash;
      const rawAmount = customAmount ? parseFloat(customAmount) : donateAmount;
      const finalAmount = Math.floor(rawAmount);
      const newBalance = balance + finalAmount;
      onUpdateBalance(newBalance);
      setShowDonatePanel(false);
      setCustomAmount('');

      // 持久化余额到 localStorage（Mock 模式的数据源）
      if (activeAddress) {
        try {
          const profiles = JSON.parse(localStorage.getItem('wizard_user_profile') || '{}');
          if (profiles[activeAddress]) {
            profiles[activeAddress].balance = newBalance;
            localStorage.setItem('wizard_user_profile', JSON.stringify(profiles));
          }
        } catch (e) { /* ignore */ }

        // 尝试同步到 Supabase（如果已配置）
        import('../services/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
          if (!isSupabaseConfigured) return;
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
              await supabase.from('profiles').update({ gold: newBalance }).eq('id', session.user.id);
            }
          } catch (e) {
            console.warn('Supabase balance sync skipped:', e);
          }
        }).catch(() => {});
      }

      // 持久化已处理的交易哈希（只保留最近50条）
      processedTxs.push(txHash);
      if (processedTxs.length > 50) processedTxs.shift();
      localStorage.setItem('wizard_processed_txs', JSON.stringify(processedTxs));
    }
  }, [isConfirmed, txHash, customAmount, donateAmount, balance, onUpdateBalance]);

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-950 via-indigo-950/50 to-slate-950 z-50 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 safe-area-top">
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={20} />
            <span className="text-sm font-bold">返回</span>
          </button>
          <h1 className="text-lg font-wizard font-bold text-white">个人中心</h1>
          <div className="w-16" />
        </div>
      </div>

      <div className={`max-w-2xl mx-auto ${isMobile ? 'px-4 pb-24' : 'px-6 pb-12'} pt-6 space-y-6`}>
        
        {/* ========== 用户头像 & 基本信息 ========== */}
        <div className={`relative rounded-2xl overflow-hidden border ${rankStyle.border} ${rankStyle.glow}`}>
          {/* 背景 */}
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-purple-900/20" />
          
          <div className="relative p-6 flex items-center gap-5">
            {/* 头像 */}
            <div className="relative flex-shrink-0">
              <div className={`${isMobile ? 'w-20 h-20' : 'w-24 h-24'} rounded-full border-3 border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.3)] overflow-hidden bg-black`}>
                <img src="/pwa-192x192.png" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className={`absolute -bottom-1 -right-1 ${rankStyle.bg} ${rankStyle.border} border rounded-full px-2 py-0.5`}>
                <span className={`text-[10px] font-black ${rankStyle.text}`}>Lv.{Math.floor(rankScore / 100) + 1}</span>
              </div>
            </div>

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              {/* 昵称 */}
              <div className="flex items-center gap-2 mb-1">
                {isEditingName ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      maxLength={20}
                      className="bg-black/60 border border-purple-500/40 rounded-lg px-3 py-1.5 text-white text-sm font-bold focus:outline-none focus:border-purple-400 w-36"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    />
                    <button onClick={handleSaveName} className="p-1.5 bg-green-500/20 rounded-lg hover:bg-green-500/30 transition-colors">
                      <Check size={14} className="text-green-400" />
                    </button>
                    <button onClick={() => { setIsEditingName(false); setNameInput(displayName); }} className="p-1.5 bg-red-500/20 rounded-lg hover:bg-red-500/30 transition-colors">
                      <X size={14} className="text-red-400" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-wizard font-black text-white truncate">{displayName}</h2>
                    <button onClick={() => setIsEditingName(true)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                      <Edit3 size={14} className="text-gray-400" />
                    </button>
                  </>
                )}
              </div>

              {/* 段位 */}
              <div className="flex items-center gap-2 mb-2">
                <Crown size={14} className={rankStyle.text} />
                <span className={`font-bold text-sm ${rankStyle.text}`}>{userRank}</span>
                <span className="text-gray-500 text-xs">|</span>
                <span className="text-gray-400 text-xs font-mono">{rankScore} PTS</span>
              </div>

              {/* 地址 */}
              {activeAddress && !isGuest && (
                <div className="text-[10px] text-gray-500 font-mono bg-black/40 rounded px-2 py-1 inline-block">
                  {activeAddress.slice(0, 6)}...{activeAddress.slice(-4)}
                </div>
              )}
              {isGuest && (
                <div className="text-[10px] text-amber-500/60 font-bold uppercase">游客模式</div>
              )}
            </div>
          </div>
        </div>

        {/* ========== 资产卡片 ========== */}
        <div className="grid grid-cols-2 gap-4">
          {/* 钻石/法力 */}
          <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gem size={16} className="text-purple-400" />
              <span className="text-xs text-purple-300 font-bold uppercase">钻石(法力)</span>
            </div>
            <div className="text-2xl font-mono font-black text-white">{balance.toLocaleString()}</div>
            <button
              onClick={() => setShowDonatePanel(!showDonatePanel)}
              className="mt-3 w-full py-2 bg-purple-600/30 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-xs font-bold text-purple-300 transition-all flex items-center justify-center gap-1.5"
            >
              <Wallet size={12} />
              捐赠获取积分
            </button>
          </div>

          {/* 胜率 */}
          <div className="bg-gradient-to-br from-amber-900/20 to-orange-900/20 border border-amber-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-amber-400" />
              <span className="text-xs text-amber-300 font-bold uppercase">总胜率</span>
            </div>
            <div className="text-2xl font-mono font-black text-white">{stats.winRate}%</div>
            <div className="text-[10px] text-gray-500 mt-1">
              近10局: <span className={stats.recentWinRate >= 50 ? 'text-green-400' : 'text-red-400'}>{stats.recentWinRate}%</span>
            </div>
          </div>
        </div>

        {/* ========== 捐赠获取积分面板 ========== */}
        {showDonatePanel && (
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-purple-500/30 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Wallet size={18} className="text-purple-400" />
                捐赠获取积分
              </h3>
              <button onClick={() => setShowDonatePanel(false)} className="p-1 hover:bg-white/10 rounded-lg">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            <div className="bg-black/40 rounded-lg p-3 text-xs text-gray-400 space-y-1">
              <p>• 网络: <span className="text-white font-bold">X Layer</span></p>
              <p>• 捐赠代币到基金会地址，每捐赠 1 枚代币 = 1 积分（取整数）</p>
              <p className="text-[10px] text-gray-500 break-all">代币: {DONATION_TOKEN_ADDRESS}</p>
              <p className="text-[10px] text-gray-500 break-all">收款: {TREASURY_ADDRESS}</p>
            </div>

            {/* 预设金额选择 */}
            <div className="grid grid-cols-4 gap-2">
              {DONATION_OPTIONS.map(opt => (
                <button
                  key={opt.amount}
                  onClick={() => { setDonateAmount(opt.amount); setCustomAmount(''); }}
                  className={`relative py-3 rounded-xl text-sm font-bold transition-all border ${
                    donateAmount === opt.amount && !customAmount
                      ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                      : 'bg-black/30 border-white/10 text-gray-400 hover:border-white/20'
                  }`}
                >
                  {opt.label}
                  {opt.popular && (
                    <span className="absolute -top-1.5 -right-1.5 text-[8px] bg-amber-500 text-black px-1.5 py-0.5 rounded-full font-black">HOT</span>
                  )}
                </button>
              ))}
            </div>

            {/* 自定义金额 */}
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                placeholder="自定义数量"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50 placeholder-gray-600"
              />
              <span className="text-xs text-gray-500 font-bold">= {Math.floor(Number(customAmount) || donateAmount)} 积分</span>
            </div>

            {/* 充值按钮 */}
            {!isGuest && address ? (
              <button
                onClick={handleDonate}
                disabled={isSending || isConfirming}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  isSending || isConfirming
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98]'
                }`}
              >
                {isSending ? (
                  <><Loader2 size={16} className="animate-spin" /> 等待签名...</>
                ) : isConfirming ? (
                  <><Loader2 size={16} className="animate-spin" /> 链上确认中...</>
                ) : chainId !== XLAYER_CHAIN_ID ? (
                  <><Zap size={16} /> 切换到 X Layer 网络</>
                ) : (
                  <><Wallet size={16} /> 确认捐赠 {Math.floor(Number(customAmount) || donateAmount)} 枚代币</>
                )}
              </button>
            ) : (
              <div className="text-center py-3 text-xs text-gray-500 bg-black/30 rounded-xl border border-white/5">
                {isGuest ? '游客模式无法捐赠，请先连接钱包' : '请先连接钱包'}
              </div>
            )}

            {/* 交易成功提示 */}
            {isConfirmed && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3 text-center">
                <p className="text-green-400 font-bold text-sm">✅ 捐赠成功！感谢支持！</p>
                <p className="text-green-300/60 text-xs mt-1">+{Math.floor(Number(customAmount) || donateAmount)} 积分已到账</p>
                {txHash && (
                  <a
                    href={`https://www.oklink.com/xlayer/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"
                  >
                    查看交易 <ExternalLink size={10} />
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* ========== 战绩统计 ========== */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-4">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Trophy size={18} className="text-amber-400" />
            战绩统计
          </h3>

          {/* 统计网格 */}
          <div className="grid grid-cols-4 gap-3">
            <StatBlock label="总场次" value={stats.total} icon={<Swords size={14} className="text-gray-400" />} />
            <StatBlock label="胜利" value={stats.wins} icon={<Trophy size={14} className="text-green-400" />} color="text-green-400" />
            <StatBlock label="失败" value={stats.losses} icon={<X size={14} className="text-red-400" />} color="text-red-400" />
            <StatBlock label="总收益" value={stats.totalEarnings > 0 ? `+${stats.totalEarnings}` : String(stats.totalEarnings)} icon={<Gem size={14} className="text-purple-400" />} color={stats.totalEarnings >= 0 ? 'text-green-400' : 'text-red-400'} />
          </div>

          {/* 胜率进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">胜率分布</span>
              <span className="text-gray-400">{stats.wins}W - {stats.losses}L</span>
            </div>
            <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
              {stats.total > 0 && (
                <>
                  <div
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${(stats.wins / stats.total) * 100}%` }}
                  />
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
                    style={{ width: `${(stats.losses / stats.total) * 100}%` }}
                  />
                </>
              )}
            </div>
          </div>

          {/* 最近战绩 */}
          <div className="space-y-2">
            <span className="text-xs text-gray-500">最近对战</span>
            <div className="flex gap-1.5 flex-wrap">
              {stats.recent.length > 0 ? (
                stats.recent.map((record, i) => (
                  <div
                    key={record.id || i}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black border transition-all ${
                      record.result === 'WIN'
                        ? 'bg-green-500/20 border-green-500/30 text-green-400'
                        : record.result === 'LOSS'
                        ? 'bg-red-500/20 border-red-500/30 text-red-400'
                        : 'bg-gray-500/20 border-gray-500/30 text-gray-400'
                    }`}
                    title={`${record.result} | ${record.amount > 0 ? '+' : ''}${record.amount}`}
                  >
                    {record.result === 'WIN' ? 'W' : record.result === 'LOSS' ? 'L' : 'D'}
                  </div>
                ))
              ) : (
                <span className="text-xs text-gray-600">暂无对战记录</span>
              )}
            </div>
          </div>
        </div>

        {/* ========== 天梯段位进度 ========== */}
        <div className="bg-black/30 border border-white/5 rounded-2xl p-5 space-y-3">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Target size={18} className="text-cyan-400" />
            天梯进度
          </h3>

          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-xl ${rankStyle.bg} ${rankStyle.border} border-2 flex items-center justify-center ${rankStyle.glow}`}>
              <Crown size={28} className={rankStyle.text} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className={`font-bold ${rankStyle.text}`}>{userRank}</span>
                <span className="text-xs text-gray-500 font-mono">{rankScore} / {getNextRankThreshold(userRank)} PTS</span>
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${getRankGradient(userRank)}`}
                  style={{ width: `${Math.min(100, (rankScore / getNextRankThreshold(userRank)) * 100)}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                距离下一段位还需 {Math.max(0, getNextRankThreshold(userRank) - rankScore)} 分
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

// 辅助组件 - 统计数字块
const StatBlock: React.FC<{ label: string; value: string | number; icon: React.ReactNode; color?: string }> = ({
  label, value, icon, color = 'text-white'
}) => (
  <div className="bg-black/30 rounded-xl p-3 text-center border border-white/5">
    <div className="flex justify-center mb-1.5">{icon}</div>
    <div className={`text-lg font-mono font-black ${color}`}>{value}</div>
    <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
  </div>
);

// 辅助函数
function getNextRankThreshold(rank: string): number {
  const thresholds: Record<string, number> = {
    Iron: 300, Bronze: 600, Silver: 1000, Gold: 1500, Diamond: 2500, Legend: 5000
  };
  return thresholds[rank] || 1000;
}

function getRankGradient(rank: string): string {
  const gradients: Record<string, string> = {
    Iron: 'from-gray-500 to-gray-400',
    Bronze: 'from-amber-700 to-amber-500',
    Silver: 'from-slate-400 to-slate-300',
    Gold: 'from-yellow-500 to-amber-400',
    Diamond: 'from-cyan-500 to-blue-400',
    Legend: 'from-amber-400 to-yellow-300',
  };
  return gradients[rank] || 'from-gray-500 to-gray-400';
}

export default UserProfilePage;