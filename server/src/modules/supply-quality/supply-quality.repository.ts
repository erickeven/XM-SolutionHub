export interface InternalWorkbenchView {
  readonly roles: readonly string[];
  readonly supportTickets: readonly { readonly ticketCode: string; readonly title: string; readonly status: string; readonly assignedToId: string | null; readonly slaDueAt: Date | null }[];
  readonly sampleRequests: readonly { readonly id: string; readonly projectCode: string; readonly orderCode: string; readonly quantity: number; readonly status: string }[];
  readonly rfqRequests: readonly { readonly id: string; readonly projectCode: string; readonly orderCode: string; readonly quantity: string; readonly status: string }[];
  readonly qualityEvents: readonly { readonly eventCode: string; readonly severity: string; readonly status: string; readonly description: string }[];
  readonly verificationTasks: readonly { readonly taskCode: string; readonly status: string; readonly source: string }[];
}

export interface SupplyQualityRepository {
  workbench(subjectId: string, systemAdministrator: boolean): Promise<InternalWorkbenchView>;
  assignSupportTicket(ticketCode: string, subjectId: string, systemAdministrator: boolean): Promise<{ readonly ticketCode: string; readonly status: string; readonly assignedToId: string | null } | null>;
  resolveSupportTicket(input: { readonly ticketCode: string; readonly subjectId: string; readonly systemAdministrator: boolean; readonly conclusion: unknown; readonly sourceIp: string; readonly traceId: string }): Promise<{ readonly ticketCode: string; readonly status: string } | null>;
}
