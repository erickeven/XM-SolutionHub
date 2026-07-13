export type ViewState = "loading" | "empty" | "error" | "forbidden";

const stateCopy: Record<ViewState, { readonly code: string; readonly title: string; readonly detail: string }> = {
  loading: { code: "SYNC", title: "正在读取受控数据", detail: "正在核对发布状态、版本和访问范围。" },
  empty: { code: "ZERO", title: "没有符合条件的已发布记录", detail: "系统不会用演示数据填充结果，请调整条件或联系资料责任人。" },
  error: { code: "FAULT", title: "数据链路暂时不可用", detail: "请求失败，已保留当前输入，可直接重试。" },
  forbidden: { code: "AUTH", title: "当前身份无权访问", detail: "资源等级或对象范围不匹配，系统不会泄露受限内容。" }
};

export function StatePanel({ state, detail }: { readonly state: ViewState; readonly detail?: string }) {
  const copy = stateCopy[state];
  return (
    <div className={`state-panel state-${state}`} role={state === "error" ? "alert" : "status"}>
      <span className="state-code" aria-hidden="true">{copy.code}</span>
      <div>
        <strong>{copy.title}</strong>
        <p>{detail ?? copy.detail}</p>
      </div>
    </div>
  );
}
