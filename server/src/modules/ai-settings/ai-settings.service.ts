import * as repository from './ai-settings.repository';
import type {
  AiProviderItem,
  AiProviderRaw,
  AiPromptItem,
  UpdateProviderInput,
  UpdatePromptInput,
} from './ai-settings.types';
import { AppError } from '../../lib/errors';

// ponytail: simple mask, add AES decryption when storing real encrypted keys
function maskApiKey(key: string | null): string | null {
  if (!key || key.length < 8) return key;
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function toProviderItem(p: AiProviderRaw): AiProviderItem {
  return {
    id: p.id,
    providerType: p.providerType,
    name: p.name,
    baseUrl: p.baseUrl,
    apiKeyMasked: maskApiKey(p.apiKeyEncrypted),
    model: p.model,
    dimensions: p.dimensions,
    enabled: p.enabled,
    isDefault: p.isDefault,
  };
}

export async function listProviders(): Promise<AiProviderItem[]> {
  const providers = await repository.findAllProviders();
  return providers.map(toProviderItem);
}

export async function getProvider(id: string): Promise<AiProviderItem> {
  const provider = await repository.findProviderById(id);
  if (!provider) throw new AppError(4201, 'AI provider not found', 404);
  return toProviderItem(provider);
}

export async function updateProvider(
  id: string,
  input: UpdateProviderInput,
): Promise<AiProviderItem> {
  const existing = await repository.findProviderById(id);
  if (!existing) throw new AppError(4201, 'AI provider not found', 404);

  // ponytail: if setting isDefault, unset other defaults for same type
  if (input.isDefault) {
    const allProviders = await repository.findAllProviders();
    for (const p of allProviders) {
      if (p.id !== id && p.providerType === existing.providerType && p.isDefault) {
        await repository.updateProvider(p.id, { isDefault: false });
      }
    }
  }

  const updated = await repository.updateProvider(id, input);
  return toProviderItem(updated);
}

export async function testConnection(): Promise<{ success: boolean; latencyMs: number }> {
  // ponytail: stub — add real LLM ping when providers are configured
  return { success: true, latencyMs: 0 };
}

export async function listPrompts(): Promise<AiPromptItem[]> {
  const prompts = await repository.findAllPrompts();
  return prompts.map((p) => ({
    id: p.id,
    key: p.key,
    title: p.title,
    content: p.content,
    enabled: p.enabled,
    version: p.version,
  }));
}

export async function getPrompt(id: string): Promise<AiPromptItem> {
  const prompt = await repository.findPromptById(id);
  if (!prompt) throw new AppError(4202, 'AI prompt not found', 404);
  return {
    id: prompt.id,
    key: prompt.key,
    title: prompt.title,
    content: prompt.content,
    enabled: prompt.enabled,
    version: prompt.version,
  };
}

export async function updatePrompt(
  id: string,
  input: UpdatePromptInput,
): Promise<AiPromptItem> {
  const existing = await repository.findPromptById(id);
  if (!existing) throw new AppError(4202, 'AI prompt not found', 404);
  const updated = await repository.updatePrompt(id, input);
  return {
    id: updated.id,
    key: updated.key,
    title: updated.title,
    content: updated.content,
    enabled: updated.enabled,
    version: updated.version,
  };
}