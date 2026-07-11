import { Button, List, Typography } from 'antd';
import { PlusOutlined, MessageOutlined } from '@ant-design/icons';
import type { ChatSession } from '../../types/ai-chat';
import { useUiContent } from '../../api/ui-content';

const RECOMMENDED_QUESTIONS = [
  'LP3798 的待机功耗是多少？',
  '有哪些适合充电桩的方案？',
  'LP3524 的同步整流驱动特性是什么？',
];

interface SessionListProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRecommend?: (question: string) => void;
}

function formatRelativeTime(
  dateStr: string,
  text: (key: string, fallback: string) => string,
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffMinutes < 1) return text('ai.time.now', '刚刚');
  if (diffMinutes < 60) return `${diffMinutes} ${text('ai.time.minutesAgo', '分钟前')}`;
  if (diffHours < 24) return `${diffHours} ${text('ai.time.hoursAgo', '小时前')}`;
  if (diffDays < 7) return `${diffDays} ${text('ai.time.daysAgo', '天前')}`;
  return date.toLocaleDateString('zh-CN');
}

export function SessionList({
  sessions,
  currentSessionId,
  onSelect,
  onNew,
  onRecommend,
}: SessionListProps) {
  const { text } = useUiContent();
  const recommendedQuestions = RECOMMENDED_QUESTIONS.map((question, index) =>
    text(`ai.recommended.${index + 1}`, question),
  );
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 p-3">
        <Button type="primary" icon={<PlusOutlined />} block onClick={onNew}>
          {text('ai.newChat', '新建对话')}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <List
          header={
            <Typography.Text className="!px-3 !text-xs !font-medium !text-slate-500">
              {text('ai.history.title', '历史会话')}
            </Typography.Text>
          }
          dataSource={sessions}
          renderItem={(session) => (
            <List.Item
              className={`cursor-pointer px-3 py-2 transition-colors hover:bg-slate-50 ${
                session.id === currentSessionId ? '!bg-blue-50' : ''
              }`}
              onClick={() => onSelect(session.id)}
            >
              <div className="flex w-full items-start gap-2">
                <MessageOutlined
                  className={`mt-0.5 text-sm ${
                    session.id === currentSessionId ? 'text-blue-600' : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <Typography.Text
                    className={`!block !truncate !text-sm ${
                      session.id === currentSessionId ? '!font-medium !text-blue-700' : '!text-slate-700'
                    }`}
                  >
                    {session.title || text('ai.newConversation', '新对话')}
                  </Typography.Text>
                  <Typography.Text className="!block !text-xs !text-slate-400">
                    {formatRelativeTime(session.updatedAt, text)}
                  </Typography.Text>
                </div>
              </div>
            </List.Item>
          )}
        />

        <div className="border-t border-slate-200 p-3">
          <Typography.Text className="!block !pb-2 !text-xs !font-medium !text-slate-500">
            {text('ai.recommended.title', '推荐问题')}
          </Typography.Text>
          <div className="space-y-2">
            {recommendedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => onRecommend?.(question)}
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
