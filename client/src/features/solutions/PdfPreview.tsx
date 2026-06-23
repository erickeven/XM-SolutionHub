import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Result, Skeleton } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { getMaterialPreview } from '../../api/solutions';
import { UnlockModal } from '../auth/UnlockModal';

interface PdfPreviewProps {
  materialId: string | null;
  isAuthenticated: boolean;
}

export function PdfPreview({ materialId, isAuthenticated }: PdfPreviewProps) {
  const [unlockOpen, setUnlockOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['material-preview', materialId],
    queryFn: () => getMaterialPreview(materialId!),
    enabled: !!materialId,
  });

  if (!materialId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        请选择资料
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 8 }} className="p-6" />;
  }

  if (isError || !data) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <Result
          status="error"
          title="预览加载失败"
          extra={
            <Button type="primary" onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const isLimited = !isAuthenticated && data.previewPages === 3;

  return (
    <div className="relative h-full">
      <iframe
        src={data.url}
        title="PDF 预览"
        className="h-full w-full border-0"
      />
      {isLimited && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/90 to-transparent p-6 text-center">
          <p className="mb-3 text-sm text-white">
            <LockOutlined className="mr-1" />
            注册后查看完整资料
          </p>
          <Button type="primary" onClick={() => setUnlockOpen(true)}>
            注册解锁
          </Button>
          <UnlockModal open={unlockOpen} onClose={() => setUnlockOpen(false)} />
        </div>
      )}
    </div>
  );
}