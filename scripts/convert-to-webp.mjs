/**
 * 图片批量转换脚本 - PNG/JPG → WebP
 * 
 * 用法: node scripts/convert-to-webp.mjs
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, '..', 'public');

// 配置
const CONFIG = {
  // 图片质量 (0-100)
  jpgQuality: 80,
  pngQuality: 80,
  webpQuality: 75,
  
  // 最大尺寸 (超过则缩放)
  maxWidth: 1920,
  maxHeight: 1080,
  
  // 卡牌和图标的目标尺寸
  cardSize: 512,
  iconSize: 128,
  avatarSize: 256,
};

// 需要处理的目录
const DIRS_TO_PROCESS = [
  { path: '', recursive: false }, // public 根目录
  { path: 'avatars', resize: CONFIG.avatarSize },
  { path: 'cards', resize: CONFIG.cardSize },
  { path: 'effects', resize: CONFIG.iconSize * 2 },
  { path: 'icons', resize: CONFIG.iconSize },
  { path: 'ui', resize: CONFIG.cardSize },
];

async function convertImage(inputPath, outputPath, options = {}) {
  const ext = path.extname(inputPath).toLowerCase();
  
  try {
    let pipeline = sharp(inputPath);
    
    // 获取图片信息
    const metadata = await pipeline.metadata();
    
    // 如果需要缩放
    if (options.resize && (metadata.width > options.resize || metadata.height > options.resize)) {
      pipeline = pipeline.resize(options.resize, options.resize, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }
    
    // 转换为 WebP
    await pipeline
      .webp({ quality: CONFIG.webpQuality })
      .toFile(outputPath);
    
    // 计算压缩比
    const inputSize = fs.statSync(inputPath).size;
    const outputSize = fs.statSync(outputPath).size;
    const ratio = ((1 - outputSize / inputSize) * 100).toFixed(1);
    
    console.log(`✅ ${path.basename(inputPath)} → ${path.basename(outputPath)}`);
    console.log(`   ${(inputSize / 1024 / 1024).toFixed(2)} MB → ${(outputSize / 1024 / 1024).toFixed(2)} MB (${ratio}% 压缩)`);
    
    return { inputSize, outputSize };
  } catch (error) {
    console.error(`❌ 转换失败: ${inputPath}`);
    console.error(`   ${error.message}`);
    return null;
  }
}

async function processDirectory(dirConfig) {
  const dirPath = path.join(publicDir, dirConfig.path);
  
  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️ 目录不存在: ${dirPath}`);
    return { totalInput: 0, totalOutput: 0, count: 0 };
  }
  
  const files = fs.readdirSync(dirPath);
  const imageFiles = files.filter(f => 
    /\.(png|jpg|jpeg)$/i.test(f) && !f.includes('.webp')
  );
  
  if (imageFiles.length === 0) {
    return { totalInput: 0, totalOutput: 0, count: 0 };
  }
  
  console.log(`\n📂 处理目录: ${dirConfig.path || 'public/'}`);
  console.log('─'.repeat(50));
  
  let totalInput = 0;
  let totalOutput = 0;
  let count = 0;
  
  for (const file of imageFiles) {
    const inputPath = path.join(dirPath, file);
    
    // 规范化文件名: 小写, 空格变横杠
    let normalizedName = file.replace(/\.(png|jpg|jpeg)$/i, '');
    normalizedName = normalizedName.toLowerCase().trim().split(/\s+/).join('-');
    
    const outputName = `${normalizedName}.webp`;
    const outputPath = path.join(dirPath, outputName);
    
    const result = await convertImage(inputPath, outputPath, {
      resize: dirConfig.resize,
      // 如果目标文件已存在且是同名转换，这其实没问题，因为 outputName 变了
    });
    
    if (result) {
      totalInput += result.inputSize;
      totalOutput += result.outputSize;
      count++;
    }
  }
  
  return { totalInput, totalOutput, count };
}

async function main() {
  console.log('🖼️  Wizard Duel 图片优化工具');
  console.log('═'.repeat(50));
  console.log(`📁 处理目录: ${publicDir}`);
  console.log(`🎯 WebP 质量: ${CONFIG.webpQuality}%`);
  
  let grandTotalInput = 0;
  let grandTotalOutput = 0;
  let grandTotalCount = 0;
  
  for (const dirConfig of DIRS_TO_PROCESS) {
    const { totalInput, totalOutput, count } = await processDirectory(dirConfig);
    grandTotalInput += totalInput;
    grandTotalOutput += totalOutput;
    grandTotalCount += count;
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('📊 优化完成！');
  console.log(`   处理文件: ${grandTotalCount} 个`);
  console.log(`   原始大小: ${(grandTotalInput / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   压缩后:   ${(grandTotalOutput / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   节省空间: ${((1 - grandTotalOutput / grandTotalInput) * 100).toFixed(1)}%`);
  console.log('\n⚠️  请更新代码中的图片引用：.png/.jpg → .webp');
}

main().catch(console.error);
