import * as repository from './ai-settings.repository';
import { encryptApiKey, decryptApiKey } from './ai-settings.crypto';
import type {
  AiProviderItem,
  AiProviderRaw,
  AiProviderConfig,
  AiPromptItem,
  UpdateProviderInput,
  UpdatePromptInput,
} from './ai-settings.types';
import { AppError } from '../../lib/errors';
import { env } from '../../config';

function maskApiKey(key: string | null): string | null {
  if (!key || key.length < 8) return key;
  return key.slice(0, 4) + '****' + key.slice(-4);
}

function toProviderItem(p: AiProviderRaw): AiProviderItem {
  let apiKeyMasked: string | null = null;
  if (p.apiKeyEncrypted) {
    try {
      const plaintext = decryptApiKey(p.apiKeyEncrypted);
      apiKeyMasked = maskApiKey(plaintext);
    } catch {
      // If decryption fails, show the raw masked value for debugging
      apiKeyMasked = maskApiKey(p.apiKeyEncrypted);
    }
  }
  return {
    id: p.id,
    providerType: p.providerType,
    name: p.name,
    baseUrl: p.baseUrl,
    apiKeyMasked,
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

  // Encrypt apiKeyPlaintext if provided, then remove plaintext from what we store
  const { apiKeyPlaintext, ...rest } = input;
  const data: UpdateProviderInput = { ...rest };
  if (apiKeyPlaintext !== undefined) {
    data.apiKeyEncrypted = apiKeyPlaintext ? encryptApiKey(apiKeyPlaintext) : null;
  }

  const updated = await repository.updateProvider(id, data);
  return toProviderItem(updated);
}

export async function testConnection(input: {
  providerId?: string;
  providerType?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  let baseUrl: string;
  let apiKey: string;
  let model: string;

  if (input.providerId) {
    const provider = await repository.findProviderById(input.providerId);
    if (!provider) throw new AppError(4201, 'AI provider not found', 404);
    if (!provider.baseUrl || !provider.apiKeyEncrypted) {
      return { success: false, latencyMs: 0, error: 'Provider missing baseUrl or API key' };
    }
    baseUrl = provider.baseUrl;
    try {
      apiKey = decryptApiKey(provider.apiKeyEncrypted);
    } catch {
      return { success: false, latencyMs: 0, error: 'Failed to decrypt stored API key' };
    }
    model = provider.model ?? 'default';
  } else {
    if (!input.baseUrl || !input.apiKey) {
      return { success: false, latencyMs: 0, error: 'baseUrl and apiKey are required for ad-hoc test' };
    }
    baseUrl = input.baseUrl;
    apiKey = input.apiKey;
    model = input.model ?? 'default';
  }

  const cleanUrl = baseUrl.replace(/\/$/, '');
  const url = `${cleanUrl}/v1/chat/completions`;
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      return { success: false, latencyMs, error: `HTTP ${response.status}: ${body.slice(0, 200)}` };
    }

    return { success: true, latencyMs };
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, latencyMs, error: message };
  }
}

/**
 * Resolve effective provider config: DB first (enabled + isDefault DESC), env fallback.
 * Used by llm.ts and embedding.ts to get runtime API config.
 */
export async function getEffectiveProvider(type: string): Promise<AiProviderConfig | null> {
  const providers = await repository.findEnabledProvidersByType(type);
  if (providers.length > 0) {
    const p = providers[0]!;
    if (!p.apiKeyEncrypted) return null;
    let apiKey: string;
    try {
      apiKey = decryptApiKey(p.apiKeyEncrypted);
    } catch {
      return null;
    }
    return {
      providerType: p.providerType,
      baseUrl: p.baseUrl ?? '',
      apiKey,
      model: p.model ?? '',
      dimensions: p.dimensions,
    };
  }

  // Fallback to env vars
  if (type === 'llm') {
    if (!env.LLM_BASE_URL || !env.LLM_API_KEY) return null;
    return {
      providerType: 'llm',
      baseUrl: env.LLM_BASE_URL,
      apiKey: env.LLM_API_KEY,
      model: env.LLM_MODEL,
      dimensions: null,
    };
  }
  if (type === 'embedding') {
    if (!env.EMBEDDING_BASE_URL) return null;
    return {
      providerType: 'embedding',
      baseUrl: env.EMBEDDING_BASE_URL,
      apiKey: env.EMBEDDING_API_KEY ?? '',
      model: env.EMBEDDING_MODEL,
      dimensions: env.EMBEDDING_DIMENSIONS,
    };
  }
  return null;
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