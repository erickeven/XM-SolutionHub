export type ConfigurableFieldType = "TEXT" | "NUMBER" | "BOOLEAN" | "ENUM" | "DATE" | "FILE";

export interface FieldDefinitionInput {
  readonly entityType: string;
  readonly code: string;
  readonly label: string;
  readonly type: ConfigurableFieldType;
  readonly unit: string | null;
  readonly enumOptions: readonly string[] | null;
  readonly validation: unknown;
  readonly visibility: unknown;
  readonly displayOrder: number;
  readonly required: boolean;
}

export interface FieldDefinitionView extends FieldDefinitionInput {
  readonly id: string;
  readonly configurationVersionId: string;
}

export interface FieldDefinitionsRepository {
  list(version: number, entityType?: string): Promise<readonly FieldDefinitionView[]>;
  upsertInDraft(version: number, input: FieldDefinitionInput): Promise<FieldDefinitionView | null>;
}
