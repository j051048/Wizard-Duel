import { DungeonRunState, DungeonNode, NodeType, Artifact } from '../types/dungeon';
import { Deck } from '../types';

const INITIAL_PLAYER_HP = 100;

export const ARTIFACTS: Artifact[] = [
  { id: 'phoenix_feather', name: '凤凰羽毛', description: '生命值低于 20% 时，下场战斗开始前恢复 20 点生命。', icon: '' },
  { id: 'arcane_focus', name: '奥术核心', description: '每场战斗开始时额外获得 1 点初始法力。', icon: '' },
  { id: 'dragon_scale', name: '龙鳞', description: '受到的所有伤害减少 1 点。', icon: '' },
  { id: 'mana_magnet', name: '法力磁铁', description: '战斗获胜后额外获得 10% 的法力金币。', icon: '' },
];

export const DungeonService = {
  startNewRun(baseDeck: Deck): DungeonRunState {
    const runId = 'run_' + (Get-Date).Ticks;
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
