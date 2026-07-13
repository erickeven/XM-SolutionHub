import { describe, expect, it } from "vitest";
import { decideResourceAccess, type AccessSubject } from "./access-policy.js";

const anonymous: AccessSubject = {
  type: "ANONYMOUS",
  authenticated: false,
  organizationIds: [],
  projectIds: [],
  ndaIds: []
};

describe("decideResourceAccess", () => {
  it("匿名用户只能预览公开资料前三页", () => {
    expect(
      decideResourceAccess(anonymous, { level: "PUBLIC", publicDownloadAllowed: false }, "PREVIEW")
    ).toMatchObject({ allowed: true, previewPageLimit: 3 });
  });

  it("匿名用户不能下载未开放下载的公开资料", () => {
    expect(
      decideResourceAccess(anonymous, { level: "PUBLIC", publicDownloadAllowed: false }, "DOWNLOAD")
    ).toMatchObject({ allowed: false, reason: "PUBLIC_DOWNLOAD_DISABLED" });
  });

  it("项目资料必须匹配项目授权", () => {
    const customer: AccessSubject = {
      type: "CUSTOMER",
      authenticated: true,
      organizationIds: [],
      projectIds: ["project-a"],
      ndaIds: []
    };
    expect(
      decideResourceAccess(
        customer,
        { level: "PROJECT", projectId: "project-b", publicDownloadAllowed: false },
        "PREVIEW"
      ).allowed
    ).toBe(false);
  });

  it("系统管理员覆盖受限资源时要求 break-glass", () => {
    const administrator: AccessSubject = {
      type: "SYSTEM_ADMIN",
      authenticated: true,
      organizationIds: [],
      projectIds: [],
      ndaIds: []
    };
    expect(
      decideResourceAccess(administrator, { level: "NDA", publicDownloadAllowed: false }, "OVERRIDE")
    ).toMatchObject({ allowed: true, requiresBreakGlass: true });
  });
});
