import { describe, expect, it, vi } from "vitest";
import type { SupplyQualityRepository } from "./supply-quality.repository.js";
import { SupplyQualityService } from "./supply-quality.service.js";

function repository(): SupplyQualityRepository {
  return {
    workbench: vi.fn().mockResolvedValue({ roles: [], supportTickets: [], sampleRequests: [], rfqRequests: [], qualityEvents: [], verificationTasks: [] }),
    assignSupportTicket: vi.fn().mockResolvedValue(null),
    resolveSupportTicket: vi.fn().mockResolvedValue(null)
  };
}

describe("SupplyQualityService", () => {
  it("无职责角色不能认领 FAE 工单", async () => {
    await expect(new SupplyQualityService(repository()).assign("SUP-1", "employee-1", false)).rejects.toMatchObject({ status: 403 });
  });

  it("未分配人员不能无痕结案", async () => {
    await expect(new SupplyQualityService(repository()).resolve({
      ticketCode: "SUP-1",
      subjectId: "employee-1",
      administrator: false,
      conclusion: { result: "not-authorized" },
      sourceIp: "127.0.0.1",
      traceId: "trace-1"
    })).rejects.toMatchObject({ status: 403 });
  });
});
