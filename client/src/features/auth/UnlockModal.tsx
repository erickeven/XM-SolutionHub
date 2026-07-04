import { Modal, Button, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';

const { Text, Title } = Typography;

interface UnlockModalProps {
  open: boolean;
  onClose: () => void;
}

export function UnlockModal({ open, onClose }: UnlockModalProps) {
  const location = useLocation();
  const redirect = encodeURIComponent(location.pathname + location.search);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={400}
      maskClosable
>
      <div className="py-4 text-center">
        <Title level={4} className="!mb-2 !text-navy-950">
          注册即可解锁完整资料
        </Title>
        <Text className="block text-sm text-slate-500">
          注册后可查看完整测试报告、下载 BOM/原理图，并继续使用 AI 技术问答。
        </Text>

        <div className="mt-6 flex flex-col gap-3">
          <Link to={`/register?redirect=${redirect}`}>
            <Button type="primary" block size="large" style={{ minHeight: 44 }}>
              注册
            </Button>
          </Link>
          <Link to={`/login?redirect=${redirect}`}>
            <Button block size="large" style={{ minHeight: 44 }}>
              登录
            </Button>
          </Link>
          <button
            onClick={onClose}
            className="mt-1 text-sm text-slate-400 transition-colors hover:text-slate-600"
          >
            暂不注册
          </button>
        </div>
      </div>
    </Modal>
  );
}