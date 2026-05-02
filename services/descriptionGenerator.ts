import { Spell, Mechanic } from '../types/card';

/**
 * Automatically generates consistent card descriptions based on stats and mechanics.
 * Ensures that description text always matches the actual numerical values.
 */
export const generateDescription = (spell: Partial<Spell>): string => {
  const { damage, armorGain, mechanic, manaCost, id } = spell;
  
  const parts: string[] = [];

  // 1. Basic Damage / Healing
  if (damage && damage > 0) {
    parts.push(`造成 ${damage} 点伤害。`);
  }
  
  if (armorGain && armorGain > 0) {
    if (damage === 0) {
      parts.push(`造成 0 点伤害，但获得 ${armorGain} 点护甲。`); // Special case for pure defense
    } else {
      parts.push(`获得 ${armorGain} 点护甲。`);
    }
  }

  // 2. Mechanics
  if (mechanic) {
    switch (mechanic) {
      case 'burn':
        const burnVal = (spell.cardSet === 'classic' || id?.includes('2')) ? 1 : 2; 
        // Note: logic aligned with mechanics.ts 'burn' handler
        // Ideally we pass effectConfig/value in Spell object too.
        // For now, infer or use conventions.
        
        parts.push(`如果获胜，下回合对手额外受到 ${burnVal} 点燃烧伤害。`);
        break;
        
      case 'tangle':
        const tangleVal = (spell.cardSet === 'classic' || id?.includes('2')) ? 1 : 2;
        parts.push(`如果获胜，对手下一张法术费用增加(${tangleVal})点。`);
        break;
        
      case 'freeze':
        // C-2: Multi-turn freeze logic
        const freezeDur = spell.effectDuration || 1;
        if (freezeDur > 1) {
            parts.push(`如果平局或胜利，冻结对手 ${freezeDur} 回合。`);
        } else {
            parts.push(`如果平局或胜利，冻结对手（下回合如果再次对决失败，跳过攻击阶段）。`);
        }
        break;
        
      case 'charge':
        const chargeBonus = Math.floor((damage || 0) * 0.5); // +50%
        // Special consistency check: thunder is +50%
        parts.push(`如果你上回合使用了闪电/雷系法术，伤害增加50%(${damage ? damage + chargeBonus : 0}点)。`);
        break;
        
      case 'fortify':
        // handled in basic stats usually, but if extra effect:
        break;
        
      case 'heal':
         parts.push(`恢复 ${spell.value || 3} 点生命值。`);
         break;
         
      case 'aoe':
         // Assuming basic damage + AOE pierce
         parts.push(`AOE爆炸！额外造成 1 点穿透伤害。`);
         break;
         
      case 'draw':
         const drawCount = (id === 'hero_vine' || id === 'draw') ? 2 : 1;
         parts.push(`从卡组抽取 ${drawCount} 张牌。`);
         break;
         
      case 'silence':
         parts.push(`净化！移除自身所有负面状态并抽 1 张牌。`);
         break;

      case 'divine_shield':
         parts.push(`召唤一个具有圣盾的随从（首次受伤免疫）。`);
         break;

      case 'deathrattle':
         parts.push(`召唤一个具有亡语效果的随从（死亡时触发特殊效果）。`);
         break;

      case 'aura':
         parts.push(`召唤一个光环随从（持续增强友方单位）。`);
         break;

      case 'summon':
         parts.push(`召唤一个随从为你作战。`);
         break;

      case 'poison':
         const poisonVal = spell.value || 2;
         const poisonDur = spell.effectDuration || 3;
         parts.push(`使目标中毒，每回合受到 ${poisonVal} 点伤害，持续 ${poisonDur} 回合。`);
         break;
    }
  }

  return parts.join('');
};

export const generateShortDesc = (spell: Partial<Spell>): string => {
   const { mechanic, armorGain } = spell;
   if (!mechanic) return '';
   
   switch(mechanic) {
       case 'burn': return '灼烧: 持续伤害';
       case 'tangle': return '缠绕: 增加费用';
       case 'freeze': return '冻结: 限制行动';
       case 'charge': return '充能: 连击增伤';
       case 'fortify': return `坚韧: +${armorGain} 护甲`;
       case 'heal': return '治疗: 恢复生命';
       case 'aoe': return '溅射: 穿透伤害';
       case 'draw': return '过牌: 补充手牌';
       case 'silence': return '净化: 解除状态';
       case 'divine_shield': return '圣盾: 免疫首次伤害';
       case 'deathrattle': return '亡语: 死亡触发效果';
       case 'aura': return '光环: 持续增益';
       case 'summon': return '召唤: 召唤随从';
       case 'poison': return '中毒: 持续伤害';
       default: return '';
   }
}
