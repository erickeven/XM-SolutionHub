import { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { DownloadOutlined, FileZipOutlined } from '@ant-design/icons';
import { downloadMaterial, downloadSolutionMaterials } from '../../api/solutions';
import { useUiContent } from '../../api/ui-content';

interface DownloadButtonProps {
  materialId: string | null;
  isAuthenticated: boolean;
  onError: (msg: string) => void;
}

export function DownloadButton({ materialId, isAuthenticated, onError }: DownloadButtonProps) {
  const [loading, setLoading] = useState(false);
  const { text } = useUiContent();

  const handleDownload = async () => {
    if (!materialId) {
      onError(text('solution.download.selectFirst', '请先选择资料'));
      return;
    }
    setLoading(true);
    try {
      const { url } = await downloadMaterial(materialId);
      window.open(url, '_blank');
    } catch {
      onError(text('solution.download.failed', '下载失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Tooltip title={text('solution.download.loginRequired', '登录后可下载')}>
        <Button type="primary" icon={<DownloadOutlined />} disabled block>
          {text('solution.download.login', '登录后下载')}
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
      {text('solution.download.single', '下载资料')}
    </Button>
  );
}

interface DownloadAllButtonProps {
  solutionId: string;
  isAuthenticated: boolean;
  disabled?: boolean;
  onError: (msg: string) => void;
}

export function DownloadAllButton({
  solutionId,
  isAuthenticated,
  disabled = false,
  onError,
}: DownloadAllButtonProps) {
  const [loading, setLoading] = useState(false);
  const { text } = useUiContent();

  const handleDownload = async () => {
    setLoading(true);
    try {
      const { url } = await downloadSolutionMaterials(solutionId);
      window.open(url, '_blank');
    } catch {
      onError(text('solution.download.allFailed', '打包下载失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Tooltip title={text('solution.download.allLoginRequired', '登录后可下载全部资料')}>
        <Button icon={<FileZipOutlined />} disabled block>
          {text('solution.download.allLogin', '登录后打包下载')}
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      icon={<FileZipOutlined />}
      loading={loading}
      onClick={handleDownload}
      disabled={disabled}
      block
    >
      {text('solution.download.all', '下载全部资料')}
    </Button>
  );
}
