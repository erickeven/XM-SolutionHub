import { ApplicationError } from "../../shared/http/application-error.js";
import type { FieldDefinitionInput, FieldDefinitionsRepository, FieldDefinitionView } from "./field-definitions.repository.js";

export class FieldDefinitionsService {
  public constructor(private readonly repository: FieldDefinitionsRepository) {}

  public list(version: number, entityType?: string): Promise<readonly FieldDefinitionView[]> {
    return this.repository.list(version, entityType);
  }

  public async upsert(version: number, input: FieldDefinitionInput): Promise<FieldDefinitionView> {
    if (input.type === "ENUM" && (input.enumOptions === null || input.enumOptions.length === 0)) {
      throw new ApplicationError(400, 40020, "枚举字段必须定义至少一个选项");
    }
    if (input.type !== "ENUM" && input.enumOptions !== null) {
      throw new ApplicationError(400, 40021, "非枚举字段不能携带枚举选项");
    }
    const field = await this.repository.upsertInDraft(version, input);
    if (field === null) throw new ApplicationError(409, 40931, "只能修改草稿状态配置版本中的字段");
    return field;
  }
}
