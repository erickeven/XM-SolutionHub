import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import App from "./App.js";

afterEach(() => vi.restoreAllMocks());

describe("App", () => {
  it("首屏直接展示四个任务入口", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /找型号/u })).toBeVisible();
    expect(screen.getByRole("button", { name: /找方案/u })).toBeVisible();
    expect(screen.getByRole("button", { name: /找资料/u })).toBeVisible();
    expect(screen.getByRole("button", { name: /快速选型/u })).toBeVisible();
  });

  it("空数据库展示明确空状态", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ code: 0, message: "OK", data: [] }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: /执行检索/u }));
    expect(await screen.findByText("没有符合条件的已发布记录")).toBeVisible();
  });

  it("客户协作界面不向匿名用户泄露内容", () => {
    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "客户协作" }));
    expect(screen.getByText("需要有效身份")).toBeVisible();
  });
});
