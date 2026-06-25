import { useState, useMemo } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import {
  Layout,
  Menu,
  Breadcrumb,
  Dropdown,
  Avatar,
  Button,
  Drawer,
  Spin,
  Tooltip,
  Grid,
} from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  BulbOutlined,
  FileTextOutlined,
  BookOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  AuditOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

type MenuItem = Required<MenuProps>['items'][number];

interface AdminRouteDef {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: Array<'STAFF' | 'AUDITOR' | 'ADMIN'>;
}

const ADMIN_ROUTES: AdminRouteDef[] = [
  { path: '/admin', label: '驾驶舱', icon: <DashboardOutlined />, roles: ['STAFF', 'AUDITOR', 'ADMIN'] },
  { path: '/admin/products', label: '产品管理', icon: <AppstoreOutlined />, roles: ['ADMIN'] },
  { path: '/admin/product-fields', label: '产品字段', icon: <UnorderedListOutlined />, roles: ['ADMIN'] },
  { path: '/admin/solutions', label: '方案管理', icon: <BulbOutlined />, roles: ['ADMIN'] },
  { path: '/admin/materials', label: '资料管理', icon: <FileTextOutlined />, roles: ['ADMIN'] },
  { path: '/admin/material-fields', label: '资料字段', icon: <UnorderedListOutlined />, roles: ['ADMIN'] },
  { path: '/admin/knowledge', label: '知识库', icon: <BookOutlined />, roles: ['ADMIN', 'AUDITOR'] },
  { path: '/admin/leads', label: '线索', icon: <UserSwitchOutlined />, roles: ['STAFF', 'AUDITOR', 'ADMIN'] },
  { path: '/admin/users', label: '用户', icon: <TeamOutlined />, roles: ['ADMIN'] },
  { path: '/admin/audit', label: '审计', icon: <AuditOutlined />, roles: ['ADMIN', 'AUDITOR'] },
];

const ROUTE_LABEL_MAP: Record<string, string> = ADMIN_ROUTES.reduce(
  (acc, r) => {
    acc[r.path] = r.label;
    return acc;
  },
  {} as Record<string, string>,
);

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();
  const screens = useBreakpoint();
  const isTablet = !screens.lg; // < 1200px roughly (lg=992; xl=1200)
  const isMobile = !screens.md;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const allowedMenu: MenuItem[] = useMemo(() => {
    if (!user) return [];
    const userRole = user.role as 'STAFF' | 'AUDITOR' | 'ADMIN' | 'USER';
    return ADMIN_ROUTES.filter((r) => (r.roles as string[]).includes(userRole)).map(
      (r) => ({
        key: r.path,
        icon: r.icon,
        label: r.label,
      }),
    );
  }, [user]);

  const selectedKey = useMemo(() => {
    // Find the best-matching route (longest prefix match)
    const matches = ADMIN_ROUTES.filter((r) =>
      r.path === '/admin'
        ? location.pathname === '/admin'
        : location.pathname.startsWith(r.path),
    );
    if (matches.length === 0) return '/admin';
    matches.sort((a, b) => b.path.length - a.path.length);
    return matches[0]!.path;
  }, [location.pathname]);

  const breadcrumbItems = useMemo(() => {
    const items = [
      { title: <Link to="/admin">后台管理</Link> },
    ];
    if (location.pathname !== '/admin') {
      // Build breadcrumb segments
      const parts = location.pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
      let accum = '/admin';
      parts.forEach((part) => {
        accum += `/${part}`;
        const label = ROUTE_LABEL_MAP[accum] ?? decodeURIComponent(part);
        items.push({ title: <span>{label}</span> });
      });
    }
    return items;
  }, [location.pathname]);

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    navigate(key);
    setMobileDrawerOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Spin size="large" />
      </div>
    );
  }

  const userMenuItems: MenuProps['items'] = [
    {
      key: 'back',
      icon: <ArrowLeftOutlined />,
      label: '返回站点',
      onClick: () => navigate('/'),
    },
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => navigate('/profile'),
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: async () => {
        await logout();
        navigate('/login');
      },
    },
  ];

  const siderContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4 text-white">
        <SettingOutlined style={{ fontSize: 18, color: '#B7791F' }} />
        {!collapsed && !isMobile && (
          <span className="font-bold tracking-wide">XM 管理后台</span>
        )}
        {isMobile && <span className="font-bold tracking-wide">XM 管理后台</span>}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={allowedMenu}
        onClick={handleMenuClick}
        className="!border-0 !bg-transparent"
      />
    </div>
  );

  return (
    <Layout className="min-h-screen">
      {!isMobile && (
        <Sider
          width={220}
          collapsible
          collapsed={isTablet || collapsed}
          collapsedWidth={64}
          trigger={null}
          className="!bg-navy-900"
        >
          {siderContent}
        </Sider>
      )}
      <Layout>
        <Header className="flex h-14 items-center justify-between !bg-white !px-4 !border-b !border-slate-200">
          <div className="flex items-center gap-3">
            {!isMobile && (
              <Button
                type="text"
                icon={collapsed || isTablet ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed((c) => !c)}
              />
            )}
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileDrawerOpen(true)}
              />
            )}
            <Breadcrumb items={breadcrumbItems} />
          </div>
          <div className="flex items-center gap-2">
            <Tooltip title="返回站点">
              <Link to="/">
                <Button type="text" size="small" icon={<HomeOutlined />}>
                  返回站点
                </Button>
              </Link>
            </Tooltip>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Button type="text" size="small" className="!flex !items-center !gap-1">
                <Avatar size={24} icon={<UserOutlined />} />
                <span className="hidden sm:inline">{user?.email}</span>
              </Button>
            </Dropdown>
          </div>
        </Header>
        <Content className="bg-slate-50 p-4 md:p-6">
          <Outlet />
        </Content>
      </Layout>

      {/* Mobile drawer */}
      <Drawer
        placement="left"
        open={isMobile && mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        width={240}
        bodyStyle={{ padding: 0, background: '#0B1F36' }}
        headerStyle={{ background: '#0B1F36', color: '#fff', border: 0 }}
        title={
          <div className="flex items-center gap-2 text-white">
            <SettingOutlined style={{ color: '#B7791F' }} />
            <span className="font-bold">XM 管理后台</span>
          </div>
        }
      >
        {siderContent}
      </Drawer>
    </Layout>
  );
}
