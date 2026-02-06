import { DuelState, SpellType, Spell } from '../types';
import { SPELLS, GAME_CONFIG } from '../constants';
import { getSpellById, recalculateCostMod } from './gameLogic';

export interface SpellProjection {
  damage: number;       // Projected damage to TARGET (after multipliers, before armor)
  selfDamage: number;   // Projected damage to SELF
  healing: number;      // Projected healing to SELF
  armorGain: number;    // Projected armor gain to SELF
  isCrit: boolean;
  isCountered: boolean;
  netHpChange: number;     // Actual HP change for target (-damage + armor absorption)
  netArmorChange: number;  // Actual Armor change for target
  target: 'player' | 'opponent';
}

export const calculateSpellProjection = (
  state: DuelState,
  caster: 'player', // Currently only player needs preview
  spellId: SpellType
): SpellProjection => {
  const result: SpellProjection = {
    damage: 0,
    selfDamage: 0,
    healing: 0,
    armorGain: 0,
    isCrit: false,
    isCountered: false,
    netHpChange: 0,
    netArmorChange: 0,
    target: 'opponent' // Default target
  };

  const spell = getSpellById(spellId);
  if (!spell) return result;

  // 1. Identify Target
  // Heals and Fortify usually target self
  if (spell.mechanic === 'heal' || spell.mechanic === 'fortify' || spell.mechanic === 'charge' || spellId === 'skip') {
      // These are "Self" targeted effectively or global
      // Note: "charge" in this game empowers next spell, doesn't hurt self.
      // "heal" target self in current logic for player caster.
      if (spell.mechanic === 'heal') {
           result.target = 'player';
      }
      // For pure damage spells, target is opponent.
  }

  // 2. Logic simulation (Clone from executeSpell)
  // Counters & Crits
  const targetLastSpellId = state.opponentLastSpell;
  const targetLastSpell = targetLastSpellId ? getSpellById(targetLastSpellId) : null;

  if (targetLastSpell) {
    if (targetLastSpell.beats === spell.id) {
        result.isCountered = true;
    } else if (!result.isCountered && spell.beats === targetLastSpellId) {
        result.isCrit = true;
    }
  }

  // 3. Base Damage Calculation
  let damage = spell.damage;
  if (result.isCrit) damage = Math.floor(damage * 1.5);
  if (result.isCountered) damage = 0;

    // Charge / Thunder Combo
  // [P0 Fix 3.3] 与 gameLogic.ts 统一：hero_thunder 不触发法术连击，倍率为 1.5
  const myLastSpell = state.playerLastSpell;
  const isThunderSpell = (id: string | null) => id && id.startsWith('thunder') && !id.startsWith('hero_');
  
  if (!result.isCountered && spell.mechanic === 'charge' && isThunderSpell(spell.id) && isThunderSpell(myLastSpell)) {
      damage = Math.floor(damage * 1.5);
  }

      // [P0 Fix 3.3] AOE 穿透伤害与 mechanics.ts 统一为 1
    // AOE extra damage 忽略护甲，直接扣血
    // 此处不在 damage 上累加，在最终计算中单独处理

  // 4. Mechanic Specifics
    // [P0 Fix 3.3] 治疗量与 mechanics.ts 统一为 3
  if (spell.mechanic === 'heal' && !result.isCountered) {
      result.healing = 3;
  }
  
  result.armorGain = spell.armorGain || 0;

  // 5. Final Calculation vs Armor (Target)
  // If target is opponent (standard attack)
  if (result.target === 'opponent') {
      let finalDamage = damage;
      let armorDamage = 0;
      
      // Calculate Armor Interaction
      const currentArmor = state.opponentArmor;
      const absorb = Math.min(currentArmor, finalDamage);
      const hpDamage = finalDamage - absorb;
      
      result.damage = finalDamage; // Raw output
      result.netHpChange = -hpDamage;
      result.netArmorChange = -absorb;

            // [P0 Fix 3.3] AOE 穿透伤害与 mechanics.ts 统一为 1
      if (spell.mechanic === 'aoe' && !result.isCountered) {
          result.damage += 1;
          result.netHpChange -= 1; // Direct HP removal (ignores armor)
      }
  } else if (result.target === 'player') {
      // Self cast (Heal?)
              if (result.healing > 0) {
           // [P0 Fix 3.3] 使用 GAME_CONFIG.maxHP 而非硬编码 100
           const missingHp = GAME_CONFIG.maxHP - state.playerHP;
           const actualHeal = Math.min(result.healing, missingHp);
           result.netHpChange = actualHeal;
       }
       result.netArmorChange = result.armorGain; // Simple addition
  }

  return result;
};
