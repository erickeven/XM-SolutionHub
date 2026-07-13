import { describe, expect, it, vi } from "vitest";
import type { ContentConfigRepository } from "./content-config.repository.js";
import { ContentConfigService } from "./content-config.service.js";

function repository(overrides: Partial<ContentConfigRepository> = {}): ContentConfigRepository {
  return {
    list: vi.fn().mockResolvedValue([]),
    nextVersion: vi.fn().mockResolvedValue(2),
    createDraft: vi.fn().mockResolvedValue({
      id: "config-2",
      version: 2,
      status: "DRAFT",
      payload: {},
      changeSummary: "change",
      publishedAt: null,
      createdAt: new Date()
    }),
    publish: vi.fn().mockResolvedValue(null),
    findByVersion: vi.fn().mockResolvedValue(null),
    ...overrides
  };
}

describe("ContentConfigService", () => {
  it("创建递增的配置草稿", async () => {
    const createDraft = vi.fn().mockResolvedValue({ id: "config-2", version: 2 });
    const service = new ContentConfigService(repository({ createDraft }));
    await service.createDraft({ navigation: [] }, "调整导航", "admin-1");
    expect(createDraft).toHaveBeenCalledWith(expect.objectContaining({ version: 2, createdById: "admin-1" }));
  });

  it("不可发布状态返回冲突", async () => {
    const service = new ContentConfigService(repository());
    await expect(
      service.publish(3, "admin-1", {
        reason: "紧急配置修复原因",
        sourceIp: "127.0.0.1",
        notificationTargets: ["owner@example.com"],
        recoveryPoint: "config-v2"
      }, "trace-1")
    ).rejects.toMatchObject({ status: 409 });
  });
});
