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
                  // 递归执行触发产生的动作 (小心无限循环)
                  this.applyAction(state, act);
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
