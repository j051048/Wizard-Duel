import { DuelState, GameAction, GameCommand, ActionType } from '../types';
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
      // 其他 Action 类型在此扩展...
    }

    // 触发检查: 如果产生伤害，检查是否有 ON_DAMAGE 触发器
    if (action.type === 'HP_CHANGE' && action.value < 0) {
        this.resolveTriggers(newState, 'ON_DAMAGE', action);
    }

    return { state: newState, log };
  }

  /**
   * 触发器解析逻辑 (初步实现，为奥秘/被动技打底)
   */
  static resolveTriggers(state: DuelState, timing: 'ON_CAST' | 'ON_DAMAGE', context?: any) {
      // 示例：未来可以在此处检查 state.playerEffects/opponentEffects 中具有触发性质的标记
      // 目前主要作为可扩展性预留，减少未来逻辑冲突
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
