/**
 * RuleArbiter - 统一规则仲裁层
 * 
 * [Phase C-1] 封装完整的回合结算顺序，参考炉石标准：
 * 
 * 回合开始阶段:
 *   1. 回合数+1
 *   2. 状态效果 tick (DoT伤害) → 💀 死亡检查
 *   3. 法力恢复
 *   4. 抽牌 → 💀 死亡检查 (疲劳)
 *   5. 回合开始触发器 → 💀 死亡检查
 * 
 * 随从战斗阶段:
 *   1. 按召唤顺序逐个攻击
 *   2. 每次攻击后 → 💀 死亡检查
 */

import { DuelState, StatusEffect } from '../types';
import { GAME_CONFIG } from '../constants';
import { checkGameOver, drawCard } from './gameLogic';
import { GameSequenceExecutor } from './sequence';

export interface ArbiterEvent {
  type: 'DAMAGE' | 'HEAL' | 'EFFECT_TICK' | 'EFFECT_EXPIRE' | 'DRAW' | 'FATIGUE' | 'MANA_RESTORE' | 'DEATH' | 'ROUND_START';
  target: 'player' | 'opponent' | 'system';
  value?: number;
  description: string;
}

export interface RoundStartResult {
  newState: DuelState;
  events: ArbiterEvent[];
  gameOver: 'WIN' | 'LOSS' | 'DRAW' | null;
}

export class RuleArbiter {

  /**
   * 执行完整的回合开始结算
   * 返回新状态 + 事件列表 + 游戏是否结束
   */
  static resolveRoundStart(state: DuelState): RoundStartResult {
    const events: ArbiterEvent[] = [];
    let s: DuelState = {
      ...state,
      // 深拷贝数组
      playerEffects: state.playerEffects.map(e => ({ ...e })),
      opponentEffects: state.opponentEffects.map(e => ({ ...e })),
      playerHand: [...state.playerHand],
      playerDeck: [...state.playerDeck],
      opponentHand: [...state.opponentHand],
      opponentDeck: [...state.opponentDeck],
      playerMinions: state.playerMinions.map(m => ({ ...m })),
      opponentMinions: state.opponentMinions.map(m => ({ ...m })),
    };

    // ========== 1. 回合数+1 ==========
    s.roundNumber += 1;
    events.push({ type: 'ROUND_START', target: 'system', description: `第 ${s.roundNumber} 回合开始` });

    // ========== 2. 重置英雄技能 ==========
    s.heroSkillsUsed = false;
    s.opponentHeroSkillUsed = false;

    // ========== 3. 状态效果 tick (DoT) ==========
    const { state: postEffectState, events: effectEvents } = this.tickEffects(s);
    s = postEffectState;
    events.push(...effectEvents);

    // 💀 死亡检查点 1: DoT 致死
    const deathCheck1 = checkGameOver(s);
    if (deathCheck1) {
      events.push({ type: 'DEATH', target: 'system', description: '💀 有人倒下了！' });
      return { newState: s, events, gameOver: deathCheck1 };
    }

    // ========== 4. 法力恢复 ==========
    s.playerMaxMana = Math.min(GAME_CONFIG.maxMana, s.playerMaxMana + 1);
    s.opponentMaxMana = Math.min(GAME_CONFIG.maxMana, s.opponentMaxMana + 1);
    s.playerMana = s.playerMaxMana;
    s.opponentMana = s.opponentMaxMana;
    events.push({ type: 'MANA_RESTORE', target: 'system', description: `法力恢复至 ${s.playerMaxMana}` });

    // ========== 5. 费用修正 (Tangle) ==========
    const playerTangle = s.playerEffects.find(e => e.type === 'tangle');
    s.playerCostMod = playerTangle ? (playerTangle.value || 0) : 0;
    const oppTangle = s.opponentEffects.find(e => e.type === 'tangle');
    s.opponentCostMod = oppTangle ? (oppTangle.value || 0) : 0;

    // ========== 6. 随从解除疲劳 ==========
    s.playerMinions = s.playerMinions.map(m => ({ ...m, exhausted: false }));
    s.opponentMinions = s.opponentMinions.map(m => ({ ...m, exhausted: false }));

    // ========== 7. 抽牌 ==========
    const { state: postDrawState, events: drawEvents } = this.resolveDrawPhase(s);
    s = postDrawState;
    events.push(...drawEvents);

    // 💀 死亡检查点 2: 疲劳致死
    const deathCheck2 = checkGameOver(s);
    if (deathCheck2) {
      events.push({ type: 'DEATH', target: 'system', description: '💀 疲劳致死！' });
      return { newState: s, events, gameOver: deathCheck2 };
    }

    // ========== 8. 回合开始触发器 ==========
    s = GameSequenceExecutor.resolveTriggers(s, 'ON_TURN_START');

    // 💀 死亡检查点 3: 触发器致死
    const deathCheck3 = checkGameOver(s);
    if (deathCheck3) {
      events.push({ type: 'DEATH', target: 'system', description: '💀 触发效果致死！' });
      return { newState: s, events, gameOver: deathCheck3 };
    }

    return { newState: s, events, gameOver: null };
  }

  /**
   * 效果 tick: 灼烧伤害 + 持续时间递减 + 过期移除
   */
  private static tickEffects(state: DuelState): { state: DuelState; events: ArbiterEvent[] } {
    const events: ArbiterEvent[] = [];
    let s = { ...state };

    // 玩家效果 tick
    let playerBurnDmg = 0;
    const newPlayerEffects: StatusEffect[] = [];
    for (const e of s.playerEffects) {
      if (e.type === 'burn') {
        playerBurnDmg += (e.value || 0);
      }
      const nextDur = e.duration - 1;
      if (nextDur > 0) {
        newPlayerEffects.push({ ...e, duration: nextDur });
      } else {
        events.push({ type: 'EFFECT_EXPIRE', target: 'player', description: `✨ 你的${this.getEffectName(e.type)}效果消失了` });
      }
    }
    s.playerEffects = newPlayerEffects;
    if (playerBurnDmg > 0) {
      s.playerHP = Math.max(0, s.playerHP - playerBurnDmg);
      events.push({ type: 'DAMAGE', target: 'player', value: playerBurnDmg, description: `🔥 你受到 ${playerBurnDmg} 点灼烧伤害` });
    }

    // 对手效果 tick
    let oppBurnDmg = 0;
    const newOppEffects: StatusEffect[] = [];
    for (const e of s.opponentEffects) {
      if (e.type === 'burn') {
        oppBurnDmg += (e.value || 0);
      }
      const nextDur = e.duration - 1;
      if (nextDur > 0) {
        newOppEffects.push({ ...e, duration: nextDur });
      } else {
        events.push({ type: 'EFFECT_EXPIRE', target: 'opponent', description: `✨ 对手的${this.getEffectName(e.type)}效果消失了` });
      }
    }
    s.opponentEffects = newOppEffects;
    if (oppBurnDmg > 0) {
      s.opponentHP = Math.max(0, s.opponentHP - oppBurnDmg);
      events.push({ type: 'DAMAGE', target: 'opponent', value: oppBurnDmg, description: `🔥 对手受到 ${oppBurnDmg} 点灼烧伤害` });
    }

    return { state: s, events };
  }

  /**
   * 抽牌阶段: 双方各抽1张
   */
  private static resolveDrawPhase(state: DuelState): { state: DuelState; events: ArbiterEvent[] } {
    const events: ArbiterEvent[] = [];
    let s = { ...state };

    // 玩家抽牌
    const pResult = drawCard(s.playerDeck, s.playerHand, s.playerFatigue);
    s = { ...s, playerDeck: pResult.newDeck, playerHand: pResult.newHand, playerFatigue: pResult.newFatigue };
    if (pResult.fatigueDamage > 0) {
      s.playerHP = Math.max(0, s.playerHP - pResult.fatigueDamage);
      events.push({ type: 'FATIGUE', target: 'player', value: pResult.fatigueDamage, description: `😵 你因疲劳受到 ${pResult.fatigueDamage} 点伤害` });
    } else if (pResult.drawnCard) {
      events.push({ type: 'DRAW', target: 'player', description: `📜 你抽了一张牌` });
    }

    // 对手抽牌
    const oResult = drawCard(s.opponentDeck, s.opponentHand, s.opponentFatigue);
    s = {
      ...s,
      opponentDeck: oResult.newDeck,
      opponentHand: oResult.newHand,
      opponentHandSize: oResult.newHand.length,
      opponentFatigue: oResult.newFatigue,
    };
    if (oResult.fatigueDamage > 0) {
      s.opponentHP = Math.max(0, s.opponentHP - oResult.fatigueDamage);
      events.push({ type: 'FATIGUE', target: 'opponent', value: oResult.fatigueDamage, description: `😵 对手因疲劳受到 ${oResult.fatigueDamage} 点伤害` });
    }

    return { state: s, events };
  }

  /** 效果类型中文名 */
  private static getEffectName(type: string): string {
    const names: Record<string, string> = {
      burn: '灼烧', tangle: '缠绕', frozen: '冻结', thawed: '解冻'
    };
    return names[type] || type;
  }
}