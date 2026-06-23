import prisma from '../../lib/prisma';
import type { Prisma, ChatMessageStatus } from '@prisma/client';

export async function createSession(userId: string, title: string) {
  return prisma.chatSession.create({ data: { userId, title } });
}

export async function getSessionById(id: string) {
  return prisma.chatSession.findUnique({ where: { id } });
}

export async function listSessions(
  userId: string,
  page: number,
  pageSize: number,
) {
  const where = { userId };
  const [items, total] = await Promise.all([
    prisma.chatSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.chatSession.count({ where }),
  ]);
  return { items, total };
}

export async function listAllSessions(
  page: number,
  pageSize: number,
  userId?: string,
) {
  const where = userId ? { userId } : undefined;
  const [items, total] = await Promise.all([
    prisma.chatSession.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.chatSession.count({ where }),
  ]);
  return { items, total };
}

export async function listMessagesBySession(sessionId: string) {
  return prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createMessage(data: {
  sessionId: string;
  role: string;
  status: ChatMessageStatus;
  content: string;
  sources?: unknown;
}) {
  return prisma.chatMessage.create({
    data: {
      sessionId: data.sessionId,
      role: data.role,
      status: data.status,
      content: data.content,
      sources: data.sources as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function updateMessage(
  id: string,
  data: {
    status?: ChatMessageStatus;
    content?: string;
    sources?: unknown;
  },
) {
  return prisma.chatMessage.update({
    where: { id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.sources !== undefined && {
        sources: data.sources as Prisma.InputJsonValue,
      }),
    },
  });
}

export async function updateMessageFeedback(
  id: string,
  feedback: { helpful: boolean; comment?: string; updatedAt: string },
) {
  return prisma.chatMessage.update({
    where: { id },
    data: { feedback: feedback as Prisma.InputJsonValue },
  });
}

export async function getSessionByMessageId(messageId: string) {
  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: {
      session: {
        select: { id: true, userId: true, title: true },
      },
    },
  });
  return message?.session ?? null;
}