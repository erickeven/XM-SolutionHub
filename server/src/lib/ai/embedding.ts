import { logger } from '../logger';
import { getEffectiveProvider } from '../../modules/ai-settings/ai-settings.service';

interface EmbeddingResponse {
  data: Array<{ embedding: number[] }>;
}

async function getEmbeddingConfig() {
  const provider = await getEffectiveProvider('embedding');
  if (!provider) {
    throw new Error('Embedding not configured — no enabled provider in DB and no embedding env vars');
  }
  return provider;
}

/**
 * Get embedding for a single text via OpenAI-compatible /v1/embeddings endpoint.
 * Throws on failure — embeddings are critical for the indexing pipeline.
 */
export async function embed(text: string): Promise<number[]> {
  const provider = await getEmbeddingConfig();
  const baseUrl = provider.baseUrl.replace(/\/$/, '');

  const res = await fetch(`${baseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: provider.model,
      input: text,
      dimensions: provider.dimensions,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Embedding API error ${res.status}: ${body}`);
  }

  const json = (await res.json()) as EmbeddingResponse;
  return json.data[0]!.embedding;
}

/**
 * Batch embed multiple texts. Sends in groups of 10 (API limit).
 * Preserves input order in output array.
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const provider = await getEmbeddingConfig();
  const baseUrl = provider.baseUrl.replace(/\/$/, '');
  const BATCH_SIZE = 10;
  const results: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const res = await fetch(`${baseUrl}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        input: batch,
        dimensions: provider.dimensions,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Embedding API batch error ${res.status}: ${body}`);
    }

    const json = (await res.json()) as EmbeddingResponse;
    for (const item of json.data) {
      results.push(item.embedding);
    }
  }

  logger.debug({ count: results.length }, 'Batch embedding complete');
  return results;
}

/** Convert a number array to pgvector string format: "[0.1,0.2,...]" */
export function toVectorString(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}