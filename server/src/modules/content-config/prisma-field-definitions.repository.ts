import { Prisma, type FieldDefinition, type PrismaClient } from "../../generated/prisma/client.js";
import type { FieldDefinitionInput, FieldDefinitionsRepository, FieldDefinitionView } from "./field-definitions.repository.js";

function json(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null ? Prisma.JsonNull : value as Prisma.InputJsonValue;
}

function map(field: FieldDefinition | null): FieldDefinitionView | null {
  if (field === null) return null;
  const enumOptions = Array.isArray(field.enumOptions)
    ? field.enumOptions.filter((item): item is string => typeof item === "string")
    : null;
  return {
    id: field.id,
    configurationVersionId: field.configurationVersionId,
    entityType: field.entityType,
    code: field.code,
    label: field.label,
    type: field.type,
    unit: field.unit,
    enumOptions,
    validation: field.validation,
    visibility: field.visibility,
    displayOrder: field.displayOrder,
    required: field.required
  };
}

export class PrismaFieldDefinitionsRepository implements FieldDefinitionsRepository {
  public constructor(private readonly prisma: PrismaClient) {}

  public async list(version: number, entityType?: string): Promise<readonly FieldDefinitionView[]> {
    const fields = await this.prisma.fieldDefinition.findMany({
      where: {
        configurationVersion: { version },
        ...(entityType === undefined ? {} : { entityType })
      },
      orderBy: [{ entityType: "asc" }, { displayOrder: "asc" }, { code: "asc" }]
    });
    return fields.flatMap((field) => {
      const mapped = map(field);
      return mapped === null ? [] : [mapped];
    });
  }

  public async upsertInDraft(version: number, input: FieldDefinitionInput): Promise<FieldDefinitionView | null> {
    const configuration = await this.prisma.configurationVersion.findFirst({
      where: { version, status: "DRAFT" },
      select: { id: true }
    });
    if (configuration === null) return null;
    const field = await this.prisma.fieldDefinition.upsert({
      where: {
        configurationVersionId_entityType_code: {
          configurationVersionId: configuration.id,
          entityType: input.entityType,
          code: input.code
        }
      },
      create: {
        ...input,
        enumOptions: input.enumOptions === null ? Prisma.JsonNull : [...input.enumOptions],
        validation: json(input.validation),
        visibility: json(input.visibility),
        configurationVersionId: configuration.id
      },
      update: {
        label: input.label,
        type: input.type,
        unit: input.unit,
        enumOptions: input.enumOptions === null ? Prisma.JsonNull : [...input.enumOptions],
        validation: json(input.validation),
        visibility: json(input.visibility),
        displayOrder: input.displayOrder,
        required: input.required
      }
    });
    return map(field);
  }
}
