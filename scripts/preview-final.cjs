const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.join(__dirname, '..', 'previews');
fs.mkdirSync(OUT, { recursive: true });

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    // Store profile so wizard doesn't show
    storageState: undefined,
  });
  const page = await context.newPage();

  // Set localStorage to skip the profile wizard
  await page.addInitScript(() => {
    // Mock profile data so wizard auto-closes
    try { localStorage.setItem('workit_profile', JSON.stringify({ role: 'Developer', nickname: 'User' })); } catch {}
    try { localStorage.setItem('quick_collect_enabled', 'false'); } catch {}
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(4000);

  // Wait for wizard to auto-dismiss
  await page.evaluate(() => {
    // Click anywhere outside wizard to dismiss if needed
    document.querySelectorAll('button').forEach(b => {
      if (b.textContent?.includes('跳过') || b.textContent?.includes('开始使用')) {
        b.click();
      }
    });
  });
  await page.waitForTimeout(1000);

  // Dismiss the vite-plugin-checker overlay
  await page.evaluate(() => {
    const overlay = document.querySelector('vite-plugin-checker-error-overlay');
    if (overlay && overlay.parentElement) {
      overlay.parentElement.removeChild(overlay);
    }
  });

  // Pages to capture - use direct JS tab switching
  const pages = [
    { name: '01-home', type: 'home' },
    { name: '02-settings', type: 'settings' },
    { name: '03-model', type: 'model' },
    { name: '04-messages', type: 'messages' },
    { name: '05-requirements', type: 'requirements' },
    { name: '06-knowledge', type: 'knowledge' },
    { name: '07-insights', type: 'insights' },
    { name: '08-mcp', type: 'mcp' },
    { name: '09-channels', type: 'channels' },
    { name: '10-agents', type: 'agents' },
    { name: '11-workflows', type: 'workflows' },
    { name: '12-assistants', type: 'assistants' },
    { name: '13-team', type: 'team' },
  ];

  for (const p of pages) {
    try {
      // Navigate by clicking sidebar button - using force to bypass overlays
      const selector = `button[title="${p.type === 'mcp' ? '应用生态' : p.type === 'channels' ? 'IM渠道' : p.type === 'agents' ? 'Agent管理' : p.type === 'workflows' ? '定时任务' : p.type === 'assistants' ? 'AI助手' : p.type === 'team' ? '团队协作' : ''}"]`;

      if (selector !== 'button[title=""]') {
        const btn = page.locator(selector);
        if (await btn.count() > 0) {
          await btn.first().click({ force: true, timeout: 5000 });
          await page.waitForTimeout(2000);
        }
      } else {
        // Use navItems with known labels
        const labels = ['首页','系统设置','模型配置','消息中心','采集库','知识库','洞察分析','应用生态','IM渠道','Agent管理','定时任务','AI助手','团队协作'];
        const idx = pages.indexOf(p);
        const label = labels[idx];
        if (label) {
          const btn = page.locator('aside button').filter({ hasText: label }).first();
          await btn.click({ force: true, timeout: 5000 });
          await page.waitForTimeout(2000);
        }
      }

      // Remove any overlays before capture
      await page.evaluate(() => {
        const overlay = document.querySelector('vite-plugin-checker-error-overlay');
        if (overlay && overlay.parentElement) overlay.parentElement.removeChild(overlay);
        const modal = document.querySelector('.fixed.inset-0');
        if (modal) modal.remove();
      });

      await page.screenshot({ path: path.join(OUT, `${p.name}.png`), fullPage: false });
      console.log(`✓ ${p.name}.png`);
    } catch (err) {
      console.error(`✗ ${p.name}: ${err.message}`);
      // Still take a screenshot of the current state
      await page.screenshot({ path: path.join(OUT, `${p.name}-error.png`), fullPage: false }).catch(() => {});
    }
  }

  await browser.close();
  console.log(`\nDone!`);
}

main().catch(console.error);
