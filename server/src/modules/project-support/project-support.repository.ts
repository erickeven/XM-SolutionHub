export interface CustomerWorkspaceView {
  readonly organizations: readonly { readonly id: string; readonly orgCode: string; readonly name: string; readonly customerRole: string }[];
  readonly projects: readonly { readonly id: string; readonly projectCode: string; readonly name: string; readonly stage: string; readonly projectRole: string }[];
  readonly tickets: readonly { readonly ticketCode: string; readonly title: string; readonly status: string; readonly updatedAt: Date }[];
  readonly sampleRequests: readonly { readonly id: string; readonly projectCode: string; readonly orderCode: string; readonly quantity: number; readonly status: string }[];
  readonly rfqRequests: readonly { readonly id: string; readonly projectCode: string; readonly orderCode: string; readonly quantity: string; readonly status: string }[];
}

export interface ProjectSupportRepository {
  workspace(subjectId: string): Promise<CustomerWorkspaceView>;
  createOrganization(input: { readonly orgCode: string; readonly name: string; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }): Promise<{ readonly id: string; readonly orgCode: string; readonly name: string }>;
  createProject(input: { readonly organizationId: string; readonly projectCode: string; readonly name: string; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }): Promise<{ readonly id: string; readonly projectCode: string; readonly name: string; readonly stage: string } | null>;
  createTicket(input: { readonly ticketCode: string; readonly projectId: string | null; readonly title: string; readonly description: string; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }): Promise<{ readonly ticketCode: string; readonly status: string } | null>;
  createSampleRequest(input: { readonly projectId: string; readonly orderCode: string; readonly quantity: number; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }): Promise<{ readonly id: string; readonly status: string } | null>;
  createRfqRequest(input: { readonly projectId: string; readonly orderCode: string; readonly quantity: number; readonly subjectId: string; readonly sourceIp: string; readonly traceId: string }): Promise<{ readonly id: string; readonly status: string } | null>;
}
