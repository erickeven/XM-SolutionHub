import type { DynamicFieldDefinition, FieldStorageValue } from "../../shared/domain/field-value-policy.js";
import type { BreakGlassEvidence } from "../content-config/content-config.repository.js";

export interface AdminProductInput {
  readonly familyCode: string;
  readonly familyName: string;
  readonly productCode: string;
  readonly name: string;
  readonly summary: string;
  readonly skus: readonly { readonly orderCode: string; readonly packageCode: string }[];
  readonly fieldValues: readonly FieldStorageValue[];
  readonly actorId: string;
}

export interface AdminSolutionInput {
  readonly solutionCode: string;
  readonly name: string;
  readonly summary: string;
  readonly conditions: unknown;
  readonly evidence: unknown;
  readonly resourceLevel: "PUBLIC" | "REGISTERED" | "ORG" | "PROJECT" | "NDA";
  readonly productCodes: readonly string[];
}

export interface AdminDocumentVersionInput {
  readonly documentCode: string;
  readonly title: string;
  readonly version: number;
  readonly resourceLevel: "PUBLIC" | "REGISTERED" | "ORG" | "PROJECT" | "NDA";
  readonly language: string;
  readonly mimeType: string;
  readonly originalObjectKey: string;
  readonly sha256: string;
}

export interface PublishResult {
  readonly id: string;
  readonly status: string;
}

export interface AdminCatalogRepository {
  publishedFieldDefinitions(entityType: string): Promise<readonly DynamicFieldDefinition[]>;
  createProduct(input: AdminProductInput): Promise<{ readonly productCode: string; readonly status: string } | null>;
  publishProduct(productCode: string, actorId: string, evidence: BreakGlassEvidence, traceId: string): Promise<PublishResult | null>;
  createSolution(input: AdminSolutionInput): Promise<{ readonly solutionCode: string; readonly version: number; readonly status: string } | null>;
  publishSolution(solutionCode: string, version: number, actorId: string, evidence: BreakGlassEvidence, traceId: string): Promise<PublishResult | null>;
  createDocumentVersion(input: AdminDocumentVersionInput): Promise<{ readonly documentCode: string; readonly version: number; readonly status: string; readonly documentVersionId: string } | null>;
  publishDocument(documentCode: string, version: number, actorId: string, evidence: BreakGlassEvidence, traceId: string): Promise<PublishResult | null>;
  linkProductDocument(productCode: string, documentCode: string, relationType: string): Promise<void | null>;
  linkSolutionDocument(solutionCode: string, version: number, documentCode: string, relationType: string): Promise<void | null>;
}
