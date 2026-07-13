export interface DocumentSummaryView {
  readonly documentCode: string;
  readonly title: string;
  readonly version: number;
  readonly language: string;
  readonly mimeType: string;
  readonly pageCount: number | null;
  readonly resourceLevel: "PUBLIC" | "REGISTERED" | "ORG" | "PROJECT" | "NDA";
}

export interface DocumentsRepository {
  searchPublishedDocuments(query: string, limit: number): Promise<readonly DocumentSummaryView[]>;
  findPublishedDocument(documentCode: string): Promise<DocumentSummaryView | null>;
}
