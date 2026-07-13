export interface PreviewSource {
  readonly documentVersionId: string;
  readonly mimeType: string;
  readonly sha256: string;
  readonly originalObjectKey: string;
}

export interface PreviewProcessingRepository {
  findSource(documentVersionId: string): Promise<PreviewSource | null>;
  markProcessing(documentVersionId: string, sha256: string, fullObjectKey: string, anonymousObjectKey: string): Promise<void>;
  markSucceeded(documentVersionId: string, sha256: string, fullObjectKey: string, anonymousObjectKey: string, pageCount: number): Promise<void>;
  markFailed(documentVersionId: string, sha256: string, reason: string): Promise<void>;
}
