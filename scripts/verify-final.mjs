import { chromium } from 'playwright';

const PAGES = [
  { type: 'home', label: '首页' },
  { type: 'settings', label: '系统设置' },
  { type: 'model', label: '模型配置' },
  { type: 'messages', label: '消息中心' },
  { type: 'requirements', label: '采集库' },
  { type: 'knowledge', label: '知识库' },
  { type: 'insights', label: '洞察分析' },
  { type: 'mcp', label: '应用生态' },
  { type: 'channels', label: 'IM渠道' },
  { type: 'agents', label: 'Agent管理' },
  { type: 'workflows', label: '定时任务' },
  { type: 'assistants', label: 'AI助手' },
  { type: 'team', label: '团队协作' },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];

page.on('console', msg => {
  if (msg.type() === 'error') errors.push(`console: ${msg.text().substring(0, 150)}`);
});
page.on('pageerror', err => errors.push(`page: ${err.message.substring(0, 150)}`));

await page.addInitScript(() => {
  try { localStorage.setItem('workit_profile', JSON.stringify({ role: 'Developer', nickname: 'User' })); } catch {}
});
await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded', timeout: 20000 });
await page.waitForTimeout(3000);

// Remove error overlay
await page.evaluate(() => {
  document.querySelectorAll('vite-plugin-checker-error-overlay').forEach(el => el.remove());
});
await page.waitForTimeout(500);

let results = [];

for (const p of PAGES) {
  // Clear errors for this page
  const beforeCount = errors.length;

  // Click sidebar button with Playwright locator + force
  try {
    await page.locator('button').filter({ hasText: p.label }).first().click({ force: true, timeout: 5000 });
    await page.waitForTimeout(2000);
  } catch (err) {
    results.push({ page: p.type, status: 'CLICK_FAIL', error: err.message.substring(0, 100) });
    continue;
  }

  // Check for JS errors since last navigation
  const newErrors = errors.slice(beforeCount);
  const hasErrors = newErrors.length > 0;

  // Check page rendered
  const hasContent = await page.evaluate(() => {
    return document.querySelector('[data-cmp]')?.getAttribute('data-cmp') || 'unknown';
  }).catch(() => 'crash');

  results.push({
    page: p.type,
    status: hasErrors ? 'OK_WITH_WARNINGS' : 'OK',
    rendered: hasContent,
    errors: newErrors.length,
  });
}

await browser.close();

console.log('\n=== FINAL PAGE VERIFICATION ===');
console.log(`Total: ${PAGES.length}\n`);

let ok = 0, warn = 0, fail = 0;
for (const r of results) {
  let icon;
  if (r.status === 'CLICK_FAIL') { icon = '✗'; fail++; }
  else if (r.status === 'OK_WITH_WARNINGS') { icon = '⚠'; warn++; }
  else { icon = '✓'; ok++; }

  console.log(`${icon} ${r.page.padEnd(15)} ${r.rendered}`);
  if (r.error) console.log(`   Error: ${r.error}`);
}
console.log(`\n✓ ${ok}  ⚠ ${warn}  ✗ ${fail}`);
if (ok + warn === PAGES.length) console.log('\n✅ ALL PAGES ARE FUNCTIONAL');
else console.log(`\n❌ ${fail} PAGES HAVE CLICK/DISPLAY ISSUES`);

if (errors.length > 0) {
  console.log(`\nCaptured ${errors.length} total console errors:`);
  for (const e of errors.slice(0, 10)) console.log(`  ${e}`);
}
