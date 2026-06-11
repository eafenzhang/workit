const { chromium } = require('playwright');
const path = require('path');

const PAGES = [
  { name: '01-home', url: 'http://localhost:5173/' },
];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  for (const p of PAGES) {
    try {
      await page.goto(p.url, { waitUntil: 'networkidle', timeout: 15000 });
      await page.waitForTimeout(2000);
      const filePath = path.join(__dirname, `preview-${p.name}.png`);
      await page.screenshot({ path: filePath, fullPage: false });
      console.log(`Screenshot saved: preview-${p.name}.png`);
    } catch (err) {
      console.error(`Failed to capture ${p.name}: ${err.message}`);
    }
  }

  await browser.close();
}

main().catch(console.error);
