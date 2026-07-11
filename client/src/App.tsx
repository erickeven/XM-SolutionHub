import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ConfigProvider, Result, Spin, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { antdTheme } from './styles/theme';
import { MainLayout } from './layouts/MainLayout';
import { AdminLayout } from './layouts/AdminLayout';
import { HomePage } from './features/selection/HomePage';
import { RouteGuard } from './components/RouteGuard';
import { useUiContent } from './api/ui-content';

// Public pages (lazy)
const SelectionPage = lazy(() =>
  import('./features/selection/SelectionPage').then((m) => ({ default: m.SelectionPage })),
);
const ProductDetailPage = lazy(() =>
  import('./features/products/ProductDetailPage').then((m) => ({ default: m.ProductDetailPage })),
);
const LoginPage = lazy(() =>
  import('./features/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('./features/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
);
const SolutionDetailPage = lazy(() =>
  import('./features/solutions/SolutionDetailPage').then((m) => ({ default: m.SolutionDetailPage })),
);
const SolutionsPage = lazy(() =>
  import('./features/solutions/SolutionsPage').then((m) => ({ default: m.SolutionsPage })),
);
const AiChatPage = lazy(() =>
  import('./features/ai-chat/AiChatPage').then((m) => ({ default: m.AiChatPage })),
);
const ProfilePage = lazy(() =>
  import('./features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })),
);

// Admin pages (lazy)
const DashboardPage = lazy(() =>
  import('./features/admin/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const ProductListPage = lazy(() =>
  import('./features/admin/products/ProductListPage').then((m) => ({ default: m.ProductListPage })),
);
const SolutionListPage = lazy(() =>
  import('./features/admin/solutions/SolutionListPage').then((m) => ({ default: m.SolutionListPage })),
);
const MaterialListPage = lazy(() =>
  import('./features/admin/materials/MaterialListPage').then((m) => ({ default: m.MaterialListPage })),
);
const TraceDebugPage = lazy(() =>
  import('./features/admin/trace/TraceDebugPage').then((m) => ({ default: m.TraceDebugPage })),
);
const KnowledgeListPage = lazy(() =>
  import('./features/admin/knowledge/KnowledgeListPage').then((m) => ({ default: m.KnowledgeListPage })),
);
const UserListPage = lazy(() =>
  import('./features/admin/users/UserListPage').then((m) => ({ default: m.UserListPage })),
);
const AuditLogPage = lazy(() =>
  import('./features/admin/audit/AuditLogPage').then((m) => ({ default: m.AuditLogPage })),
);
const LeadsListPage = lazy(() =>
  import('./features/admin/leads/LeadsListPage').then((m) => ({ default: m.LeadsListPage })),
);
const ProductFieldSettingsPage = lazy(() =>
  import('./features/admin/product-fields/ProductFieldSettingsPage').then((m) => ({
    default: m.ProductFieldSettingsPage,
  })),
);
const RoleListPage = lazy(() =>
  import('./features/admin/roles/RoleListPage').then((m) => ({ default: m.RoleListPage })),
);
const MaterialFieldSettingsPage = lazy(() =>
  import('./features/admin/material-fields/MaterialFieldSettingsPage').then((m) => ({
    default: m.MaterialFieldSettingsPage,
  })),
);
const AiSettingsPage = lazy(() =>
  import('./features/admin/ai-settings/AiSettingsPage').then((m) => ({
    default: m.AiSettingsPage,
  })),
);
const UiContentSettingsPage = lazy(() =>
  import('./features/admin/ui-content/UiContentSettingsPage').then((m) => ({
    default: m.UiContentSettingsPage,
  })),
);

function AdminNotFoundPage() {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <Result
        status="404"
        title="页面不存在"
        subTitle="您访问的后台页面不存在"
        extra={
          <Link to="/admin">
            <Button type="primary" icon={<ArrowLeftOutlined />}>
              返回驾驶舱
            </Button>
          </Link>
        }
      />
    </div>
  );
}

function PublicNotFoundPage() {
  const { text } = useUiContent();
  return <Result status="404" title={text('common.notFound', '页面不存在')} />;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
  },
});

export default function App() {
  return (
    <ConfigProvider theme={antdTheme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense
            fallback={
              <div className="flex min-h-[50vh] items-center justify-center">
                <Spin size="large" />
              </div>
            }
          >
            <Routes>
              {/* Auth pages — top-level (no layout chrome) */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />

              {/* Public layout */}
              <Route element={<MainLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/selection" element={<SelectionPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/solutions" element={<SolutionsPage />} />
                <Route path="/solutions/:id" element={<SolutionDetailPage />} />
                <Route
                  path="/ai-chat"
                  element={
                    <RouteGuard>
                      <AiChatPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/ai-chat/:sessionId"
                  element={
                    <RouteGuard>
                      <AiChatPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <RouteGuard>
                      <ProfilePage />
                    </RouteGuard>
                  }
                />
                <Route path="*" element={<PublicNotFoundPage />} />
              </Route>

              {/* Admin layout */}
              <Route
                path="/admin"
                element={
                  <RouteGuard permissions={['admin.dashboard.read']}>
                    <AdminLayout />
                  </RouteGuard>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route
                  path="products"
                  element={
<RouteGuard permissions={['products.read']}>
                    <ProductListPage />
                  </RouteGuard>
                  }
                />
                <Route
                  path="product-fields"
                  element={
<RouteGuard permissions={['products.write']}>
                    <ProductFieldSettingsPage />
                  </RouteGuard>
                  }
                />
                <Route
                  path="solutions"
                  element={
<RouteGuard permissions={['solutions.read']}>
                    <SolutionListPage />
                  </RouteGuard>
                  }
                />
                <Route
                  path="materials"
                  element={
<RouteGuard permissions={['materials.read']}>
                    <MaterialListPage />
                  </RouteGuard>
                  }
                />
                <Route
                  path="material-fields"
                  element={
<RouteGuard permissions={['materials.write']}>
                    <MaterialFieldSettingsPage />
                  </RouteGuard>
                  }
                />
                <Route
                  path="knowledge"
                  element={
<RouteGuard permissions={['knowledge.read']}>
                    <KnowledgeListPage />
                  </RouteGuard>
                  }
                />
                <Route
                  path="knowledge/:docId/trace"
                  element={
                    <RouteGuard permissions={['knowledge.write']}>
                      <TraceDebugPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="trace/:docId"
                  element={
                    <RouteGuard permissions={['knowledge.write']}>
                      <TraceDebugPage />
                    </RouteGuard>
                  }
                />
                <Route path="leads" element={<RouteGuard permissions={['leads.read']}>
                      <LeadsListPage />
                    </RouteGuard>} />
                <Route
                  path="users"
                  element={
                                    <RouteGuard permissions={['users.read']}>
                      <UserListPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="roles"
                  element={
                    <RouteGuard permissions={['users.write']}>
                      <RoleListPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <RouteGuard permissions={['audit.read']}>
                      <AuditLogPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="ui-content"
                  element={
                    <RouteGuard permissions={['settings.ui.read']}>
                      <UiContentSettingsPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="ai-settings"
                  element={
                    <RouteGuard permissions={['settings.ai.read']}>
                      <AiSettingsPage />
                    </RouteGuard>
                  }
                />
                <Route path="*" element={<AdminNotFoundPage />} />
              </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}
