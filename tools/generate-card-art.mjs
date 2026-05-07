import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const CARD_WIDTH = 256;
const CARD_HEIGHT = 360;

const ELEMENT_CONFIGS = {
  fire: { gradient: ['#dc2626', '#f97316', '#fbbf24'], icon: '\u{1F525}', bgPattern: 'flames' },
  vine: { gradient: ['#16a34a', '#65a30d', '#a3e635'], icon: '\u{1F33F}', bgPattern: 'leaves' },
  ice: { gradient: ['#0891b2', '#22d3ee', '#67e8f9'], icon: '\u{2744}\u{FE0F}', bgPattern: 'snowflake' },
  thunder: { gradient: ['#ca8a04', '#eab308', '#fde047'], icon: '\u{26A1}', bgPattern: 'lightning' },
  rock: { gradient: ['#78716c', '#a8a29e', '#d6d3d1'], icon: '\u{1FAA8}', bgPattern: 'stones' },
  neutral: { gradient: ['#6366f1', '#818cf8', '#a5b4fc'], icon: '\u{2728}', bgPattern: 'arcane' },
  dual: { gradient: ['#7c3aed', '#a78bfa', '#c4b5fd'], icon: '\u{1F52E}', bgPattern: 'dual' },
};

function getElement(id) {
  if (id.startsWith('dual')) return 'dual';
  if (id.startsWith('fire')) return 'fire';
  if (id.startsWith('vine')) return 'vine';
  if (id.startsWith('ice')) return 'ice';
  if (id.startsWith('thunder')) return 'thunder';
  if (id.startsWith('rock')) return 'rock';
  return 'neutral';
}

function generateCardSVG(id, name) {
  const element = getElement(id);
  const config = ELEMENT_CONFIGS[element];
  const [c1, c2, c3] = config.gradient;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${c1}" stop-opacity="0.9"/>
      <stop offset="50%" stop-color="${c2}" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="${c3}" stop-opacity="0.5"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="${c2}" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="${c1}" stop-opacity="0"/>
    </radialGradient>
    <filter id="shadow">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${c1}" flood-opacity="0.5"/>
    </filter>
  </defs>
  <!-- Background -->
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="12" fill="url(#bg)"/>
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="12" fill="url(#glow)"/>
  <!-- Border -->
  <rect x="2" y="2" width="${CARD_WIDTH - 4}" height="${CARD_HEIGHT - 4}" rx="10" fill="none" stroke="${c2}" stroke-width="2" stroke-opacity="0.6"/>
  <!-- Top decorative bar -->
  <rect x="10" y="10" width="${CARD_WIDTH - 20}" height="3" rx="1.5" fill="${c3}" opacity="0.8"/>
  <!-- Center icon area -->
  <circle cx="${CARD_WIDTH / 2}" cy="140" r="60" fill="${c1}" opacity="0.3" filter="url(#shadow)"/>
  <text x="${CARD_WIDTH / 2}" y="155" text-anchor="middle" font-size="60">${config.icon}</text>
  <!-- Card name -->
  <rect x="20" y="260" width="${CARD_WIDTH - 40}" height="32" rx="6" fill="black" fill-opacity="0.5"/>
  <text x="${CARD_WIDTH / 2}" y="282" text-anchor="middle" font-size="14" font-weight="bold" fill="white" font-family="sans-serif">${name}</text>
  <!-- ID watermark -->
  <text x="${CARD_WIDTH / 2}" y="340" text-anchor="middle" font-size="10" fill="white" fill-opacity="0.3" font-family="monospace">${id}</text>
</svg>`;
}

// Cards to generate
const cards = [
  // Fire
  { id: 'fire20', name: '火之吐息' },
  { id: 'fire21', name: '烈焰之心' },
  { id: 'fire22', name: '凤凰守卫' },
  { id: 'fire23', name: '陨石坠落' },
  { id: 'fire24', name: '焚天之焰' },
  // Vine
  { id: 'vine20', name: '荆棘之皮' },
  { id: 'vine21', name: '自然恩赐' },
  { id: 'vine22', name: '远古树人' },
  { id: 'vine23', name: '万藤缠绕' },
  { id: 'vine24', name: '永恒之树' },
  // Ice
  { id: 'ice18', name: '冰甲术' },
  { id: 'ice19', name: '冰锥穿刺' },
  { id: 'ice20', name: '冰晶龙' },
  { id: 'ice21', name: '寒冰风暴' },
  { id: 'ice22', name: '冰封王座' },
  // Thunder
  { id: 'thunder18', name: '雷击' },
  { id: 'thunder19', name: '连锁雷击' },
  { id: 'thunder20', name: '雷凤凰' },
  { id: 'thunder21', name: '雷霆万钧' },
  { id: 'thunder22', name: '神罚雷霆' },
  // Rock
  { id: 'rock19', name: '石化皮肤' },
  { id: 'rock20', name: '巨石投掷' },
  { id: 'rock21', name: '大地泰坦' },
  { id: 'rock22', name: '山崩地裂' },
  { id: 'rock23', name: '不灭磐石' },
  // Neutral
  { id: 'neutral6', name: '法力涌流' },
  { id: 'neutral7', name: '生命涌泉' },
  { id: 'neutral8', name: '奥术增幅' },
  { id: 'neutral9', name: '命运之轮' },
  { id: 'neutral10', name: '万灵药剂' },
  // Dual
  { id: 'dual_fire_vine', name: '焦土重生' },
  { id: 'dual_ice_rock', name: '冰岩壁垒' },
];

const outputDir = join(process.cwd(), 'public', 'cards');
if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

let generated = 0;
for (const card of cards) {
  const svg = generateCardSVG(card.id, card.name);
  const filePath = join(outputDir, `${card.id}.webp.svg`);
  writeFileSync(filePath, svg, 'utf-8');
  generated++;
}

console.log(`Generated ${generated} card art SVGs in ${outputDir}`);
