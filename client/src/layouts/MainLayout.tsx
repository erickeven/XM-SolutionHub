import { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Dropdown, message } from 'antd';
import { MenuOutlined, RobotOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/', label: '首页' },
  { path: '/selection', label: '选型' },
  { path: '/solutions', label: '方案资料' },
  { path: '/ai-chat', label: 'AI问答' },
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

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header: 64px, navy-950 bg */}
      <header className="sticky top-0 z-40 h-16 bg-navy-950 text-white">
        <div className="mx-auto flex h-full max-w-[1280px] items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span className="text-lg font-bold">芯茂微</span>
            <span className="hidden text-sm text-slate-400 sm:inline">SolutionHub</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm transition-colors ${
                  isActive(item.path)
                    ? 'font-medium text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Login status */}
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated && user ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'profile',
                      label: '个人中心',
                      onClick: () => navigate('/profile'),
                    },
                    {
                      key: 'logout',
                      label: '退出登录',
                      icon: <LogoutOutlined />,
                      onClick: async () => {
                        await logout();
                        message.success('已退出登录');
                        navigate('/');
                      },
                    },
                  ],
                }}
              >
                <Button type="text" size="small" className="!text-slate-300 hover:!text-white">
                  <UserOutlined className="!mr-1" />
                  {user.email}
                </Button>
              </Dropdown>
            ) : (
              <>
                <Link to="/login">
                  <Button type="text" size="small" className="!text-slate-300 hover:!text-white">
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
          >
            <MenuOutlined style={{ fontSize: 20 }} />
          </button>
        </div>
      </header>

      {/* Mobile menu drawer */}
      <Drawer
        title="导航"
        placement="right"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={260}
      >
        <nav className="flex flex-col gap-4">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`text-base ${
                isActive(item.path) ? 'font-medium text-blue-600' : 'text-slate-700'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <hr className="border-slate-200" />
          {isAuthenticated && user ? (
            <>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-slate-700"
              >
                {user.email}
              </Link>
              <button
                onClick={async () => {
                  await logout();
                  setMobileMenuOpen(false);
                  message.success('已退出登录');
                  navigate('/');
                }}
                className="text-left text-base text-slate-700"
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-slate-700"
              >
                登录
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-base text-slate-700"
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </Drawer>

      {/* Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-navy-950 text-slate-400">
        <div className="mx-auto max-w-[1280px] px-4 py-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <div className="mb-2 flex items-center gap-2 text-white">
                <span className="font-bold">芯茂微</span>
                <span className="text-sm text-slate-500">SolutionHub</span>
              </div>
              <p className="text-sm">专业的电源芯片选型与方案资料平台</p>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-white">快速链接</div>
              <div className="flex flex-col gap-1 text-sm">
                <Link to="/selection" className="hover:text-white">智能选型</Link>
                <Link to="/ai-chat" className="hover:text-white">
                  <RobotOutlined className="!mr-1" />
                  AI 问答
                </Link>
                <Link to="/solutions" className="hover:text-white">方案资料</Link>
              </div>
            </div>
            <div>
              <div className="mb-2 text-sm font-medium text-white">联系我们</div>
              <div className="text-sm">
                <p>邮箱: info@xinmaowei.com</p>
                <p>电话: 400-xxx-xxxx</p>
              </div>
            </div>
          </div>
          <div className="mt-6 flex flex-col items-center justify-between gap-2 border-t border-slate-700 pt-4 text-xs sm:flex-row">
            <span>© 2026 芯茂微电子. All rights reserved.</span>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white">隐私政策</a>
              <a href="#" className="hover:text-white">服务条款</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}