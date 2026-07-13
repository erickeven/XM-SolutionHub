import { ApplicationError } from "../http/application-error.js";

export type DynamicFieldType = "TEXT" | "NUMBER" | "BOOLEAN" | "ENUM" | "DATE" | "FILE";

export interface DynamicFieldDefinition {
  readonly id: string;
  readonly code: string;
  readonly type: DynamicFieldType;
  readonly required: boolean;
  readonly enumOptions: readonly string[] | null;
}

export interface FieldStorageValue {
  readonly fieldDefinitionId: string;
  readonly textValue: string | null;
  readonly numberValue: number | null;
  readonly booleanValue: boolean | null;
  readonly dateValue: Date | null;
  readonly fileVersionId: string | null;
}

export function toFieldStorageValue(definition: DynamicFieldDefinition, value: unknown): FieldStorageValue {
  const empty = {
    fieldDefinitionId: definition.id,
    textValue: null,
    numberValue: null,
    booleanValue: null,
    dateValue: null,
    fileVersionId: null
  };
  if (value === null || value === undefined || value === "") {
    if (definition.required) throw new ApplicationError(400, 40030, `缺少必填字段：${definition.code}`);
    return empty;
  }
  switch (definition.type) {
    case "TEXT":
      if (typeof value !== "string") throw new ApplicationError(400, 40031, `${definition.code} 必须是文本`);
      return { ...empty, textValue: value };
    case "NUMBER":
      if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new ApplicationError(400, 40032, `${definition.code} 必须是有限数字`);
      }
      return { ...empty, numberValue: value };
    case "BOOLEAN":
      if (typeof value !== "boolean") throw new ApplicationError(400, 40033, `${definition.code} 必须是布尔值`);
      return { ...empty, booleanValue: value };
    case "ENUM":
      if (typeof value !== "string" || definition.enumOptions?.includes(value) !== true) {
        throw new ApplicationError(400, 40034, `${definition.code} 不在受控枚举中`);
      }
      return { ...empty, textValue: value };
    case "DATE": {
      if (typeof value !== "string") throw new ApplicationError(400, 40035, `${definition.code} 必须是 ISO 日期`);
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) throw new ApplicationError(400, 40035, `${definition.code} 必须是 ISO 日期`);
      return { ...empty, dateValue: parsed };
    }
    case "FILE":
      if (typeof value !== "string" || !/^[0-9a-f-]{36}$/iu.test(value)) {
        throw new ApplicationError(400, 40036, `${definition.code} 必须引用文件版本`);
      }
      return { ...empty, fileVersionId: value };
  }
}

export function validateDynamicFieldSet(
  definitions: readonly DynamicFieldDefinition[],
  values: Readonly<Record<string, unknown>>
): readonly FieldStorageValue[] {
  const knownCodes = new Set(definitions.map((definition) => definition.code));
  const unknownCode = Object.keys(values).find((code) => !knownCodes.has(code));
  if (unknownCode !== undefined) throw new ApplicationError(400, 40037, `未知字段：${unknownCode}`);
  return definitions
    .map((definition) => toFieldStorageValue(definition, values[definition.code]))
    .filter((value) =>
      value.textValue !== null || value.numberValue !== null || value.booleanValue !== null ||
      value.dateValue !== null || value.fileVersionId !== null
    );
}
