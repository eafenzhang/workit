import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.addInitScript(() => {
  try { localStorage.setItem('workit_profile', JSON.stringify({ role: 'Developer', nickname: 'User' })); } catch {}
});
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(3000);

// Remove overlay and wizard
await page.evaluate(() => {
  document.querySelectorAll('vite-plugin-checker-error-overlay').forEach(el => el.remove());
  document.querySelectorAll('.fixed.inset-0').forEach(el => {
    if (el.querySelector('.animate-spin') || el.textContent.includes('跳过') || el.textContent.includes('开始')) {
      el.remove();
    }
  });
});
await page.waitForTimeout(500);

const targets = [
  { name: '01-home', label: '首页' },
  { name: '02-settings', label: '系统设置' },
  { name: '03-model', label: '模型配置' },
  { name: '04-messages', label: '消息中心' },
  { name: '05-requirements', label: '采集库' },
  { name: '06-knowledge', label: '知识库' },
  { name: '07-insights', label: '洞察分析' },
  { name: '08-mcp', label: '应用生态' },
  { name: '09-channels', label: 'IM渠道' },
  { name: '10-agents', label: 'Agent管理' },
  { name: '11-workflows', label: '定时任务' },
  { name: '12-assistants', label: 'AI助手' },
  { name: '13-team', label: '团队协作' },
];

for (const t of targets) {
  await page.evaluate((label) => {
    const btns = document.querySelectorAll('aside button');
    for (const b of btns) {
      if (b.textContent.includes(label)) {
        b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        break;
      }
    }
  }, t.label);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `previews/${t.name}.png`, fullPage: false });
  console.log(`✓ ${t.name}.png (${t.label})`);
}

await browser.close();
console.log('All done!');
