/**
 * Manual image recompression script (run with `npm run optimize:images`).
 * Intentionally NOT executed during the automated Cloudflare Pages build.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');
const MIN_BYTES_TO_OPTIMIZE = 100 * 1024; // 100 KB
const DEFAULT_MAX_WIDTH = 1600;
const HERO_MAX_WIDTH = 1920;

async function collectImages(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectImages(fullPath)));
    } else if (/\.(jpe?g|png)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

async function optimizeFile(filePath) {
  const stat = await fs.stat(filePath);
  if (stat.size < MIN_BYTES_TO_OPTIMIZE) {
    return { status: 'skipped-small', before: stat.size, after: stat.size };
  }

  const inputBuffer = await fs.readFile(filePath);
  const fileName = path.basename(filePath);
  const ext = path.extname(fileName).toLowerCase();
  const maxWidth = /hero/i.test(fileName) ? HERO_MAX_WIDTH : DEFAULT_MAX_WIDTH;

  const pipeline = sharp(inputBuffer)
    .rotate()
    .resize({ width: maxWidth, withoutEnlargement: true });

  const outputBuffer =
    ext === '.png'
      ? await pipeline.png({ compressionLevel: 9, palette: true, quality: 80 }).toBuffer()
      : await pipeline.jpeg({ quality: 75, mozjpeg: true }).toBuffer();

  if (outputBuffer.length >= stat.size) {
    return { status: 'skipped-larger', before: stat.size, after: stat.size };
  }

  await fs.writeFile(filePath, outputBuffer);
  return { status: 'optimized', before: stat.size, after: outputBuffer.length };
}

async function main() {
  const files = await collectImages(PUBLIC_DIR);
  let optimizedCount = 0;
  let savedBytes = 0;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const result = await optimizeFile(filePath);
    if (result.status === 'optimized') {
      optimizedCount += 1;
      const saved = result.before - result.after;
      savedBytes += saved;
      console.log(
        `[optimize:images] ${relPath}: ${(result.before / 1024).toFixed(1)} KB -> ${(
          result.after / 1024
        ).toFixed(1)} KB (-${((saved / result.before) * 100).toFixed(1)}%)`
      );
    }
  }

  console.log(
    `[optimize:images] Checked ${files.length} image(s), optimized ${optimizedCount}, saved ${(
      savedBytes / 1024
    ).toFixed(1)} KB total.`
  );
}

main().catch((err) => {
  console.error('[optimize:images] Failed:', err);
  process.exit(1);
});
