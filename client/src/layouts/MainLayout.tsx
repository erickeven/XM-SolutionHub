import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  Drawer,
  Dropdown,
  message,
} from 'antd';
import {
  MenuOutlined,
  RobotOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
  HomeOutlined,
  AppstoreOutlined,
  MessageOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/selection', label: '选型' },
  { path: '/solutions', label: '方案资料' },
  { path: '/ai-chat', label: 'AI问答' },
];

const BOTTOM_NAV_ITEMS = [
  { path: '/', label: '首页', icon: <HomeOutlined /> },
  { path: '/selection', label: '选型', icon: <AppstoreOutlined /> },
  { path: '/ai-chat', label: 'AI', icon: <MessageOutlined /> },
  { path: '/profile', label: '我的', icon: <ProfileOutlined /> },
];

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAdminRole =
    user?.role === 'ADMIN' || user?.role === 'AUDITOR' || user?.role === 'STAFF';

  const handleLogout = async () => {
    await logout();
    message.success('已退出登录');
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header: 64px, navy-950 */}
      <header className="sticky top-0 z-40 h-16 border-b border-white/10 bg-navy-950 text-white">
        <div className="container-page flex h-full items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-wide">芯茂微</span>
            <span className="hidden text-sm text-slate-400 sm:inline">
              SolutionHub
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
                  isActive(item.path)
                    ? 'bg-white/10 font-medium text-white'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="hidden items-center gap-2 md:flex">
            <Link to="/ai-chat">
              <Button
                type="primary"
                size="small"
                className="!bg-copper-500 !border-copper-500 hover:!bg-amber-600 hover:!border-amber-600"
              >
                <RobotOutlined /> 开始对话
              </Button>
            </Link>
            {isAuthenticated && user ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      icon: <UserOutlined />,
                      label: '个人中心',
                      onClick: () => navigate('/profile'),
                    },
                    ...(isAdminRole
                      ? [
                          {
                            key: 'admin',
                            icon: <SettingOutlined />,
                            label: '进入后台',
                            onClick: () => navigate('/admin'),
                          },
                        ]
                      : []),
                    { type: 'divider' as const },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: '退出登录',
                      onClick: handleLogout,
                    },
                  ],
                }}
              >
                <Button
                  type="text"
                  size="small"
                  className="!text-slate-300 hover:!text-white"
                >
                  <UserOutlined className="!mr-1" />
                  {user.email.split('@')[0]}
                </Button>
              </Dropdown>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    type="text"
                    size="small"
                    className="!text-slate-300 hover:!text-white"
                  >
                    登录
                  </Button>
                </Link>
                <Link to="/register">
                  <Button type="primary" size="small">
                    注册
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="text-white md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="打开菜单"
          >
            <MenuOutlined style={{ fontSize: 20 }} />
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <span className="font-bold">芯茂微</span>
            <span className="text-sm text-slate-500">SolutionHub</span>
          </div>
        }
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={280}
      >
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`rounded-md px-3 py-2 text-base transition-colors ${
                isActive(item.path)
                  ? 'bg-blue-50 font-medium text-blue-600'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            to="/ai-chat"
            onClick={() => setMobileMenuOpen(false)}
            className="mt-2 flex items-center justify-center rounded-md bg-copper-500 px-3 py-2 text-base font-medium text-white"
          >
            <RobotOutlined className="mr-2" />
            开始对话
          </Link>
          <hr className="my-3 border-slate-200" />
          {isAuthenticated && user ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base text-slate-700 hover:bg-slate-50"
              >
                <UserOutlined className="mr-2" />
                个人中心 · {user.email}
              </Link>
              {isAdminRole && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-base text-slate-700 hover:bg-slate-50"
                >
                  <SettingOutlined className="mr-2" />
                  进入后台
                </Link>
              )}
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="rounded-md px-3 py-2 text-left text-base text-red-600 hover:bg-red-50"
              >
                <LogoutOutlined className="mr-2" />
                退出登录
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base text-slate-700 hover:bg-slate-50"
              >
                登录
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md bg-blue-600 px-3 py-2 text-center text-base text-white"
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </Drawer>

      {/* Content */}
      <main className="flex-1 pb-14 md:pb-0">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="hidden md:block border-t border-white/10 bg-navy-950 text-slate-400">
        <div className="container-page py-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-white">
                <span className="text-base font-bold">芯茂微</span>
                <span className="text-xs text-slate-500">SolutionHub</span>
              </div>
              <p className="text-sm leading-relaxed">
                专业的电源芯片选型与方案资料平台，毫秒级匹配、可解释推荐、全规格书可预览。
              </p>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-white">快速链接</div>
              <div className="flex flex-col gap-1 text-sm">
                <Link to="/selection" className="hover:text-white">
                  智能选型
                </Link>
                <Link to="/ai-chat" className="hover:text-white">
                  <RobotOutlined className="!mr-1" />
                  AI 技术问答
                </Link>
                <Link to="/solutions" className="hover:text-white">
                  方案资料
                </Link>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-white">联系我们</div>
              <div className="space-y-1 text-sm">
                <p>邮箱：info@xinmaowei.com</p>
                <p>电话：400-xxx-xxxx</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-slate-800 pt-4 text-xs sm:flex-row">
            <span>© {new Date().getFullYear()} 芯茂微电子. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">
                隐私政策
              </a>
              <a href="#" className="hover:text-white">
                服务条款
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                active ? 'text-blue-600' : 'text-slate-500'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
