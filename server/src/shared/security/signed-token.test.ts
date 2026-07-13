import { describe, expect, it } from "vitest";
import { createAccessToken, verifyAccessToken } from "./signed-token.js";

const secret = "a-secure-test-secret-that-is-at-least-32-chars";

describe("signed access token", () => {
  it("签发并验证两小时访问令牌", () => {
    const token = createAccessToken({ sub: "subject-1", type: "CUSTOMER" }, secret, 1_000);
    expect(verifyAccessToken(token, secret, 2_000)).toMatchObject({ sub: "subject-1", type: "CUSTOMER" });
  });

  it("拒绝篡改和过期令牌", () => {
    const token = createAccessToken({ sub: "subject-1", type: "CUSTOMER" }, secret, 1_000);
    expect(verifyAccessToken(`${token}x`, secret, 2_000)).toBeNull();
    expect(verifyAccessToken(token, secret, 8_000_000)).toBeNull();
  });
});
