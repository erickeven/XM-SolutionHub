import { Empty, Typography, Button } from 'antd';
import { FileTextOutlined, BugOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { SourceCard } from './SourceCard';
import { useAuth } from '../../hooks/useAuth';
import type { ChatSource } from '../../types/ai-chat';

interface SourcePanelProps {
  sources: ChatSource[];
}

export function SourcePanel({ sources }: SourcePanelProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const traceDocId = sources[0]?.docId;
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-4 py-3">
        <Typography.Text strong className="!text-sm !text-slate-700">
          <FileTextOutlined className="!mr-2" />
          本轮引用来源
        </Typography.Text>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sources.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="本次回答暂无引用来源"
            className="mt-8"
          />
        ) : (
          <div className="space-y-3">
            {sources.map((source, index) => (
              <div key={`${source.docId}-${index}`}>
                <SourceCard source={source} />
              </div>
            ))}
          </div>
        )}
      </div>

      {isAdmin && traceDocId && (
        <div className="border-t border-slate-200 p-3">
          <Link to={`/admin/trace/${traceDocId}`}>
            <Button icon={<BugOutlined />} size="small" block>
              查看检索追踪
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
