import { describe, expect, it, vi } from "vitest";
import type { ProjectSupportRepository } from "./project-support.repository.js";
import { ProjectSupportService } from "./project-support.service.js";

function repository(): ProjectSupportRepository {
  return {
    workspace: vi.fn().mockResolvedValue({ organizations: [], projects: [], tickets: [], sampleRequests: [], rfqRequests: [] }),
    createOrganization: vi.fn(),
    createProject: vi.fn().mockResolvedValue(null),
    createTicket: vi.fn().mockResolvedValue(null),
    createSampleRequest: vi.fn().mockResolvedValue(null),
    createRfqRequest: vi.fn().mockResolvedValue(null)
  };
}

describe("ProjectSupportService", () => {
  it("非企业管理者不能创建正式项目", async () => {
    await expect(
      new ProjectSupportService(repository()).createProject(
        "00000000-0000-4000-8000-000000000001",
        "新电源项目",
        "subject-1",
        { sourceIp: "127.0.0.1", traceId: "trace-1" }
      )
    ).rejects.toMatchObject({ status: 403 });
  });

  it("不能为未授权项目创建支持工单", async () => {
    await expect(
      new ProjectSupportService(repository()).createTicket(
        "00000000-0000-4000-8000-000000000001",
        "需要选型支持",
        "请协助核对工作条件和候选器件",
        "subject-1",
        { sourceIp: "127.0.0.1", traceId: "trace-1" }
      )
    ).rejects.toMatchObject({ status: 403 });
  });
});
