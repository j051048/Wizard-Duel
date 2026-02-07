/**
 * DonatePanel - 捐赠获取积分面板
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Wallet, X, Loader2, Zap, ExternalLink } from 'lucide-react';
import { useAccount, useSwitchChain, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';

const XLAYER_CHAIN_ID = 196;
const DONATION_TOKEN_ADDRESS = '0xdcc83b32b6b4e95a61951bfcc9d71967515c0fca' as const;
const TREASURY_ADDRESS = '0xbd8aa43f0e2fe80d24bf80f3ee45a8f233ce04f7' as const;

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
] as const;

const DONATION_OPTIONS = [
  { amount: 10, label: '10', popular: false },
  { amount: 50, label: '50', popular: true },
  { amount: 100, label: '100', popular: false },
  { amount: 500, label: '500', popular: false },
];

interface DonatePanelProps {
  onClose: () => void;
  balance: number;
  activeAddress: string | null;
  isGuest: boolean;
  onUpdateBalance: (newBalance: number) => void;
}

export const DonatePanel: React.FC<DonatePanelProps> = ({
  onClose,
  balance,
  activeAddress,
  isGuest,
  onUpdateBalance
}) => {
  const { address, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  
  const [donateAmount, setDonateAmount] = useState(50);
  const [customAmount, setCustomAmount] = useState('');

  const { writeContract, data: txHash, isPending: isSending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handleDonate = useCallback(async () => {
    const rawAmount = customAmount ? parseFloat(customAmount) : donateAmount;
    const finalAmount = Math.floor(rawAmount);
    if (!finalAmount || finalAmount <= 0) return;
    
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

  const confirmedTxRef = useRef<string | null>(null);
  useEffect(() => {
    if (isConfirmed && txHash && confirmedTxRef.current !== txHash) {
      const processedTxs: string[] = JSON.parse(localStorage.getItem('wizard_processed_txs') || '[]');
      if (processedTxs.includes(txHash)) return;

      confirmedTxRef.current = txHash;
      const rawAmount = customAmount ? parseFloat(customAmount) : donateAmount;
      const finalAmount = Math.floor(rawAmount);
      const newBalance = balance + finalAmount;
      onUpdateBalance(newBalance);
      setCustomAmount('');

      if (activeAddress) {
        try {
          const profiles = JSON.parse(localStorage.getItem('wizard_user_profile') || '{}');
          if (profiles[activeAddress]) {
            profiles[activeAddress].balance = newBalance;
            localStorage.setItem('wizard_user_profile', JSON.stringify(profiles));
          }
        } catch (e) { /* ignore */ }

        import('../../services/supabase').then(async ({ supabase, isSupabaseConfigured }) => {
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

      processedTxs.push(txHash);
      if (processedTxs.length > 50) processedTxs.shift();
      localStorage.setItem('wizard_processed_txs', JSON.stringify(processedTxs));
    }
  }, [isConfirmed, txHash, customAmount, donateAmount, balance, onUpdateBalance, activeAddress]);

  return (
    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-purple-500/30 rounded-2xl p-5 space-y-4 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-white flex items-center gap-2">
          <Wallet size={18} className="text-purple-400" />
          捐赠获取积分
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-lg">
          <X size={16} className="text-gray-400" />
        </button>
      </div>

      <div className="bg-black/40 rounded-lg p-3 text-xs text-gray-400 space-y-1">
        <p>• 网络: <span className="text-white font-bold">X Layer</span></p>
        <p>• 捐赠代币到基金会地址，每捐赠 1 枚代币 = 1 积分（取整数）</p>
        <p className="text-[10px] text-gray-500 break-all">代币: {DONATION_TOKEN_ADDRESS}</p>
        <p className="text-[10px] text-gray-500 break-all">收款: {TREASURY_ADDRESS}</p>
      </div>

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
  );
};
