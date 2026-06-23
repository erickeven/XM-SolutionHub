import type { ChatSource } from '../knowledge/knowledge.search.types';

export interface ChatRequest {
  query: string;
  sessionId?: string;
}

export interface ChatSessionItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageItem {
  id: string;
  role: string;
  status: string;
  content: string;
  sources: ChatSource[] | null;
  feedback: { helpful: boolean; comment?: string; updatedAt: string } | null;
  createdAt: string;
}

export interface FeedbackInput {
  helpful: boolean;
  comment?: string;
}

export interface SessionMessagesResult {
  session: { id: string; title: string };
  messages: ChatMessageItem[];
}

export interface SessionListResult {
  items: ChatSessionItem[];
  total: number;
  page: number;
  pageSize: number;
}