export interface ChatSource {
  docId: string;
  eventId?: string;
  title: string;
  page?: number;
  snippet: string;
  entities: string[];
  score: number;
}

export type MessageRole = 'user' | 'assistant';
export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface MessageFeedback {
  helpful: boolean;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  status: MessageStatus;
  content: string;
  sources: ChatSource[];
  feedback: MessageFeedback | null;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListResponse {
  items: ChatSession[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SessionMessagesResponse {
  session: {
    id: string;
    title: string;
  };
  messages: ChatMessage[];
}
