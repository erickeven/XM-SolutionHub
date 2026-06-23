import type { Response } from 'express';
import { env } from '../../config';
import { logger } from '../../lib/logger';
import { AppError } from '../../lib/errors';
import { llmAdapter } from '../../lib/ai/llm';
import { searchKnowledgeWithDegradation } from '../knowledge/knowledge.search';
import type { ChatSource } from '../knowledge/knowledge.search.types';
import * as repository from './ai-chat.repository';
import type {
  SessionListResult,
  SessionMessagesResult,
  FeedbackInput,
} from './ai-chat.types';

function sendSSE(res: Response, event: string, data: unknown): void {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

export async function chat(
  res: Response,
  userId: string,
  role: string,
  query: string,
  sessionId?: string,
): Promise<void> {
  const startTime = Date.now();

  // ── Pre-SSE: errors here become JSON via errorHandler ──

  let session: { id: string };
  if (sessionId) {
    const existing = await repository.getSessionById(sessionId);
    if (!existing) {
      throw new AppError(2004, 'Session not found', 404);
    }
    if (existing.userId !== userId) {
      throw new AppError(2003, 'Forbidden', 403);
    }
    session = existing;
  } else {
    const created = await repository.createSession(userId, query.slice(0, 50));
    session = { id: created.id };
  }

  // Save user message
  await repository.createMessage({
    sessionId: session.id,
    role: 'user',
    status: 'COMPLETED',
    content: query,
  });

  // Create assistant placeholder
  const assistantMessage = await repository.createMessage({
    sessionId: session.id,
    role: 'assistant',
    status: 'STREAMING',
    content: '',
  });

  // ── SSE starts here ──

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  let disconnected = false;
  res.on('close', () => {
    disconnected = true;
  });

  const heartbeatInterval = setInterval(() => {
    if (!disconnected) {
      res.write(':heartbeat\n\n');
    }
  }, env.SSE_HEARTBEAT_MS);

  try {
    // 1. Send meta event
    sendSSE(res, 'meta', {
      messageId: assistantMessage.id,
      sessionId: session.id,
    });

    // 2. Search knowledge
    const searchResult = await searchKnowledgeWithDegradation(
      query,
      env.KNOWLEDGE_SEARCH_MODE,
      30,
      role,
    );

    // 3. No sources → low confidence reject
    if (searchResult.sources.length === 0) {
      sendSSE(res, 'error', {
        code: 'NO_SOURCES',
        message: '暂无相关资料支持该问题',
        retryable: false,
      });
      await repository.updateMessage(assistantMessage.id, {
        status: 'COMPLETED',
        content: '暂无相关资料支持该问题',
        sources: [],
      });
      return;
    }

    // 4. Send source events
    for (const source of searchResult.sources) {
      if (disconnected) break;
      sendSSE(res, 'source', source);
    }

    if (disconnected) {
      await repository.updateMessage(assistantMessage.id, {
        status: 'INTERRUPTED',
        content: '',
        sources: searchResult.sources as unknown as ChatSource[],
      });
      return;
    }

    // 5. Stream LLM response
    let fullContent = '';
    let llmFailed = false;

    try {
      const stream = llmAdapter.generateAnswer({
        question: query,
        sources: searchResult.sources,
      });
      for await (const delta of stream) {
        if (disconnected) break;
        fullContent += delta;
        sendSSE(res, 'delta', { content: delta });
      }
    } catch (err) {
      llmFailed = true;
      logger.warn({ err }, 'LLM streaming failed');
      if (!disconnected) {
        sendSSE(res, 'error', {
          code: 'LLM_UNAVAILABLE',
          message: '生成服务暂不可用',
          retryable: true,
        });
      }
    }

    // 6. Save final state
    if (disconnected) {
      // Client disconnected → save as INTERRUPTED
      await repository.updateMessage(assistantMessage.id, {
        status: 'INTERRUPTED',
        content: fullContent,
        sources: searchResult.sources as unknown as ChatSource[],
      });
    } else if (llmFailed) {
      // LLM failed → save sources, keep whatever content was produced
      await repository.updateMessage(assistantMessage.id, {
        status: 'COMPLETED',
        content: fullContent,
        sources: searchResult.sources as unknown as ChatSource[],
      });
    } else {
      // Success → save as COMPLETED
      await repository.updateMessage(assistantMessage.id, {
        status: 'COMPLETED',
        content: fullContent,
        sources: searchResult.sources as unknown as ChatSource[],
      });

      const latencyMs = Date.now() - startTime;
      sendSSE(res, 'done', {
        messageId: assistantMessage.id,
        usage: null,
        latencyMs,
      });
    }
  } finally {
    clearInterval(heartbeatInterval);
    if (!res.writableEnded) {
      res.end();
    }
  }
}

export async function listSessions(
  userId: string,
  role: string,
  page: number,
  pageSize: number,
  filterUserId?: string,
): Promise<SessionListResult> {
  if (role === 'ADMIN') {
    const result = await repository.listAllSessions(page, pageSize, filterUserId);
    return {
      items: result.items.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
      total: result.total,
      page,
      pageSize,
    };
  }

  const result = await repository.listSessions(userId, page, pageSize);
  return {
    items: result.items.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
    total: result.total,
    page,
    pageSize,
  };
}

export async function getSessionMessages(
  sessionId: string,
  userId: string,
  role: string,
): Promise<SessionMessagesResult> {
  const session = await repository.getSessionById(sessionId);
  if (!session) {
    throw new AppError(2004, 'Session not found', 404);
  }
  if (session.userId !== userId && role !== 'ADMIN') {
    throw new AppError(2003, 'Forbidden', 403);
  }

  const messages = await repository.listMessagesBySession(sessionId);
  return {
    session: { id: session.id, title: session.title },
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      status: m.status,
      content: m.content,
      sources: m.sources as ChatSource[] | null,
      feedback: m.feedback as {
        helpful: boolean;
        comment?: string;
        updatedAt: string;
      } | null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function updateFeedback(
  messageId: string,
  userId: string,
  input: FeedbackInput,
): Promise<{ messageId: string; feedback: FeedbackInput & { updatedAt: string } }> {
  const session = await repository.getSessionByMessageId(messageId);
  if (!session) {
    throw new AppError(2004, 'Message not found', 404);
  }
  if (session.userId !== userId) {
    throw new AppError(2003, 'Forbidden', 403);
  }

  const feedback = {
    helpful: input.helpful,
    ...(input.comment !== undefined && { comment: input.comment }),
    updatedAt: new Date().toISOString(),
  };

  await repository.updateMessageFeedback(messageId, feedback);
  return { messageId, feedback };
}