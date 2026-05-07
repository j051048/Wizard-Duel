import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.resolve(repoRoot, 'dist');

if (path.basename(distDir) !== 'dist' || !distDir.startsWith(repoRoot + path.sep)) {
  throw new Error(`Refusing to clean unexpected build directory: ${distDir}`);
}

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });
