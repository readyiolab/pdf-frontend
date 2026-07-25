const fs = require('fs');
const path = require('path');

const src = 'C:\\Users\\SURYA\\.gemini\\antigravity-ide\\brain\\47c6c6a7-c198-479a-9b40-a973ab5c254c\\hero_nitro_clean_1784786320619.png';
const dest = path.join(__dirname, 'public', 'images', 'hero_nitro.png');

try {
  fs.copyFileSync(src, dest);
  console.log('Successfully copied hero_nitro.png');
} catch (e) {
  console.error(e);
}
