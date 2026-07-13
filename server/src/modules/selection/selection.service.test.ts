import { describe, expect, it, vi } from "vitest";
import { SelectionService } from "./selection.service.js";
import type { SelectionRepository } from "./selection.types.js";

describe("SelectionService", () => {
  it("去重并清理选型条件", async () => {
    const findPublishedCandidates = vi.fn().mockResolvedValue([]);
    const repository: SelectionRepository = { findPublishedCandidates };
    await new SelectionService(repository).match("  充电器 ", ["高压", "高压"], 8);
    expect(findPublishedCandidates).toHaveBeenCalledWith(["充电器", "高压"], 8);
  });

  it("空条件不查询产品", async () => {
    const findPublishedCandidates = vi.fn().mockResolvedValue([]);
    const repository: SelectionRepository = { findPublishedCandidates };
    await expect(new SelectionService(repository).match(" ", [], 8)).resolves.toEqual([]);
    expect(findPublishedCandidates).not.toHaveBeenCalled();
  });
});
