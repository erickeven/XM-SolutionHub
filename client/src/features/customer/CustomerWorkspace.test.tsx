import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CustomerWorkspace } from "./CustomerWorkspace.js";

const emptyWorkspace = {
  organizations: [],
  projects: [],
  tickets: [],
  sampleRequests: [],
  rfqRequests: []
};

function success(data: unknown): Response {
  return new Response(JSON.stringify({ code: 0, message: "OK", data }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("CustomerWorkspace", () => {
  it("异步提交无项目工单后安全重置表单并刷新列表", async () => {
    let workspaceReads = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation((input: RequestInfo | URL) => {
      const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
      if (url.endsWith("/workspace")) {
        workspaceReads += 1;
        return Promise.resolve(success(workspaceReads === 1 ? emptyWorkspace : {
          ...emptyWorkspace,
          tickets: [{ ticketCode: "SUP-1", title: "通用选型咨询", status: "OPEN", updatedAt: new Date().toISOString() }]
        }));
      }
      return Promise.resolve(success({ ticketCode: "SUP-1", status: "OPEN" }));
    });
    render(
      <CustomerWorkspace
        accessToken="access-token"
        subject={{ id: "subject-1", email: "customer@example.com", displayName: "验证客户", type: "CUSTOMER" }}
      />
    );
    fireEvent.change(await screen.findByRole("textbox", { name: "问题标题" }), { target: { value: "通用选型咨询" } });
    fireEvent.change(screen.getByRole("textbox", { name: "问题描述" }), {
      target: { value: "请协助核对工作条件和可订货料号" }
    });
    fireEvent.click(screen.getByRole("button", { name: "提交支持工单" }));
    expect(await screen.findByText(/SUP-1/u)).toBeVisible();
    expect(screen.queryByText(/Cannot read properties/u)).not.toBeInTheDocument();
  });
});
