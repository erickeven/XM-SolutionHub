import { describe, expect, it, vi } from "vitest";
import type { FieldDefinitionsRepository } from "./field-definitions.repository.js";
import { FieldDefinitionsService } from "./field-definitions.service.js";

const base = {
  entityType: "product",
  code: "voltage_max",
  label: "最大电压",
  type: "NUMBER" as const,
  unit: "V",
  enumOptions: null,
  validation: {},
  visibility: {},
  displayOrder: 10,
  required: true
};

describe("FieldDefinitionsService", () => {
  it("拒绝没有选项的枚举字段", async () => {
    const repository: FieldDefinitionsRepository = { list: vi.fn(), upsertInDraft: vi.fn() };
    await expect(
      new FieldDefinitionsService(repository).upsert(2, { ...base, type: "ENUM", enumOptions: null })
    ).rejects.toMatchObject({ status: 400 });
  });

  it("禁止修改已发布配置中的字段", async () => {
    const repository: FieldDefinitionsRepository = {
      list: vi.fn(),
      upsertInDraft: vi.fn().mockResolvedValue(null)
    };
    await expect(new FieldDefinitionsService(repository).upsert(1, base)).rejects.toMatchObject({ status: 409 });
  });
});
