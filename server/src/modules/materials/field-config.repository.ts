import prisma from '../../lib/prisma';
import { Prisma, type MaterialFieldConfig } from '@prisma/client';
import type { CreateFieldConfigInput, UpdateFieldConfigInput } from './field-config.types';

export async function findAll(enabledOnly?: boolean): Promise<MaterialFieldConfig[]> {
  const where: Record<string, unknown> = {};
  if (enabledOnly) {
    where.enabled = true;
  }
  return prisma.materialFieldConfig.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });
}

export async function findById(id: string): Promise<MaterialFieldConfig | null> {
  return prisma.materialFieldConfig.findUnique({ where: { id } });
}

export async function findByKey(fieldKey: string): Promise<MaterialFieldConfig | null> {
  return prisma.materialFieldConfig.findFirst({
    where: { fieldKey, resourceType: 'material' },
  });
}

export async function create(data: CreateFieldConfigInput): Promise<MaterialFieldConfig> {
  return prisma.materialFieldConfig.create({
    data: {
      resourceType: data.resourceType ?? 'material',
      fieldKey: data.fieldKey,
      label: data.label,
      fieldType: data.fieldType,
      required: data.required ?? false,
      optionsJson: (data.optionsJson ?? undefined) as never,
      sortOrder: data.sortOrder ?? 0,
      enabled: data.enabled ?? true,
      validationJson: data.validationJson ?? undefined,
    },
  });
}

export async function update(id: string, data: UpdateFieldConfigInput): Promise<MaterialFieldConfig> {
  const updateData: Record<string, unknown> = {};
  if (data.label !== undefined) updateData.label = data.label;
  if (data.fieldType !== undefined) updateData.fieldType = data.fieldType;
  if (data.required !== undefined) updateData.required = data.required;
  if (data.optionsJson !== undefined) {
    updateData.optionsJson = data.optionsJson === null ? Prisma.DbNull : data.optionsJson;
  }
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.validationJson !== undefined) {
    updateData.validationJson = data.validationJson === null ? Prisma.DbNull : data.validationJson;
  }

  return prisma.materialFieldConfig.update({
    where: { id },
    data: updateData as never,
  });
}

export async function updateEnabled(id: string, enabled: boolean): Promise<MaterialFieldConfig> {
  return prisma.materialFieldConfig.update({
    where: { id },
    data: { enabled },
  });
}

export async function remove(id: string): Promise<MaterialFieldConfig> {
  return prisma.materialFieldConfig.delete({ where: { id } });
}
