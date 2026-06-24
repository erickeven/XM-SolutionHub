import prisma from '../../lib/prisma';
import type { ProductFieldConfig } from '@prisma/client';
import type { CreateFieldConfigInput, UpdateFieldConfigInput } from './field-config.types';

export async function findAll(enabledOnly?: boolean): Promise<ProductFieldConfig[]> {
  const where: Record<string, unknown> = {};
  if (enabledOnly) {
    where.enabled = true;
  }
  return prisma.productFieldConfig.findMany({
    where,
    orderBy: { sortOrder: 'asc' },
  });
}

export async function findById(id: string): Promise<ProductFieldConfig | null> {
  return prisma.productFieldConfig.findUnique({ where: { id } });
}

export async function findByKey(fieldKey: string): Promise<ProductFieldConfig | null> {
  return prisma.productFieldConfig.findFirst({
    where: { fieldKey, resourceType: 'product' },
  });
}

export async function create(data: CreateFieldConfigInput): Promise<ProductFieldConfig> {
  return prisma.productFieldConfig.create({
    data: {
      resourceType: data.resourceType ?? 'product',
      fieldKey: data.fieldKey,
      label: data.label,
      fieldType: data.fieldType,
      required: data.required ?? false,
      optionsJson: data.optionsJson ?? undefined,
      sortOrder: data.sortOrder ?? 0,
      enabled: data.enabled ?? true,
      validationJson: data.validationJson ?? undefined,
    },
  });
}

export async function update(id: string, data: UpdateFieldConfigInput): Promise<ProductFieldConfig> {
  const updateData: Record<string, unknown> = {};
  if (data.label !== undefined) updateData.label = data.label;
  if (data.fieldType !== undefined) updateData.fieldType = data.fieldType;
  if (data.required !== undefined) updateData.required = data.required;
  if (data.optionsJson !== undefined) updateData.optionsJson = data.optionsJson;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.enabled !== undefined) updateData.enabled = data.enabled;
  if (data.validationJson !== undefined) updateData.validationJson = data.validationJson;

  return prisma.productFieldConfig.update({
    where: { id },
    data: updateData as never,
  });
}

export async function updateEnabled(id: string, enabled: boolean): Promise<ProductFieldConfig> {
  return prisma.productFieldConfig.update({
    where: { id },
    data: { enabled },
  });
}

export async function remove(id: string): Promise<ProductFieldConfig> {
  return prisma.productFieldConfig.delete({ where: { id } });
}