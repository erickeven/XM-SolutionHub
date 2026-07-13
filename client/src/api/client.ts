export interface ProductSummary {
  readonly productCode: string;
  readonly name: string;
  readonly summary: string;
  readonly familyName: string | null;
  readonly orderableSkus: readonly string[];
}

export interface SolutionSummary {
  readonly solutionCode: string;
  readonly name: string;
  readonly summary: string;
  readonly version: number;
  readonly resourceLevel: string;
}

export interface DocumentSummary {
  readonly documentCode: string;
  readonly title: string;
  readonly version: number;
  readonly language: string;
  readonly mimeType: string;
  readonly pageCount: number | null;
  readonly resourceLevel: string;
}

export interface SelectionCandidate extends ProductSummary {
  readonly score: number;
  readonly matchedEvidence: readonly string[];
}

export interface SessionSubject {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly type: "CUSTOMER" | "INTERNAL" | "SYSTEM_ADMIN";
}

export interface SessionResult {
  readonly accessToken: string;
  readonly subject: SessionSubject;
}

export interface ProductDetail extends ProductSummary {
  readonly fields: readonly { readonly code: string; readonly label: string; readonly type: string; readonly unit: string | null; readonly value: string | number | boolean | null; readonly source: string }[];
  readonly relatedSolutions: readonly { readonly solutionCode: string; readonly name: string; readonly summary: string; readonly version: number; readonly fitRules: unknown; readonly evidenceSource: string }[];
  readonly documents: readonly { readonly documentCode: string; readonly title: string; readonly relationType: string; readonly latestVersion: number; readonly resourceLevel: string }[];
}

export interface SolutionDetail extends SolutionSummary {
  readonly conditions: unknown;
  readonly evidence: unknown;
  readonly products: readonly { readonly productCode: string; readonly name: string; readonly orderableSkus: readonly string[]; readonly fitRules: unknown; readonly evidenceSource: string }[];
  readonly documents: readonly { readonly documentCode: string; readonly title: string; readonly relationType: string; readonly version: number; readonly resourceLevel: string }[];
}

interface ApiEnvelope<T> {
  readonly code: number;
  readonly message: string;
  readonly data: T;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const payload: unknown = await response.json();
  if (!isRecord(payload) || typeof payload.code !== "number" || typeof payload.message !== "string") {
    throw new Error("服务返回了无法识别的数据格式");
  }
  const envelope = payload as unknown as ApiEnvelope<T>;
  if (!response.ok || envelope.code !== 0) throw new Error(envelope.message);
  return envelope.data;
}

function authorization(accessToken: string | null): HeadersInit {
  return accessToken === null ? {} : { authorization: `Bearer ${accessToken}` };
}

export const discoveryApi = {
  products: (query: string): Promise<readonly ProductSummary[]> =>
    request(`/api/v1/products?q=${encodeURIComponent(query)}`),
  solutions: (query: string): Promise<readonly SolutionSummary[]> =>
    request(`/api/v1/solutions?q=${encodeURIComponent(query)}`),
  documents: (query: string): Promise<readonly DocumentSummary[]> =>
    request(`/api/v1/documents?q=${encodeURIComponent(query)}`),
  selection: (application: string): Promise<readonly SelectionCandidate[]> =>
    request("/api/v1/selection/match", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ application, keywords: [], limit: 8 })
    }),
  productDetail: (productCode: string): Promise<ProductDetail> => request(`/api/v1/products/${encodeURIComponent(productCode)}`),
  solutionDetail: (solutionCode: string): Promise<SolutionDetail> => request(`/api/v1/solutions/${encodeURIComponent(solutionCode)}`),
  issueFileAccess: (documentCode: string, action: "PREVIEW" | "DOWNLOAD", accessToken: string | null): Promise<{ readonly accessPath: string; readonly expiresAt: string; readonly previewPageLimit: number | null }> =>
    request(`/api/v1/documents/${encodeURIComponent(documentCode)}/access`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify({ action })
    })
};

export const iamApi = {
  register: (input: { readonly email: string; readonly displayName: string; readonly password: string }): Promise<SessionResult> =>
    request("/api/v1/iam/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    }),
  login: (input: { readonly email: string; readonly password: string }): Promise<SessionResult> =>
    request("/api/v1/iam/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input)
    })
};

export interface CustomerWorkspaceData {
  readonly organizations: readonly { readonly id: string; readonly orgCode: string; readonly name: string; readonly customerRole: string }[];
  readonly projects: readonly { readonly id: string; readonly projectCode: string; readonly name: string; readonly stage: string; readonly projectRole: string }[];
  readonly tickets: readonly { readonly ticketCode: string; readonly title: string; readonly status: string; readonly updatedAt: string }[];
  readonly sampleRequests: readonly { readonly id: string; readonly projectCode: string; readonly orderCode: string; readonly quantity: number; readonly status: string }[];
  readonly rfqRequests: readonly { readonly id: string; readonly projectCode: string; readonly orderCode: string; readonly quantity: string; readonly status: string }[];
}

export const customerApi = {
  workspace: (accessToken: string): Promise<CustomerWorkspaceData> =>
    request("/api/v1/customer/workspace", { headers: authorization(accessToken) }),
  createOrganization: (name: string, accessToken: string) =>
    request("/api/v1/customer/organizations", {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify({ name })
    }),
  createProject: (organizationId: string, name: string, accessToken: string) =>
    request("/api/v1/customer/projects", {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify({ organizationId, name })
    }),
  createTicket: (input: { readonly projectId: string | null; readonly title: string; readonly description: string }, accessToken: string) =>
    request("/api/v1/customer/tickets", {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify(input)
    }),
  createSampleRequest: (input: { readonly projectId: string; readonly orderCode: string; readonly quantity: number }, accessToken: string) =>
    request("/api/v1/customer/sample-requests", {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify(input)
    }),
  createRfqRequest: (input: { readonly projectId: string; readonly orderCode: string; readonly quantity: number }, accessToken: string) =>
    request("/api/v1/customer/rfq-requests", {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify(input)
    })
};

export interface InternalWorkbenchData {
  readonly roles: readonly string[];
  readonly supportTickets: readonly { readonly ticketCode: string; readonly title: string; readonly status: string; readonly assignedToId: string | null; readonly slaDueAt: string | null }[];
  readonly sampleRequests: readonly { readonly id: string; readonly projectCode: string; readonly orderCode: string; readonly quantity: number; readonly status: string }[];
  readonly rfqRequests: readonly { readonly id: string; readonly projectCode: string; readonly orderCode: string; readonly quantity: string; readonly status: string }[];
  readonly qualityEvents: readonly { readonly eventCode: string; readonly severity: string; readonly status: string; readonly description: string }[];
  readonly verificationTasks: readonly { readonly taskCode: string; readonly status: string; readonly source: string }[];
}

export interface ConfigurationVersionView {
  readonly id: string;
  readonly version: number;
  readonly status: string;
  readonly payload: unknown;
  readonly changeSummary: string;
  readonly publishedAt: string | null;
}

export const internalApi = {
  workbench: (accessToken: string): Promise<InternalWorkbenchData> =>
    request("/api/v1/internal/workbench", { headers: authorization(accessToken) }),
  assignTicket: (ticketCode: string, accessToken: string) =>
    request(`/api/v1/internal/support/${encodeURIComponent(ticketCode)}/assign`, {
      method: "POST",
      headers: authorization(accessToken)
    }),
  resolveTicket: (ticketCode: string, conclusion: unknown, accessToken: string) =>
    request(`/api/v1/internal/support/${encodeURIComponent(ticketCode)}/resolve`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify({ conclusion })
    }),
  configurationVersions: (accessToken: string): Promise<readonly ConfigurationVersionView[]> =>
    request("/api/v1/admin/configuration/versions", { headers: authorization(accessToken) }),
  createConfigurationDraft: (payload: unknown, changeSummary: string, accessToken: string): Promise<ConfigurationVersionView> =>
    request("/api/v1/admin/configuration/versions", {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify({ payload, changeSummary })
    }),
  publishConfiguration: (version: number, evidence: { readonly reason: string; readonly notificationTargets: readonly string[]; readonly recoveryPoint: string }, accessToken: string): Promise<ConfigurationVersionView> =>
    request(`/api/v1/admin/configuration/versions/${version}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify(evidence)
    })
};

export interface BreakGlassInput {
  readonly reason: string;
  readonly notificationTargets: readonly string[];
  readonly recoveryPoint: string;
}

export const adminCatalogApi = {
  createProduct: (input: unknown, accessToken: string) => request("/api/v1/admin/catalog/products", {
    method: "POST",
    headers: { "content-type": "application/json", ...authorization(accessToken) },
    body: JSON.stringify(input)
  }),
  publishProduct: (productCode: string, evidence: BreakGlassInput, accessToken: string) =>
    request(`/api/v1/admin/catalog/products/${encodeURIComponent(productCode)}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify(evidence)
    }),
  createSolution: (input: unknown, accessToken: string) => request("/api/v1/admin/catalog/solutions", {
    method: "POST",
    headers: { "content-type": "application/json", ...authorization(accessToken) },
    body: JSON.stringify(input)
  }),
  publishSolution: (solutionCode: string, version: number, evidence: BreakGlassInput, accessToken: string) =>
    request(`/api/v1/admin/catalog/solutions/${encodeURIComponent(solutionCode)}/versions/${version}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify(evidence)
    }),
  uploadDocument: (input: { readonly documentCode: string; readonly title: string; readonly version: number; readonly resourceLevel: string; readonly language: string; readonly file: File }, accessToken: string) =>
    request(`/api/v1/admin/catalog/documents/${encodeURIComponent(input.documentCode)}/versions/${input.version}/original`, {
      method: "PUT",
      headers: {
        "content-type": "application/pdf",
        "x-document-title": encodeURIComponent(input.title),
        "x-resource-level": input.resourceLevel,
        "x-document-language": input.language,
        ...authorization(accessToken)
      },
      body: input.file
    }),
  publishDocument: (documentCode: string, version: number, evidence: BreakGlassInput, accessToken: string) =>
    request(`/api/v1/admin/catalog/documents/${encodeURIComponent(documentCode)}/versions/${version}/publish`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify(evidence)
    }),
  linkProductDocument: (productCode: string, documentCode: string, accessToken: string) =>
    request(`/api/v1/admin/catalog/products/${encodeURIComponent(productCode)}/documents`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify({ documentCode, relationType: "DATASHEET" })
    }),
  linkSolutionDocument: (solutionCode: string, version: number, documentCode: string, accessToken: string) =>
    request(`/api/v1/admin/catalog/solutions/${encodeURIComponent(solutionCode)}/versions/${version}/documents`, {
      method: "POST",
      headers: { "content-type": "application/json", ...authorization(accessToken) },
      body: JSON.stringify({ documentCode, relationType: "APPLICATION_NOTE" })
    })
};
