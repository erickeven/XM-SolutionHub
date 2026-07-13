import { describe, expect, it, vi } from "vitest";
import type { PimRepository } from "./pim.repository.js";
import { PimService } from "./pim.service.js";

describe("PimService", () => {
  it("搜索时裁剪用户输入", async () => {
    const searchPublishedProducts = vi.fn().mockResolvedValue([]);
    const repository: PimRepository = {
      searchPublishedProducts,
      findPublishedProductByCode: vi.fn().mockResolvedValue(null)
    };
    const service = new PimService(repository);
    await service.search("  XMW  ", 20);
    expect(searchPublishedProducts).toHaveBeenCalledWith("XMW", 20);
  });

  it("未发布产品对外表现为不存在", async () => {
    const repository: PimRepository = {
      searchPublishedProducts: vi.fn().mockResolvedValue([]),
      findPublishedProductByCode: vi.fn().mockResolvedValue(null)
    };
    await expect(new PimService(repository).getProduct("DRAFT-1")).rejects.toMatchObject({ status: 404 });
  });
});
