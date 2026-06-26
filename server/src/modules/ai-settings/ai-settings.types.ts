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

export interface UpdateProviderInput {
  name?: string;
  baseUrl?: string | null;
  apiKeyEncrypted?: string | null;
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