const fs = require('fs');
const path = require('path');

// Destination directory (relative to project root)
const destDir = path.join(__dirname, '..', 'public', 'images', 'branding');
fs.mkdirSync(destDir, { recursive: true });

// Source directory where PNGs are stored in the brain folder
const srcBase = path.resolve('C:/Users/mlisb/.gemini/antigravity-ide/brain/b42848ce-171b-4625-afe5-002992787931');

for (let i = 1; i <= 4; i++) {
  const src = path.join(srcBase, `branding_page_${i}.png`);
  const dest = path.join(destDir, `branding_page_${i}.png`);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log(`Copied ${src} -> ${dest}`);
  } else {
    console.warn(`Source file not found: ${src}`);
  }
}

console.log('Branding assets setup complete.');
