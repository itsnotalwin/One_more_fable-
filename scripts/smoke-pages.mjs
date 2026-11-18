import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const failures = [];

page.on('pageerror', error => failures.push(`PAGE ERROR: ${error.stack || error.message}`));
page.on('console', message => {
  if (message.type() === 'error') failures.push(`CONSOLE ERROR: ${message.text()}`);
});
page.on('requestfailed', request => {
  failures.push(`REQUEST FAILED: ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`);
});

try {
  const response = await page.goto('http://127.0.0.1:4173/One_more_fable-/', {
    waitUntil: 'domcontentloaded',
    timeout: 30000,
  });
  if (!response?.ok()) failures.push(`PAGE RESPONSE: ${response?.status() ?? 'no response'}`);

  await page.waitForTimeout(2500);

  const stageExists = await page.locator('#stage').count();
  const canvasExists = await page.locator('#game').count();
  const gateVisible = await page.locator('#introGate').isVisible().catch(() => false);
  const titleVisible = await page.locator('#screenTitle').isVisible().catch(() => false);

  if (!stageExists || !canvasExists) failures.push('React game shell did not mount (#stage or #game missing).');
  if (!gateVisible && !titleVisible) failures.push('Neither the opening gate nor the title screen became visible.');

  if (failures.length) {
    await page.screenshot({ path: 'one-more-smoke-failure.png', fullPage: true }).catch(() => {});
    throw new Error(`ONE MORE browser smoke test failed:\\n${failures.join('\\n')}\\nURL: ${page.url()}`);
  }

  console.log('ONE MORE browser smoke test passed: React mounted, game canvas exists, and the opening/title screen is visible.');
} finally {
  await browser.close();
}
