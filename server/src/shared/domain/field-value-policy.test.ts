import { describe, expect, it } from "vitest";
import { toFieldStorageValue, validateDynamicFieldSet } from "./field-value-policy.js";

describe("dynamic field value policy", () => {
  it("按字段定义而不是硬编码实体字段映射数字", () => {
    expect(toFieldStorageValue({ id: "field-1", code: "voltage", type: "NUMBER", required: true, enumOptions: null }, 650))
      .toMatchObject({ fieldDefinitionId: "field-1", numberValue: 650 });
  });

  it("拒绝不在字段定义中的值", () => {
    expect(() => validateDynamicFieldSet([], { invented: "value" })).toThrow("未知字段");
  });

  it("验证受控枚举", () => {
    expect(() => toFieldStorageValue({ id: "field-2", code: "package", type: "ENUM", required: true, enumOptions: ["SOP8"] }, "DIP8"))
      .toThrow("受控枚举");
  });
});
