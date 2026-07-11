import { Modal, Button, Typography } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import { useUiContent } from '../../api/ui-content';

const { Text, Title } = Typography;

interface UnlockModalProps {
  open: boolean;
  onClose: () => void;
}

export function UnlockModal({ open, onClose }: UnlockModalProps) {
  const location = useLocation();
  const redirect = encodeURIComponent(location.pathname + location.search);
  const { text } = useUiContent();

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
          {text('auth.unlock.title', '登录或注册后查看完整资料')}
        </Title>
        <Text className="block text-sm text-slate-500">
          {text('auth.unlock.subtitle', '未登录可预览前 3 页；登录后可查看完整测试报告并下载全部方案资料。')}
        </Text>

        <div className="mt-6 flex flex-col gap-3">
          <Link to={`/register?redirect=${redirect}`}>
            <Button type="primary" block size="large" style={{ minHeight: 44 }}>
              {text('auth.register', '注册')}
            </Button>
          </Link>
          <Link to={`/login?redirect=${redirect}`}>
            <Button block size="large" style={{ minHeight: 44 }}>
              {text('auth.login', '登录')}
            </Button>
          </Link>
          <button
            onClick={onClose}
            className="mt-1 text-sm text-slate-400 transition-colors hover:text-slate-600"
          >
            {text('auth.unlock.later', '继续预览')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
