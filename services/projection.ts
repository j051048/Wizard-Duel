import { DuelState, SpellType, Spell } from '../types';
import { SPELLS } from '../constants';
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
  const myLastSpell = state.playerLastSpell;
  const isThunder = (id: string | null) => id && (id.startsWith('thunder') || id === 'hero_thunder');
  
  if (!result.isCountered && spell.mechanic === 'charge' && isThunder(spell.id) && isThunder(myLastSpell)) {
      damage = Math.floor(damage * 1.5);
  }

  // AOE Extra Damage
  if (!result.isCountered && spell.mechanic === 'aoe') {
      // AOE does main damage + 2 extra piercing
      // Current logic: spell.damage goes through normal math, + 2 direct.
      // But verify `executeSpell` logic:
      // logs.push(...applyDamage(effect... damage))
      // logs.push(...handler(aoe)) -> handler does extra 2 damage directly.
      // So TOTAL damage = Base calc + 2.
      // Let's separate them for calculation if armor matters, but for projection sum is fine.
      // Actually AOE extra damage ignores armor in `mechanic_handlers`.
  }

  // 4. Mechanic Specifics
  if (spell.mechanic === 'heal' && !result.isCountered) {
      result.healing = 5;
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

      // AOE Exception: Extra 2 damage ignores armor
      if (spell.mechanic === 'aoe' && !result.isCountered) {
          result.damage += 2;
          result.netHpChange -= 2; // Direct HP removal
      }
  } else if (result.target === 'player') {
      // Self cast (Heal?)
       if (result.healing > 0) {
           // Cap at max HP
           const missingHp = 100 - state.playerHP; // Assuming 100 max
           const actualHeal = Math.min(result.healing, missingHp);
           result.netHpChange = actualHeal;
       }
       result.netArmorChange = result.armorGain; // Simple addition
  }

  return result;
};
