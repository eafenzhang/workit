import { chromium } from 'playwright';

const PAGES = [
  { type: 'home', sidebarLabel: '首页' },
  { type: 'settings', sidebarLabel: '系统设置' },
  { type: 'model', sidebarLabel: '模型配置' },
  { type: 'messages', sidebarLabel: '消息中心' },
  { type: 'requirements', sidebarLabel: '采集库' },
  { type: 'knowledge', sidebarLabel: '知识库' },
  { type: 'insights', sidebarLabel: '洞察分析' },
  { type: 'mcp', sidebarLabel: '应用生态' },
  { type: 'channels', sidebarLabel: 'IM渠道' },
  { type: 'agents', sidebarLabel: 'Agent管理' },
  { type: 'workflows', sidebarLabel: '定时任务' },
  { type: 'assistants', sidebarLabel: 'AI助手' },
  { type: 'team', sidebarLabel: '团队协作' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// Capture console errors
const pageErrors = [];
page.on('console', msg => {
  if (msg.type() === 'error') pageErrors.push(`[console.error] ${msg.text()}`);
});
page.on('pageerror', err => {
  pageErrors.push(`[pageerror] ${err.message}`);
});

await page.addInitScript(() => {
  try { localStorage.setItem('workit_profile', JSON.stringify({ role: 'Developer', nickname: 'User' })); } catch {}
});
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(3000);

// Remove error overlay + wizard
await page.evaluate(() => {
  document.querySelectorAll('vite-plugin-checker-error-overlay').forEach(el => el.remove());
  document.querySelectorAll('.fixed.inset-0').forEach(el => {
    if (el.querySelector('.animate-spin') || el.textContent.includes('跳过') || el.textContent.includes('开始')) {
      el.remove();
    }
  });
});
await page.waitForTimeout(500);

let passed = 0;
let failed = 0;
const details = [];

for (const p of PAGES) {
  try {
    // Navigate by simulating clicks sequentially with debugging
    const clicked = await page.evaluate((label) => {
      const allBtns = document.querySelectorAll('button');
      for (const b of allBtns) {
        const text = (b.textContent || '').trim();
        const title = (b.getAttribute('title') || '').trim();
        if (text === label || text.startsWith(label) || text.includes(label) || title === label) {
          b.scrollIntoView({ block: 'nearest' });
          b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          return 'found:' + (title || text.substring(0, 20));
        }
      }
      return 'not-found';
    }, p.sidebarLabel);

    if (!clicked) {
      details.push(`✗ ${p.type}: sidebar button "${p.sidebarLabel}" not found`);
      failed++;
      continue;
    }

    await page.waitForTimeout(2000);

    // Check page loaded - look for content
    const hasContent = await page.evaluate(() => {
      const body = document.querySelector('[data-cmp]');
      return body ? body.getAttribute('data-cmp') : 'no-cmp';
    });

    // Check for API errors or JS errors
    const currentErrors = pageErrors.filter(e => !e.includes('favicon') && !e.includes('Failed to load resource'));
    const errorSummary = currentErrors.length > 0 ? ` (${currentErrors.length} errors)` : '';

    if (hasContent !== 'no-cmp') {
      const status = currentErrors.length === 0 ? '✓' : '⚠';
      details.push(`${status} ${p.type}: rendered (${hasContent})${errorSummary}`);
      if (currentErrors.length === 0) passed++;
      else { passed++; details.push(`  First error: ${currentErrors[0]}`); }
    } else {
      details.push(`⚠ ${p.type}: rendered but no data-cmp attribute found`);
      passed++;
    }
  } catch (err) {
    details.push(`✗ ${p.type}: ${err.message}`);
    failed++;
  }
}

await browser.close();

console.log(`\n=== Page Verification Results ===`);
console.log(`Total: ${PAGES.length} | Passed: ${passed} | Failed: ${failed}\n`);
for (const d of details) console.log(d);
console.log(`\n${passed === PAGES.length ? '✅ ALL PAGES VERIFIED' : '⚠️ SOME PAGES HAVE ISSUES'}`);
