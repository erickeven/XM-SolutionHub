import { useState } from "react";
import { DiscoveryPage } from "./features/discovery/DiscoveryPage.js";
import { AuthPanel } from "./features/iam/AuthPanel.js";
import type { SessionResult } from "./api/client.js";
import { CustomerWorkspace } from "./features/customer/CustomerWorkspace.js";
import { InternalWorkbench } from "./features/internal/InternalWorkbench.js";
import "./styles.css";

type Surface = "external" | "customer" | "internal";

export default function App() {
  const [surface, setSurface] = useState<Surface>("external");
  const [authOpen, setAuthOpen] = useState(false);
  const [session, setSession] = useState<SessionResult | null>(null);
  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">跳到主要内容</a>
      <header className="topbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">XM</span><div><strong>芯茂微</strong><small>DESIGN-IN PLATFORM</small></div></div>
        <nav aria-label="界面切换">
          <button aria-current={surface === "external" ? "page" : undefined} onClick={() => setSurface("external")}>工程发现</button>
          <button aria-current={surface === "customer" ? "page" : undefined} onClick={() => setSurface("customer")}>客户协作</button>
          <button aria-current={surface === "internal" ? "page" : undefined} onClick={() => setSurface("internal")}>内部作业台</button>
        </nav>
        <button className="identity-button" type="button" onClick={() => setAuthOpen(true)}>{session === null ? "注册 / 登录" : session.subject.displayName}</button>
      </header>
      {surface === "external" ? (
        <DiscoveryPage accessToken={session?.accessToken ?? null} />
      ) : surface === "customer" && session?.subject.type === "CUSTOMER" ? (
        <main id="main-content" className="restricted-surface customer-surface" tabIndex={-1}>
          <CustomerWorkspace accessToken={session.accessToken} subject={session.subject} />
        </main>
      ) : surface === "internal" && session !== null && session.subject.type !== "CUSTOMER" ? (
        <main id="main-content" className="restricted-surface internal-surface" tabIndex={-1}>
          <InternalWorkbench accessToken={session.accessToken} subject={session.subject} />
        </main>
      ) : (
        <main id="main-content" className="restricted-surface" tabIndex={-1}>
          <p className="eyebrow">IDENTITY BOUNDARY</p>
          <h1>{surface === "customer" ? "客户个人与协作工作台" : "芯茂微内部作业台"}</h1>
          {session === null || (surface === "internal" && session.subject.type === "CUSTOMER") ? (
            <StateBoundary surface={surface} />
          ) : (
            <div className="workbench-empty"><span>IDENTITY VERIFIED</span><strong>{session.subject.displayName}</strong><p>当前工作台从空事务数据开始；没有创建企业、项目或内部任务。</p></div>
          )}
        </main>
      )}
      <footer><span>芯茂微数字化 Design-in 平台</span><span>版本、来源、授权与审计优先</span></footer>
      {authOpen ? <AuthPanel onClose={() => setAuthOpen(false)} onAuthenticated={(nextSession) => { setSession(nextSession); setAuthOpen(false); }} /> : null}
    </div>
  );
}

function StateBoundary({ surface }: { readonly surface: Exclude<Surface, "external"> }) {
  return (
    <div className="boundary-panel" role="status">
      <span>AUTH</span>
      <div><strong>需要有效身份</strong><p>{surface === "customer" ? "注册个人可进入个人工作台；企业和项目能力按需升级。" : "仅芯茂微内部员工和系统管理员可以进入。"}</p></div>
    </div>
  );
}
