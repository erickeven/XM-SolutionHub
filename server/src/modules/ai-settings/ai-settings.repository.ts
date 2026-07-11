import prisma from '../../lib/prisma';
import type { AiProviderRaw, AiPromptDetail } from './ai-settings.types';

export async function findAllProviders(): Promise<AiProviderRaw[]> {
  return prisma.aiProviderSetting.findMany({ orderBy: [{ providerType: 'asc' }, { name: 'asc' }] });
}

export async function findProviderById(id: string): Promise<AiProviderRaw | null> {
  return prisma.aiProviderSetting.findUnique({ where: { id } });
}

export async function findEnabledProvidersByType(type: string): Promise<AiProviderRaw[]> {
  return prisma.aiProviderSetting.findMany({
    where: { providerType: type, enabled: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
  });
}

export async function updateProvider(
  id: string,
  data: Partial<{
    name: string;
    baseUrl: string | null;
    apiKeyEncrypted: string | null;
    model: string | null;
    dimensions: number | null;
    enabled: boolean;
    isDefault: boolean;
  }>,
): Promise<AiProviderRaw> {
  return prisma.aiProviderSetting.update({ where: { id }, data });
}

export async function findAllPrompts(): Promise<AiPromptDetail[]> {
  return prisma.aiPromptSetting.findMany({ orderBy: { key: 'asc' } });
}

export async function findPromptById(id: string): Promise<AiPromptDetail | null> {
  return prisma.aiPromptSetting.findUnique({ where: { id } });
}

export async function findPromptByKey(key: string): Promise<AiPromptDetail | null> {
  return prisma.aiPromptSetting.findFirst({ where: { key, enabled: true } });
}

export async function updatePrompt(
  id: string,
  data: { title?: string; content?: string; enabled?: boolean },
): Promise<AiPromptDetail> {
  // Increment the version whenever prompt content changes.
  const upd: Record<string, unknown> = { ...data };
  if (data.content !== undefined) {
    upd.version = { increment: 1 } as unknown as number;
  }
  return prisma.aiPromptSetting.update({ where: { id }, data: upd as never });
}
