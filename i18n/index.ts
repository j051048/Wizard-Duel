/**
 * i18n System - 国际化系统
 * 
 * 支持中文和英文，可扩展其他语言
 */

import { useState, useEffect } from 'react';
import { Language } from '../types';
import { zh } from './zh';
import { en } from './en';

export const TRANSLATIONS: Record<Language, Record<string, string>> = {
  zh,
  en
};

/**
 * useTranslation Hook - 翻译钩子
 * 
 * 用法:
 * const { t, language, setLanguage } = useTranslation();
 * <div>{t('Online')}</div>
 */
export const useTranslation = () => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('wizard_language');
    return (saved as Language) || 'zh';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('wizard_language', lang);
  };

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || key;
  };

  return { t, language, setLanguage };
};

// 导出翻译对象（用于兼容旧代码）
export { zh, en };
