const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'previews');
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(3000);

  // Sidebar buttons that open pages (text content of buttons)
  const pages = [
    { name: '01-home', button: '首页' },
    { name: '02-settings', button: '系统设置' },
    { name: '03-model', button: '模型配置' },
    { name: '04-messages', button: '消息中心' },
    { name: '05-requirements', button: '采集库' },
    { name: '06-knowledge', button: '知识库' },
    { name: '07-insights', button: '洞察分析' },
    { name: '08-mcp', button: '应用生态' },
    { name: '09-channels', button: 'IM渠道' },
    { name: '10-agents', button: 'Agent管理' },
    { name: '11-workflows', button: '定时任务' },
    { name: '12-assistants', button: 'AI助手' },
    { name: '13-team', button: '团队协作' },
  ];

  for (const p of pages) {
    try {
      // Click the sidebar button
      const btn = page.locator('aside button', { hasText: p.button });
      if (await btn.count() > 0) {
        await btn.first().click();
        await page.waitForTimeout(2000);
        await page.screenshot({ path: path.join(OUT, `${p.name}.png`), fullPage: false });
        console.log(`✓ ${p.name}.png (${p.button})`);
      } else {
        console.log(`✗ Button not found: ${p.button}`);
        // Still take screenshot to show current state
        await page.screenshot({ path: path.join(OUT, `${p.name}-error.png`), fullPage: false });
      }
    } catch (err) {
      console.error(`✗ ${p.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\nDone! ${pages.length} screenshots in:`, OUT);
}

main().catch(console.error);
