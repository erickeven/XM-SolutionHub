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
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useUiContent, useUiText } from '../api/ui-content';

export function MainLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, isAuthenticated, logout } = useAuth();
  const { text } = useUiContent();
  const navHome = useUiText('main.nav.home', '首页');
  const navSelection = useUiText('main.nav.selection', '选型');
  const navSolutions = useUiText('main.nav.solutions', '方案资料');
  const navAi = useUiText('main.nav.ai', 'AI问答');
  const chatCta = useUiText('main.cta.chat', '开始对话');
  const loginText = useUiText('auth.login', '登录');
  const registerText = useUiText('auth.register', '注册');
  const profileText = useUiText('main.nav.profile', '我的');
  const footerSelection = useUiText('main.footer.selection', '智能选型');
  const footerAi = useUiText('main.footer.ai', 'AI 技术问答');
  const footerDesc = useUiText(
    'main.footer.description',
    '专业的电源芯片选型与方案资料平台，毫秒级匹配、可解释推荐、全规格书可预览。',
  );
  const navItems = [
    { path: '/', label: navHome },
    { path: '/selection', label: navSelection },
    { path: '/solutions', label: navSolutions },
    { path: '/ai-chat', label: navAi },
  ];
  const bottomNavItems = [
    { path: '/', label: navHome, icon: <HomeOutlined /> },
    { path: '/selection', label: navSelection, icon: <AppstoreOutlined /> },
    { path: '/ai-chat', label: text('main.nav.aiShort', 'AI'), icon: <MessageOutlined /> },
    { path: '/profile', label: profileText, icon: <ProfileOutlined /> },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAdminRole =
    user?.permissions?.includes('admin.dashboard.read') ?? false;

  const handleLogout = async () => {
    await logout();
    message.success(text('auth.logout.success', '已退出登录'));
    navigate('/');
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-40 h-16 border-b border-white/10 bg-navy-950/95 text-white shadow-[0_1px_0_rgba(255,255,255,0.04)] backdrop-blur">
        <div className="container-page flex h-full items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-copper-400/40 bg-copper-500/15 text-copper-400">
              <AppstoreOutlined />
            </span>
            <span className="text-lg font-bold">{text('brand.name', '芯茂微')}</span>
            <span className="hidden border-l border-white/15 pl-3 text-sm text-slate-400 sm:inline">
              {text('brand.suffix', 'SolutionHub')}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`rounded-md px-3 py-2 text-sm transition-colors ${
                  isActive(item.path)
                    ? 'bg-white/[0.12] font-medium text-white'
                    : 'text-slate-300 hover:bg-white/[0.08] hover:text-white'
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
                className="!border-copper-500 !bg-copper-500 hover:!border-copper-400 hover:!bg-copper-400"
              >
                <RobotOutlined /> {chatCta}
              </Button>
            </Link>
            {isAuthenticated && user ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      icon: <UserOutlined />,
                      label: text('main.profile', '个人中心'),
                      onClick: () => navigate('/profile'),
                    },
                    ...(isAdminRole
                      ? [
                          {
                            key: 'admin',
                            icon: <SettingOutlined />,
                            label: text('main.admin', '进入后台'),
                            onClick: () => navigate('/admin'),
                          },
                        ]
                      : []),
                    { type: 'divider' as const },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: text('auth.logout', '退出登录'),
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
                    {loginText}
                  </Button>
                </Link>
                <Link to="/register">
                  <Button type="primary" size="small">
                    {registerText}
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-white md:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label={text('main.menu.open', '打开菜单')}
          >
            <MenuOutlined style={{ fontSize: 20 }} />
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <Drawer
        title={text('main.menu.title', '导航')}
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={280}
      >
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
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
            {chatCta}
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
                {text('main.profile', '个人中心')} · {user.email}
              </Link>
              {isAdminRole && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-base text-slate-700 hover:bg-slate-50"
                >
                  <SettingOutlined className="mr-2" />
                  {text('main.admin', '进入后台')}
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
                {text('auth.logout', '退出登录')}
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md px-3 py-2 text-base text-slate-700 hover:bg-slate-50"
              >
                {loginText}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-md bg-blue-600 px-3 py-2 text-center text-base text-white"
              >
                {registerText}
              </Link>
            </>
          )}
        </nav>
      </Drawer>

      {/* Content */}
      <main className="flex-1 pb-14 md:pb-0">
        <ErrorBoundary
          title={text('common.pageError', '页面发生错误')}
          unknownError={text('common.unknownError', '未知错误')}
          retryText={text('common.retry', '重试')}
        >
          <Outlet />
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="hidden border-t border-white/10 bg-navy-950 text-slate-400 md:block">
        <div className="container-page py-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-white">
                <span className="text-base font-bold">{text('brand.name', '芯茂微')}</span>
                <span className="text-xs text-slate-500">{text('brand.suffix', 'SolutionHub')}</span>
              </div>
              <p className="text-sm leading-relaxed">
                {footerDesc}
              </p>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-white">{text('main.footer.links', '快速链接')}</div>
              <div className="flex flex-col gap-1 text-sm">
                <Link to="/selection" className="hover:text-white">
                  {footerSelection}
                </Link>
                <Link to="/ai-chat" className="hover:text-white">
                  <RobotOutlined className="!mr-1" />
                  {footerAi}
                </Link>
                <Link to="/solutions" className="hover:text-white">
                  {navSolutions}
                </Link>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-white">{text('main.footer.contact', '联系我们')}</div>
              <div className="space-y-1 text-sm">
                <p>{text('main.footer.email', '邮箱：info@xinmaowei.com')}</p>
                <p>{text('main.footer.phone', '电话：400-xxx-xxxx')}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-slate-800 pt-4 text-xs sm:flex-row">
            <span>© {new Date().getFullYear()} {text('main.footer.copyright', '芯茂微电子. All rights reserved.')}</span>
            <div className="flex gap-4">
              <span className="cursor-default">
                {text('main.footer.privacy', '隐私政策')}
              </span>
              <span className="cursor-default">
                {text('main.footer.terms', '服务条款')}
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-14 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        {bottomNavItems.map((item) => {
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
