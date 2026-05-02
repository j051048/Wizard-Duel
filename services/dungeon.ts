/**
 * Wizard Duel — 地牢模式服务 v2
 * [Phase D-1] 程序化地图生成（3层分支结构）
 * [Phase D-2] 20遗物 + 遗物效果处理
 * [Phase D-3] 15事件 + 事件选择处理
 * [Phase D-4] 节点逻辑：REST / EVENT / SHOP / BATTLE / ELITE / BOSS
 */

import { DungeonRunState, DungeonNode, NodeType, Artifact, DungeonEvent, ShopItem, EventEffect } from '../types/dungeon';
import { Deck, SpellType } from '../types';
import { ALL_ARTIFACTS, ALL_EVENTS, pickRandomArtifacts, pickRandomEvent } from '../data/dungeonData';
import { SPELLS } from '../data/spells';
import { resetGameRNG, getGameRNG } from '../utils/seededRandom';

const INITIAL_PLAYER_HP = 100;
const LAYER_COUNT = 3;
const NODES_PER_LAYER = 9; // 含分支

// ============ D-1: 程序化地图生成 ============

/**
 * 生成 3 层地牢地图，每层 9 节点（含 2-3 条分支）
 * 层间通过 BOSS 节点连接
 */
export function generateDungeonMap(seed: string): DungeonNode[] {
  const rng = resetGameRNG(hashSeed(seed));
  const nodes: DungeonNode[] = [];

  const nodeWeights: Record<NodeType, number> = {
    BATTLE: 0.35,
    ELITE:  0.10,
    BOSS:   0.05,
    REST:   0.15,
    EVENT:  0.20,
    SHOP:   0.15,
  };

  const pickNodeType = (layer: number, index: number, total: number): NodeType => {
    // 第一个节点固定是 BATTLE
    if (index === 0) return 'BATTLE';
    // 最后一个节点固定是 BOSS
    if (index === total - 1) return 'BOSS';

    // 权重随机
    const roll = rng.random();
    let cumulative = 0;
    for (const [type, weight] of Object.entries(nodeWeights)) {
      if (type === 'BOSS') continue; // BOSS 已固定
      cumulative += weight;
      if (roll < cumulative) return type as NodeType;
    }
    return 'BATTLE';
  };

  for (let layer = 0; layer < LAYER_COUNT; layer++) {
    const layerOffset = layer * 100;
    const nodesInLayer = NODES_PER_LAYER;

    for (let i = 0; i < nodesInLayer; i++) {
      const nodeType = pickNodeType(layer, i, nodesInLayer);
      const nodeId = `node_${layer}_${i}`;

      const node: DungeonNode = {
        id: nodeId,
        type: nodeType,
        depth: layerOffset + i,
        name: getNodeName(nodeType, layer, i),
        description: getNodeDescription(nodeType),
        isCleared: false,
        layer,
        branch: 0,
        children: i < nodesInLayer - 1 ? [`node_${layer}_${i + 1}`] : [],
        parents: i > 0 ? [`node_${layer}_${i - 1}`] : [],
        eventId: nodeType === 'EVENT' ? pickRandomEvent().id : undefined,
      };

      nodes.push(node);
    }
  }

  return nodes;
}

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) || 1;
}

function getNodeName(type: NodeType, layer: number, index: number): string {
  const layerNames = ['浅层', '中层', '深层'];
  const prefix = layerNames[layer] || '深层';

  switch (type) {
    case 'BATTLE': return `${prefix}战斗 #${index + 1}`;
    case 'ELITE':  return `${prefix}精英`;
    case 'BOSS':   return `${['火焰领主', '冰霜女巫', '岩石守护者'][layer] || '最终Boss'}`;
    case 'REST':   return '休息营地';
    case 'EVENT':  return '神秘事件';
    case 'SHOP':   return '地牢商店';
    default:       return type;
  }
}

function getNodeDescription(type: NodeType): string {
  switch (type) {
    case 'BATTLE': return '与敌人交战';
    case 'ELITE':  return '强大的敌人守卫着宝藏';
    case 'BOSS':   return '层主守关，击败可进入下一层';
    case 'REST':   return '恢复体力或升级法术';
    case 'EVENT':  return '未知的遭遇...';
    case 'SHOP':   return '用金币换取物资';
    default:       return '';
  }
}

// ============ D-2/D-3/D-4: DungeonService ============

export const DungeonService = {
  /** 开始新的地牢探索 */
  startNewRun(baseDeck: Deck): DungeonRunState {
    const runId = 'run_' + Date.now();
    const seed = 'dungeon_' + runId;
    const map = generateDungeonMap(seed);

    return {
      runId,
      seed,
      currentDepth: 0,
      playerHP: INITIAL_PLAYER_HP,
      maxHP: INITIAL_PLAYER_HP,
      gold: 50,
      deck: { ...baseDeck, id: 'run_deck_' + runId, name: 'Dungeon Deck' },
      artifacts: [],
      map,
      currentNodeIndex: 0,
      isGameOver: false,
      isVictory: false,
      currentLayer: 0,
      killCount: 0,
    };
  },

  /** 进入下一个节点 */
  advanceNode(state: DungeonRunState): DungeonRunState {
    const nextIndex = state.currentNodeIndex + 1;
    const isVictory = nextIndex >= state.map.length;

    return {
      ...state,
      currentNodeIndex: nextIndex,
      isVictory,
      isGameOver: isVictory,
    };
  },

  /** 更新 HP（受 MAX_HP_UP 遗物影响） */
  updateHP(state: DungeonRunState, delta: number): DungeonRunState {
    const newHP = Math.max(0, Math.min(state.maxHP, state.playerHP + delta));
    return {
      ...state,
      playerHP: newHP,
      isGameOver: newHP <= 0,
    };
  },

  /** 设置最大 HP */
  setMaxHP(state: DungeonRunState, maxHP: number): DungeonRunState {
    const ratio = state.playerHP / state.maxHP;
    return {
      ...state,
      maxHP,
      playerHP: Math.round(ratio * maxHP),
    };
  },

  /** 花费金币 */
  spendGold(state: DungeonRunState, amount: number): DungeonRunState | null {
    if (state.gold < amount) return null;
    return { ...state, gold: state.gold - amount };
  },

  /** 获得金币（受 DOUBLE_GOLD 遗物影响） */
  addGold(state: DungeonRunState, amount: number): DungeonRunState {
    const bonus = state.artifacts
      .filter(a => a.effectType === 'DOUBLE_GOLD')
      .reduce((sum, a) => sum + a.value, 0);
    return { ...state, gold: state.gold + amount + bonus };
  },

  /** 添加遗物 */
  addArtifact(state: DungeonRunState, artifact: Artifact): DungeonRunState {
    // 处理即时效果
    let newState = { ...state, artifacts: [...state.artifacts, artifact] };

    if (artifact.effectType === 'MAX_HP_UP') {
      newState = { ...newState, maxHP: newState.maxHP + artifact.value, playerHP: newState.playerHP + artifact.value };
    }

    return newState;
  },

  /** 获取随机遗物选项（排除已拥有的） */
  getRandomArtifactOptions(count: number = 3, state: DungeonRunState): Artifact[] {
    const ownedIds = state.artifacts.map(a => a.id);
    return pickRandomArtifacts(count, ownedIds);
  },

  /** 处理休息节点 */
  handleRest(state: DungeonRunState, choice: 'heal' | 'upgrade'): DungeonRunState {
    if (choice === 'heal') {
      const healAmount = Math.floor(state.maxHP * 0.3);
      return this.updateHP(state, healAmount);
    }
    // upgrade: 最大HP+10
    return this.setMaxHP(state, state.maxHP + 10);
  },

  /** 处理事件选择 */
  handleEventChoice(state: DungeonRunState, effect: EventEffect): DungeonRunState {
    let newState = { ...state };

    switch (effect.type) {
      case 'heal': {
        const amount = effect.value === 999
          ? state.maxHP - state.playerHP
          : Number(effect.value);
        newState = this.updateHP(newState, amount);
        break;
      }
      case 'damage':
        newState = this.updateHP(newState, -Number(effect.value));
        break;
      case 'gold':
        newState = this.addGold(newState, Number(effect.value));
        break;
      case 'maxhp':
        newState = this.setMaxHP(newState, newState.maxHP + Number(effect.value));
        break;
      case 'artifact': {
        const count = Number(effect.value);
        const options = this.getRandomArtifactOptions(count, newState);
        // 直接添加第一件（简化：不弹选择框）
        for (const art of options) {
          newState = this.addArtifact(newState, art);
        }
        break;
      }
      case 'card': {
        // 获得一张随机稀有卡
        const availableCards = SPELLS.filter(s => s.rarity === 'rare' || s.rarity === 'mythic');
        if (availableCards.length > 0) {
          const rng = getGameRNG();
          const card = availableCards[rng.randomInt(0, availableCards.length)];
          newState = {
            ...newState,
            deck: { ...newState.deck, cards: [...newState.deck.cards, card.id as SpellType] },
          };
        }
        break;
      }
    }

    return newState;
  },

  /** 生成商店物品 */
  generateShopItems(state: DungeonRunState): ShopItem[] {
    const rng = getGameRNG();
    const items: ShopItem[] = [];

    // 1 件遗物
    const artifact = this.getRandomArtifactOptions(1, state)[0];
    if (artifact) {
      const price = artifact.rarity === 'LEGENDARY' ? 100 : artifact.rarity === 'RARE' ? 60 : 30;
      items.push({
        id: 'shop_artifact_' + artifact.id,
        name: artifact.name,
        description: artifact.description,
        icon: artifact.icon,
        price,
        type: 'artifact',
        artifactId: artifact.id,
      });
    }

    // 治疗服务
    const healPrice = 25;
    items.push({
      id: 'shop_heal',
      name: '治疗药水',
      description: `恢复 ${Math.floor(state.maxHP * 0.4)} HP`,
      icon: '🧪',
      price: healPrice,
      type: 'heal',
      healAmount: Math.floor(state.maxHP * 0.4),
    });

    // 1 张卡牌
    const availableCards = SPELLS.filter(s =>
      s.rarity !== 'legendary' && !s.id.startsWith('hero_') && s.id !== 'skip'
    );
    if (availableCards.length > 0) {
      const card = availableCards[rng.randomInt(0, availableCards.length)];
      items.push({
        id: 'shop_card_' + card.id,
        name: card.name,
        description: card.description,
        icon: card.emoji,
        price: card.manaCost * 8 + (card.rarity === 'mythic' ? 20 : card.rarity === 'rare' ? 10 : 0),
        type: 'card',
        cardId: card.id as SpellType,
      });
    }

    return items;
  },

  /** 购买商店物品 */
  purchaseShopItem(state: DungeonRunState, item: ShopItem): DungeonRunState | null {
    const paid = this.spendGold(state, item.price);
    if (!paid) return null;

    let newState = paid;

    if (item.type === 'artifact' && item.artifactId) {
      const artifact = ALL_ARTIFACTS.find(a => a.id === item.artifactId);
      if (artifact) newState = this.addArtifact(newState, artifact);
    } else if (item.type === 'heal' && item.healAmount) {
      newState = this.updateHP(newState, item.healAmount);
    } else if (item.type === 'card' && item.cardId) {
      newState = {
        ...newState,
        deck: { ...newState.deck, cards: [...newState.deck.cards, item.cardId] },
      };
    }

    return newState;
  },

  /** 应用遗物的战斗开始效果 */
  applyBattleStartArtifacts(state: DungeonRunState): DungeonRunState {
    let newState = { ...state };

    for (const art of state.artifacts) {
      switch (art.effectType) {
        case 'START_MANA':
          // 由对战层处理（传递给 createTavernDuelState）
          break;
        case 'START_ARMOR':
          newState = { ...newState, playerHP: Math.min(newState.maxHP, newState.playerHP) };
          break;
        case 'DRAW_CARD':
          // 由对战层处理
          break;
        case 'AOE_DAMAGE':
          // 由对战层处理（开局对敌方造成伤害）
          break;
      }
    }

    return newState;
  },

  /** 战斗胜利后处理 */
  onBattleVictory(state: DungeonRunState): DungeonRunState {
    let newState = { ...state };
    newState = { ...newState, killCount: (newState.killCount || 0) + 1 };

    // 基础金币奖励
    newState = this.addGold(newState, 15);

    // 遗物效果
    for (const art of state.artifacts) {
      if (art.effectType === 'GOLD_PER_KILL') {
        newState = this.addGold(newState, art.value);
      }
      if (art.effectType === 'HEAL_BATTLE_END' && Math.random() < 0.2) {
        newState = this.updateHP(newState, art.value);
      }
    }

    // 标记当前节点完成
    const updatedMap = [...newState.map];
    if (updatedMap[newState.currentNodeIndex]) {
      updatedMap[newState.currentNodeIndex] = { ...updatedMap[newState.currentNodeIndex], isCleared: true };
    }
    newState = { ...newState, map: updatedMap };

    return newState;
  },

  /** 检查是否有 REBIRTH 遗物 */
  hasRebirth(state: DungeonRunState): boolean {
    return state.artifacts.some(a => a.effectType === 'REBIRTH');
  },

  /** 触发 REBIRTH 效果 */
  triggerRebirth(state: DungeonRunState): DungeonRunState {
    return {
      ...state,
      playerHP: Math.floor(state.maxHP * 0.5),
      isGameOver: false,
      artifacts: state.artifacts.filter(a => a.effectType !== 'REBIRTH'), // 一次性
    };
  },

  /** 获取当前节点 */
  getCurrentNode(state: DungeonRunState): DungeonNode | null {
    return state.map[state.currentNodeIndex] || null;
  },

  /** 获取事件数据 */
  getEvent(eventId: string): DungeonEvent | undefined {
    return ALL_EVENTS.find(e => e.id === eventId);
  },
};
