export interface FileAccessResource {
  readonly documentVersionId: string;
  readonly documentCode: string;
  readonly title: string;
  readonly mimeType: string;
  readonly originalObjectKey: string;
  readonly resourceLevel: "PUBLIC" | "REGISTERED" | "ORG" | "PROJECT" | "NDA";
  readonly fullPreviewObjectKey: string | null;
  readonly anonymousPreviewObjectKey: string | null;
}

export interface StoredFileAccess {
  readonly action: "PREVIEW" | "DOWNLOAD";
  readonly objectKey: string;
  readonly mimeType: string;
  readonly filename: string;
}

export interface FileAccessRepository {
  findPublishedResource(documentCode: string, now: Date): Promise<FileAccessResource | null>;
  createToken(input: { readonly tokenHash: string; readonly documentVersionId: string; readonly subjectId: string | null; readonly action: "PREVIEW" | "DOWNLOAD"; readonly maxPreviewPages: number | null; readonly expiresAt: Date }): Promise<void>;
  resolveToken(tokenHash: string, now: Date): Promise<StoredFileAccess | null>;
}
