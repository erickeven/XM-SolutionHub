import { apiClient } from './client';
import type { ApiResponse } from '../types/api';
import type {
  ChatSource,
  ChatSession,
  ChatMessage,
  SessionListResponse,
  SessionMessagesResponse,
  MessageFeedback,
} from '../types/ai-chat';

export type {
  ChatSource,
  ChatSession,
  ChatMessage,
  SessionListResponse,
  SessionMessagesResponse,
  MessageFeedback,
};

export interface SSEHandlers {
  onMeta: (data: { messageId: string; sessionId: string }) => void;
  onSource: (data: ChatSource) => void;
  onDelta: (data: { content: string }) => void;
  onDone: (data: { messageId: string; usage: unknown; latencyMs: number }) => void;
  onError: (data: { code: string; message: string; retryable: boolean }) => void;
}

export interface ListSessionsParams {
  page?: number;
  pageSize?: number;
}

export async function listSessions(params: ListSessionsParams = {}): Promise<SessionListResponse> {
  const { data: res } = await apiClient.get<ApiResponse<SessionListResponse>>('/ai/sessions', {
    params,
  });
  return res.data;
}

export async function getSessionMessages(sessionId: string): Promise<SessionMessagesResponse> {
  const { data: res } = await apiClient.get<ApiResponse<SessionMessagesResponse>>(
    `/ai/sessions/${sessionId}/messages`,
  );
  return res.data;
}

export async function sendFeedback(
  messageId: string,
  feedback: MessageFeedback,
): Promise<MessageFeedback> {
  const { data: res } = await apiClient.post<ApiResponse<MessageFeedback>>(
    `/ai/messages/${messageId}/feedback`,
    feedback,
  );
  return res.data;
}

export async function streamChat(
  query: string,
  sessionId: string | null,
  accessToken: string,
  handlers: SSEHandlers,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/v1/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ query, sessionId }),
    signal,
  });

  if (!response.ok) {
    const error = (await response.json()) as { code?: number | string; message?: string };
    handlers.onError({
      code: String(error.code ?? response.status),
      message: error.message ?? '请求失败',
      retryable: false,
    });
    return;
  }

  if (!response.body) {
    handlers.onError({ code: 'NO_BODY', message: '响应体为空', retryable: false });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let currentEvent = '';

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const dataStr = line.slice(6);
          if (dataStr.trim()) {
            try {
              const data = JSON.parse(dataStr) as unknown;
              switch (currentEvent) {
                case 'meta':
                  handlers.onMeta(data as { messageId: string; sessionId: string });
                  break;
                case 'source':
                  handlers.onSource(data as ChatSource);
                  break;
                case 'delta':
                  handlers.onDelta(data as { content: string });
                  break;
                case 'done':
                  handlers.onDone(data as { messageId: string; usage: unknown; latencyMs: number });
                  break;
                case 'error':
                  handlers.onError(data as { code: string; message: string; retryable: boolean });
                  break;
              }
            } catch {
              handlers.onError({
                code: 'PARSE_ERROR',
                message: '解析流数据失败',
                retryable: false,
              });
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
