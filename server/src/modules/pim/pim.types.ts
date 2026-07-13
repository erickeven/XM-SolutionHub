export interface FieldValueView {
  readonly code: string;
  readonly label: string;
  readonly type: "TEXT" | "NUMBER" | "BOOLEAN" | "ENUM" | "DATE" | "FILE";
  readonly unit: string | null;
  readonly value: string | number | boolean | null;
  readonly source: string;
}

export interface ProductSummaryView {
  readonly productCode: string;
  readonly name: string;
  readonly summary: string;
  readonly familyName: string | null;
  readonly orderableSkus: readonly string[];
}

export interface RelatedSolutionView {
  readonly solutionCode: string;
  readonly name: string;
  readonly summary: string;
  readonly version: number;
  readonly fitRules: unknown;
  readonly evidenceSource: string;
}

export interface ProductDocumentView {
  readonly documentCode: string;
  readonly title: string;
  readonly relationType: string;
  readonly latestVersion: number;
  readonly resourceLevel: "PUBLIC" | "REGISTERED" | "ORG" | "PROJECT" | "NDA";
}

export interface ProductDetailView extends ProductSummaryView {
  readonly fields: readonly FieldValueView[];
  readonly relatedSolutions: readonly RelatedSolutionView[];
  readonly documents: readonly ProductDocumentView[];
}
