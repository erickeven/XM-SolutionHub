export interface AiProviderItem {
  id: string;
  providerType: string;
  name: string;
  baseUrl: string | null;
  apiKeyMasked: string | null;
  model: string | null;
  dimensions: number | null;
  enabled: boolean;
  isDefault: boolean;
}

/** Internal raw type from repository — includes un-masked apiKeyEncrypted */
export interface AiProviderRaw {
  id: string;
  providerType: string;
  name: string;
  baseUrl: string | null;
  apiKeyEncrypted: string | null;
  model: string | null;
  dimensions: number | null;
  enabled: boolean;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiPromptItem {
  id: string;
  key: string;
  title: string;
  content: string;
  enabled: boolean;
  version: number;
}

export interface AiPromptDetail extends AiPromptItem {
  createdAt: Date;
  updatedAt: Date;
}

/** Resolved runtime config for an AI provider — decrypted apiKey, used by llm/embedding adapters */
export interface AiProviderConfig {
  providerType: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  dimensions: number | null;
}

export interface UpdateProviderInput {
  name?: string;
  baseUrl?: string | null;
  apiKeyEncrypted?: string | null;
  /** Plaintext API key on input — encrypted before storage, NEVER returned from GET */
  apiKeyPlaintext?: string;
  model?: string | null;
  dimensions?: number | null;
  enabled?: boolean;
  isDefault?: boolean;
}

export interface UpdatePromptInput {
  title?: string;
  content?: string;
  enabled?: boolean;
}