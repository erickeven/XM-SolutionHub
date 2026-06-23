import { test, expect, type Page } from '@playwright/test';

/**
 * Responsive visual verification — no horizontal scroll at 3 viewports.
 * Pages: /, /selection, /login, /register, /ai-chat, /admin/leads, /admin/knowledge, /profile
 *
 * Auth-protected pages (/admin/*, /profile, /ai-chat) will redirect to /login
 * or show a 403 Result — both are valid outcomes. We only assert no horizontal
 * overflow, not the specific page content.
 */

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/selection', name: 'selection' },
  { path: '/login', name: 'login' },
  { path: '/register', name: 'register' },
  { path: '/ai-chat', name: 'ai-chat' },
  { path: '/admin/leads', name: 'admin-leads' },
  { path: '/admin/knowledge', name: 'admin-knowledge' },
  { path: '/profile', name: 'profile' },
] as const;

/**
 * Asserts no horizontal scrollbar: document.body.scrollWidth must not exceed
 * the viewport width. A small tolerance (2px) accounts for sub-pixel rounding.
 */
async function assertNoHorizontalScroll(page: Page, viewportWidth: number): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(
    scrollWidth,
    `Horizontal overflow: scrollWidth=${scrollWidth} > viewportWidth=${viewportWidth}`,
  ).toBeLessThanOrEqual(viewportWidth + 2);
}

test.describe('Responsive — no horizontal scroll', () => {
  for (const { path, name } of PAGES) {
    test(`${name} (${path}) has no horizontal scroll`, async ({ page }, testInfo) => {
      await page.goto(path);
      // Wait for network idle or redirect to settle
      await page.waitForLoadState('networkidle').catch(() => {
        // networkidle may timeout if long-polling; page is likely ready
      });

      const viewportWidth = testInfo.project.use.viewport?.width ?? 1280;
      await assertNoHorizontalScroll(page, viewportWidth);

      // Screenshot for visual regression
      const screenshotPath = `screenshots/${testInfo.project.name}-${name}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
    });
  }
});