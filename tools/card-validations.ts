/**
 * 卡牌验证工具 - 检测潜在的游戏设计问题
 */

import { SPELLS } from '../constants.ts';

export function validateSpells() {
  const issues: string[] = [];

  SPELLS.forEach(s => {
    // 检测零费用卡牌
    if (s.manaCost !== undefined && s.manaCost === 0) {
      issues.push(`Zero mana cost detected for ${s.id} (${s.name})`);
    }
    
    // 检测描述中的潜在问题
    if (s.description) {
      const desc = s.description.toLowerCase();
      
      // 检测免费施法机制
      if (desc.includes('free') || desc.includes('cast for free') || desc.includes('without paying')) {
        issues.push(`Potential free-cast mechanic in description of ${s.id} (${s.name})`);
      }
      
      // 检测无限缩放机制
      if (desc.includes('for each') || desc.includes('每个')) {
        issues.push(`Potential uncapped scaling in ${s.id} (${s.name})`);
      }
    }
    
    // 检测伤害平衡
    if (s.damage > s.manaCost * 2) {
      issues.push(`High damage efficiency in ${s.id}: ${s.damage} damage for ${s.manaCost} mana`);
    }
  });

  return issues;
}

// 运行验证
if (typeof require !== 'undefined' && require.main === module) {
  const issues = validateSpells();
  if (issues.length === 0) {
    console.log('✅ All spells validated successfully!');
  } else {
    console.log('⚠️ Potential issues found:');
    issues.forEach(issue => console.log(`  - ${issue}`));
  }
}
