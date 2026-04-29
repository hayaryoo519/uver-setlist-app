// Generate PNG icons from SVG using sharp
import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const svgPath = path.join(__dirname, 'public', 'icons', 'icon.svg');

async function generateIcons() {
    try {
        await sharp(svgPath)
            .resize(192, 192)
            .png()
            .toFile(path.join(__dirname, 'public', 'icons', 'icon-192x192.png'));
        console.log('Created icon-192x192.png');

        await sharp(svgPath)
            .resize(512, 512)
            .png()
            .toFile(path.join(__dirname, 'public', 'icons', 'icon-512x512.png'));
        console.log('Created icon-512x512.png');

        console.log('Done!');
    } catch (err) {
        console.error('Error:', err);
    }
}

generateIcons();
