import { AppError } from '../../lib/errors';
import * as repository from './field-config.repository';
import type {
  FieldConfigListItem,
  CreateFieldConfigInput,
  UpdateFieldConfigInput,
} from './field-config.types';

const CORE_FIELDS = ['title', 'type', 'status'];

function toListItem(raw: {
  id: string;
  resourceType: string;
  fieldKey: string;
  label: string;
  fieldType: string;
  required: boolean;
  optionsJson: unknown | null;
  sortOrder: number;
  enabled: boolean;
  validationJson: unknown | null;
  createdAt: Date;
  updatedAt: Date;
}): FieldConfigListItem {
  return {
    id: raw.id,
    resourceType: raw.resourceType,
    fieldKey: raw.fieldKey,
    label: raw.label,
    fieldType: raw.fieldType,
    required: raw.required,
    optionsJson: raw.optionsJson,
    sortOrder: raw.sortOrder,
    enabled: raw.enabled,
    validationJson: raw.validationJson,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}

export async function listFields(enabledOnly?: boolean): Promise<FieldConfigListItem[]> {
  const items = await repository.findAll(enabledOnly);
  return items.map(toListItem);
}

export async function createField(input: CreateFieldConfigInput): Promise<FieldConfigListItem> {
  try {
    const raw = await repository.create(input);
    return toListItem(raw);
  } catch (err: unknown) {
    if (err instanceof Error && 'code' in err && (err as { code: string }).code === 'P2002') {
      throw new AppError(4002, 'Field key already exists for this resource type', 409);
    }
    throw err;
  }
}

export async function updateField(id: string, input: UpdateFieldConfigInput): Promise<FieldConfigListItem> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(4001, 'Field config not found', 404);
  }

  const raw = await repository.update(id, input);
  return toListItem(raw);
}

export async function toggleField(id: string, enabled: boolean): Promise<FieldConfigListItem> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(4001, 'Field config not found', 404);
  }

  const raw = await repository.updateEnabled(id, enabled);
  return toListItem(raw);
}

export async function deleteField(id: string): Promise<void> {
  const existing = await repository.findById(id);
  if (!existing) {
    throw new AppError(4001, 'Field config not found', 404);
  }

  if (CORE_FIELDS.includes(existing.fieldKey)) {
    throw new AppError(4003, `Cannot delete core field: ${existing.fieldKey}`, 403);
  }

  await repository.remove(id);
}