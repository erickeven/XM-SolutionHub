import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Result, Skeleton } from 'antd';
import { LockOutlined, FileSearchOutlined } from '@ant-design/icons';
import { getMaterialPreview } from '../../api/solutions';
import { UnlockModal } from '../auth/UnlockModal';
import { useUiContent, useUiText } from '../../api/ui-content';

interface PdfPreviewProps {
  materialId: string | null;
  isAuthenticated: boolean;
}

export function PdfPreview({ materialId, isAuthenticated }: PdfPreviewProps) {
  const [unlockOpen, setUnlockOpen] = useState(false);
  const { text } = useUiContent();
  const emptyText = useUiText('solution.preview.empty', '请选择资料');
  const errorTitle = useUiText('solution.preview.error', '预览加载失败');
  const retryText = useUiText('solution.preview.retry', '重试');
  const limitedTemplate = useUiText(
    'solution.preview.limited',
    '当前显示前 {pages} 页预览，登录后查看完整资料',
  );
  const unlockText = useUiText('solution.preview.unlock', '登录/注册查看完整资料');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['material-preview', materialId, isAuthenticated],
    queryFn: () => getMaterialPreview(materialId!),
    enabled: !!materialId,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: 'always',
    refetchOnReconnect: 'always',
    refetchOnWindowFocus: 'always',
    refetchInterval: 25 * 60 * 1000,
  });

  if (!materialId) {
    return (
      <div className="flex h-full items-center justify-center text-slate-400">
        {emptyText}
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
          title={errorTitle}
          extra={
            <Button type="primary" onClick={() => refetch()}>
              {retryText}
            </Button>
          }
        />
      </div>
    );
  }

  const isLimited = !isAuthenticated && data.isLimitedPreview;

  return (
    <div className="relative h-full">
      {data.canInlinePreview ? (
        <iframe
          key={data.url}
          src={data.url}
          title={text('solution.preview.frameTitle', '资料预览')}
          className="h-full w-full border-0"
        />
      ) : (
        <div className="flex h-full items-center justify-center p-6">
          <Result
            icon={<FileSearchOutlined />}
            title={text('solution.preview.external.title', '可打开预览文件')}
            subTitle={text('solution.preview.external.subtitle', '当前浏览器不支持直接内嵌该格式，可在新窗口中查看。')}
            extra={
              <Button type="primary" onClick={() => window.open(data.url, '_blank', 'noopener,noreferrer')}>
                {text('solution.preview.external.open', '打开预览')}
              </Button>
            }
          />
        </div>
      )}
      {isLimited && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-950/85 to-transparent px-4 py-4 text-center">
          <p className="mb-3 text-sm text-white">
            <LockOutlined className="mr-1" />
            {limitedTemplate.replace('{pages}', String(data.previewPages))}
          </p>
          <Button type="primary" onClick={() => setUnlockOpen(true)}>
            {unlockText}
          </Button>
          <UnlockModal open={unlockOpen} onClose={() => setUnlockOpen(false)} />
        </div>
      )}
    </div>
  );
}
