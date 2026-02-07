/**
 * Wizard Duel - Type Definitions (Re-export Hub)
 *
 * [Phase B-5] 所有类型已按领域拆分到 types/ 目录
 * [Phase P2] 统一导入路径 - 通过 types/index.ts 统一导出
 * 此文件保持向后兼容，所有现有 import { X } from '../types' 仍然有效
 */

// 统一从 types/index.ts 导出所有类型
export * from './types/index';
