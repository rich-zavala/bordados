import sharp from 'sharp';
import { readFileSync } from 'fs';

const svg = readFileSync('src/assets/icon.svg');
const sizes = [16, 32, 48, 192, 512];

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`src/assets/icon-${size}.png`);
  console.log(`Generated icon-${size}.png`);
}

await sharp(svg).resize(32, 32).png().toFile('src/favicon.ico');
console.log('Generated favicon.ico');
