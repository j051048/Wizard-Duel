import { DungeonRunState, DungeonNode, NodeType, Artifact } from '../types/dungeon';
import { Deck } from '../types';

const INITIAL_PLAYER_HP = 100;

export const ARTIFACTS: Artifact[] = [
  { id: 'phoenix_feather', name: '凤凰之羽', description: '战斗胜利时有20%几率在下场战斗开始前恢复20点生命值', icon: '🪶', rarity: 'RARE', effectType: 'HEAL_BATTLE_END', value: 20 },
  { id: 'arcane_focus', name: '奥术聚焦', description: '每场战斗开始时获得1点额外法力水晶', icon: '🔮', rarity: 'COMMON', effectType: 'BUFF_DAMAGE', value: 1 },
  { id: 'dragon_scale', name: '龙鳞', description: '最大生命值增加1点。', icon: '🐲', rarity: 'COMMON', effectType: 'MAX_HP_UP', value: 1 },
  { id: 'mana_magnet', name: '法力磁石', description: '战斗胜利后获得10%的额外金币奖励', icon: '🧲', rarity: 'LEGENDARY', effectType: 'DISCOUNT_SPELL', value: 10 },
];

export const DungeonService = {
  startNewRun(baseDeck: Deck): DungeonRunState {
    const runId = 'run_' + Date.now();
    const nodeTypes = ['BATTLE', 'BATTLE', 'REST', 'EVENT', 'ELITE', 'BATTLE', 'REST', 'SHOP', 'BATTLE', 'BOSS'] as NodeType[];
    const map = nodeTypes.map((type, index) => ({
      id: 'node_' + index,
      type,
      name: type,
      depth: index,
      isCleared: false
    }));
    return {
      runId, seed: 'seed', currentDepth: 0, playerHP: INITIAL_PLAYER_HP, maxHP: INITIAL_PLAYER_HP, gold: 50,
      deck: { ...baseDeck, id: 'run_deck_' + runId, name: 'Dungeon Deck' },
      artifacts: [], map, currentNodeIndex: 0, isGameOver: false, isVictory: false
    };
  },
  advanceNode(state: DungeonRunState): DungeonRunState {
    return { ...state, currentNodeIndex: state.currentNodeIndex + 1 };
  },
  updateHP(state: DungeonRunState, delta: number): DungeonRunState {
    return { ...state, playerHP: state.playerHP + delta };
  },
  addArtifact(state: DungeonRunState, artifact: Artifact): DungeonRunState {
    return { ...state, artifacts: [...state.artifacts, artifact] };
  },
  getRandomArtifactOptions(count: number = 3): Artifact[] {
    return ARTIFACTS.slice(0, count);
  }
};
