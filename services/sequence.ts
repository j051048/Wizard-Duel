import { DuelState, GameAction, GameCommand, ActionType, TriggerTiming } from '../types';
import { GAME_CONFIG } from '../constants';

const MAX_TRIGGER_DEPTH = 16;

/**
 * GameSequenceExecutor - 核心规则执行引擎
 * 负责解析并执行 Command 中的 Actions
 */
export class GameSequenceExecutor {
  /**
   * 执行单个 Action 并返回新的状态
   */
  static applyAction(state: DuelState, action: GameAction, triggerDepth: number = 0): { state: DuelState; log?: string } {
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
        
        // [Fix 1.6] 同类效果比较强弱：新效果更强才替换，否则保留旧效果
        const idx = effects.findIndex(e => e.type === newEffect.type);
        if (idx >= 0) {
            const existingEffect = effects[idx];
            const existingValue = existingEffect.value || 0;
            const newValue = newEffect.value || 0;
            // 新效果更强（value 更大或 value 相等但 duration 更长）则替换
            if (newValue > existingValue || (newValue === existingValue && newEffect.duration > existingEffect.duration)) {
                effects[idx] = newEffect;
            }
            // 否则保留旧效果，不做任何修改
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
          
          // [P0 Fix 3.4] 'all' 表示移除目标的所有效果（silence 净化机制）
          if (typeToRemove === 'all') {
              if (target === 'player') {
                  newState.playerEffects = [];
              } else if (target === 'opponent') {
                  newState.opponentEffects = [];
              } else if (target === 'both') {
                  newState.playerEffects = [];
                  newState.opponentEffects = [];
              }
          } else {
              // 移除指定类型的效果
              if (target === 'player') {
                  newState.playerEffects = newState.playerEffects.filter(e => e.type !== typeToRemove);
              } else if (target === 'opponent') {
                  newState.opponentEffects = newState.opponentEffects.filter(e => e.type !== typeToRemove);
              } else if (target === 'both') {
                  newState.playerEffects = newState.playerEffects.filter(e => e.type !== typeToRemove);
                  newState.opponentEffects = newState.opponentEffects.filter(e => e.type !== typeToRemove);
              }
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
          // [Fix 1.2] 使用 instanceId 标识随从，避免 splice 后索引错位
          const isPlayer = action.target === 'player';
          const attackerSide = isPlayer ? [...newState.playerMinions] : [...newState.opponentMinions];
          const defenderSide = isPlayer ? [...newState.opponentMinions] : [...newState.playerMinions];

          // action.value 支持 instanceId (string) 或传统索引 (number)
          let attackerIdx: number;
          if (typeof action.value === 'string') {
              attackerIdx = attackerSide.findIndex(m => m.instanceId === action.value);
          } else {
              attackerIdx = action.value;
          }

          if (attackerIdx >= 0 && attackerSide[attackerIdx]) {
              const attacker = { ...attackerSide[attackerIdx] };

              // 选择防御目标：有嘲讽优先 → 存活的随从 → 英雄
              const aliveDefenders = defenderSide.filter(m => m.hp > 0);
              // 嘲讽随从优先（如果有 taunt 属性）
              const tauntDefenders = aliveDefenders.filter(m => (m as any).taunt);
              let defender: typeof attacker | null = null;
              let defenderIdx = -1;

              if (tauntDefenders.length > 0) {
                  defender = { ...tauntDefenders[0] };
                  defenderIdx = defenderSide.findIndex(m => m.instanceId === tauntDefenders[0].instanceId);
              } else if (aliveDefenders.length > 0) {
                  defender = { ...aliveDefenders[0] };
                  defenderIdx = defenderSide.findIndex(m => m.instanceId === aliveDefenders[0].instanceId);
              }

              if (defender && defenderIdx >= 0) {
                  // 交换伤害
                  defender.hp -= attacker.atk;
                  attacker.hp -= defender.atk;
                  
                  // 更新防御方 - 用 filter 替代 splice，避免索引问题
                  const newDefenders = defenderSide.map((m, i) =>
                      i === defenderIdx ? defender! : m
                  ).filter(m => m.hp > 0);
                  
                  if (isPlayer) newState.opponentMinions = newDefenders;
                  else newState.playerMinions = newDefenders;
                  
                  log = `⚔️ ${attacker.name} 攻击了 ${defender.name}`;
              } else {
                  // 没有可攻击的随从，直接攻脸
                  const dmg = attacker.atk;
                  if (isPlayer) {
                      newState.opponentHP = Math.max(0, newState.opponentHP - dmg);
                      log = `⚔️ ${attacker.name} 直接攻击对手，造成${dmg}点伤害`;
                  } else {
                      newState.playerHP = Math.max(0, newState.playerHP - dmg);
                      log = `⚔️ ${attacker.name} 直接攻击你，造成${dmg}点伤害`;
                  }
              }

              // 更新攻击方状态 - 用 filter 替代 splice
              attacker.exhausted = true;
              const newAttackers = attackerSide.map((m, i) =>
                  i === attackerIdx ? attacker : m
              ).filter(m => m.hp > 0);
              
              if (isPlayer) newState.playerMinions = newAttackers;
              else newState.opponentMinions = newAttackers;
          }
          break;
      }
    }

        // [P0 Fix 3.1] 触发检查 - 使用返回值而非直接修改
    const postTriggerState = this.resolveTriggers(newState, action.type === 'HP_CHANGE' && action.value < 0 ? 'ON_DAMAGE' : 'ON_CAST', action, triggerDepth);

    return { state: postTriggerState, log };
  }

    /**
   * 触发器解析逻辑 (增强实现)
   * [P0 Fix 3.1] 不再直接修改传入的 state，返回新的状态对象
   * [Fix 1.4] 添加递归深度限制
   */
  static resolveTriggers(state: DuelState, timing: TriggerTiming, context?: any, depth: number = 0): DuelState {
      if (depth >= MAX_TRIGGER_DEPTH) {
          console.warn(`[resolveTriggers] 递归深度超过上限 (${MAX_TRIGGER_DEPTH})，停止递归。timing=${timing}`);
          return state;
      }

      let currentState: DuelState = { ...state };
      const allTriggers = [...currentState.playerTriggers, ...currentState.opponentTriggers];
      const matchingTriggers = allTriggers.filter(t => t.timing === timing);

      for (const trigger of matchingTriggers) {
          if (!trigger.condition || trigger.condition(currentState, context)) {
              const actions = trigger.action(currentState, context);
              for (const act of actions) {
                  // 递归执行触发产生的动作，返回新状态
                  const result = this.applyAction(currentState, act, depth + 1);
                  currentState = result.state;
              }
              if (trigger.isOnce) {
                  currentState = {
                      ...currentState,
                      playerTriggers: currentState.playerTriggers.filter(t => t.id !== trigger.id),
                      opponentTriggers: currentState.opponentTriggers.filter(t => t.id !== trigger.id)
                  };
              }
          }
      }
      return currentState;
  }

  /**
   * 批量执行一个 Command 中的所有 Actions (同步模式用于重构旧逻辑)
   */
  static executeCommand(state: DuelState, command: GameCommand): { state: DuelState; logs: string[] } {
    let currentState = state;
    const logs: string[] = [];

        // [P0 Fix 3.1] ON_CAST 触发点 - 使用返回值
    currentState = this.resolveTriggers(currentState, 'ON_CAST', command);

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
