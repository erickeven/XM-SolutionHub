import { test, expect, type Page } from '@playwright/test';

/**
 * Mobile-specific tests for selection card layout at 390x844 (iPhone 12/13).
 * Verifies: no horizontal scroll, filter panel (drawer) works, compare bar works.
 *
 * These tests run only in the "mobile" project (390x844 viewport).
 */

const MOBILE_WIDTH = 390;

async function assertNoHorizontalScroll(page: Page): Promise<void> {
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(
    scrollWidth,
    `Horizontal overflow on mobile: scrollWidth=${scrollWidth} > ${MOBILE_WIDTH}`,
  ).toBeLessThanOrEqual(MOBILE_WIDTH + 2);
}

test.describe('Selection card — mobile (390x844)', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'Mobile-only interaction suite');
    // Ensure we're at mobile viewport
    await page.setViewportSize({ width: MOBILE_WIDTH, height: 844 });
  });

  test('selection page has no horizontal scroll on mobile', async ({ page }) => {
    await page.goto('/selection');
    await page.waitForLoadState('networkidle').catch(() => {});
    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: 'screenshots/mobile-selection-page.png',
      fullPage: false,
    });
  });

  test('filter panel opens via drawer on mobile', async ({ page }) => {
    await page.goto('/selection');
    await page.waitForLoadState('networkidle').catch(() => {});

    // On mobile, the left sidebar is hidden (md:block) and a filter button appears
    // The filter button has text "筛选" and is visible on mobile
    const filterButton = page.getByRole('button', { name: /筛选/ }).first();
    await expect(filterButton).toBeVisible({ timeout: 10_000 });

    // Click to open the drawer
    await filterButton.click();
    // Drawer title "筛选条件" should appear
    const drawer = page.getByRole('dialog', { name: '筛选条件' });
    const drawerTitle = drawer.getByText('筛选条件', { exact: true });
    await expect(drawerTitle).toBeVisible({ timeout: 5_000 });

    // Verify filter panel content is visible inside drawer
    const electricalParamsLabel = drawer.getByText('电气参数', { exact: true });
    await expect(electricalParamsLabel).toBeVisible({ timeout: 5_000 });

    await page.screenshot({
      path: 'screenshots/mobile-filter-drawer-open.png',
      fullPage: false,
    });
  });

  test('filter panel has input fields for electrical parameters', async ({ page }) => {
    await page.goto('/selection');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Open filter drawer
    const filterButton = page.getByRole('button', { name: /筛选/ }).first();
    await filterButton.click();
    await page.waitForTimeout(1000);

    // Check that InputNumber fields exist for voltage/current
    const inputLabels = page.locator('label:has-text("输入电压下限"), label:has-text("输入电压上限"), label:has-text("输出电压"), label:has-text("输出电流")');
    const count = await inputLabels.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('filter panel has application type select', async ({ page }) => {
    await page.goto('/selection');
    await page.waitForLoadState('networkidle').catch(() => {});

    const filterButton = page.getByRole('button', { name: /筛选/ }).first();
    await filterButton.click();
    await page.waitForTimeout(1000);

    // Application type section
    const drawer = page.getByRole('dialog', { name: '筛选条件' });
    const appTypeLabel = drawer.getByText('应用类型', { exact: true });
    await expect(appTypeLabel).toBeVisible({ timeout: 5_000 });
  });

  test('filter panel has reset button', async ({ page }) => {
    await page.goto('/selection');
    await page.waitForLoadState('networkidle').catch(() => {});

    const filterButton = page.getByRole('button', { name: /筛选/ }).first();
    await filterButton.click();
    await page.waitForTimeout(1000);

    // Reset button with "重置" text
    const resetButton = page.getByRole('button', { name: /重置/ });
    await expect(resetButton).toBeVisible({ timeout: 5_000 });
  });

  test('filter panel has submit button', async ({ page }) => {
    await page.goto('/selection');
    await page.waitForLoadState('networkidle').catch(() => {});

    const filterButton = page.getByRole('button', { name: /筛选/ }).first();
    await filterButton.click();
    await page.waitForTimeout(1000);

    // Submit button "开始选型"
    const submitButton = page.getByRole('button', { name: /开始选型/ });
    await expect(submitButton).toBeVisible({ timeout: 5_000 });
  });

  test('compare bar is not visible when no items selected', async ({ page }) => {
    await page.goto('/selection');
    await page.waitForLoadState('networkidle').catch(() => {});

    // CompareBar returns null when items.length === 0
    // The "已选对比" text should not be present
    const compareBar = page.getByText(/已选对比/);
    await expect(compareBar).not.toBeVisible();
  });

  test('home page selection cards render without horizontal scroll', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});

    // Scroll to popular products section
    const popularHeading = page.getByText('推荐型号');
    if (await popularHeading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await popularHeading.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    }

    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: 'screenshots/mobile-home-page.png',
      fullPage: false,
    });
  });

  test('home page quick selection form renders without overflow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});

    // The quick selection card should be visible
    const quickSelectTitle = page.getByText('快速选型');
    await expect(quickSelectTitle).toBeVisible({ timeout: 10_000 });

    await assertNoHorizontalScroll(page);
    await page.screenshot({
      path: 'screenshots/mobile-quick-select.png',
      fullPage: false,
    });
  });

  test('mobile hamburger menu opens navigation drawer', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle').catch(() => {});

    // The hamburger button is in the header (md:hidden)
    // It contains a MenuOutlined icon — find by the button in header
    const header = page.locator('header');
    const hamburger = header.locator('button:visible').first();
    await hamburger.click();
    await page.waitForTimeout(500);

    // Drawer with title "导航" should appear
    const navDrawer = page.getByText('导航');
    await expect(navDrawer).toBeVisible({ timeout: 5_000 });

    // Navigation items should be visible
    const navItems = page.getByRole('link', { name: /首页|选型|方案资料|AI问答/ });
    const count = await navItems.count();
    expect(count).toBeGreaterThanOrEqual(3);

    await page.screenshot({
      path: 'screenshots/mobile-nav-drawer.png',
      fullPage: false,
    });
  });
});
