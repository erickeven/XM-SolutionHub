import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { Drawer, Tabs, message } from 'antd';
import { HistoryOutlined, MessageOutlined, FileTextOutlined } from '@ant-design/icons';
import { useAuth } from '../../hooks/useAuth';
import { useAuthStore } from '../../stores/authStore';
import { listSessions, getSessionMessages, streamChat, sendFeedback } from '../../api/ai-chat';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import { SessionList } from './SessionList';
import { SourcePanel } from './SourcePanel';
import type { ChatMessage } from '../../types/ai-chat';

type TabKey = 'history' | 'chat' | 'sources';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AiChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const accessToken = useAuthStore((state) => state.accessToken);
  const queryClient = useQueryClient();

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingQuery, setPendingQuery] = useState<string | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<TabKey>('chat');
  const [leftDrawerOpen, setLeftDrawerOpen] = useState(false);
  const [rightDrawerOpen, setRightDrawerOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auth guard
  useEffect(() => {
    if (!isAuthenticated) {
      localStorage.setItem('redirectAfterAuth', window.location.pathname);
    }
  }, [isAuthenticated]);

  const { data: sessionsData } = useQuery({
    queryKey: ['ai-sessions'],
    queryFn: () => listSessions({ page: 1, pageSize: 50 }),
    enabled: isAuthenticated && !!accessToken,
  });

  const { data: sessionMessagesData } = useQuery({
    queryKey: ['ai-session-messages', sessionId],
    queryFn: () => getSessionMessages(sessionId!),
    enabled: !!sessionId && isAuthenticated && !!accessToken,
  });

  // Sync server messages to local view when not streaming
  useEffect(() => {
    if (sessionMessagesData && !isStreaming) {
      setLocalMessages(sessionMessagesData.messages);
    }
  }, [sessionMessagesData, isStreaming]);

  // Clear local state when switching to a new chat
  useEffect(() => {
    if (!sessionId) {
      setLocalMessages([]);
      setStreamingContent('');
      setIsStreaming(false);
      setPendingQuery(undefined);
      setErrorMessage(undefined);
    }
  }, [sessionId]);

  const currentSources = localMessages
    .filter((m) => m.role === 'assistant')
    .flatMap((m) => m.sources);

  const feedbackMutation = useMutation({
    mutationFn: ({ messageId, helpful }: { messageId: string; helpful: boolean }) =>
      sendFeedback(messageId, { helpful }),
    onSuccess: (_, variables) => {
      setLocalMessages((prev) =>
        prev.map((msg) =>
          msg.id === variables.messageId
            ? { ...msg, feedback: { helpful: variables.helpful } }
            : msg,
        ),
      );
      message.success('反馈已提交');
    },
    onError: () => {
      message.error('反馈提交失败');
    },
  });

  const handleFeedback = useCallback(
    (messageId: string, helpful: boolean) => {
      feedbackMutation.mutate({ messageId, helpful });
    },
    [feedbackMutation],
  );

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const handleSend = useCallback(
    async (query: string) => {
      if (!query.trim() || !accessToken) return;

      setPendingQuery(undefined);
      setErrorMessage(undefined);
      setIsStreaming(true);
      setStreamingContent('');
      setActiveTab('chat');

      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        status: 'complete',
        content: query.trim(),
        sources: [],
        feedback: null,
        createdAt: new Date().toISOString(),
      };

      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        status: 'pending',
        content: '',
        sources: [],
        feedback: null,
        createdAt: new Date().toISOString(),
      };

      setLocalMessages((prev) => [...prev, userMessage, assistantMessage]);

      abortControllerRef.current = new AbortController();
      let assistantId = assistantMessage.id;

      try {
        await streamChat(
          query.trim(),
          sessionId ?? null,
          accessToken,
          {
            onMeta: (data) => {
              assistantId = data.messageId;
              setLocalMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantMessage.id
                    ? { ...msg, id: data.messageId, status: 'streaming' }
                    : msg,
                ),
              );
              if (!sessionId) {
                navigate(`/ai-chat/${data.sessionId}`, { replace: true });
              }
            },
            onSource: (data) => {
              setLocalMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId ? { ...msg, sources: [...msg.sources, data] } : msg,
                ),
              );
            },
            onDelta: (data) => {
              setStreamingContent((prev) => prev + data.content);
              setLocalMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, content: msg.content + data.content, status: 'streaming' }
                    : msg,
                ),
              );
            },
            onDone: () => {
              setIsStreaming(false);
              setStreamingContent('');
              setLocalMessages((prev) =>
                prev.map((msg) => (msg.id === assistantId ? { ...msg, status: 'complete' } : msg)),
              );
              queryClient.invalidateQueries({ queryKey: ['ai-sessions'] });
              queryClient.invalidateQueries({ queryKey: ['ai-session-messages', sessionId] });
            },
            onError: (data) => {
              setIsStreaming(false);
              setStreamingContent('');
              setPendingQuery(query.trim());
              setErrorMessage(data.message);
              setLocalMessages((prev) =>
                prev.map((msg) =>
                  msg.id === assistantId
                    ? { ...msg, status: 'error', content: msg.content || '生成失败' }
                    : msg,
                ),
              );
            },
          },
          abortControllerRef.current.signal,
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          setIsStreaming(false);
          setStreamingContent('');
          setLocalMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, status: 'error', content: '已停止生成' } : msg,
            ),
          );
          return;
        }
        setIsStreaming(false);
        setStreamingContent('');
        setPendingQuery(query.trim());
        setErrorMessage(err instanceof Error ? err.message : '请求失败');
        setLocalMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, status: 'error', content: '生成失败' } : msg,
          ),
        );
      } finally {
        abortControllerRef.current = null;
      }
    },
    [accessToken, sessionId, navigate, queryClient],
  );

  const handleRetry = useCallback(() => {
    if (pendingQuery) {
      void handleSend(pendingQuery);
    }
  }, [pendingQuery, handleSend]);

  const handleNewChat = useCallback(() => {
    navigate('/ai-chat');
  }, [navigate]);

  const handleSelectSession = useCallback(
    (id: string) => {
      navigate(`/ai-chat/${id}`);
      setLeftDrawerOpen(false);
    },
    [navigate],
  );

  const handleRecommend = useCallback((question: string) => {
    setPendingQuery(question);
    setLeftDrawerOpen(false);
  }, []);

  const sessions = sessionsData?.items ?? [];

  if (!isAuthenticated || !accessToken) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-[calc(100vh-64px-56px)] bg-slate-50 md:h-[calc(100vh-64px)]">
      {/* Desktop left sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white md:block">
        <SessionList
          sessions={sessions}
          currentSessionId={sessionId ?? null}
          onSelect={handleSelectSession}
          onNew={handleNewChat}
          onRecommend={handleRecommend}
        />
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header / tab switcher */}
        <div className="border-b border-slate-200 bg-white md:hidden">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key as TabKey)}
            centered
            items={[
              {
                key: 'history',
                label: (
                  <span onClick={() => setLeftDrawerOpen(true)}>
                    <HistoryOutlined /> 历史
                  </span>
                ),
              },
              { key: 'chat', label: <MessageOutlined /> },
              {
                key: 'sources',
                label: (
                  <span onClick={() => setRightDrawerOpen(true)}>
                    <FileTextOutlined /> 来源
                  </span>
                ),
              },
            ]}
          />
        </div>

        {activeTab === 'chat' && (
          <>
            <div className="flex-1 overflow-y-auto">
              {errorMessage && (
                <div className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
                  {errorMessage}
                </div>
              )}
              <ChatMessageList
                messages={localMessages}
                streamingContent={streamingContent}
                isStreaming={isStreaming}
                onFeedback={handleFeedback}
              />
            </div>
            <ChatInput
              onSend={handleSend}
              onStop={handleStop}
              onRetry={handleRetry}
              disabled={false}
              isStreaming={isStreaming}
              pendingQuery={pendingQuery}
            />
          </>
        )}

        {activeTab === 'sources' && (
          <div className="block flex-1 overflow-y-auto md:hidden">
            <SourcePanel sources={currentSources} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="block flex-1 overflow-y-auto md:hidden">
            <SessionList
              sessions={sessions}
              currentSessionId={sessionId ?? null}
              onSelect={handleSelectSession}
              onNew={handleNewChat}
              onRecommend={handleRecommend}
            />
          </div>
        )}
      </main>

      {/* Desktop right sidebar */}
      <aside className="hidden w-80 shrink-0 border-l border-slate-200 bg-white lg:block">
        <SourcePanel sources={currentSources} />
      </aside>

      {/* Mobile drawers */}
      <Drawer
        title="历史会话"
        placement="left"
        open={leftDrawerOpen}
        onClose={() => setLeftDrawerOpen(false)}
        width={260}
      >
        <SessionList
          sessions={sessions}
          currentSessionId={sessionId ?? null}
          onSelect={handleSelectSession}
          onNew={handleNewChat}
          onRecommend={(q) => {
            handleRecommend(q);
            setLeftDrawerOpen(false);
          }}
        />
      </Drawer>

      <Drawer
        title="引用来源"
        placement="right"
        open={rightDrawerOpen}
        onClose={() => setRightDrawerOpen(false)}
        width={280}
      >
        <SourcePanel sources={currentSources} />
      </Drawer>
    </div>
  );
}
