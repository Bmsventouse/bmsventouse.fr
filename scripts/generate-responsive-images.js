/**
 * Generate responsive, optimized images (WebP + JPG) for hero and key visuals.
 * - Input: images/hero-background-custom.jpg
 * - Output: WebP and JPG variants at multiple widths.
 */
const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true }).catch(() => {});
}

async function generateVariants(inputPath, baseOutName, widths, formats = ['webp', 'jpg']) {
  const extless = baseOutName;

  const outDir = path.dirname(inputPath);
  await ensureDir(outDir);

  for (const w of widths) {
    for (const fmt of formats) {
      const outFile = path.join(outDir, `${extless}-${w}.${fmt}`);
      const pipeline = sharp(inputPath)
        .resize({
          width: w,
          withoutEnlargement: true,
          fit: 'cover',
          position: 'center',
        });

      if (fmt === 'webp') {
        await pipeline
          .webp({ quality: 82 })
          .toFile(outFile);
      } else if (fmt === 'jpg') {
        await pipeline
          .jpeg({ quality: 82, mozjpeg: true })
          .toFile(outFile);
      }
      console.log(`Generated ${outFile} (${w}px, ${fmt})`);
    }
  }

  // Also create a moderately compressed original format copy if needed
  const originalWebp = path.join(outDir, `${extless}.webp`);
  if (path.resolve(inputPath) !== path.resolve(originalWebp)) {
    await sharp(inputPath).webp({ quality: 82 }).toFile(originalWebp);
    console.log(`Generated ${originalWebp}`);
  }
}

async function generateIcons() {
  // Base logo used for all favicons / PWA icons / apple-touch
  const projectRoot = path.join(__dirname, '..');
  const baseIcon = path.join(projectRoot, 'android-chrome-192x192.png');

  try {
    await fs.access(baseIcon);
  } catch {
    console.warn(`[icons] Base icon not found at ${baseIcon}, skipping favicon generation.`);
    return;
  }

  const iconDefs = [
    { out: 'favicon-16x16.png', size: 16 },
    { out: 'favicon-32x32.png', size: 32 },
    { out: 'apple-touch-icon.png', size: 180 },
    { out: 'android-chrome-192x192.png', size: 192 },
    { out: 'android-chrome-512x512.png', size: 512 },
    { out: 'android-chrome-192x192.webp', size: 192 },
  ];

  await Promise.all(
    iconDefs.map(async ({ out, size }) => {
      const outPath = path.join(projectRoot, out);

      // Évite le cas interdit par sharp : même fichier en entrée et en sortie.
      // Pour android-chrome-192x192.png, on considère que le fichier de base
      // dans le dépôt est déjà la bonne version et on ne le régénère pas.
      if (outPath === baseIcon) {
        console.log(`[icons] Skipping ${out} (base icon already present).`);
        return;
      }

      await sharp(baseIcon)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .toFormat(out.endsWith('.webp') ? 'webp' : 'png', { quality: 90 })
        .toFile(outPath);
      console.log(`[icons] Generated ${out} (${size}x${size})`);
    })
  );
}

async function main() {
  const imagesDir = path.join(__dirname, '..', 'images');
  // The repository retains the original WebP; support a future JPG without requiring it.
  let heroJpg = path.join(imagesDir, 'hero-background-custom.jpg');
  try { await fs.access(heroJpg); } catch (_) {
    heroJpg = path.join(imagesDir, 'hero-background-custom.webp');
  }

  // Variants widths tuned for mobile-first LCP improvements
  const widths = [640, 960, 1280, 1920];

  try {
    await fs.access(heroJpg);
    await generateVariants(heroJpg, 'hero-background-custom', widths, ['webp', 'jpg']);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      console.warn(`[images] Base hero image not found at ${heroJpg}, skipping responsive image generation.`);
    } else {
      throw err;
    }
  }

  await generateIcons();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});