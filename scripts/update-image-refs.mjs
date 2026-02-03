/**
 * 更新代码中的图片引用 - 将 .png/.jpg 替换为 .webp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// 需要处理的文件
const FILES_TO_UPDATE = [
  'hooks/usePreloader.ts',
  'components/BattleArena.tsx',
  'components/PlayerFrame.tsx',
  'components/Lobby.tsx',
  'components/SpellCard.tsx',
];

// 替换规则
const REPLACEMENTS = [
  // 背景图
  [/(['"`])\/battle-bg\.jpg(['"`])/g, "$1/battle-bg.webp$2"],
  [/(['"`])\/lobby-bg\.jpg(['"`])/g, "$1/lobby-bg.webp$2"],
  
  // 头像
  [/(['"`])\/avatars\/([^'"`)]+)\.png(['"`])/g, "$1/avatars/$2.webp$3"],
  
  // 卡牌
  [/(['"`])\/cards\/([^'"`)]+)\.png(['"`])/g, "$1/cards/$2.webp$3"],
  
  // 特效
  [/(['"`])\/effects\/([^'"`)]+)\.png(['"`])/g, "$1/effects/$2.webp$3"],
  
  // 图标
  [/(['"`])\/icons\/([^'"`)]+)\.png(['"`])/g, "$1/icons/$2.webp$3"],
  
  // UI
  [/(['"`])\/ui\/([^'"`)]+)\.png(['"`])/g, "$1/ui/$2.webp$3"],
];

function updateFile(filePath) {
  const fullPath = path.join(rootDir, filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ 文件不存在: ${filePath}`);
    return 0;
  }
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  let replacementCount = 0;
  
  for (const [pattern, replacement] of REPLACEMENTS) {
    const matches = content.match(pattern);
    if (matches) {
      replacementCount += matches.length;
      content = content.replace(pattern, replacement);
    }
  }
  
  if (replacementCount > 0) {
    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(`✅ ${filePath}: 替换了 ${replacementCount} 处引用`);
  } else {
    console.log(`⏭️  ${filePath}: 无需修改`);
  }
  
  return replacementCount;
}

function main() {
  console.log('🔄 更新图片引用：.png/.jpg → .webp');
  console.log('═'.repeat(50));
  
  let totalReplacements = 0;
  
  for (const file of FILES_TO_UPDATE) {
    totalReplacements += updateFile(file);
  }
  
  console.log('═'.repeat(50));
  console.log(`📊 完成！共替换 ${totalReplacements} 处引用`);
}

main();
