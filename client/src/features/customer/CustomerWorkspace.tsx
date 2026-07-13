import { useEffect, useState } from "react";
import { customerApi, type CustomerWorkspaceData, type SessionSubject } from "../../api/client.js";
import { StatePanel } from "../../components/StatePanel.js";

export function CustomerWorkspace({ accessToken, subject }: { readonly accessToken: string; readonly subject: SessionSubject }) {
  const [data, setData] = useState<CustomerWorkspaceData | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState("");

  async function load(): Promise<void> {
    setStatus("loading");
    try {
      setData(await customerApi.workspace(accessToken));
      setStatus("ready");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "工作台读取失败");
      setStatus("error");
    }
  }

  useEffect(() => {
    let active = true;
    void customerApi.workspace(accessToken).then((workspace) => {
      if (!active) return;
      setData(workspace);
      setStatus("ready");
    }).catch((cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : "工作台读取失败");
      setStatus("error");
    });
    return () => { active = false; };
  }, [accessToken]);

  async function createOrganization(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const value = new FormData(formElement).get("organizationName");
    if (typeof value !== "string") return;
    try {
      await customerApi.createOrganization(value, accessToken);
      formElement.reset();
      await load();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "企业创建失败");
      setStatus("error");
    }
  }

  async function createProject(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const organizationId = form.get("organizationId");
    const name = form.get("projectName");
    if (typeof organizationId !== "string" || typeof name !== "string") return;
    try {
      await customerApi.createProject(organizationId, name, accessToken);
      formElement.reset();
      await load();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "项目创建失败");
      setStatus("error");
    }
  }

  async function createTicket(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const projectId = form.get("projectId");
    const title = form.get("title");
    const description = form.get("description");
    if (typeof title !== "string" || typeof description !== "string") return;
    try {
      await customerApi.createTicket({ projectId: typeof projectId === "string" && projectId !== "" ? projectId : null, title, description }, accessToken);
      formElement.reset();
      await load();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "支持工单提交失败");
      setStatus("error");
    }
  }

  async function createOrderRequest(event: React.FormEvent<HTMLFormElement>, kind: "sample" | "rfq"): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const projectId = form.get("projectId");
    const orderCode = form.get("orderCode");
    const quantityText = form.get("quantity");
    if (typeof projectId !== "string" || typeof orderCode !== "string" || typeof quantityText !== "string") return;
    const quantity = Number(quantityText);
    try {
      if (kind === "sample") await customerApi.createSampleRequest({ projectId, orderCode, quantity }, accessToken);
      else await customerApi.createRfqRequest({ projectId, orderCode, quantity }, accessToken);
      formElement.reset();
      await load();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : `${kind === "sample" ? "样品" : "RFQ"}申请失败`);
      setStatus("error");
    }
  }

  return (
    <div className="customer-workspace">
      <header><div><p className="eyebrow">CUSTOMER WORKSPACE</p><h1>{subject.displayName} 的工程工作台</h1></div><span>{subject.email}</span></header>
      {status === "loading" ? <StatePanel state="loading" /> : null}
      {status === "error" ? <StatePanel state="error" detail={error} /> : null}
      {status === "ready" && data !== null ? (
        <div className="workspace-grid">
          <section><h2>企业协作 <span>{data.organizations.length}</span></h2>{data.organizations.length === 0 ? <StatePanel state="empty" detail="你仍是注册个人；仅在确有协作需要时创建企业。" /> : <ul>{data.organizations.map((organization) => <li key={organization.id}><strong>{organization.name}</strong><small>{organization.orgCode} · {organization.customerRole}</small></li>)}</ul>}<form onSubmit={(event) => void createOrganization(event)}><input name="organizationName" aria-label="企业名称" placeholder="企业名称" minLength={2} required /><button type="submit">创建企业</button></form></section>
          <section><h2>正式项目 <span>{data.projects.length}</span></h2>{data.projects.length === 0 ? <StatePanel state="empty" detail="没有正式项目，不影响继续找型号、方案和资料。" /> : <ul>{data.projects.map((project) => <li key={project.id}><strong>{project.name}</strong><small>{project.projectCode} · {project.stage}</small></li>)}</ul>}{data.organizations.length > 0 ? <form onSubmit={(event) => void createProject(event)}><select name="organizationId" required>{data.organizations.map((organization) => <option value={organization.id} key={organization.id}>{organization.name}</option>)}</select><input name="projectName" placeholder="项目名称" minLength={2} required /><button type="submit">创建项目</button></form> : null}</section>
          <section className="support-section"><h2>技术支持 <span>{data.tickets.length}</span></h2>{data.tickets.length === 0 ? <StatePanel state="empty" detail="尚未提交技术支持问题。注册个人可直接咨询，无需先建项目。" /> : <ul>{data.tickets.map((ticket) => <li key={ticket.ticketCode}><strong>{ticket.title}</strong><small>{ticket.ticketCode} · {ticket.status}</small></li>)}</ul>}<form onSubmit={(event) => void createTicket(event)}><select name="projectId" aria-label="关联项目"><option value="">通用咨询（不关联项目）</option>{data.projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><input name="title" aria-label="问题标题" placeholder="问题标题" minLength={3} required /><textarea name="description" aria-label="问题描述" placeholder="描述工作条件、现象和期望结果" minLength={10} required /><button type="submit">提交支持工单</button></form></section>
          {data.projects.length > 0 ? <section><h2>样品申请 <span>{data.sampleRequests.length}</span></h2><ul>{data.sampleRequests.map((item) => <li key={item.id}><strong>{item.projectCode} · {item.orderCode}</strong><small>{item.quantity} 件 · {item.status}</small></li>)}</ul><form onSubmit={(event) => void createOrderRequest(event, "sample")}><select name="projectId" required>{data.projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><input name="orderCode" placeholder="已上架可订货料号" required /><input name="quantity" type="number" min="1" step="1" placeholder="数量" required /><button type="submit">提交样品申请</button></form></section> : null}
          {data.projects.length > 0 ? <section><h2>RFQ <span>{data.rfqRequests.length}</span></h2><ul>{data.rfqRequests.map((item) => <li key={item.id}><strong>{item.projectCode} · {item.orderCode}</strong><small>{item.quantity} · {item.status}</small></li>)}</ul><form onSubmit={(event) => void createOrderRequest(event, "rfq")}><select name="projectId" required>{data.projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select><input name="orderCode" placeholder="已上架可订货料号" required /><input name="quantity" type="number" min="0.001" step="0.001" placeholder="数量" required /><button type="submit">提交 RFQ</button></form></section> : null}
        </div>
      ) : null}
    </div>
  );
}
