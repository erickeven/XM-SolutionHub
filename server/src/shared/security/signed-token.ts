import { createHmac, timingSafeEqual } from "node:crypto";

export interface AccessTokenPayload {
  readonly sub: string;
  readonly type: "CUSTOMER" | "INTERNAL" | "SYSTEM_ADMIN";
  readonly exp: number;
}

function signature(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAccessToken(
  subject: Omit<AccessTokenPayload, "exp">,
  secret: string,
  now = Date.now()
): string {
  const payload: AccessTokenPayload = { ...subject, exp: Math.floor(now / 1000) + 2 * 60 * 60 };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encoded}.${signature(encoded, secret)}`;
}

export function verifyAccessToken(token: string, secret: string, now = Date.now()): AccessTokenPayload | null {
  const [encoded, supplied] = token.split(".");
  if (encoded === undefined || supplied === undefined) return null;
  const expected = signature(encoded, secret);
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  if (suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) return null;
  try {
    const parsed: unknown = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("sub" in parsed) ||
      !("type" in parsed) ||
      !("exp" in parsed) ||
      typeof parsed.sub !== "string" ||
      (parsed.type !== "CUSTOMER" && parsed.type !== "INTERNAL" && parsed.type !== "SYSTEM_ADMIN") ||
      typeof parsed.exp !== "number" ||
      parsed.exp <= Math.floor(now / 1000)
    ) return null;
    return { sub: parsed.sub, type: parsed.type, exp: parsed.exp };
  } catch {
    return null;
  }
}
