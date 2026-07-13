import { useEffect, useState } from "react";
import { internalApi, type ConfigurationVersionView, type InternalWorkbenchData, type SessionSubject } from "../../api/client.js";
import { StatePanel } from "../../components/StatePanel.js";
import { AdminCatalogPanel } from "./AdminCatalogPanel.js";

export function InternalWorkbench({ accessToken, subject }: { readonly accessToken: string; readonly subject: SessionSubject }) {
  const [workbench, setWorkbench] = useState<InternalWorkbenchData | null>(null);
  const [versions, setVersions] = useState<readonly ConfigurationVersionView[]>([]);
  const [error, setError] = useState("");

  async function reload(): Promise<void> {
    try {
      const data = await internalApi.workbench(accessToken);
      setWorkbench(data);
      if (subject.type === "SYSTEM_ADMIN") setVersions(await internalApi.configurationVersions(accessToken));
      setError("");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "内部作业台读取失败");
    }
  }

  useEffect(() => {
    let active = true;
    void internalApi.workbench(accessToken).then(async (data) => {
      const configuration = subject.type === "SYSTEM_ADMIN"
        ? await internalApi.configurationVersions(accessToken)
        : [];
      if (!active) return;
      setWorkbench(data);
      setVersions(configuration);
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "内部作业台读取失败");
    });
    return () => { active = false; };
  }, [accessToken, subject.type]);

  async function assign(ticketCode: string): Promise<void> {
    try { await internalApi.assignTicket(ticketCode, accessToken); await reload(); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "工单认领失败"); }
  }

  async function resolve(ticketCode: string): Promise<void> {
    try { await internalApi.resolveTicket(ticketCode, { result: "resolved-from-workbench" }, accessToken); await reload(); }
    catch (cause: unknown) { setError(cause instanceof Error ? cause.message : "工单结案失败"); }
  }

  async function createDraft(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const payloadText = form.get("payload");
    const summary = form.get("summary");
    if (typeof payloadText !== "string" || typeof summary !== "string") return;
    try {
      const payload: unknown = JSON.parse(payloadText);
      await internalApi.createConfigurationDraft(payload, summary, accessToken);
      formElement.reset();
      await reload();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "配置草稿创建失败");
    }
  }

  async function publish(event: React.FormEvent<HTMLFormElement>, version: number): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const reason = form.get("reason");
    const recoveryPoint = form.get("recoveryPoint");
    const notification = form.get("notification");
    if (typeof reason !== "string" || typeof recoveryPoint !== "string" || typeof notification !== "string") return;
    try {
      await internalApi.publishConfiguration(version, { reason, recoveryPoint, notificationTargets: [notification] }, accessToken);
      await reload();
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "配置发布失败");
    }
  }

  if (workbench === null && error === "") return <StatePanel state="loading" />;
  return (
    <div className="internal-workbench">
      <header><div><p className="eyebrow">INTERNAL OPERATIONS</p><h1>芯茂微内部作业台</h1></div><span>{subject.displayName} · {workbench?.roles.join(" / ") || subject.type}</span></header>
      {error !== "" ? <StatePanel state="error" detail={error} /> : null}
      {workbench !== null ? <div className="queue-grid">
        <Queue title="FAE 支持" empty="没有待处理或可认领工单。">{workbench.supportTickets.map((ticket) => <li key={ticket.ticketCode}><span><strong>{ticket.title}</strong><small>{ticket.ticketCode} · {ticket.status}</small></span><span className="document-actions">{ticket.assignedToId === null ? <button type="button" onClick={() => void assign(ticket.ticketCode)}>认领</button> : null}<button type="button" onClick={() => void resolve(ticket.ticketCode)}>结案</button></span></li>)}</Queue>
        <Queue title="样品队列" empty="没有待处理样品申请。">{workbench.sampleRequests.map((item) => <li key={item.id}><strong>{item.projectCode} · {item.orderCode}</strong><small>{item.quantity} 件 · {item.status}</small></li>)}</Queue>
        <Queue title="RFQ / 跟单" empty="没有待处理 RFQ。">{workbench.rfqRequests.map((item) => <li key={item.id}><strong>{item.projectCode} · {item.orderCode}</strong><small>{item.quantity} · {item.status}</small></li>)}</Queue>
        <Queue title="质量事件" empty="没有当前职责范围内的质量事件。">{workbench.qualityEvents.map((item) => <li key={item.eventCode}><strong>{item.eventCode} · {item.severity}</strong><small>{item.status} · {item.description}</small></li>)}</Queue>
        <Queue title="AE 测试验证" empty="没有待执行验证任务。">{workbench.verificationTasks.map((item) => <li key={item.taskCode}><strong>{item.taskCode}</strong><small>{item.status} · {item.source}</small></li>)}</Queue>
      </div> : null}
      {subject.type === "SYSTEM_ADMIN" ? <><AdminCatalogPanel accessToken={accessToken} /><section className="governance-panel"><h2>配置治理 / Break-glass</h2><form className="config-draft-form" onSubmit={(event) => void createDraft(event)}><input name="summary" placeholder="变更摘要" minLength={3} required /><textarea name="payload" defaultValue={'{"navigation":["products","solutions","documents","selection"]}'} required /><button type="submit">创建草稿</button></form><ul>{versions.map((version) => <li key={version.id}><span><strong>V{version.version} · {version.status}</strong><small>{version.changeSummary}</small></span>{version.status === "DRAFT" ? <form onSubmit={(event) => void publish(event, version.version)}><input name="reason" placeholder="高风险发布原因（至少 10 字）" minLength={10} required /><input name="notification" type="email" placeholder="通知对象" required /><input name="recoveryPoint" placeholder="恢复点" minLength={3} required /><button type="submit">记录原因并发布</button></form> : null}</li>)}</ul></section></> : null}
    </div>
  );
}

function Queue({ title, empty, children }: { readonly title: string; readonly empty: string; readonly children: React.ReactNode }) {
  const hasChildren = Array.isArray(children) ? children.length > 0 : children !== null && children !== undefined;
  return <section><h2>{title}</h2>{hasChildren ? <ul>{children}</ul> : <StatePanel state="empty" detail={empty} />}</section>;
}
