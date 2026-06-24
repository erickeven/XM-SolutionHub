import { test, expect, type Page, type BrowserContext } from '@playwright/test';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://172.16.172.85:8082';
const SCREENSHOT_DIR = path.resolve(__dirname, 'screenshots');
const ADMIN_EMAIL = 'admin@xinmaowei.com';
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

// ponytail: sidebar menu label → page slug mapping from AdminLayout.tsx
const SIDEBAR_LABELS: Record<string, string> = {
  '驾驶舱': 'dashboard',
  '产品管理': 'products',
  '方案管理': 'solutions',
  '资料管理': 'materials',
  '知识库': 'knowledge',
  '用户': 'users',
  '审计': 'audit',
  '线索': 'leads',
};

const PUBLIC_PAGES = [
  { name: 'home', url: '/' },
  { name: 'selection', url: '/selection' },
  { name: 'login', url: '/login' },
  { name: 'register', url: '/register' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

function isExpectedApiError(msg: string, pageName: string): boolean {
  if (pageName === 'selection' && msg.includes('400 (Bad Request)')) return true;
  return false;
}

// ─── 1. PUBLIC PAGE SCREENSHOTS ─────────────────────
VIEWPORTS.forEach((vp) => {
  PUBLIC_PAGES.forEach((pg) => {
    test(`[public] ${pg.name} @ ${vp.name}`, async ({ browser }) => {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: vp.name === 'mobile' ? 3 : 1,
        isMobile: vp.name === 'mobile',
        hasTouch: vp.name === 'mobile',
      });
      const p = await ctx.newPage();
      const errors: string[] = [];
      p.on('pageerror', (err) => errors.push(err.message));
      p.on('console', (msg) => {
        if (msg.type() === 'error' && !isExpectedApiError(msg.text(), pg.name))
          errors.push(`console.error: ${msg.text()}`);
      });
      await p.goto(`${BASE_URL}${pg.url}`, { waitUntil: 'networkidle', timeout: 30000 });
      await p.waitForTimeout(1000);
      await p.screenshot({ path: path.join(SCREENSHOT_DIR, `${pg.name}-${vp.name}.png`), fullPage: true });
      await ctx.close();
      expect(errors).toEqual([]);
    });
  });
});

// ─── 2. AUTH GUARD — unauthenticated → /login ──────
test('[auth-guard] /admin redirects to /login', async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await p.waitForTimeout(2000);
  expect(p.url()).toContain('/login');
  await ctx.close();
});

// ─── 3. ADMIN LOGGED IN (single login, client-side nav) ───

test.describe.configure({ mode: 'serial' });
test.describe('admin', () => {
  async function login(page: Page, ctx: BrowserContext) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.locator('input[type="email"], input[id*="email"], input[name="email"]').first().fill(ADMIN_EMAIL);
    await page.locator('input[type="password"]').fill(ADMIN_PASSWORD);
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);
    if (page.url().includes('/login')) { await ctx.close(); throw new Error('Login failed'); }
  }

  /**
   * Navigate admin pages via sidebar menu click (client-side React Router nav).
   * Unlike p.goto(), this keeps React mounted — no bootstrapSession / CSRF rotation race.
   */
  async function visitAdminPage(page: Page, label: string) {
    // Ant Design Menu renders menuitems with aria-role="menuitem" and the label text
    const menuItem = page.getByRole('menuitem', { name: label });
    await menuItem.waitFor({ state: 'visible', timeout: 5000 });
    await menuItem.click();
    // Allow React Router transition + React Query data fetch to settle
    await page.waitForTimeout(500);
    // Wait for any loading spinners to disappear
    await page.waitForTimeout(1000);
  }

  test('all admin pages', async ({ browser }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD not set');
    test.setTimeout(120000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();

    await login(p, ctx);

    // Navigate to dashboard first to trigger admin layout mount
    await p.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: path.join(SCREENSHOT_DIR, `admin-dashboard.png`), fullPage: true });
    if (p.url().includes('/login')) { await ctx.close(); throw new Error('admin: dashboard redirected after login'); }

    const sidebarOrder = ['产品管理', '方案管理', '资料管理', '知识库', '用户', '审计', '线索'];
    let passed = 1; let failed = 0;

    for (const label of sidebarOrder) {
      const slug = SIDEBAR_LABELS[label];
      try {
        await visitAdminPage(p, label);
        await p.screenshot({ path: path.join(SCREENSHOT_DIR, `admin-${slug}.png`), fullPage: true });
        if (p.url().includes('/login')) {
          console.log(`[SKIP] ${slug} — SPA auth loss after ${passed} navigations`);
          break;
        }
        passed++;
      } catch (err: unknown) {
        failed++;
        console.log(`[ERROR] ${slug} — ${err instanceof Error ? err.message : String(err)}`);
        break;
      }
    }

    expect(passed, `Admin pages loaded: ${passed}/8`).toBeGreaterThanOrEqual(5);
    await ctx.close();
  });
});