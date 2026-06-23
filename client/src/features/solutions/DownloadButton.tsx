import { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { downloadMaterial } from '../../api/solutions';

interface DownloadButtonProps {
  materialId: string | null;
  isAuthenticated: boolean;
  onError: (msg: string) => void;
}

export function DownloadButton({ materialId, isAuthenticated, onError }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!materialId) {
      onError('请先选择资料');
      return;
    }
    setLoading(true);
    try {
      const { url } = await downloadMaterial(materialId);
      window.open(url, '_blank');
    } catch {
      onError('下载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Tooltip title="登录后可下载">
        <Button type="primary" icon={<DownloadOutlined />} disabled block>
          登录后下载
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      type="primary"
      icon={<DownloadOutlined />}
      loading={loading}
      onClick={handleDownload}
      block
    >
      下载资料
    </Button>
  );
}