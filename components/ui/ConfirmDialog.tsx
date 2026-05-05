/**
 * ConfirmDialog - 确认弹窗组件
 * 用于投降、退出等需要二次确认的操作
 */

import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = '确认',
  cancelText = '取消',
  type = 'warning',
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;

  const getTypeStyles = () => {
    switch (type) {
      case 'danger':
        return {
          iconBg: 'bg-red-500/20',
          iconColor: 'text-red-400',
          confirmBg: 'bg-red-600 hover:bg-red-500',
          borderColor: 'border-red-500/30'
        };
      case 'warning':
        return {
          iconBg: 'bg-yellow-500/20',
          iconColor: 'text-yellow-400',
          confirmBg: 'bg-yellow-600 hover:bg-yellow-500',
          borderColor: 'border-yellow-500/30'
        };
      case 'info':
      default:
        return {
          iconBg: 'bg-blue-500/20',
          iconColor: 'text-blue-400',
          confirmBg: 'bg-blue-600 hover:bg-blue-500',
          borderColor: 'border-blue-500/30'
        };
    }
  };

  const styles = getTypeStyles();

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onCancel}
      />

      {/* 弹窗内容 */}
      <div className={`
        relative bg-slate-900 rounded-2xl border ${styles.borderColor} p-6 w-full max-w-sm
        shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300
      `}>
        {/* 关闭按钮 */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* 图标 */}
        <div className="flex justify-center mb-4">
          <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center`}>
            <AlertTriangle className={`w-8 h-8 ${styles.iconColor}`} />
          </div>
        </div>

        {/* 标题 */}
        <h3 id="confirm-dialog-title" className="text-xl font-bold text-white text-center mb-2">
          {title}
        </h3>

        {/* 消息 */}
        <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
          {message}
        </p>

        {/* 按钮组 */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-slate-800 border border-white/10 rounded-xl font-bold text-gray-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-3 ${styles.confirmBg} rounded-xl font-bold text-white transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;