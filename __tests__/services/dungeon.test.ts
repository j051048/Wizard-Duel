/**
 * 地牢模式测试
 * [Phase D/F-3] 覆盖地图生成、遗物、事件、节点逻辑
 */

import { describe, it, expect } from 'vitest';
import { DungeonService, generateDungeonMap } from '../../services/dungeon';
import { ALL_ARTIFACTS, ALL_EVENTS, pickRandomArtifacts, pickRandomEvent } from '../../data/dungeonData';
import { DungeonRunState } from '../../types/dungeon';

const createMockRun = (overrides: Partial<DungeonRunState> = {}): DungeonRunState => ({
  runId: 'test_run',
  seed: 'test_seed',
  currentDepth: 0,
  playerHP: 100,
  maxHP: 100,
  gold: 50,
  deck: { id: 'deck_1', name: 'Test', cards: ['fire', 'ice', 'thunder'], createdAt: 0, lastUsed: 0 },
  artifacts: [],
  map: [],
  currentNodeIndex: 0,
  isGameOver: false,
  isVictory: false,
  killCount: 0,
  ...overrides,
});

describe('Dungeon Data', () => {
  it('should have 20 artifacts', () => {
    expect(ALL_ARTIFACTS.length).toBe(20);
  });

  it('should have artifact rarities: 10 COMMON, 6 RARE, 4 LEGENDARY', () => {
    const common = ALL_ARTIFACTS.filter(a => a.rarity === 'COMMON').length;
    const rare = ALL_ARTIFACTS.filter(a => a.rarity === 'RARE').length;
    const legendary = ALL_ARTIFACTS.filter(a => a.rarity === 'LEGENDARY').length;
    expect(common).toBe(10);
    expect(rare).toBe(6);
    expect(legendary).toBe(4);
  });

  it('should have 15 events', () => {
    expect(ALL_EVENTS.length).toBe(15);
  });

  it('each event should have at least 1 choice', () => {
    ALL_EVENTS.forEach(event => {
      expect(event.choices.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('pickRandomArtifacts should return requested count', () => {
    const arts = pickRandomArtifacts(3);
    expect(arts.length).toBe(3);
  });

  it('pickRandomArtifacts should not return excluded ids', () => {
    const exclude = ALL_ARTIFACTS.slice(0, 10).map(a => a.id);
    const arts = pickRandomArtifacts(5, exclude);
    arts.forEach(a => {
      expect(exclude).not.toContain(a.id);
    });
  });

  it('pickRandomEvent should return a valid event', () => {
    const event = pickRandomEvent();
    expect(event).toBeDefined();
    expect(event.id).toBeDefined();
    expect(event.choices.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Dungeon Map Generation', () => {
  it('should generate 27 nodes (3 layers x 9)', () => {
    const map = generateDungeonMap('test_seed');
    expect(map.length).toBe(27);
  });

  it('first node should be BATTLE', () => {
    const map = generateDungeonMap('test_seed_2');
    expect(map[0].type).toBe('BATTLE');
  });

  it('last node of each layer should be BOSS', () => {
    const map = generateDungeonMap('test_seed_3');
    // Layer 0: index 8, Layer 1: index 17, Layer 2: index 26
    expect(map[8].type).toBe('BOSS');
    expect(map[17].type).toBe('BOSS');
    expect(map[26].type).toBe('BOSS');
  });

  it('should produce deterministic maps for same seed', () => {
    const map1 = generateDungeonMap('same_seed');
    const map2 = generateDungeonMap('same_seed');
    expect(map1.length).toBe(map2.length);
    // Same seed → same node types in same order
    for (let i = 0; i < map1.length; i++) {
      expect(map1[i].type).toBe(map2[i].type);
    }
  });
});

describe('DungeonService', () => {
  it('should start a new run with correct initial state', () => {
    const deck = { id: 'd1', name: 'Test', cards: ['fire', 'ice'], createdAt: 0, lastUsed: 0 };
    const run = DungeonService.startNewRun(deck);
    expect(run.playerHP).toBe(100);
    expect(run.maxHP).toBe(100);
    expect(run.gold).toBe(50);
    expect(run.artifacts).toHaveLength(0);
    expect(run.map.length).toBe(27);
    expect(run.isGameOver).toBe(false);
  });

  it('should advance node index', () => {
    const run = createMockRun();
    const advanced = DungeonService.advanceNode(run);
    expect(advanced.currentNodeIndex).toBe(1);
  });

  it('should update HP within bounds', () => {
    const run = createMockRun({ playerHP: 50, maxHP: 100 });
    const healed = DungeonService.updateHP(run, 30);
    expect(healed.playerHP).toBe(80);
  });

  it('should not exceed maxHP when healing', () => {
    const run = createMockRun({ playerHP: 90, maxHP: 100 });
    const healed = DungeonService.updateHP(run, 50);
    expect(healed.playerHP).toBe(100);
  });

  it('should mark game over when HP reaches 0', () => {
    const run = createMockRun({ playerHP: 10 });
    const dead = DungeonService.updateHP(run, -20);
    expect(dead.playerHP).toBe(0);
    expect(dead.isGameOver).toBe(true);
  });

  it('should add gold correctly', () => {
    const run = createMockRun({ gold: 50 });
    const updated = DungeonService.addGold(run, 30);
    expect(updated.gold).toBe(80);
  });

  it('should add artifact and apply MAX_HP_UP immediately', () => {
    const run = createMockRun({ playerHP: 80, maxHP: 100 });
    const dragonScale = ALL_ARTIFACTS.find(a => a.id === 'dragon_scale')!;
    const updated = DungeonService.addArtifact(run, dragonScale);
    expect(updated.artifacts).toHaveLength(1);
    expect(updated.maxHP).toBe(115); // +15
    expect(updated.playerHP).toBe(95); // 80 + 15
  });

  it('should not allow spending more gold than available', () => {
    const run = createMockRun({ gold: 10 });
    const result = DungeonService.spendGold(run, 50);
    expect(result).toBeNull();
  });

  it('should allow spending gold when sufficient', () => {
    const run = createMockRun({ gold: 100 });
    const result = DungeonService.spendGold(run, 50);
    expect(result).not.toBeNull();
    expect(result!.gold).toBe(50);
  });

  it('should handle rest heal (30% maxHP)', () => {
    const run = createMockRun({ playerHP: 50, maxHP: 100 });
    const healed = DungeonService.handleRest(run, 'heal');
    expect(healed.playerHP).toBe(80); // 50 + 30
  });

  it('should handle rest upgrade (maxHP +10)', () => {
    const run = createMockRun({ playerHP: 80, maxHP: 100 });
    const upgraded = DungeonService.handleRest(run, 'upgrade');
    expect(upgraded.maxHP).toBe(110);
  });

  it('should generate shop items', () => {
    const run = createMockRun();
    const items = DungeonService.generateShopItems(run);
    expect(items.length).toBeGreaterThanOrEqual(2); // at least heal + 1 more
    items.forEach(item => {
      expect(item.price).toBeGreaterThan(0);
      expect(item.name).toBeDefined();
    });
  });

  it('should apply DOUBLE_GOLD artifact when adding gold', () => {
    // Create a test DOUBLE_GOLD artifact (not in ALL_ARTIFACTS, so use inline)
    const testArtifact = { id: 'test_double', name: 'Test', description: '', icon: '💰', rarity: 'RARE' as const, effectType: 'DOUBLE_GOLD' as const, value: 20 };
    const run = createMockRun({ gold: 50, artifacts: [testArtifact] });
    const updated = DungeonService.addGold(run, 10);
    // base 10 + bonus 20 = 30 added to 50 = 80
    expect(updated.gold).toBe(80);
  });

  it('should handle onBattleVictory', () => {
    const run = createMockRun({ gold: 50, map: [{ id: 'node_0', type: 'BATTLE', depth: 0, name: 'test', isCleared: false }] });
    const result = DungeonService.onBattleVictory(run);
    expect(result.killCount).toBe(1);
    expect(result.map[0].isCleared).toBe(true);
    expect(result.gold).toBeGreaterThan(50); // base + 15 reward
  });

  it('should detect and trigger rebirth', () => {
    const phoenixEgg = ALL_ARTIFACTS.find(a => a.id === 'phoenix_egg')!;
    const run = createMockRun({ playerHP: 0, isGameOver: true, maxHP: 100, artifacts: [phoenixEgg] });

    expect(DungeonService.hasRebirth(run)).toBe(true);
    const reborn = DungeonService.triggerRebirth(run);
    expect(reborn.isGameOver).toBe(false);
    expect(reborn.playerHP).toBe(50); // 50% of maxHP
    // rebirth artifact should be consumed
    expect(reborn.artifacts).toHaveLength(0);
  });
});
