import { useId, useState } from "react";
import {
  discoveryApi,
  type DocumentSummary,
  type ProductSummary,
  type SelectionCandidate,
  type SolutionSummary,
  type ProductDetail,
  type SolutionDetail
} from "../../api/client.js";
import { StatePanel } from "../../components/StatePanel.js";

type DiscoveryMode = "products" | "solutions" | "documents" | "selection";
type DiscoveryResult = ProductSummary | SolutionSummary | DocumentSummary | SelectionCandidate;

const defaultMode = {
  id: "products",
  index: "01",
  label: "找型号",
  description: "按型号、系列和关键参数定位产品",
  placeholder: "输入产品型号或参数"
} as const;

const modes: readonly {
  readonly id: DiscoveryMode;
  readonly index: string;
  readonly label: string;
  readonly description: string;
  readonly placeholder: string;
}[] = [
  defaultMode,
  { id: "solutions", index: "02", label: "找方案", description: "按真实应用筛选已发布方案", placeholder: "输入应用、拓扑或负载" },
  { id: "documents", index: "03", label: "找资料", description: "搜索受控版本的规格书与方案资料", placeholder: "输入资料编号或标题" },
  { id: "selection", index: "04", label: "快速选型", description: "用应用条件匹配可订货产品", placeholder: "描述应用，例如：65W 高压快充" }
];

function resultKey(result: DiscoveryResult): string {
  if ("productCode" in result) return result.productCode;
  if ("solutionCode" in result) return result.solutionCode;
  return result.documentCode;
}

function ResultRow({ result, onInspect, onPreview }: { readonly result: DiscoveryResult; readonly onInspect: () => void; readonly onPreview: () => void }) {
  if ("documentCode" in result) {
    return (
      <li className="result-row">
        <span className="result-type">DOC</span>
        <div><strong>{result.title}</strong><p>{result.documentCode} · V{result.version} · {result.language}</p></div>
        <button className="row-action" type="button" onClick={onPreview}>预览</button>
      </li>
    );
  }
  if ("solutionCode" in result) {
    return (
      <li className="result-row">
        <span className="result-type">SOL</span>
        <div><strong>{result.name}</strong><p>{result.solutionCode} · V{result.version} · {result.summary}</p></div>
        <button className="row-action" type="button" onClick={onInspect}>查看方案</button>
      </li>
    );
  }
  return (
    <li className="result-row">
      <span className="result-type">SKU</span>
      <div>
        <strong>{result.name}</strong>
        <p>{result.productCode} · {result.orderableSkus.length === 0 ? "暂无上架料号" : result.orderableSkus.join(" / ")}</p>
        {"matchedEvidence" in result && result.matchedEvidence.length > 0 ? (
          <small>匹配证据：{result.matchedEvidence.slice(0, 2).join("；")}</small>
        ) : null}
      </div>
      <button className="row-action" type="button" onClick={onInspect}>{"score" in result ? `证据 ${result.score.toString().padStart(2, "0")}` : "查看产品"}</button>
    </li>
  );
}

export function DiscoveryPage({ accessToken }: { readonly accessToken: string | null }) {
  const inputId = useId();
  const [mode, setMode] = useState<DiscoveryMode>("products");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly DiscoveryResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "empty" | "error">("idle");
  const [error, setError] = useState("");
  const [detail, setDetail] = useState<ProductDetail | SolutionDetail | null>(null);
  const [detailError, setDetailError] = useState("");
  const activeMode = modes.find((item) => item.id === mode) ?? defaultMode;

  function selectMode(nextMode: DiscoveryMode): void {
    setMode(nextMode);
    setResults([]);
    setStatus("idle");
    setError("");
    setDetail(null);
    setDetailError("");
  }

  async function inspect(result: { readonly productCode: string } | { readonly solutionCode: string }): Promise<void> {
    setDetailError("");
    try {
      if ("solutionCode" in result) setDetail(await discoveryApi.solutionDetail(result.solutionCode));
      else if ("productCode" in result) setDetail(await discoveryApi.productDetail(result.productCode));
    } catch (cause: unknown) {
      setDetailError(cause instanceof Error ? cause.message : "详情读取失败");
    }
  }

  async function accessDocument(documentCode: string, action: "PREVIEW" | "DOWNLOAD"): Promise<void> {
    setDetailError("");
    try {
      const access = await discoveryApi.issueFileAccess(documentCode, action, accessToken);
      window.open(access.accessPath, "_blank", "noopener,noreferrer");
    } catch (cause: unknown) {
      setDetailError(cause instanceof Error ? cause.message : "资料授权失败");
    }
  }

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setStatus("loading");
    setError("");
    try {
      const data =
        mode === "products"
          ? await discoveryApi.products(query)
          : mode === "solutions"
            ? await discoveryApi.solutions(query)
            : mode === "documents"
              ? await discoveryApi.documents(query)
              : await discoveryApi.selection(query);
      setResults(data);
      setStatus(data.length === 0 ? "empty" : "ready");
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : "未知请求错误");
      setStatus("error");
    }
  }

  return (
    <main id="main-content" className="discovery-shell" tabIndex={-1}>
      <section className="command-header" aria-labelledby="discovery-title">
        <div>
          <p className="eyebrow">ENGINEERING DISCOVERY / 受控工程发现</p>
          <h1 id="discovery-title">从应用条件进入产品证据链</h1>
          <p className="lead">无需注册即可查找型号、方案和资料。公开资料可预览前三页，登录后按资源等级获得完整权限。</p>
        </div>
        <dl className="system-readout" aria-label="系统规则摘要">
          <div><dt>事实源</dt><dd>MySQL</dd></div>
          <div><dt>资料策略</dt><dd>版本受控</dd></div>
          <div><dt>匿名预览</dt><dd>03 页</dd></div>
        </dl>
      </section>

      <section className="task-grid" aria-label="工程任务入口">
        {modes.map((item) => (
          <button
            className={mode === item.id ? "task-button active" : "task-button"}
            key={item.id}
            type="button"
            aria-pressed={mode === item.id}
            onClick={() => selectMode(item.id)}
          >
            <span>{item.index}</span><strong>{item.label}</strong><small>{item.description}</small>
          </button>
        ))}
      </section>

      <section className="query-console" aria-label={`${activeMode.label}查询`}>
        <div className="console-rail"><span>QUERY</span><i aria-hidden="true" /></div>
        <form onSubmit={(event) => void submit(event)}>
          <label htmlFor={inputId}>{activeMode.label}条件</label>
          <div className="query-line">
            <input
              id={inputId}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={activeMode.placeholder}
              required={mode === "selection"}
            />
            <button type="submit">执行检索 <span aria-hidden="true">↗</span></button>
          </div>
          <p>仅返回已发布且当前有效的记录；方案关联产品会自动排除未上架产品。</p>
        </form>
      </section>

      <section className="result-console" aria-live="polite" aria-busy={status === "loading"}>
        <header><h2>检索结果</h2><span>{status === "ready" ? `${results.length} RECORDS` : "LIVE DATA"}</span></header>
        {status === "idle" ? <p className="idle-copy">输入条件并执行检索。空数据库会如实显示空状态，不注入演示结果。</p> : null}
        {status === "loading" ? <StatePanel state="loading" /> : null}
        {status === "empty" ? <StatePanel state="empty" /> : null}
        {status === "error" ? <StatePanel state="error" detail={error} /> : null}
        {status === "ready" ? <ul className="result-list">{results.map((result) => <ResultRow key={resultKey(result)} result={result} onInspect={() => { if ("solutionCode" in result || "productCode" in result) void inspect(result); }} onPreview={() => { if ("documentCode" in result) void accessDocument(result.documentCode, "PREVIEW"); }} />)}</ul> : null}
      </section>
      {detailError !== "" ? <StatePanel state="error" detail={detailError} /> : null}
      {detail !== null ? (
        <section className="evidence-panel" aria-label="工程证据详情">
          <header><div><p className="eyebrow">CONTROLLED DETAIL</p><h2>{detail.name}</h2></div><button type="button" onClick={() => setDetail(null)}>关闭</button></header>
          <p>{detail.summary}</p>
          {"relatedSolutions" in detail ? (
            <>
              <h3>关联应用方案</h3>
              {detail.relatedSolutions.length === 0 ? <StatePanel state="empty" detail="当前产品没有符合发布规则的关联方案。" /> : (
                <ul>{detail.relatedSolutions.map((solution) => <li key={solution.solutionCode}><button type="button" onClick={() => void inspect(solution)}><strong>{solution.name}</strong><span>{solution.solutionCode} · {solution.evidenceSource}</span></button></li>)}</ul>
              )}
              <h3>受控资料</h3>
              <ul>{detail.documents.map((document) => <li key={document.documentCode}><span><strong>{document.title}</strong><small>{document.documentCode} · {document.resourceLevel}</small></span><span className="document-actions"><button type="button" onClick={() => void accessDocument(document.documentCode, "PREVIEW")}>预览</button><button type="button" onClick={() => void accessDocument(document.documentCode, "DOWNLOAD")}>下载</button></span></li>)}</ul>
            </>
          ) : (
            <>
              <h3>适配产品 / 可订货料号</h3>
              <ul>{detail.products.map((product) => <li key={product.productCode}><button type="button" onClick={() => void inspect(product)}><strong>{product.name}</strong><span>{product.productCode} · {product.orderableSkus.join(" / ")}</span></button></li>)}</ul>
              <h3>方案资料</h3>
              <ul>{detail.documents.map((document) => <li key={document.documentCode}><span><strong>{document.title}</strong><small>{document.documentCode} · {document.resourceLevel}</small></span><span className="document-actions"><button type="button" onClick={() => void accessDocument(document.documentCode, "PREVIEW")}>预览</button><button type="button" onClick={() => void accessDocument(document.documentCode, "DOWNLOAD")}>下载</button></span></li>)}</ul>
            </>
          )}
        </section>
      ) : null}
    </main>
  );
}
