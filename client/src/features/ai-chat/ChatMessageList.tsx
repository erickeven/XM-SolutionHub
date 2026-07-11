import { useRef, useEffect } from 'react';
import { Empty, Spin, Typography, Alert } from 'antd';
import { RobotOutlined, UserOutlined } from '@ant-design/icons';
import { SourceCard } from './SourceCard';
import { FeedbackButtons } from './FeedbackButtons';
import type { ChatMessage, MessageFeedback } from '../../types/ai-chat';
import { useUiContent } from '../../api/ui-content';

interface ChatMessageListProps {
  messages: ChatMessage[];
  streamingContent: string;
  isStreaming: boolean;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

export function ChatMessageList({
  messages,
  streamingContent,
  isStreaming,
  onFeedback,
}: ChatMessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { text } = useUiContent();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-slate-500">
        <Empty description={text('ai.empty', '输入您的问题开始对话')} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isStreaming={isStreaming}
          streamingContent={streamingContent}
          onFeedback={onFeedback}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

interface MessageItemProps {
  message: ChatMessage;
  isStreaming: boolean;
  streamingContent: string;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

function MessageItem({ message, isStreaming, streamingContent, onFeedback }: MessageItemProps) {
  const isUser = message.role === 'user';
  const displayContent = isStreaming && message.status === 'streaming' ? streamingContent : message.content;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex max-w-[90%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} sm:max-w-[80%] lg:max-w-[70%]`}
      >
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isUser ? 'bg-navy-900 text-white' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {isUser ? <UserOutlined /> : <RobotOutlined />}
        </div>

        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div
            className={`rounded-2xl px-4 py-2.5 ${
              isUser
                ? 'rounded-tr-none bg-navy-900 text-white'
                : 'rounded-tl-none bg-slate-50 text-slate-900'
            }`}
          >
            <Typography.Text
              className={`!whitespace-pre-wrap !text-sm ${isUser ? '!text-white' : '!text-slate-800'}`}
            >
              {displayContent}
            </Typography.Text>
          </div>

          {!isUser && (
            <MessageMeta
              message={message}
              isStreaming={isStreaming}
              onFeedback={onFeedback}
            />
          )}
        </div>
      </div>
    </div>
  );
}

interface MessageMetaProps {
  message: ChatMessage;
  isStreaming: boolean;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

function MessageMeta({ message, isStreaming, onFeedback }: MessageMetaProps) {
  const { text } = useUiContent();
  const hasSources = message.sources.length > 0;
  const showLowConfidence = message.status === 'complete' && !hasSources;
  const showError = message.status === 'error';

  return (
    <div className="mt-2 w-full">
      {message.status === 'pending' && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Spin size="small" />
          <span>{text('ai.searching', '正在检索资料...')}</span>
        </div>
      )}

      {message.status === 'streaming' && isStreaming && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Spin size="small" />
          <span>{text('ai.generating', '回答生成中...')}</span>
        </div>
      )}

      {showLowConfidence && (
        <Alert
          type="info"
          showIcon
          message={text('ai.noSources', '暂无相关资料支持该问题')}
          className="!my-2 !border-slate-200 !bg-slate-50 !py-1 !text-xs"
        />
      )}

      {showError && (
        <Alert
          type="warning"
          showIcon
          message={text('ai.error.retry', '生成失败，请重试')}
          className="!my-2 !py-1 !text-xs"
        />
      )}

      {hasSources && (
        <div className="mt-2 space-y-2">
          <Typography.Text className="!block !text-xs !font-medium !text-slate-500">
            {text('ai.sources.evidence', '来源依据')}
          </Typography.Text>
          {message.sources.map((source, index) => (
            <SourceCard key={`${source.docId}-${index}`} source={source} />
          ))}
        </div>
      )}

      {message.status === 'complete' && (
        <FeedbackButtons
          messageId={message.id}
          currentFeedback={message.feedback as MessageFeedback | null}
          onFeedback={onFeedback}
        />
      )}
    </div>
  );
}
