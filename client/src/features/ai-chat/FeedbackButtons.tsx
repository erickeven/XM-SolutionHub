import { Button, Space } from 'antd';
import { LikeOutlined, LikeFilled, DislikeOutlined, DislikeFilled } from '@ant-design/icons';
import type { MessageFeedback } from '../../types/ai-chat';

interface FeedbackButtonsProps {
  messageId: string;
  currentFeedback: MessageFeedback | null;
  onFeedback: (messageId: string, helpful: boolean) => void;
}

export function FeedbackButtons({ messageId, currentFeedback, onFeedback }: FeedbackButtonsProps) {
  const isHelpful = currentFeedback?.helpful === true;
  const isUnhelpful = currentFeedback?.helpful === false;

  return (
    <Space size="small" className="mt-2">
      <Button
        type="text"
        size="small"
        icon={isHelpful ? <LikeFilled /> : <LikeOutlined />}
        className={isHelpful ? '!text-blue-600' : '!text-slate-500'}
        onClick={() => onFeedback(messageId, true)}
      >
        有帮助
      </Button>
      <Button
        type="text"
        size="small"
        icon={isUnhelpful ? <DislikeFilled /> : <DislikeOutlined />}
        className={isUnhelpful ? '!text-blue-600' : '!text-slate-500'}
        onClick={() => onFeedback(messageId, false)}
      >
        无帮助
      </Button>
    </Space>
  );
}
