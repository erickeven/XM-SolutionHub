import { lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider, Result, Spin } from 'antd';
import { antdTheme } from './styles/theme';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './features/selection/HomePage';
import { RouteGuard } from './components/RouteGuard';

const SelectionPage = lazy(() => import('./features/selection/SelectionPage').then((module) => ({ default: module.SelectionPage })));
const ProductDetailPage = lazy(() => import('./features/products/ProductDetailPage').then((module) => ({ default: module.ProductDetailPage })));
const LoginPage = lazy(() => import('./features/auth/LoginPage').then((module) => ({ default: module.LoginPage })));
const RegisterPage = lazy(() => import('./features/auth/RegisterPage').then((module) => ({ default: module.RegisterPage })));
const SolutionDetailPage = lazy(() => import('./features/solutions/SolutionDetailPage').then((module) => ({ default: module.SolutionDetailPage })));
const SolutionsPage = lazy(() => import('./features/solutions/SolutionsPage').then((module) => ({ default: module.SolutionsPage })));
const AiChatPage = lazy(() => import('./features/ai-chat/AiChatPage').then((module) => ({ default: module.AiChatPage })));
const TraceDebugPage = lazy(() => import('./features/admin/trace/TraceDebugPage').then((module) => ({ default: module.TraceDebugPage })));
const KnowledgeListPage = lazy(() => import('./features/admin/knowledge/KnowledgeListPage').then((module) => ({ default: module.KnowledgeListPage })));
const UserListPage = lazy(() => import('./features/admin/users/UserListPage').then((module) => ({ default: module.UserListPage })));
const AuditLogPage = lazy(() => import('./features/admin/audit/AuditLogPage').then((module) => ({ default: module.AuditLogPage })));
const LeadsListPage = lazy(() => import('./features/admin/leads/LeadsListPage').then((module) => ({ default: module.LeadsListPage })));
const ProfilePage = lazy(() => import('./features/profile/ProfilePage').then((module) => ({ default: module.ProfilePage })));

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
          <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center"><Spin size="large" /></div>}>
            <Routes>
            {/* Auth pages — outside MainLayout, full page */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Main layout pages */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/selection" element={<SelectionPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/solutions/:id" element={<SolutionDetailPage />} />
              <Route path="/solutions" element={<SolutionsPage />} />
              <Route path="/ai-chat" element={<RouteGuard><AiChatPage /></RouteGuard>} />
              <Route path="/ai-chat/:sessionId" element={<RouteGuard><AiChatPage /></RouteGuard>} />
              <Route path="/profile" element={<RouteGuard><ProfilePage /></RouteGuard>} />
              <Route path="/admin/knowledge" element={<RouteGuard roles={['ADMIN']}><KnowledgeListPage /></RouteGuard>} />
              <Route path="/admin/trace/:docId" element={<RouteGuard roles={['ADMIN']}><TraceDebugPage /></RouteGuard>} />
              <Route path="/admin/users" element={<RouteGuard roles={['ADMIN']}><UserListPage /></RouteGuard>} />
              <Route path="/admin/audit" element={<RouteGuard roles={['ADMIN']}><AuditLogPage /></RouteGuard>} />
              <Route path="/admin/leads" element={<RouteGuard roles={['STAFF', 'AUDITOR', 'ADMIN']}><LeadsListPage /></RouteGuard>} />
              <Route path="/admin/*" element={<RouteGuard roles={['STAFF', 'AUDITOR', 'ADMIN']}><PlaceholderPage title="后台管理" /></RouteGuard>} />
              <Route path="*" element={<Result status="404" title="页面不存在" />} />
            </Route>
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ConfigProvider>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-500">页面建设中</p>
      </div>
    </div>
  );
}
