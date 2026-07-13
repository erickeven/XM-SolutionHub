import { useState } from "react";
import { adminCatalogApi, type BreakGlassInput } from "../../api/client.js";

function stringValue(form: FormData, name: string): string {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

function evidence(form: FormData): BreakGlassInput {
  return {
    reason: stringValue(form, "reason"),
    notificationTargets: [stringValue(form, "notification")],
    recoveryPoint: stringValue(form, "recoveryPoint")
  };
}

export function AdminCatalogPanel({ accessToken }: { readonly accessToken: string }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function run(action: () => Promise<unknown>, success: string): Promise<void> {
    setError("");
    try {
      await action();
      setMessage(success);
    } catch (cause: unknown) {
      setMessage("");
      setError(cause instanceof Error ? cause.message : "受控数据操作失败");
    }
  }

  async function createProduct(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(() => adminCatalogApi.createProduct({
      familyCode: stringValue(form, "familyCode"),
      familyName: stringValue(form, "familyName"),
      productCode: stringValue(form, "productCode"),
      name: stringValue(form, "name"),
      summary: stringValue(form, "summary"),
      skus: JSON.parse(stringValue(form, "skus")) as unknown,
      fields: JSON.parse(stringValue(form, "fields")) as unknown
    }, accessToken), "产品草稿已创建");
  }

  async function createSolution(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(() => adminCatalogApi.createSolution({
      solutionCode: stringValue(form, "solutionCode"),
      name: stringValue(form, "name"),
      summary: stringValue(form, "summary"),
      conditions: JSON.parse(stringValue(form, "conditions")) as unknown,
      evidence: JSON.parse(stringValue(form, "evidence")) as unknown,
      resourceLevel: stringValue(form, "resourceLevel"),
      productCodes: stringValue(form, "productCodes").split(",").map((code) => code.trim()).filter(Boolean)
    }, accessToken), "方案 V1 草稿已创建");
  }

  async function uploadDocument(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get("file");
    if (!(file instanceof File)) { setError("请选择 PDF 原件"); return; }
    await run(() => adminCatalogApi.uploadDocument({
      documentCode: stringValue(form, "documentCode"),
      title: stringValue(form, "title"),
      version: Number(stringValue(form, "version")),
      resourceLevel: stringValue(form, "resourceLevel"),
      language: stringValue(form, "language"),
      file
    }, accessToken), "PDF 原件已入库，等待 Worker 生成预览");
  }

  async function publish(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const kind = stringValue(form, "kind");
    const code = stringValue(form, "code");
    const version = Number(stringValue(form, "version"));
    await run(
      () => kind === "product"
        ? adminCatalogApi.publishProduct(code, evidence(form), accessToken)
        : kind === "solution"
          ? adminCatalogApi.publishSolution(code, version, evidence(form), accessToken)
          : adminCatalogApi.publishDocument(code, version, evidence(form), accessToken),
      "发布成功，break-glass 与审计事件已记录"
    );
  }

  async function link(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      () => adminCatalogApi.linkProductDocument(
        stringValue(form, "productCode"),
        stringValue(form, "documentCode"),
        accessToken
      ),
      "产品规格书关联成功"
    );
  }

  async function linkSolution(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await run(
      () => adminCatalogApi.linkSolutionDocument(
        stringValue(form, "solutionCode"),
        Number(stringValue(form, "version")),
        stringValue(form, "documentCode"),
        accessToken
      ),
      "方案资料关联成功"
    );
  }

  return (
    <section className="catalog-governance">
      <h2>受控产品 / 方案 / 资料发布</h2>
      {message !== "" ? <p className="operation-success" role="status">{message}</p> : null}
      {error !== "" ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="catalog-forms">
        <form onSubmit={(event) => void createProduct(event)}><h3>产品草稿</h3><input name="familyCode" placeholder="产品族编码" required /><input name="familyName" placeholder="产品族名称" required /><input name="productCode" placeholder="产品编码" required /><input name="name" placeholder="产品名称" required /><textarea name="summary" placeholder="受控摘要" minLength={10} required /><textarea name="skus" defaultValue={'[{"orderCode":"XMW-ORDER-CODE","packageCode":"SOP8"}]'} required /><textarea name="fields" defaultValue="{}" required /><button type="submit">创建产品草稿</button></form>
        <form onSubmit={(event) => void createSolution(event)}><h3>方案草稿</h3><input name="solutionCode" placeholder="方案编码" required /><input name="name" placeholder="方案名称" required /><textarea name="summary" placeholder="方案摘要" minLength={10} required /><textarea name="conditions" defaultValue="{}" required /><textarea name="evidence" defaultValue="{}" required /><select name="resourceLevel" defaultValue="PUBLIC"><option>PUBLIC</option><option>REGISTERED</option><option>ORG</option><option>PROJECT</option><option>NDA</option></select><input name="productCodes" placeholder="已发布产品编码，逗号分隔" required /><button type="submit">创建方案 V1</button></form>
        <form onSubmit={(event) => void uploadDocument(event)}><h3>PDF 原件</h3><input name="documentCode" placeholder="资料编码" required /><input name="title" placeholder="资料标题" required /><input name="version" type="number" min="1" defaultValue="1" required /><select name="resourceLevel" defaultValue="PUBLIC"><option>PUBLIC</option><option>REGISTERED</option><option>ORG</option><option>PROJECT</option><option>NDA</option></select><input name="language" defaultValue="zh-CN" required /><input name="file" type="file" accept="application/pdf,.pdf" required /><button type="submit">上传并排队生成预览</button></form>
        <form onSubmit={(event) => void publish(event)}><h3>高风险发布</h3><select name="kind"><option value="product">产品</option><option value="solution">方案</option><option value="document">资料</option></select><input name="code" placeholder="对象编码" required /><input name="version" type="number" min="1" defaultValue="1" /><textarea name="reason" placeholder="发布覆盖原因（至少 10 字）" minLength={10} required /><input name="notification" type="email" placeholder="通知对象" required /><input name="recoveryPoint" placeholder="恢复点" minLength={3} required /><button type="submit">记录原因并发布</button></form>
        <form onSubmit={(event) => void link(event)}><h3>关联产品规格书</h3><input name="productCode" placeholder="产品编码" required /><input name="documentCode" placeholder="已发布资料编码" required /><button type="submit">建立 DATASHEET 关联</button></form>
        <form onSubmit={(event) => void linkSolution(event)}><h3>关联方案资料</h3><input name="solutionCode" placeholder="方案编码" required /><input name="version" type="number" min="1" defaultValue="1" required /><input name="documentCode" placeholder="已发布资料编码" required /><button type="submit">建立 APPLICATION_NOTE 关联</button></form>
      </div>
    </section>
  );
}
