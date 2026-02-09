import { Spell, CardSet, SpellType } from '../types';
import { generateDescription, generateShortDesc } from '../services/descriptionGenerator';

export const MINION_DATA: Record<string, { name: string, atk: number, hp: number, type: string }> = {
  'rock_golem': { name: '大地巨像', atk: 5, hp: 10, type: 'rock' },
  'spirit_wolf': { name: '幽灵狼', atk: 3, hp: 3, type: 'vine' },
  'fire_spirit': { name: '火元素', atk: 4, hp: 2, type: 'fire' },
};

// Helper: Define spell with auto-generated descriptions
const defineSpell = (s: Partial<Spell> & { id: SpellType; name: string; manaCost: number; rarity: Spell['rarity']; mechanic: Spell['mechanic']; cardSet?: CardSet }): Spell => {
  const defaults = {
     color: 'text-white',
     borderColor: 'border-white',
     shadowColor: 'rgba(255,255,255,0.5)',
     damage: 0,
     armorGain: 0,
     value: 0
  };
  
  // Color presets based on ID prefix
  if (s.id.startsWith('fire')) {
      s.emoji = s.emoji || '🔥';
      s.color = 'text-red-500'; 
      s.borderColor = 'border-red-500';
      s.shadowColor = 'rgba(239,68,68,0.5)';
      s.beats = 'vine';
  } else if (s.id.startsWith('vine')) {
      s.emoji = s.emoji || '🌿';
      s.color = 'text-green-500';
      s.borderColor = 'border-green-500';
      s.shadowColor = 'rgba(34,197,94,0.5)';
      s.beats = 'ice';
  } else if (s.id.startsWith('ice')) {
      s.emoji = s.emoji || '❄️';
      s.color = 'text-cyan-400';
      s.borderColor = 'border-cyan-400';
      s.shadowColor = 'rgba(34,211,238,0.5)';
      s.beats = 'thunder';
  } else if (s.id.startsWith('thunder')) {
      s.emoji = s.emoji || '⚡';
      s.color = 'text-yellow-400';
      s.borderColor = 'border-yellow-400';
      s.shadowColor = 'rgba(250,204,21,0.5)';
      s.beats = 'rock';
  } else if (s.id.startsWith('rock')) {
      s.emoji = s.emoji || '🪨';
      s.color = 'text-stone-400';
      s.borderColor = 'border-stone-400';
      s.shadowColor = 'rgba(168,162,158,0.5)';
      s.beats = 'fire';
  }

  const spell = { ...defaults, ...s, cardSet: s.cardSet || 'core' } as Spell;
  spell.description = generateDescription(spell);
  spell.shortDesc = generateShortDesc(spell);
  return spell;
};

export const SPELLS: Spell[] = [
  // ============ Core Set ============
  defineSpell({
    id: 'fire', name: '炎爆术', manaCost: 4, damage: 6, rarity: 'mythic', mechanic: 'burn', cardSet: 'core',
    artSrc: '/cards/fire-pyroblast.webp'
  }),
  defineSpell({
    id: 'vine', name: '荆棘缠绕', manaCost: 2, damage: 3, rarity: 'rare', mechanic: 'tangle', cardSet: 'core',
    artSrc: '/cards/vine-entangling.webp'
  }),
  defineSpell({
    id: 'ice', name: '暴风雪', manaCost: 3, damage: 4, rarity: 'rare', mechanic: 'freeze', cardSet: 'core',
    artSrc: '/cards/ice-frostnova.webp'
  }),
  defineSpell({
    id: 'thunder', name: '闪电箭', manaCost: 2, damage: 4, rarity: 'common', mechanic: 'charge', cardSet: 'core',
    artSrc: '/cards/thunder-chainlightning.webp'
  }),
  defineSpell({
    id: 'rock', name: '铁皮术', manaCost: 1, armorGain: 3, rarity: 'common', mechanic: 'fortify', cardSet: 'core',
    artSrc: '/cards/rock-bulwark.webp'
  }),

  // ============ Classic Set (Extension 1) ============
  defineSpell({
    id: 'fire2', name: '火球术', manaCost: 3, damage: 5, rarity: 'common', mechanic: 'burn', cardSet: 'classic',
    artSrc: '/cards/fire-fireball.webp'
  }),
  defineSpell({
    id: 'vine2', name: '纠缠根须', manaCost: 1, damage: 2, rarity: 'common', mechanic: 'tangle', cardSet: 'classic',
    artSrc: '/cards/vine-roots.webp'
  }),
  defineSpell({
    id: 'ice2', name: '霜冻新星', manaCost: 2, damage: 3, rarity: 'common', mechanic: 'freeze', cardSet: 'classic',
    artSrc: '/cards/ice-nova.webp'
  }),
  defineSpell({
    id: 'thunder2', name: '连锁闪电', manaCost: 3, damage: 3, rarity: 'rare', mechanic: 'charge', cardSet: 'classic',
    artSrc: '/cards/thunder-chain.webp'
  }),
  defineSpell({
    id: 'rock2', name: '石墙', manaCost: 2, armorGain: 7, rarity: 'rare', mechanic: 'fortify', cardSet: 'classic',
    artSrc: '/cards/rock-wall.webp'
  }),
  
  // ============ Tournament Set (Extension 2) ============
  defineSpell({
     id: 'fire3', name: '地狱爆破', manaCost: 5, damage: 8, rarity: 'mythic', mechanic: 'burn', cardSet: 'tournament',
     artSrc: '/cards/fire-inferno.webp', value: 3
  }),
  defineSpell({
     id: 'vine3', name: '荆棘鞭笞', manaCost: 3, damage: 4, rarity: 'rare', mechanic: 'tangle', cardSet: 'tournament',
     artSrc: '/cards/vine-whip.webp' 
  }),
  defineSpell({
     id: 'ice3', name: '寒冰屏障', manaCost: 4, damage: 2, armorGain: 6, rarity: 'rare', mechanic: 'freeze', cardSet: 'tournament',
     artSrc: '/cards/ice-block.webp'
  }),
  defineSpell({
     id: 'thunder3', name: '雷电风暴', manaCost: 5, damage: 6, rarity: 'mythic', mechanic: 'charge', cardSet: 'tournament',
     artSrc: '/cards/thunder-storm.webp'
  }),
  defineSpell({
     id: 'rock3', name: '大地震击', manaCost: 5, damage: 5, armorGain: 10, rarity: 'mythic', mechanic: 'fortify', cardSet: 'tournament',
     artSrc: '/cards/rock-quake.webp'
  }),

  // ============ Low Cost Fillers (C-6) ============
  defineSpell({
    id: 'fire4', name: '小火花', manaCost: 1, damage: 2, rarity: 'common', mechanic: 'burn',
    artSrc: '/cards/fire-spark.webp'
  }),
  defineSpell({
    id: 'vine4', name: '藤蔓鞭打', manaCost: 1, damage: 1, rarity: 'common', mechanic: 'tangle',
    artSrc: '/cards/vine-lash.webp'
  }),
  defineSpell({
    id: 'ice4', name: '严重冻伤', manaCost: 1, damage: 2, rarity: 'common', mechanic: 'freeze',
    artSrc: '/cards/ice-bite.webp'
  }),
  defineSpell({
    id: 'thunder4', name: '静电冲击', manaCost: 1, damage: 2, rarity: 'common', mechanic: 'charge',
    artSrc: '/cards/thunder-shock.webp'
  }),
  defineSpell({
    id: 'rock4', name: '小石子', manaCost: 1, armorGain: 2, rarity: 'common', mechanic: 'fortify',
    artSrc: '/cards/rock-pebble.webp'
  }),

  // ============ 新增低费卡牌 (Balance v2.0) ============
  // [P0 Balance] 填补费用曲线空白，增加前期选择
  
  // 0费卡牌 - 灵活过渡
  defineSpell({
    id: 'fire7', name: '余烬', manaCost: 0, damage: 1, rarity: 'common', mechanic: 'burn',
    artSrc: '/cards/fire-embers.webp', value: 1  // 0费1伤+1灼烧，弱但免费
  }),
  defineSpell({
    id: 'vine7', name: '嫩芽', manaCost: 0, damage: 0, rarity: 'common', mechanic: 'tangle',
    artSrc: '/cards/vine-sprout.webp', value: 1  // 0费纯控制
  }),
  
  // 1费卡牌 - 补充
  defineSpell({
    id: 'ice5', name: '寒霜箭', manaCost: 1, damage: 1, rarity: 'common', mechanic: 'freeze',
    artSrc: '/cards/ice-frost-bolt.webp'  // 1费1伤+冻结，快速控制
  }),
  defineSpell({
    id: 'thunder6', name: '电火花', manaCost: 1, damage: 2, rarity: 'common', mechanic: 'charge',
    artSrc: '/cards/thunder-spark.webp'  // 1费2伤，合理性价比
  }),
  defineSpell({
    id: 'rock7', name: '碎石甲', manaCost: 1, damage: 1, armorGain: 2, rarity: 'common', mechanic: 'fortify',
    artSrc: '/cards/rock-gravel-armor.webp'  // 1费攻防兼备
  }),

  // ============ Mid Cost Fillers (C-6) ============
  defineSpell({
      // New: 2 Mana Hybrid
      id: 'rock5', name: '坚岩护手', manaCost: 2, damage: 2, armorGain: 3, rarity: 'common', mechanic: 'fortify',
      artSrc: '/cards/rock-gauntlet.webp', emoji: '🪨🥊'
  }),
  defineSpell({
      // New: 4 Mana Burn
      id: 'fire5', name: '灼热射线', manaCost: 4, damage: 5, rarity: 'rare', mechanic: 'burn',
      artSrc: '/cards/fire-ray.webp', value: 2
  }),
  defineSpell({
      // New: 4 Mana Tangle
      id: 'vine5', name: '疯狂生长', manaCost: 4, damage: 4, rarity: 'rare', mechanic: 'tangle',
      artSrc: '/cards/vine-growth.webp'
  }),

  // ============ High Cost / Legendaries (Balanced v2.0) ============
  // [P0 Balance] 高费卡性价比调整
  defineSpell({
     id: 'rock6', name: '崇山峻岭', manaCost: 7, damage: 4, armorGain: 8, rarity: 'legendary', mechanic: 'fortify', cardSet: 'tournament',
     artSrc: '/cards/rock-mountain.webp', summonId: 'rock_golem'  // 费用 6→7，伤害 6→4，护甲 10→8
  }),
  defineSpell({
     id: 'fire6', name: '火焰波', manaCost: 6, damage: 7, rarity: 'legendary', mechanic: 'burn', cardSet: 'tournament',
     artSrc: '/cards/fire-wave.webp', value: 2  // 伤害 10→7，灼烧 4→2
  }),
  defineSpell({
     id: 'ice6', name: '绝对零度', manaCost: 6, damage: 6, rarity: 'legendary', mechanic: 'freeze', cardSet: 'tournament',
     artSrc: '/cards/ice-zero.webp', effectDuration: 1  // 伤害 8→6，冻结 2→1 回合
  }),
  defineSpell({
     id: 'thunder5', name: '雷神之怒', manaCost: 5, damage: 5, rarity: 'mythic', mechanic: 'charge', cardSet: 'tournament',
     artSrc: '/cards/thunder-wrath.webp'
  }),
  defineSpell({
     id: 'vine6', name: '森林之握', manaCost: 4, damage: 4, rarity: 'rare', mechanic: 'tangle', cardSet: 'tournament',
     artSrc: '/cards/vine-grasp.webp', value: 2  // 伤害 5→4，增加缠绕值
  }),


  // ============ Ultimates (Balanced v2.0) ============
  // [P0 Balance] Ultimate 卡牌整体削弱，避免一卡定胜负
  defineSpell({
    id: 'fire_ultimate', name: '末日审判', manaCost: 10, damage: 10, rarity: 'legendary', mechanic: 'burn', cardSet: 'tournament',
    artSrc: '/cards/fire-ultimate.webp', value: 3  // 伤害 15→10，灼烧 5→3
  }),
  defineSpell({
    id: 'ice_ultimate', name: '绝对终结', manaCost: 8, damage: 8, rarity: 'legendary', mechanic: 'freeze', cardSet: 'tournament',
    artSrc: '/cards/ice-ultimate.webp', effectDuration: 1  // 伤害 10→8，冻结 3→1 回合
  }),
  defineSpell({
    id: 'rock_ultimate', name: '万象天引', manaCost: 9, damage: 6, armorGain: 12, rarity: 'legendary', mechanic: 'fortify', cardSet: 'tournament',
    artSrc: '/cards/rock-ultimate.webp'  // 伤害 8→6，护甲 20→12
  }),
  defineSpell({
    id: 'thunder_ultimate', name: '雷神降临', manaCost: 8, damage: 8, rarity: 'legendary', mechanic: 'charge', cardSet: 'tournament',
    artSrc: '/cards/thunder-ultimate.webp'  // 费用 7→8，伤害 10→8
  }),
  defineSpell({
    id: 'vine_ultimate', name: '自然之怒', manaCost: 7, damage: 6, rarity: 'legendary', mechanic: 'tangle', cardSet: 'tournament',
    artSrc: '/cards/vine-ultimate.webp', value: 2  // 伤害 7→6，增加缠绕值
  }),

  // ============ Utilities ============
  defineSpell({
    id: 'healing', name: '治疗波', manaCost: 2, value: 4, damage: 0, rarity: 'rare', mechanic: 'heal', cardSet: 'tournament',
    artSrc: '/cards/healing-wave.webp', 
    beats: 'fire', color: 'text-blue-500', borderColor: 'border-blue-500', shadowColor: 'rgba(59,130,246,0.5)', emoji: '💙'
  }),
  defineSpell({
    id: 'aoe', name: '奥术爆炸', manaCost: 4, damage: 3, rarity: 'rare', mechanic: 'aoe', cardSet: 'tournament',
    artSrc: '/cards/aoe-explosion.webp',
    beats: 'vine', color: 'text-purple-500', borderColor: 'border-purple-500', shadowColor: 'rgba(147,51,234,0.5)', emoji: '💥'
  }),
  defineSpell({
    id: 'draw', name: '奥术智慧', manaCost: 3, damage: 0, value: 2, rarity: 'rare', mechanic: 'draw', cardSet: 'tournament',
    artSrc: '/cards/draw-intellect.webp',
    beats: 'silence', color: 'text-indigo-500', borderColor: 'border-indigo-500', shadowColor: 'rgba(99,102,241,0.5)', emoji: '📚'
  }),
  defineSpell({
    id: 'silence', name: '沉默', manaCost: 1, damage: 0, rarity: 'common', mechanic: 'silence', cardSet: 'tournament',
    artSrc: '/cards/silence.webp',
    beats: 'healing', color: 'text-gray-500', borderColor: 'border-gray-500', shadowColor: 'rgba(107,114,128,0.5)', emoji: '🤫'
  }),

  // ============ Hero Skills ============
  defineSpell({
     id: 'hero_fire', name: '火焰精通', manaCost: 2, damage: 2, rarity: 'mythic', mechanic: 'burn', cardSet: 'legacy',
     artSrc: '/cards/hero-fire-mastery.webp', description: '造成2点伤害。如果获胜，下回合对手额外受到1点燃烧伤害。'
  }),
  defineSpell({
     id: 'hero_vine', name: '自然呼唤', manaCost: 2, armorGain: 0, value: 2, rarity: 'rare', mechanic: 'draw', cardSet: 'classic',
     artSrc: '/cards/hero-vine-call.webp', description: '抽2张牌。' 
  }),
  defineSpell({
     id: 'hero_ice', name: '冰霜护盾', manaCost: 2, armorGain: 2, rarity: 'mythic', mechanic: 'freeze', cardSet: 'legacy',
     artSrc: '/cards/hero-ice-shield.webp'
  }),
  defineSpell({
     id: 'hero_thunder', name: '风暴涌动', manaCost: 2, damage: 1, rarity: 'mythic', mechanic: 'charge', cardSet: 'legacy',
     artSrc: '/cards/hero-thunder-surge.webp'
  }),
  defineSpell({
     id: 'hero_rock', name: '大地之力', manaCost: 2, armorGain: 5, rarity: 'mythic', mechanic: 'fortify', cardSet: 'legacy',
     artSrc: '/cards/hero-rock-earthquake.webp'
  }),
  
  // ============ Skip ============
  { 
    id: 'skip', 
    name: '跳过回合', 
    emoji: '🏳️', 
    artSrc: '/cards/skip-turn.webp', 
    color: 'text-gray-400', 
    borderColor: 'border-gray-400',
    shadowColor: 'rgba(156,163,175,0.5)',
    beats: 'skip' as SpellType,
    manaCost: 0, 
    damage: 0, 
    rarity: 'common',
    mechanic: 'skip',
    description: '跳过本回合。',
    shortDesc: '跳过'
  },
];

export const STANDARD_SETS: CardSet[] = ['core', 'classic', 'tournament'];
export const WILD_SETS: CardSet[] = ['core', 'classic', 'tournament', 'legacy'];

export const PRESET_DECKS: { name: string; cards: SpellType[]; description: string; style: 'aggro' | 'control' | 'combo' }[] = [
  {
    name: '烈焰咆哮',
    style: 'aggro',
    description: '极致进攻，利用火焰的高额伤害和持久灼烧快速终结对手。',
    cards: [
      'fire', 'fire', 
      'fire2', 'fire2', 
      'fire4', 'fire4', 
      'fire5', 'fire5',
      'fire7', 'fire7',
      'aoe', 'aoe', 
      'draw', 'draw', 
      'thunder', 'thunder', 
      'thunder4', 'thunder4',
      'rock', 'rock' 
    ]
  },
  {
    name: '严寒禁区',
    style: 'control',
    description: '缜密防守，通过冰冻限制对手行动，并在防守中寻找反击机会。',
    cards: [
      'ice', 'ice', 
      'ice2', 'ice2', 
      'ice3', 'ice3',
      'ice4', 'ice4',
      'rock3', 'rock3', 
      'rock2', 'rock2', 
      'healing', 'healing', 
      'vine2', 'vine2', 
      'draw', 'draw' ,
      'rock', 'rock'
    ]
  },
  {
    name: '雷霆万钧',
    style: 'combo',
    description: '资源掌控，利用雷电连击和藤蔓控费，掌握战斗节奏。',
    cards: [
      'thunder', 'thunder', 
      'thunder2', 'thunder2', 
      'thunder4', 'thunder4',
      'thunder6', 'thunder6',
      'vine', 'vine', 
      'vine2', 'vine2', 
      'vine4', 'vine4',
      'draw', 'draw', 
      'ice4', 'ice4',
      'rock', 'rock'
    ]
  }
];

export const ALL_SPELLS = SPELLS.reduce((acc, spell) => {
  acc[spell.id] = spell;
  return acc;
}, {} as Record<string, Spell>);

export const getElementColors = (element: SpellType) => {
  const spell = SPELLS.find(s => s.id === element);
  return {
    text: spell?.color || 'text-white',
    border: spell?.borderColor || 'border-white',
    shadow: spell?.shadowColor || 'rgba(255,255,255,0.5)',
  };
};

export const getMechanicName = (mechanic: string): string => {
  const names: Record<string, string> = {
    burn: '灼烧',
    tangle: '缠绕',
    freeze: '冻结',
    charge: '充能',
    fortify: '坚韧',
    skip: '跳过',
    heal: '治疗',
    aoe: 'AOE',
    draw: '抽牌',
    silence: '沉默',
  };
  return names[mechanic] || mechanic;
};
