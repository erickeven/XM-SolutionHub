import { logger } from '../logger';
import { loadPrompt, getEffectiveProvider } from '../../modules/ai-settings/ai-settings.service';

export interface ExtractedEvent {
  summary: string;
  eventType: string;
}

export interface ExtractedEntity {
  name: string;
  entityType: string;
  role: string;
}

export interface ExtractionResult {
  event: ExtractedEvent | null;
  entities: ExtractedEntity[];
}

interface LLMResponse {
  choices: Array<{ message: { content: string } }>;
}

const HARDCODED_SYSTEM_PROMPT = `你是一个技术文档分析助手。请从给定的文本片段中提取一个关键事件和相关的实体。

输出格式为严格的 JSON：
{
  "event": {
    "summary": "事件的简短摘要",
    "eventType": "事件类型，如：产品发布、技术参数、应用场景、测试结果、认证标准"
  },
  "entities": [
    {
      "name": "实体名称",
      "entityType": "实体类型，如：产品、技术、标准、组织、参数",
      "role": "实体在事件中的角色，如：主体、对象、属性、环境"
    }
  ]
}

规则：
1. 如果文本中没有明确的事件，将 event 设为 null
2. 实体列表可以为空
3. 只输出 JSON，不要输出其他内容`;

/**
 * Extract one event and multiple entities from a chunk via LLM.
 * Graceful degradation: if LLM unavailable or parsing fails, returns { event: null, entities: [] }.
 */
export async function extractEventAndEntities(
  chunkContent: string,
): Promise<ExtractionResult> {
  const provider = await getEffectiveProvider('llm');
  if (!provider || !provider.baseUrl) {
    logger.warn('No LLM provider configured, skipping event/entity extraction');
    return { event: null, entities: [] };
  }

  const url = `${provider.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  try {
    const dbPrompt = await loadPrompt('extraction').catch(() => null);
    const systemPrompt = dbPrompt ?? HARDCODED_SYSTEM_PROMPT;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: chunkContent },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn(
        { status: res.status, body },
        'LLM API error, skipping extraction',
      );
      return { event: null, entities: [] };
    }

    const json = (await res.json()) as LLMResponse;
    const content = json.choices[0]?.message.content;
    if (!content) {
      logger.warn('LLM returned empty content, skipping extraction');
      return { event: null, entities: [] };
    }

    // Extract JSON from the response (LLM may wrap in markdown code blocks)
    const jsonStr = extractJson(content);
    if (!jsonStr) {
      logger.warn('Could not parse JSON from LLM response, skipping extraction');
      return { event: null, entities: [] };
    }

    const parsed = JSON.parse(jsonStr) as {
      event: ExtractedEvent | null;
      entities: ExtractedEntity[];
    };

    return {
      event: parsed.event ?? null,
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    };
  } catch (err) {
    logger.warn({ err }, 'LLM extraction failed, graceful degradation');
    return { event: null, entities: [] };
  }
}

// ── Query entity extraction (for standard search mode) ──────────

const HARDCODED_ENTITY_EXTRACTION_PROMPT = `Extract all entity names (product models, parameters, technical terms) from the user's question. Return as JSON array of strings.

Example:
Question: "LP9961的LLC谐振频率是多少？"
Output: ["LP9961", "LLC", "谐振频率"]

Rules:
1. Only output a JSON array of strings, nothing else
2. If no entities found, return []`;

/**
 * Extract entity names from a user query via LLM.
 * Used by StandardKnowledgeSearchAdapter for entity-driven recall.
 * If LLM unavailable: returns [] (caller falls back to trigram matching).
 */
export async function extractQueryEntities(query: string): Promise<string[]> {
  const provider = await getEffectiveProvider('llm');
  if (!provider || !provider.baseUrl) {
    logger.warn('No LLM provider configured, skipping query entity extraction');
    return [];
  }

  const url = `${provider.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  try {
    const dbPrompt = await loadPrompt('entity_query').catch(() => null);
    const systemPrompt = dbPrompt ?? HARDCODED_ENTITY_EXTRACTION_PROMPT;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query },
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn({ status: res.status, body }, 'LLM API error in entity extraction');
      return [];
    }

    const json = (await res.json()) as LLMResponse;
    const content = json.choices[0]?.message.content;
    if (!content) {
      logger.warn('LLM returned empty content for entity extraction');
      return [];
    }

    const jsonStr = extractJson(content);
    if (!jsonStr) {
      // Try parsing as array directly
      const trimmed = content.trim();
      if (trimmed.startsWith('[')) {
        try {
          const arr = JSON.parse(trimmed) as unknown;
          if (Array.isArray(arr)) {
            return arr.filter((x): x is string => typeof x === 'string');
          }
        } catch {
          // fall through
        }
      }
      logger.warn('Could not parse entity array from LLM response');
      return [];
    }

    const parsed = JSON.parse(jsonStr) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === 'string');
    }
    return [];
  } catch (err) {
    logger.warn({ err }, 'LLM entity extraction failed, graceful degradation');
    return [];
  }
}

// ── LLM precision ranking (for standard search mode) ─────────────

interface LLMRankResponse {
  choices: Array<{ message: { content: string } }>;
}

const HARDCODED_RANK_PROMPT = `Rank these document snippets by relevance to the question. Return JSON array of { "index": number, "relevance_score": number } pairs. relevance_score is 0.0 to 1.0.

Rules:
1. Only output the JSON array, nothing else
2. index is 0-based position in the input array
3. Higher relevance_score = more relevant`;

/**
 * Use LLM to rank candidate snippets by relevance to the query.
 * Returns null if LLM unavailable (caller falls back to rerank API).
 */
export async function llmRankCandidates(
  query: string,
  candidates: { id: string; content: string }[],
): Promise<{ id: string; score: number }[] | null> {
  const provider = await getEffectiveProvider('llm');
  if (!provider || !provider.baseUrl) {
    logger.warn('No LLM provider configured, skipping LLM precision ranking');
    return null;
  }

  if (candidates.length === 0) return [];

  const url = `${provider.baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  const snippets = candidates.map((c, i) => `[${i}] ${c.content.slice(0, 300)}`).join('\n');
  const userMsg = `Question: ${query}\n\nSnippets:\n${snippets}`;

  try {
    const dbPrompt = await loadPrompt('rerank').catch(() => null);
    const systemPrompt = dbPrompt ?? HARDCODED_RANK_PROMPT;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      logger.warn({ status: res.status, body }, 'LLM API error in ranking');
      return null;
    }

    const json = (await res.json()) as LLMRankResponse;
    const content = json.choices[0]?.message.content;
    if (!content) {
      logger.warn('LLM returned empty content for ranking');
      return null;
    }

    const jsonStr = extractJson(content);
    if (!jsonStr) {
      // Try parsing as array directly
      const trimmed = content.trim();
      if (trimmed.startsWith('[')) {
        try {
          const arr = JSON.parse(trimmed) as unknown;
          if (Array.isArray(arr)) {
            return parseRankResults(arr, candidates);
          }
        } catch {
          // fall through
        }
      }
      logger.warn('Could not parse ranking from LLM response');
      return null;
    }

    const parsed = JSON.parse(jsonStr) as unknown;
    if (Array.isArray(parsed)) {
      return parseRankResults(parsed, candidates);
    }
    return null;
  } catch (err) {
    logger.warn({ err }, 'LLM ranking failed, graceful degradation');
    return null;
  }
}

function parseRankResults(
  arr: unknown[],
  candidates: { id: string; content: string }[],
): { id: string; score: number }[] {
  const results: { id: string; score: number }[] = [];
  for (const item of arr) {
    if (typeof item !== 'object' || item === null) continue;
    const obj = item as Record<string, unknown>;
    const index = typeof obj.index === 'number' ? obj.index : undefined;
    const score = typeof obj.relevance_score === 'number' ? obj.relevance_score : undefined;
    if (index === undefined || score === undefined) continue;
    const candidate = candidates[index];
    if (!candidate) continue;
    results.push({ id: candidate.id, score });
  }
  return results;
}

function extractJson(content: string): string | null {
  // Try direct parse first
  try {
    JSON.parse(content);
    return content;
  } catch {
    // Try extracting from markdown code block
    const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match && match[1]) {
      try {
        JSON.parse(match[1]);
        return match[1];
      } catch {
        // fall through
      }
    }
    // Try finding first { and last }
    const start = content.indexOf('{');
    const end = content.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const substr = content.slice(start, end + 1);
      try {
        JSON.parse(substr);
        return substr;
      } catch {
        // fall through
      }
    }
    return null;
  }
}