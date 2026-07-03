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
  '产品字段': 'product-fields',
  '方案管理': 'solutions',
  '资料管理': 'materials',
  '资料字段': 'material-fields',
  '知识库': 'knowledge',
  '线索': 'leads',
  '用户': 'users',
  '角色权限': 'roles',
  '审计': 'audit',
  'AI及模型': 'ai-settings',
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
  void msg;
  void pageName;
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
    const menuItem = page.getByRole('menuitem', { name: label });
    await menuItem.waitFor({ state: 'visible', timeout: 5000 });
    await menuItem.click();
    await page.waitForTimeout(1000);
  }

  test('all admin pages (12/12)', async ({ browser }) => {
    test.skip(!ADMIN_PASSWORD, 'E2E_ADMIN_PASSWORD not set');
    test.setTimeout(180000);
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const p = await ctx.newPage();
    const consoleErrors: string[] = [];
    p.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    await login(p, ctx);

    // Navigate to dashboard first to trigger admin layout mount
    await p.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(2000);
    await p.screenshot({ path: path.join(SCREENSHOT_DIR, 'admin-dashboard.png'), fullPage: true });
    expect(p.url(), 'Dashboard must not redirect to /login after login').not.toContain('/login');

    // Dashboard plus all sidebar pages in AdminLayout order
    const sidebarOrder = [
      '产品管理', '产品字段', '方案管理',
      '资料管理', '资料字段', '知识库',
      '线索', '用户', '角色权限', '审计', 'AI及模型',
    ];
    let passed = 1;

    for (const label of sidebarOrder) {
      const slug = SIDEBAR_LABELS[label];
      await visitAdminPage(p, label);
      await p.screenshot({ path: path.join(SCREENSHOT_DIR, `admin-${slug}.png`), fullPage: true });
      expect(
        p.url(),
        `${label} (${slug}) must not redirect to /login (passed=${passed}/12)`,
      ).not.toContain('/login');
      passed++;
    }

    expect(passed, `Admin pages loaded: ${passed}/12`).toBe(12);
    expect(consoleErrors, 'No unexpected console errors').toEqual([]);
    await ctx.close();
  });
});
