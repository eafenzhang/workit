const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'previews');
fs.mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'sidebar', desc: '侧边栏总览（展开所有菜单项）' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  for (const p of PAGES) {
    try {
      await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(3000);

      // Screenshot full page
      await page.screenshot({ path: path.join(OUT, `${p.name}.png`), fullPage: false });
      console.log(`✓ ${p.name}.png`);
    } catch (err) {
      console.error(`✗ ${p.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log('Done. Files in:', OUT);
}

main().catch(console.error);
