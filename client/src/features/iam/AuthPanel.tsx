import { useId, useState } from "react";
import { iamApi, type SessionResult } from "../../api/client.js";

export function AuthPanel({ onClose, onAuthenticated }: { readonly onClose: () => void; readonly onAuthenticated: (session: SessionResult) => void }) {
  const titleId = useId();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("loading");
    const data = new FormData(event.currentTarget);
    const emailValue = data.get("email");
    const passwordValue = data.get("password");
    const displayNameValue = data.get("displayName");
    const email = typeof emailValue === "string" ? emailValue : "";
    const password = typeof passwordValue === "string" ? passwordValue : "";
    const displayName = typeof displayNameValue === "string" ? displayNameValue : "";
    try {
      const session = mode === "register"
        ? await iamApi.register({ email, password, displayName })
        : await iamApi.login({ email, password });
      onAuthenticated(session);
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "身份服务暂时不可用");
      setStatus("error");
    }
  }

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="auth-panel" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header><div><p className="eyebrow">IDENTITY / 身份边界</p><h2 id={titleId}>{mode === "login" ? "登录工程账户" : "注册个人账户"}</h2></div><button type="button" onClick={onClose} aria-label="关闭身份面板">×</button></header>
        <div className="auth-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")}>登录</button>
          <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")}>注册个人</button>
        </div>
        <form onSubmit={(event) => void submit(event)}>
          {mode === "register" ? <label>姓名<input name="displayName" autoComplete="name" minLength={2} required /></label> : null}
          <label>邮箱<input name="email" type="email" autoComplete="email" required /></label>
          <label>密码<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={12} required /></label>
          {status === "error" ? <p className="form-error" role="alert">{error}</p> : null}
          <button className="primary-action" type="submit" disabled={status === "loading"}>{status === "loading" ? "正在验证…" : mode === "login" ? "登录" : "创建个人账户"}</button>
        </form>
        <p className="auth-note">注册不会自动创建企业、项目、采购或开案事实。</p>
      </section>
    </div>
  );
}
