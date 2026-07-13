import { describe, expect, it } from "vitest";
import { isProductVisible, isSolutionVersionVisible } from "./publication-policy.js";

const now = new Date("2026-07-12T00:00:00.000Z");

describe("publication policy", () => {
  it("只展示已到发布时间的上架产品", () => {
    expect(isProductVisible({ status: "PUBLISHED", publishedAt: now }, now)).toBe(true);
    expect(isProductVisible({ status: "DRAFT", publishedAt: now }, now)).toBe(false);
  });

  it("排除失效方案版本", () => {
    expect(
      isSolutionVersionVisible(
        { status: "PUBLISHED", effectiveAt: null, expiresAt: new Date("2026-07-11T00:00:00.000Z") },
        now
      )
    ).toBe(false);
  });
});
