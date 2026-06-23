import { env } from '../../config';
import { logger } from '../logger';
import type { ChatSource } from '../../modules/knowledge/knowledge.search.types';

export interface GenerateAnswerInput {
  question: string;
  sources: ChatSource[];
}

export interface LlmAdapter {
  generateAnswer(input: GenerateAnswerInput): AsyncIterable<string>;
}

function buildSystemPrompt(sources: ChatSource[]): string {
  const sourceList = sources
    .map((s, i) => {
      const page = s.page ? ` 第${s.page}页` : '';
      return `[${i + 1}] ${s.title}${page}\n${s.snippet}`;
    })
    .join('\n\n');

  return (
    '你只能基于以下来源回答问题。如果来源不足以回答，请明确说明。\n' +
    '不要编造任何不在来源中的信息。\n' +
    `来源：\n${sourceList}`
  );
}

class OpenAiCompatibleLlmAdapter implements LlmAdapter {
  async *generateAnswer(input: GenerateAnswerInput): AsyncIterable<string> {
    if (!env.LLM_BASE_URL || !env.LLM_API_KEY) {
      throw new Error('LLM not configured');
    }

    const systemPrompt = buildSystemPrompt(input.sources);
    const baseUrl = env.LLM_BASE_URL.replace(/\/$/, '');

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.LLM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.LLM_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input.question },
        ],
        stream: true,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      logger.error({ status: response.status, body }, 'LLM API error');
      throw new Error(`LLM API returned ${response.status}`);
    }

    if (!response.body) {
      throw new Error('LLM API returned no body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;
        const data = trimmed.slice(6);
        if (data === '[DONE]') return;
        try {
          const json = JSON.parse(data) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) yield delta;
        } catch {
          // Skip malformed JSON chunks
        }
      }
    }
  }
}

export const llmAdapter = new OpenAiCompatibleLlmAdapter();