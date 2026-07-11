import { AppError } from '../../lib/errors';
import * as repository from './ui-content.repository';
import type { CreateUiContentInput, UpdateUiContentInput, UiContentItem } from './ui-content.types';
import { UI_CONTENT_DEFAULTS } from './ui-content.defaults';

let defaultsPromise: Promise<void> | null = null;

async function ensureDefaults(): Promise<void> {
  if (!defaultsPromise) {
    defaultsPromise = repository
      .createManyDefaults(UI_CONTENT_DEFAULTS)
      .then(() => undefined)
      .catch((error: unknown) => {
        defaultsPromise = null;
        throw error;
      });
  }
  await defaultsPromise;
}

function toItem(row: UiContentItem): UiContentItem {
  return row;
}

export async function listAdmin(): Promise<UiContentItem[]> {
  await ensureDefaults();
  const rows = await repository.findMany();
  return rows.map(toItem);
}

export async function listPublic(): Promise<Record<string, string>> {
  await ensureDefaults();
  const rows = await repository.findEnabled();
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

export async function createContent(input: CreateUiContentInput): Promise<UiContentItem> {
  try {
    return toItem(await repository.create(input));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new AppError(4002, 'UI content key already exists', 409);
    }
    throw error;
  }
}

export async function updateContent(id: string, input: UpdateUiContentInput): Promise<UiContentItem> {
  try {
    return toItem(await repository.update(id, input));
  } catch (error) {
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      throw new AppError(4001, 'UI content not found', 404);
    }
    throw error;
  }
}
