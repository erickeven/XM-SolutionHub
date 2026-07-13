import { decideResourceAccess, type AccessSubject } from "../../shared/domain/access-policy.js";
import { ApplicationError } from "../../shared/http/application-error.js";
import type { DocumentSummaryView, DocumentsRepository } from "./documents.repository.js";

export interface DocumentPreviewDecision {
  readonly document: DocumentSummaryView;
  readonly allowed: boolean;
  readonly previewPageLimit: number | null;
  readonly reason: string;
}

export class DocumentsService {
  public constructor(private readonly repository: DocumentsRepository) {}

  public search(query: string, limit: number): Promise<readonly DocumentSummaryView[]> {
    return this.repository.searchPublishedDocuments(query.trim(), limit);
  }

  public async previewPolicy(documentCode: string, subject: AccessSubject): Promise<DocumentPreviewDecision> {
    const document = await this.repository.findPublishedDocument(documentCode);
    if (document === null) throw new ApplicationError(404, 40430, "资料不存在或尚未发布");
    const decision = decideResourceAccess(
      subject,
      { level: document.resourceLevel, publicDownloadAllowed: subject.authenticated },
      "PREVIEW"
    );
    return {
      document,
      allowed: decision.allowed,
      previewPageLimit: decision.previewPageLimit,
      reason: decision.reason
    };
  }
}
