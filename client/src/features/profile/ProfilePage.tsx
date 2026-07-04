import { Card, Tag, Button, Descriptions, Result, Spin } from 'antd';
import { LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const ROLE_TAG_COLOR: Record<string, string> = {
  ADMIN: 'red',
  AUDITOR: 'orange',
  STAFF: 'blue',
  USER: 'default',
};

const ROLE_LABEL: Record<string, string> = {
  ADMIN: '管理员',
  AUDITOR: '审核员',
  STAFF: '员工',
  USER: '普通用户',
};

export function ProfilePage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Result
          status="403"
          title="请先登录"
          subTitle="登录后可查看个人中心"
          extra={
            <Button type="primary" onClick={() => navigate('/login')}>
              前往登录
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page py-6 md:py-10">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-4 text-xl font-bold text-slate-900 md:text-2xl">个人中心</h1>

        {/* 账号信息 */}
        <Card title="账号信息" className="mb-4">
          <Descriptions column={1} labelStyle={{ width: 120 }}>
            <Descriptions.Item label="邮箱">
              {user.email}
            </Descriptions.Item>
            <Descriptions.Item label="角色">
              <Tag color={ROLE_TAG_COLOR[user.role] ?? 'default'}>
                {ROLE_LABEL[user.role] ?? user.role}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="用户ID">
              <span className="text-sm text-slate-500">
                {user.id}
              </span>
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 安全设置 */}
        <Card title="安全设置">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-slate-900">登录密码</div>
              <div className="mt-1 text-xs text-slate-500">
                建议定期修改密码以保障账号安全
              </div>
            </div>
            <Button
              icon={<LockOutlined />}
              onClick={() => navigate('/login?mode=reset')}
            >
              修改密码
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
