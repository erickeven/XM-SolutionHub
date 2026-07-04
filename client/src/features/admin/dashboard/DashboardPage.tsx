import {
  Card,
  Row,
  Col,
  Statistic,
  Tag,
  Typography,
  List,
  Space,
  Button,
  Skeleton,
  Result,
  Progress,
} from 'antd';
import {
  AppstoreOutlined,
  BulbOutlined,
  FileTextOutlined,
  BookOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ReloadOutlined,
  ClockCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDashboard } from '../../../api/dashboard';
import type { LeadStatusBreakdown, KnowledgeStatusBreakdown } from '../../../api/dashboard';

const { Text, Title } = Typography;

const COUNT_ICON: Record<string, React.ReactNode> = {
  products: <AppstoreOutlined />,
  solutions: <BulbOutlined />,
  materials: <FileTextOutlined />,
  knowledge: <BookOutlined />,
  leads: <UserSwitchOutlined />,
  users: <TeamOutlined />,
};

const STATUS_LABEL: Record<string, string> = {
  NEW: '新建',
  ASSIGNED: '已分配',
  FOLLOWING: '跟进中',
  CONVERTED: '已转化',
  ABANDONED: '已放弃',
  UPLOADED: '已上传',
  PROCESSING: '处理中',
  READY: '就绪',
  FAILED: '失败',
};

const STATUS_COLOR: Record<string, string> = {
  NEW: 'default',
  ASSIGNED: 'blue',
  FOLLOWING: 'cyan',
  CONVERTED: 'green',
  ABANDONED: 'red',
  UPLOADED: 'default',
  PROCESSING: 'blue',
  READY: 'green',
  FAILED: 'red',
  ACTIVE: 'green',
  DRAFT: 'default',
  INACTIVE: 'red',
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  return d.toLocaleString('zh-CN');
}

function StatusBar({
  items,
}: {
  items: (LeadStatusBreakdown | KnowledgeStatusBreakdown)[];
}) {
  const total = items.reduce((acc, it) => acc + it.count, 0);
  return (
    <List
      dataSource={items}
      renderItem={(it) => {
        const pct = total > 0 ? Math.round((it.count / total) * 100) : 0;
        return (
          <List.Item>
            <div className="w-full">
              <div className="mb-1 flex items-center justify-between text-sm">
                <Space size={4}>
                  <Tag color={STATUS_COLOR[it.status] ?? 'default'}>
                    {STATUS_LABEL[it.status] ?? it.status}
                  </Tag>
                </Space>
                <Text>
                  {it.count}
                  <Text type="secondary" className="ml-1">
                    ({pct}%)
                  </Text>
                </Text>
              </div>
              <Progress
                percent={pct}
                showInfo={false}
                size="small"
                strokeColor={{
                  '0%': '#2563EB',
                  '100%': '#2563EB',
                }}
                trailColor="#E5E7EB"
              />
            </div>
          </List.Item>
        );
      }}
    />
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getDashboard,
    refetchInterval: 60_000,
  });

  if (isError) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Result
          status="error"
          title="加载失败"
          subTitle="无法获取管理驾驶舱数据"
          extra={
            <Button type="primary" icon={<ReloadOutlined />} onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-4">
        <div className="mb-4">
          <Skeleton active paragraph={{ rows: 1 }} title={false} />
        </div>
        <Row gutter={[16, 16]}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Col xs={12} md={8} xl={4} key={i}>
              <Card>
                <Skeleton active paragraph={{ rows: 2 }} title={false} />
              </Card>
            </Col>
          ))}
        </Row>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card title="线索状态分布">
              <Skeleton active paragraph={{ rows: 4 }} title={false} />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card title="知识库状态分布">
              <Skeleton active paragraph={{ rows: 4 }} title={false} />
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Title level={4} className="!mb-0 !text-slate-900">
            管理驾驶舱
          </Title>
          <Text type="secondary">
            核心数据与待处理事项一览 · 数据更新于 {formatTime(data.generatedAt)}
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={() => refetch()}>
          刷新
        </Button>
      </div>

      {/* Count cards */}
      <Row gutter={[16, 16]}>
        {data.counts.map((c) => (
          <Col xs={12} md={8} xl={4} key={c.key}>
            <Card className="hover:shadow-card">
              <Statistic
                title={
                  <Space size={4}>
                    <span className="text-slate-500">{COUNT_ICON[c.key] ?? null}</span>
                    <span>{c.label}</span>
                  </Space>
                }
                value={c.value}
                valueStyle={{ fontSize: 24, fontWeight: 600, color: '#111827' }}
                suffix={
                  typeof c.delta === 'number' ? (
                    <Text
                      type={c.delta >= 0 ? 'success' : 'danger'}
                      className="!text-xs"
                    >
                      {c.delta >= 0 ? (
                        <ArrowUpOutlined />
                      ) : (
                        <ArrowDownOutlined />
                      )}
                      {Math.abs(c.delta)}
                    </Text>
                  ) : null
                }
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Breakdowns + Panels */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="线索状态分布" className="h-full">
            {data.leadStatusBreakdown.length === 0 ? (
              <Text type="secondary">暂无数据</Text>
            ) : (
              <StatusBar items={data.leadStatusBreakdown} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="知识库状态分布" className="h-full">
            {data.knowledgeStatusBreakdown.length === 0 ? (
              <Text type="secondary">暂无数据</Text>
            ) : (
              <StatusBar items={data.knowledgeStatusBreakdown} />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card title="待处理事项" className="h-full">
            {data.pendingItems.length === 0 ? (
              <Text type="secondary">暂无待处理事项</Text>
            ) : (
              <List
                dataSource={data.pendingItems}
                renderItem={(item) => (
                  <List.Item
                    className="!px-0"
                    actions={
                      item.href
                        ? [
                            <Button
                              type="link"
                              size="small"
                              onClick={() => navigate(item.href!)}
                            >
                              处理 <RightOutlined />
                            </Button>,
                          ]
                        : undefined
                    }
                  >
                    <List.Item.Meta
                      title={item.title}
                      description={
                        <Space direction="vertical" size={2}>
                          {item.description && (
                            <Text type="secondary" className="!text-xs">
                              {item.description}
                            </Text>
                          )}
                          {item.createdAt && (
                            <Text type="secondary" className="!text-xs">
                              <ClockCircleOutlined /> {formatTime(item.createdAt)}
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="最近活动" className="h-full">
            {data.recentActivity.length === 0 ? (
              <Text type="secondary">暂无活动记录</Text>
            ) : (
              <List
                dataSource={data.recentActivity}
                renderItem={(item) => (
                  <List.Item className="!px-0">
                    <List.Item.Meta
                      title={
                        <Space size={8}>
                          <Text>{item.actionLabel}</Text>
                          {item.targetLabel && (
                            <Tag color="blue">{item.targetLabel}</Tag>
                          )}
                        </Space>
                      }
                      description={
                        <Space size={8} className="!text-xs">
                          {item.actorEmail && (
                            <Text type="secondary">{item.actorEmail}</Text>
                          )}
                          <Text type="secondary">
                            <ClockCircleOutlined /> {formatTime(item.createdAt)}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
