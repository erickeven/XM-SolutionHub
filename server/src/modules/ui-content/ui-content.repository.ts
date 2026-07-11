import prisma from '../../lib/prisma';
import type { CreateUiContentInput, UpdateUiContentInput } from './ui-content.types';
import type { UI_CONTENT_DEFAULTS } from './ui-content.defaults';

export function createManyDefaults(defaults: typeof UI_CONTENT_DEFAULTS) {
  return prisma.uiContentSetting.createMany({
    data: defaults,
    skipDuplicates: true,
  });
}

export function findMany() {
  return prisma.uiContentSetting.findMany({
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  });
}

export function findEnabled() {
  return prisma.uiContentSetting.findMany({
    where: { enabled: true },
    orderBy: [{ group: 'asc' }, { key: 'asc' }],
  });
}

export function create(input: CreateUiContentInput) {
  return prisma.uiContentSetting.create({
    data: {
      key: input.key,
      group: input.group,
      label: input.label,
      value: input.value,
      enabled: input.enabled ?? true,
    },
  });
}

export function update(id: string, input: UpdateUiContentInput) {
  return prisma.uiContentSetting.update({
    where: { id },
    data: input,
  });
}
