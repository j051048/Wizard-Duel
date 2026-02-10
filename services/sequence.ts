import { DuelState, GameAction, GameCommand, ActionType, TriggerTiming, GameTrigger } from '../types';
import { GAME_CONFIG } from '../constants';
import { getGameRNG } from '../utils/seededRandom';

const MAX_TRIGGER_DEPTH = 16;

/**
 * GameSequenceExecutor - 核心规则执行引擎
 * 
 * [P0 Overhaul] 重大升级：
 * - Fix #3: 濒死标记 + 统一死亡帧，HP<=0 不立即移除随从
 * - Fix #4: Order of Play 排序，触发器按 createdAt 排序
 * - Fix #5: ON_BEFORE_PLAY 拦截器（奥秘反制漏斗）
 * - Fix #2: 随从召唤使用 SeededRNG 生成 instanceId
 * 
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
              // [P0 Fix #2] 使用 SeededRNG 生成确定性 instanceId
              const rng = getGameRNG();
              const instanceId = `m-${newState.roundNumber}-${rng.randomInt(10000, 99999)}`;
              minions.push({
                  ...minionData,
                  instanceId,
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
                  
                  // [P0 Fix #3] 濒死标记：不立即移除 hp<=0 的随从，标记为 isDying
                  const newDefenders = defenderSide.map((m, i) =>
                      i === defenderIdx ? { ...defender!, isDying: defender!.hp <= 0 } : m
                  );
                  
                  if (isPlayer) newState.opponentMinions = newDefenders;
                  else newState.playerMinions = newDefenders;
                  
                  log = `⚔️ ${attacker.name} 攻击了 ${defender.name}`;

                  // [P0 Fix #3] 如果防御方濒死，触发 ON_DEATH
                  if (defender.hp <= 0) {
                      const deathContext = { diedMinion: defender, killer: attacker, side: isPlayer ? 'opponent' : 'player' };
                      const postDeathState = this.resolveTriggers({ ...newState }, 'ON_DEATH', deathContext, triggerDepth + 1);
                      Object.assign(newState, postDeathState);
                  }
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

              // 更新攻击方状态
              attacker.exhausted = true;
              if (attacker.hp <= 0) {
                  (attacker as any).isDying = true;
              }
              const newAttackers = attackerSide.map((m, i) =>
                  i === attackerIdx ? attacker : m
              );
              
              if (isPlayer) newState.playerMinions = newAttackers;
              else newState.opponentMinions = newAttackers;
          }
          break;
      }
    }

            // [P0 Fix 3.1] 触发检查 - 使用返回值而非直接修改
    const triggerTiming: TriggerTiming = action.type === 'HP_CHANGE' && action.value < 0 ? 'ON_DAMAGE' : 'ON_CAST';
    const postTriggerState = this.resolveTriggers(newState, triggerTiming, action, triggerDepth);

    return { state: postTriggerState, log };
  }

      /**
   * 触发器解析逻辑 (P0 大幅增强)
   * 
   * [P0 Fix #4] Order of Play: 按 createdAt 时间戳排序
   * [P0 Fix #4] Defender Priority: 同一帧内防守方触发器优先
   * [P0 Fix 3.1] 不直接修改传入的 state，返回新的状态对象
   * [Fix 1.4] 递归深度限制
   */
  static resolveTriggers(
    state: DuelState, 
    timing: TriggerTiming, 
    context?: any, 
    depth: number = 0,
    /** 当前施法方（用于 Defender Priority 判定） */
    activeCaster?: 'player' | 'opponent'
  ): DuelState {
      if (depth >= MAX_TRIGGER_DEPTH) {
          console.warn(`[resolveTriggers] 递归深度超过上限 (${MAX_TRIGGER_DEPTH})，停止递归。timing=${timing}`);
          return state;
      }

      let currentState: DuelState = { ...state };
      
      // [P0 Fix #4] 合并所有触发器并按 Order of Play 排序
      const allTriggers: GameTrigger[] = [
        ...currentState.playerTriggers.map(t => ({ ...t, owner: 'player' as const })),
        ...currentState.opponentTriggers.map(t => ({ ...t, owner: 'opponent' as const })),
      ];
      const matchingTriggers = allTriggers.filter(t => t.timing === timing);

      // [P0 Fix #4] 排序规则：
      // 1. Defender Priority: 防守方（非当前施法方）的触发器优先
      // 2. Order of Play: 按 createdAt 时间戳升序（先入场的先触发）
      matchingTriggers.sort((a, b) => {
        if (activeCaster) {
          const aIsDefender = a.owner !== activeCaster;
          const bIsDefender = b.owner !== activeCaster;
          if (aIsDefender && !bIsDefender) return -1; // 防守方优先
          if (!aIsDefender && bIsDefender) return 1;
        }
        // 同侧按入场顺序
        return (a.createdAt ?? 0) - (b.createdAt ?? 0);
      });

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
   * [P0 Fix #5] ON_BEFORE_PLAY 拦截器（奥秘反制漏斗）
   * 
   * 在卡牌效果执行前检查是否有拦截触发器（如奥秘、反制法术）。
   * 如果拦截成功，返回 { intercepted: true }，调用方应跳过该卡牌的效果执行。
   */
  static resolveBeforePlay(
    state: DuelState,
    caster: 'player' | 'opponent',
    spellId: string,
    context?: any
  ): { state: DuelState; intercepted: boolean; logs: string[] } {
    const logs: string[] = [];
    let currentState: DuelState = { ...state };
    let intercepted = false;

    // 合并触发器，防守方优先
    const defender = caster === 'player' ? 'opponent' : 'player';
    const allTriggers: GameTrigger[] = [
      ...(defender === 'player' ? currentState.playerTriggers : currentState.opponentTriggers)
        .map(t => ({ ...t, owner: defender as 'player' | 'opponent' })),
      ...(caster === 'player' ? currentState.playerTriggers : currentState.opponentTriggers)
        .map(t => ({ ...t, owner: caster })),
    ];

    const beforePlayTriggers = allTriggers
      .filter(t => t.timing === 'ON_BEFORE_PLAY')
      .sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

    const fullContext = { ...context, spellId, caster };

    for (const trigger of beforePlayTriggers) {
      if (!trigger.condition || trigger.condition(currentState, fullContext)) {
        const actions = trigger.action(currentState, fullContext);
        for (const act of actions) {
          const result = this.applyAction(currentState, act, 0);
          currentState = result.state;
          if (result.log) logs.push(result.log);
        }

        // 检查拦截标记（action 中可以设置 subType: 'intercept'）
        if (actions.some(a => a.subType === 'intercept')) {
          intercepted = true;
          logs.push(`🛡️ ${caster === 'player' ? '你的' : '对手的'}法术被反制了！`);
        }

        // 一次性触发器消耗
        if (trigger.isOnce) {
          currentState = {
            ...currentState,
            playerTriggers: currentState.playerTriggers.filter(t => t.id !== trigger.id),
            opponentTriggers: currentState.opponentTriggers.filter(t => t.id !== trigger.id),
          };
        }

        // 一旦被拦截，停止后续拦截器检查
        if (intercepted) break;
      }
    }

    return { state: currentState, intercepted, logs };
  }

  /**
   * [P0 Fix #3] 统一死亡帧处理
   * 
   * 在伤害结算后调用：
   * 1. 找出所有 isDying 标记的随从
   * 2. 按入场顺序触发 ON_DEATH
   * 3. 统一移除已死亡随从
   */
  static resolveDeathFrame(state: DuelState): { state: DuelState; logs: string[] } {
    let currentState: DuelState = { ...state };
    const logs: string[] = [];

    // 收集所有濒死随从
    const dyingPlayerMinions = currentState.playerMinions.filter((m: any) => m.isDying || m.hp <= 0);
    const dyingOpponentMinions = currentState.opponentMinions.filter((m: any) => m.isDying || m.hp <= 0);
    const allDying = [
      ...dyingPlayerMinions.map(m => ({ ...m, side: 'player' as const })),
      ...dyingOpponentMinions.map(m => ({ ...m, side: 'opponent' as const })),
    ];

    if (allDying.length === 0) return { state: currentState, logs };

    // 按入场顺序（instanceId 中包含回合号）触发 ON_DEATH
    // instanceId 格式: m-{roundNumber}-{random}
    allDying.sort((a, b) => {
      const aRound = parseInt(a.instanceId?.split('-')[1] || '0');
      const bRound = parseInt(b.instanceId?.split('-')[1] || '0');
      return aRound - bRound;
    });

    for (const dying of allDying) {
      logs.push(`💀 ${dying.name} 阵亡了！`);
      const deathContext = { diedMinion: dying, side: dying.side };
      currentState = this.resolveTriggers(currentState, 'ON_DEATH', deathContext, 0);
    }

    // 统一移除所有 isDying 或 hp<=0 的随从
    currentState.playerMinions = currentState.playerMinions.filter((m: any) => !m.isDying && m.hp > 0);
    currentState.opponentMinions = currentState.opponentMinions.filter((m: any) => !m.isDying && m.hp > 0);

    return { state: currentState, logs };
  }

    /**
   * 批量执行一个 Command 中的所有 Actions
   * 
   * [P0 Fix #3] 增加统一死亡帧：每次 Action 后不立即清理死亡随从，
   * 而是在所有 Action 执行完毕后统一进入 Death Frame。
   * [P0 Fix #5] 在执行前先经过 ON_BEFORE_PLAY 拦截检查。
   */
  static executeCommand(state: DuelState, command: GameCommand): { state: DuelState; logs: string[] } {
    let currentState = state;
    const logs: string[] = [];

    // [P0 Fix #5] ON_BEFORE_PLAY 拦截检查
    if (command.sourceSpell && command.sourceSpell !== 'skip') {
      const beforeResult = this.resolveBeforePlay(
        currentState, command.caster, command.sourceSpell, command
      );
      currentState = beforeResult.state;
      logs.push(...beforeResult.logs);
      
      if (beforeResult.intercepted) {
        // 法术被反制，跳过所有后续 Action
        return { state: currentState, logs };
      }
    }

    // [P0 Fix 3.1] ON_CAST 触发点 - 传入 activeCaster 用于 Defender Priority
    currentState = this.resolveTriggers(currentState, 'ON_CAST', command, 0, command.caster);

    for (const action of command.actions) {
      const result = this.applyAction(currentState, action);
      currentState = result.state;
      if (result.log) logs.push(result.log);

      // 英雄死亡判定中断（英雄不走濒死标记，立即判定）
      if (currentState.playerHP <= 0 || currentState.opponentHP <= 0) {
          const winner = currentState.playerHP <= 0 ? '对手' : '你';
          logs.push(`💀 战斗结束！${winner}赢得了胜利！`);
          break; 
      }
    }

    // [P0 Fix #3] 统一死亡帧：处理所有濒死随从
    const deathResult = this.resolveDeathFrame(currentState);
    currentState = deathResult.state;
    logs.push(...deathResult.logs);

    return { state: currentState, logs };
  }
}
