import { DuelState, GameAction, GameCommand, ActionType, TriggerTiming } from '../types';
import { GAME_CONFIG } from '../constants';

/**
 * GameSequenceExecutor - 核心规则执行引擎
 * 负责解析并执行 Command 中的 Actions
 */
export class GameSequenceExecutor {
  /**
   * 执行单个 Action 并返回新的状态
   */
  static applyAction(state: DuelState, action: GameAction): { state: DuelState; log?: string } {
    const newState = { ...state };
    let log: string | undefined = action.description;

    switch (action.type) {
      case 'HP_CHANGE': {
        const target = action.target;
        let amount = action.value;

        // 负值代表伤害，正值代表治疗
        if (amount < 0) {
            const damage = Math.abs(amount);
            const currentArmor = target === 'player' ? newState.playerArmor : newState.opponentArmor;
            const absorb = Math.min(currentArmor, damage);
            const finalDamage = damage - absorb;

            if (target === 'player') {
                newState.playerArmor -= absorb;
                newState.playerHP = Math.max(0, newState.playerHP - finalDamage);
            } else if (target === 'opponent') {
                newState.opponentArmor -= absorb;
                newState.opponentHP = Math.max(0, newState.opponentHP - finalDamage);
            }
            log = `${action.description}${absorb > 0 ? ` (吸收${absorb}点)` : ''}`;
        } else {
            // 治疗
            if (target === 'player') {
                newState.playerHP = Math.min(GAME_CONFIG.maxHP, newState.playerHP + amount);
            } else if (target === 'opponent') {
                newState.opponentHP = Math.min(GAME_CONFIG.maxHP, newState.opponentHP + amount);
            }
        }
        break;
      }
      case 'ARMOR_CHANGE': {
        const target = action.target;
        const amount = action.value;
        if (target === 'player') {
          newState.playerArmor = Math.max(0, newState.playerArmor + amount);
        } else if (target === 'opponent') {
          newState.opponentArmor = Math.max(0, newState.opponentArmor + amount);
        }
        break;
      }
      case 'MANA_CHANGE': {
        const target = action.target;
        const amount = action.value;
        if (target === 'player') {
          newState.playerMana = Math.max(0, Math.min(newState.playerMaxMana, newState.playerMana + amount));
        } else if (target === 'opponent') {
          newState.opponentMana = Math.max(0, Math.min(newState.opponentMaxMana, newState.opponentMana + amount));
        }
        break;
      }
      case 'ADD_EFFECT': {
        const target = action.target;
        const effects = target === 'player' ? [...newState.playerEffects] : [...newState.opponentEffects];
        const newEffect = action.value;
        
        // 刷新机制: 如果已有同类型效果，替换之
        const idx = effects.findIndex(e => e.type === newEffect.type);
        if (idx >= 0) {
            effects[idx] = newEffect;
        } else {
            effects.push(newEffect);
        }

        if (target === 'player') newState.playerEffects = effects;
        else newState.opponentEffects = effects;
        break;
      }
      case 'REMOVE_EFFECT': {
          const target = action.target;
          const typeToRemove = action.subType;
          if (target === 'player') {
              newState.playerEffects = newState.playerEffects.filter(e => e.type !== typeToRemove);
          } else if (target === 'opponent') {
              newState.opponentEffects = newState.opponentEffects.filter(e => e.type !== typeToRemove);
          } else if (target === 'both') {
              newState.playerEffects = [];
              newState.opponentEffects = [];
          }
          break;
      }
      case 'DRAW_CARD': {
        const target = action.target;
        const count = action.value || 1;
        
        for (let i = 0; i < count; i++) {
            const isPlayer = target === 'player';
            const deck = isPlayer ? newState.playerDeck : newState.opponentDeck;
            const hand = isPlayer ? newState.playerHand : newState.opponentHand;
            const fatigue = isPlayer ? newState.playerFatigue : newState.opponentFatigue;

            if (deck.length === 0) {
                // 疲劳逻辑
                const damage = fatigue + 1;
                if (isPlayer) {
                    newState.playerFatigue = damage;
                    newState.playerHP = Math.max(0, newState.playerHP - damage);
                } else {
                    newState.opponentFatigue = damage;
                    newState.opponentHP = Math.max(0, newState.opponentHP - damage);
                }
            } else {
                const drawn = deck[0];
                const remDeck = deck.slice(1);
                
                if (isPlayer) {
                    newState.playerDeck = remDeck;
                    if (newState.playerHand.length < 10) {
                        newState.playerHand = [...newState.playerHand, drawn];
                    }
                } else {
                    newState.opponentDeck = remDeck;
                    if (newState.opponentHand.length < 10) {
                        newState.opponentHand = [...newState.opponentHand, drawn];
                    }
                    newState.opponentHandSize = newState.opponentHand.length;
                }
            }
        }
        break;
      }
      case 'SUMMON_MINION': {
          const target = action.target;
          const minionData = action.value;
          const minions = target === 'player' ? [...newState.playerMinions] : [...newState.opponentMinions];
          
          if (minions.length < 5) {
              minions.push({
                  ...minionData,
                  instanceId: `m-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                  exhausted: true // 刚召唤出来是疲劳的 (没有冲锋的话)
              });
              if (target === 'player') newState.playerMinions = minions;
              else newState.opponentMinions = minions;
          }
          break;
      }
      case 'MINION_ATTACK': {
          // 简化逻辑：随从攻击对位随从，若无则攻脸
          const isPlayer = action.target === 'player';
          const attackerSide = isPlayer ? newState.playerMinions : newState.opponentMinions;
          const defenderSide = isPlayer ? newState.opponentMinions : newState.playerMinions;
          const attackerIdx = action.value;

          if (attackerSide[attackerIdx]) {
              const attacker = { ...attackerSide[attackerIdx] };
              const defender = defenderSide[attackerIdx] ? { ...defenderSide[attackerIdx] } : null;

              if (defender) {
                  // 交换伤害
                  defender.hp -= attacker.atk;
                  attacker.hp -= defender.atk;
                  
                  // 更新防御方
                  const newDefenders = [...defenderSide];
                  if (defender.hp <= 0) newDefenders.splice(attackerIdx, 1);
                  else newDefenders[attackerIdx] = defender;
                  
                  if (isPlayer) newState.opponentMinions = newDefenders;
                  else newState.playerMinions = newDefenders;
                  
                  log = `⚔️ ${attacker.name} 攻击了 ${defender.name}`;
              } else {
                  // 直接攻脸
                  const dmg = attacker.atk;
                  if (isPlayer) {
                      newState.opponentHP = Math.max(0, newState.opponentHP - dmg);
                      log = `⚔️ ${attacker.name} 直接攻击对手，造成${dmg}点伤害`;
                  } else {
                      newState.playerHP = Math.max(0, newState.playerHP - dmg);
                      log = `⚔️ ${attacker.name} 直接攻击你，造成${dmg}点伤害`;
                  }
              }

              // 更新攻击方状态
              const newAttackers = [...attackerSide];
              if (attacker.hp <= 0) newAttackers.splice(attackerIdx, 1);
              else {
                  attacker.exhausted = true;
                  newAttackers[attackerIdx] = attacker;
              }
              
              if (isPlayer) newState.playerMinions = newAttackers;
              else newState.opponentMinions = newAttackers;
          }
          break;
      }
    }

    // 触发检查
    this.resolveTriggers(newState, action.type === 'HP_CHANGE' && action.value < 0 ? 'ON_DAMAGE' : 'ON_CAST', action);

    return { state: newState, log };
  }

  /**
   * 触发器解析逻辑 (增强实现)
   */
  static resolveTriggers(state: DuelState, timing: TriggerTiming, context?: any) {
      const allTriggers = [...state.playerTriggers, ...state.opponentTriggers];
      const matchingTriggers = allTriggers.filter(t => t.timing === timing);

      for (const trigger of matchingTriggers) {
          if (!trigger.condition || trigger.condition(state, context)) {
              const actions = trigger.action(state, context);
              for (const act of actions) {
                  // 递归执行触发产生的动作，并捕获返回值更新状态
                  const result = this.applyAction(state, act);
                  // 将新状态的属性同步回当前 state
                  Object.assign(state, result.state);
              }
              if (trigger.isOnce) {
                  state.playerTriggers = state.playerTriggers.filter(t => t.id !== trigger.id);
                  state.opponentTriggers = state.opponentTriggers.filter(t => t.id !== trigger.id);
              }
          }
      }
  }

  /**
   * 批量执行一个 Command 中的所有 Actions (同步模式用于重构旧逻辑)
   */
  static executeCommand(state: DuelState, command: GameCommand): { state: DuelState; logs: string[] } {
    let currentState = state;
    const logs: string[] = [];

    // ON_CAST 触发点
    this.resolveTriggers(currentState, 'ON_CAST', command);

    for (const action of command.actions) {
      const result = this.applyAction(currentState, action);
      currentState = result.state;
      if (result.log) logs.push(result.log);

      // 死亡判定中断
      if (currentState.playerHP <= 0 || currentState.opponentHP <= 0) {
          const winner = currentState.playerHP <= 0 ? '对手' : '你';
          logs.push(`💀 战斗结束！${winner}赢得了胜利！`);
          break; 
      }
    }

    return { state: currentState, logs };
  }
}
