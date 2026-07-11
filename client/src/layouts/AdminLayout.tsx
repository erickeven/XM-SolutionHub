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
  SafetyCertificateOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  MenuOutlined,
  LogoutOutlined,
  UserOutlined,
  HomeOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  UnorderedListOutlined,
  ApiOutlined,
  FontSizeOutlined,
  FolderOutlined,
  TeamOutlined as TeamIcon,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { ErrorBoundary } from '../components/ErrorBoundary';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

type MenuItem = Required<MenuProps>['items'][number];

interface AdminRouteDef {
  path: string;
  label: string;
  icon: React.ReactNode;
  roles: Array<'STAFF' | 'AUDITOR' | 'ADMIN'>;
  group?: string;
}

interface AdminMenuGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  children: AdminRouteDef[];
}

const ADMIN_MENU_GROUPS: (AdminRouteDef | AdminMenuGroup)[] = [
  { path: '/admin', label: '驾驶舱', icon: <DashboardOutlined />, roles: ['STAFF', 'AUDITOR', 'ADMIN'] },
  {
    key: 'content', label: '内容管理', icon: <FolderOutlined />,
    children: [
      { path: '/admin/products', label: '产品管理', icon: <AppstoreOutlined />, roles: ['ADMIN'] },
      { path: '/admin/solutions', label: '方案管理', icon: <BulbOutlined />, roles: ['ADMIN'] },
      { path: '/admin/materials', label: '资料管理', icon: <FileTextOutlined />, roles: ['ADMIN'] },
      { path: '/admin/knowledge', label: '知识库', icon: <BookOutlined />, roles: ['ADMIN', 'AUDITOR'] },
    ],
  },
  {
    key: 'ops', label: '运营管理', icon: <TeamIcon />,
    children: [
      { path: '/admin/leads', label: '线索', icon: <UserSwitchOutlined />, roles: ['STAFF', 'AUDITOR', 'ADMIN'] },
      { path: '/admin/users', label: '用户', icon: <TeamOutlined />, roles: ['ADMIN'] },
      { path: '/admin/audit', label: '审计', icon: <AuditOutlined />, roles: ['ADMIN', 'AUDITOR'] },
    ],
  },
  {
    key: 'settings', label: '系统设置', icon: <SettingOutlined />,
    children: [
      { path: '/admin/product-fields', label: '产品字段', icon: <UnorderedListOutlined />, roles: ['ADMIN'] },
      { path: '/admin/material-fields', label: '资料字段', icon: <UnorderedListOutlined />, roles: ['ADMIN'] },
      { path: '/admin/ui-content', label: '前端文案', icon: <FontSizeOutlined />, roles: ['ADMIN'] },
      { path: '/admin/roles', label: '角色权限', icon: <SafetyCertificateOutlined />, roles: ['ADMIN'] },
      { path: '/admin/ai-settings', label: 'AI及模型', icon: <ApiOutlined />, roles: ['ADMIN'] },
    ],
  },
];

// Flatten for route label map and selected key detection
const FLAT_ROUTES: AdminRouteDef[] = [];
const flatten = (items: typeof ADMIN_MENU_GROUPS) => {
  for (const item of items) {
    if ('children' in item) {
      FLAT_ROUTES.push(...item.children);
    } else {
      FLAT_ROUTES.push(item);
    }
  }
};
flatten(ADMIN_MENU_GROUPS);

const ROUTE_LABEL_MAP: Record<string, string> = {};
for (const item of ADMIN_MENU_GROUPS) {
  if ('children' in item) {
    for (const child of item.children) {
      ROUTE_LABEL_MAP[child.path] = child.label;
    }
  } else {
    ROUTE_LABEL_MAP[item.path] = item.label;
  }
}

export function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoading, logout } = useAuth();
  const { hasPermission } = usePermissions();
  const screens = useBreakpoint();
  const isTablet = !screens.lg; // < 1200px roughly (lg=992; xl=1200)
  const isMobile = !screens.md;

  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Permission code mapping for each admin route
  const ROUTE_PERMISSION: Record<string, string> = {
    '/admin': 'admin.dashboard.read',
    '/admin/products': 'products.read',
    '/admin/product-fields': 'products.write',
    '/admin/solutions': 'solutions.read',
    '/admin/materials': 'materials.read',
    '/admin/material-fields': 'materials.write',
    '/admin/ui-content': 'settings.ui.read',
    '/admin/knowledge': 'knowledge.read',
    '/admin/leads': 'leads.read',
    '/admin/users': 'users.read',
    '/admin/roles': 'users.write',
    '/admin/audit': 'audit.read',
    '/admin/ai-settings': 'settings.ai.read',
  };

  const allowedMenu: MenuItem[] = useMemo(() => {
    if (!user) return [];
    const result: MenuItem[] = [];
    for (const item of ADMIN_MENU_GROUPS) {
      if ('children' in item) {
        // Sub-menu group: only include if at least one child is allowed
        const visibleChildren = item.children.filter((r) => {
          const perm = ROUTE_PERMISSION[r.path];
          if (perm) return hasPermission(perm);
          return (r.roles as string[]).includes(user.role as string);
        });
        if (visibleChildren.length > 0) {
          result.push({
            key: item.key,
            icon: item.icon,
            label: item.label,
            children: visibleChildren.map((r) => ({
              key: r.path,
              icon: r.icon,
              label: r.label,
            })),
          });
        }
      } else {
        const perm = ROUTE_PERMISSION[item.path];
        const allowed = perm ? hasPermission(perm) : (item.roles as string[]).includes(user.role as string);
        if (allowed) {
          result.push({ key: item.path, icon: item.icon, label: item.label });
        }
      }
    }
    return result;
  }, [user, hasPermission]);

  const selectedKey = useMemo(() => {
    const matches = FLAT_ROUTES.filter((r) =>
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
      <div className="flex h-14 items-center gap-2 border-b border-white/10 px-4 text-white">
        <SettingOutlined style={{ fontSize: 18, color: '#B7791F' }} />
        {!collapsed && !isMobile && (
          <span className="font-bold">XM 管理后台</span>
        )}
        {isMobile && <span className="font-bold">XM 管理后台</span>}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        defaultOpenKeys={['content', 'ops', 'settings']}
        items={allowedMenu}
        onClick={handleMenuClick}
        className="!border-0 !bg-transparent"
      />
    </div>
  );

  return (
    <Layout className="min-h-screen bg-slate-50">
      {!isMobile && (
        <Sider
          width={240}
          collapsible
          collapsed={isTablet || collapsed}
          collapsedWidth={64}
          trigger={null}
          className="!bg-navy-900 shadow-[inset_-1px_0_0_rgba(255,255,255,0.08)]"
        >
          {siderContent}
        </Sider>
      )}
      <Layout>
        <Header className="flex h-14 items-center justify-between !border-b !border-slate-200 !bg-white/95 !px-4 backdrop-blur">
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
                <Button type="text" size="small" icon={<HomeOutlined />} className="!hidden sm:!inline-flex">
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
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </Content>
      </Layout>

      {isMobile && (
        <Drawer
          placement="left"
          open={mobileDrawerOpen}
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
      )}
    </Layout>
  );
}
