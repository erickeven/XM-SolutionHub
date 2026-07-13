export interface SolutionSummaryView {
  readonly solutionCode: string;
  readonly name: string;
  readonly summary: string;
  readonly version: number;
  readonly resourceLevel: "PUBLIC" | "REGISTERED" | "ORG" | "PROJECT" | "NDA";
}

export interface SolutionProductView {
  readonly productCode: string;
  readonly name: string;
  readonly orderableSkus: readonly string[];
  readonly fitRules: unknown;
  readonly evidenceSource: string;
}

export interface SolutionDocumentView {
  readonly documentCode: string;
  readonly title: string;
  readonly relationType: string;
  readonly version: number;
  readonly resourceLevel: "PUBLIC" | "REGISTERED" | "ORG" | "PROJECT" | "NDA";
}

export interface SolutionDetailView extends SolutionSummaryView {
  readonly conditions: unknown;
  readonly evidence: unknown;
  readonly products: readonly SolutionProductView[];
  readonly documents: readonly SolutionDocumentView[];
}
