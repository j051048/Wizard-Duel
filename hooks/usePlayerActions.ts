/**
 * usePlayerActions - 玩家行动管理
 * 
 * [Phase B-1] 从 useGameLoop 中拆出：
 * - 出牌 (playCard)
 * - 换牌 (handleMulligan)
 */

import { useCallback } from 'react';
import {
  SpellType, DuelState, DuelPhase, GameMode, AIProfile, GameActionCommand
} from '../types';
import {
  createInitialDuelState, createTavernDuelState, canAffordSpell, createPvpDuelState
} from '../services/gameLogic';
import { getHeroSkillById, getSkillChoices } from '../data/heroSkills';
import { getGameRNG } from '../utils/seededRandom';
import { GameRuleEngine } from '../services/GameRuleEngine';
import { getElementType } from '../services/combat/elementSystem';
import { validateCardPlay } from '../services/validation/antiCheat';
import {
  PHASE_TRANSITION_DELAY, BANNER_WAIT_DELAY, ROUND_TRANSITION_DELAY
} from '../config/timing';

interface UsePlayerActionsDeps {
  duelStateRef: React.MutableRefObject<DuelState | null>;
  phaseRef: React.MutableRefObject<string>;
  isProcessing: boolean;
  enqueue: (commands: GameActionCommand[], actionId?: string) => void;
  showTurnBanner: (type: 'player' | 'opponent') => void;
  setDuelState: (state: DuelState | null) => void;
  setPhase: (phase: DuelPhase) => void;
  addMessage: (msg: string) => void;
  setPlayerCard: (card: SpellType | null) => void;
  clearMessages: () => void;
  resetBattleUI: () => void;
  startNewRound: (state: DuelState) => void;
  pvpRoleRef?: React.MutableRefObject<'player1' | 'player2' | null>;
}

export function usePlayerActions({
  duelStateRef,
  phaseRef,
  isProcessing,
  enqueue,
  showTurnBanner,
  setDuelState,
  setPhase,
  addMessage,
  setPlayerCard,
  clearMessages,
  resetBattleUI,
  startNewRound,
  pvpRoleRef,
}: UsePlayerActionsDeps) {

    /** 出牌 */
  const playCard = useCallback((spellId: SpellType): boolean => {
    const state = duelStateRef.current;
    if (!state || phaseRef.current !== 'PLAYER_TURN' || isProcessing) return false;

    // [P0 Fix #6] 独立防作弊校验（不信任 canAffordSpell 单独的结果）
    const violations = validateCardPlay(state, spellId, 'player');
    if (violations.length > 0) {
      const criticalViolation = violations.find(v => v.severity === 'critical' || v.severity === 'error');
      if (criticalViolation) {
        console.warn('[AntiCheat] Card play rejected:', violations);
        addMessage(criticalViolation.message || '非法操作');
        return false;
      }
    }

    const affordable = canAffordSpell(spellId, state.playerMana, state.playerEffects, state.playerCostMod);
    if (!affordable.canAfford) {
      addMessage(affordable.reason || '无法出牌');
      return false;
    }

    setPlayerCard(spellId);

    const { newState, commands: engineCommands } = GameRuleEngine.castSpell(state, spellId, 'player');
    enqueue([...engineCommands], `play_${spellId}_${Date.now()}`);
    return true;
  }, [duelStateRef, phaseRef, isProcessing, enqueue, addMessage, setPlayerCard]);

  /** 起手换牌 */
  const handleMulligan = useCallback((indicesToReplace: number[]) => {
    if (!duelStateRef.current) return;
    const state = duelStateRef.current;

    let newHand = [...state.playerHand];
    let newDeck = [...state.playerDeck];

    indicesToReplace.forEach(index => {
      if (index < newHand.length && newDeck.length > 0) {
        const card = newHand[index];
        const newCard = newDeck[0];
        newDeck = newDeck.slice(1);
        newHand[index] = newCard;
        newDeck.push(card);
      }
    });
    // [P0 Fix #2] 使用确定性 RNG 洗牌
    newDeck = getGameRNG().shuffle(newDeck);

    const newState = { ...state, playerHand: newHand, playerDeck: newDeck };
    setDuelState(newState);

    const commands: GameActionCommand[] = [
      { type: 'UPDATE_STATE', payload: newState },
      // [P3-2] After mulligan, transition to skill selection phase
      {
        type: 'EXECUTE_LOGIC',
        payload: () => setPhase('SKILL_SELECT_PHASE'),
        delay: PHASE_TRANSITION_DELAY
      }
    ];

    clearMessages();
    enqueue(commands, 'mulligan');
  }, [duelStateRef, enqueue, setDuelState, clearMessages, setPhase]);

  /** [P3-2] 英雄技能选择完成后开始对战 */
  const selectHeroSkill = useCallback((skillId: string) => {
    const state = duelStateRef.current;
    if (!state) return;

    // Validate skill exists
    const skill = getHeroSkillById(skillId);
    if (!skill) {
      console.warn('[selectHeroSkill] Invalid skill ID:', skillId);
      return;
    }

    // Determine opponent's main element from their hand
    const opponentElementCounts: Record<string, number> = {};
    for (const spellId of state.opponentHand) {
      const el = getElementType(spellId);
      if (el !== 'neutral') {
        opponentElementCounts[el] = (opponentElementCounts[el] || 0) + 1;
      }
    }
    let opponentMainElement: string | undefined;
    let maxCount = 0;
    for (const [el, count] of Object.entries(opponentElementCounts)) {
      if (count > maxCount) { maxCount = count; opponentMainElement = el; }
    }

    // Pick a random skill from the opponent's main element
    const opponentChoices = getSkillChoices(opponentMainElement);
    const opponentSkill = opponentChoices[0]; // First choice is from main element
    const opponentSkillId = opponentSkill?.id || 'skill_burn_shot';

    const newState: DuelState = {
      ...state,
      selectedHeroSkill: skillId,
      opponentSelectedHeroSkill: opponentSkillId,
    };
    setDuelState(newState);

    const commands: GameActionCommand[] = [
      { type: 'UPDATE_STATE', payload: newState },
      { type: 'EXECUTE_LOGIC', payload: () => showTurnBanner(pvpRoleRef?.current === 'player2' ? 'opponent' : 'player'), delay: PHASE_TRANSITION_DELAY },
      { type: 'WAIT', payload: null, delay: BANNER_WAIT_DELAY },
      { type: 'ADD_MESSAGE', payload: `英雄技能「${skill.name}」已就绪！` },
      {
        type: 'EXECUTE_LOGIC',
        payload: () => startNewRound({ ...newState, roundNumber: 0 }),
        delay: ROUND_TRANSITION_DELAY
      }
    ];

    clearMessages();
    addMessage(`已选择英雄技能：${skill.emoji} ${skill.name}`);
    enqueue(commands, 'select_skill');
  }, [duelStateRef, enqueue, showTurnBanner, setDuelState, addMessage, clearMessages, startNewRound, pvpRoleRef]);

  /** [P3-2] 使用英雄技能（每回合一次，2 费） */
  const useHeroSkill = useCallback((): boolean => {
    const state = duelStateRef.current;
    if (!state || phaseRef.current !== 'PLAYER_TURN' || isProcessing) return false;
    if (!state.selectedHeroSkill) return false;
    if (state.heroSkillsUsed) {
      addMessage('本回合已使用过英雄技能');
      return false;
    }

    const skill = getHeroSkillById(state.selectedHeroSkill);
    if (!skill) return false;

    const effectiveCost = Math.max(0, skill.manaCost + state.playerCostMod);
    if (state.playerMana < effectiveCost) {
      addMessage('法力不足');
      return false;
    }

    // Build actions for the skill
    const actions: GameActionCommand[] = [];
    let newState: DuelState = {
      ...state,
      playerMana: state.playerMana - effectiveCost,
      heroSkillsUsed: true,
    };

    if (skill.damage) {
      newState = { ...newState, opponentHP: newState.opponentHP - skill.damage };
      actions.push({ type: 'ADD_MESSAGE', payload: `${skill.emoji} ${skill.name} 造成 ${skill.damage} 点伤害！` });
    }
    if (skill.armorGain) {
      newState = { ...newState, playerArmor: newState.playerArmor + skill.armorGain };
      actions.push({ type: 'ADD_MESSAGE', payload: `${skill.emoji} ${skill.name} 获得 ${skill.armorGain} 点护甲` });
    }
    if (skill.heal) {
      newState = { ...newState, playerHP: Math.min(30, newState.playerHP + skill.heal) };
      actions.push({ type: 'ADD_MESSAGE', payload: `${skill.emoji} ${skill.name} 恢复 ${skill.heal} 点生命` });
    }
    if (skill.draw) {
      const drawn: SpellType[] = [];
      let deck = [...newState.playerDeck];
      let hand = [...newState.playerHand];
      for (let i = 0; i < skill.draw && deck.length > 0; i++) {
        drawn.push(deck[0]);
        hand.push(deck[0]);
        deck = deck.slice(1);
      }
      newState = { ...newState, playerDeck: deck, playerHand: hand };
      actions.push({ type: 'ADD_MESSAGE', payload: `${skill.emoji} 抽了 ${drawn.length} 张牌` });
    }

    actions.unshift({ type: 'UPDATE_STATE', payload: newState });
    enqueue(actions, `hero_skill_${skill.id}_${Date.now()}`);
    return true;
  }, [duelStateRef, phaseRef, isProcessing, enqueue, addMessage]);

  /** 初始化标准对战 */
  const startDuel = useCallback((playerDeck: SpellType[], _opponentDeck: SpellType[], gameMode: GameMode = 'standard') => {
    const initialState = createInitialDuelState(playerDeck || [], gameMode);
    setDuelState(initialState);
    setPhase('MULLIGAN_PHASE');
    resetBattleUI();
  }, [setDuelState, setPhase, resetBattleUI]);

  /** 初始化酒馆对战 */
  const startTavernDuel = useCallback((deck: SpellType[], aiProfile: AIProfile, gameMode: GameMode = 'standard') => {
    const state = createTavernDuelState(deck, aiProfile, gameMode);
    setDuelState(state);
    setPhase('MULLIGAN_PHASE');
    resetBattleUI();
  }, [setDuelState, setPhase, resetBattleUI]);

  /** [PVP] 初始化 PVP 对战 (已认证同步版 & P0 Fix) */
  const startPvpDuel = useCallback((p1Deck: SpellType[], p2Deck: SpellType[], role: 'player1' | 'player2', seed?: number) => {
    if (pvpRoleRef) pvpRoleRef.current = role;
    
    // PVP 模式不再默认 Standard，而是使用 createPvpDuelState 创建完全一致的初始状态
    // 此函数内部会对 p1Deck/p2Deck 进行确定性洗牌并根据 role 分配视角
    const initialState = createPvpDuelState(p1Deck, p2Deck, seed || 0, role);

    setDuelState(initialState);
    setPhase('MULLIGAN_PHASE');
    resetBattleUI();
  }, [setDuelState, setPhase, resetBattleUI, pvpRoleRef]);

  return {
    playCard,
    handleMulligan,
    startDuel,
    startTavernDuel,
    startPvpDuel,
    selectHeroSkill,
    useHeroSkill,
  };
}