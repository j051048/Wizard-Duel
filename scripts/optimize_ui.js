import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PUBLIC_PATH = path.resolve(__dirname, '../public');
const UI_PATH = path.join(PUBLIC_PATH, 'ui');

async function optimizeImages() {
  const files = fs.readdirSync(UI_PATH);
  
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      const inputPath = path.join(UI_PATH, file);
      const outputName = path.basename(file, ext) + '.webp';
      const outputPath = path.join(UI_PATH, outputName);
      
      console.log(`Optimizing: ${file} -> ${outputName}`);
      
      try {
        await sharp(inputPath)
          .webp({ quality: 80, effort: 6 })
          .toFile(outputPath);
          
        const oldSize = fs.statSync(inputPath).size;
        const newSize = fs.statSync(outputPath).size;
        const reduction = ((oldSize - newSize) / oldSize * 100).toFixed(2);
        
        console.log(`  Done! Size: ${oldSize} -> ${newSize} (${reduction}% reduction)`);
      } catch (err) {
        console.error(`  Error optimizing ${file}:`, err);
      }
    }
  }
}

optimizeImages();
