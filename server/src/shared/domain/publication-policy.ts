export interface PublishableProduct {
  readonly status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
  readonly publishedAt: Date | null;
}

export function isProductVisible(product: PublishableProduct, now = new Date()): boolean {
  return product.status === "PUBLISHED" && product.publishedAt !== null && product.publishedAt <= now;
}

export interface PublishableSolutionVersion {
  readonly status: "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
  readonly effectiveAt: Date | null;
  readonly expiresAt: Date | null;
}

export function isSolutionVersionVisible(version: PublishableSolutionVersion, now = new Date()): boolean {
  return (
    version.status === "PUBLISHED" &&
    (version.effectiveAt === null || version.effectiveAt <= now) &&
    (version.expiresAt === null || version.expiresAt > now)
  );
}
