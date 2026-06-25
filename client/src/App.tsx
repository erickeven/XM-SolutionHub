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
                <Route path="*" element={<Result status="404" title="页面不存在" />} />
              </Route>

              {/* Admin layout */}
              <Route
                path="/admin"
                element={
                  <RouteGuard roles={['STAFF', 'AUDITOR', 'ADMIN']}>
                    <AdminLayout />
                  </RouteGuard>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route
                  path="products"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <ProductListPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="product-fields"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <ProductFieldSettingsPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="solutions"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <SolutionListPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="materials"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <MaterialListPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="material-fields"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <MaterialFieldSettingsPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="knowledge"
                  element={
                    <RouteGuard roles={['ADMIN', 'AUDITOR']}>
                      <KnowledgeListPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="knowledge/:docId/trace"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <TraceDebugPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="trace/:docId"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <TraceDebugPage />
                    </RouteGuard>
                  }
                />
                <Route path="leads" element={<LeadsListPage />} />
                <Route
                  path="users"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <UserListPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="roles"
                  element={
                    <RouteGuard roles={['ADMIN']}>
                      <RoleListPage />
                    </RouteGuard>
                  }
                />
                <Route
                  path="audit"
                  element={
                    <RouteGuard roles={['ADMIN', 'AUDITOR']}>
                      <AuditLogPage />
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
