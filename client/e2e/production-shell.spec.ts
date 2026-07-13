import { expect, test } from "@playwright/test";

test("外部发现首屏提供四个匿名入口并保持可访问", async ({ page }) => {
  const consoleProblems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      consoleProblems.push(`${message.type()}: ${message.text()}`);
    }
  });

  await page.goto("/");

  await expect(page).toHaveTitle("芯茂微 Design-in 工程平台");
  await expect(page.getByRole("heading", { name: "从应用条件进入产品证据链" })).toBeVisible();
  for (const entry of ["找型号", "找方案", "找资料", "快速选型"]) {
    await expect(page.getByRole("button", { name: new RegExp(entry) })).toBeVisible();
  }
  await expect(page.getByText("公开资料可预览前三页")).toBeVisible();

  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBe(dimensions.clientWidth);

  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "跳到主要内容" })).toBeFocused();
  expect(consoleProblems).toEqual([]);
});
