import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { antdTheme } from './styles/theme';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './features/selection/HomePage';
import { SelectionPage } from './features/selection/SelectionPage';
import { ProductDetailPage } from './features/products/ProductDetailPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { SolutionDetailPage } from './features/solutions/SolutionDetailPage';
import { AiChatPage } from './features/ai-chat/AiChatPage';
import { TraceDebugPage } from './features/admin/trace/TraceDebugPage';
import { KnowledgeListPage } from './features/admin/knowledge/KnowledgeListPage';
import { UserListPage } from './features/admin/users/UserListPage';
import { AuditLogPage } from './features/admin/audit/AuditLogPage';
import { LeadsListPage } from './features/admin/leads/LeadsListPage';
import { ProfilePage } from './features/profile/ProfilePage';

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
              <Route path="/solutions" element={<PlaceholderPage title="方案资料" />} />
              <Route path="/ai-chat" element={<AiChatPage />} />
              <Route path="/ai-chat/:sessionId" element={<AiChatPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/admin/knowledge" element={<KnowledgeListPage />} />
              <Route path="/admin/trace/:docId" element={<TraceDebugPage />} />
              <Route path="/admin/users" element={<UserListPage />} />
              <Route path="/admin/audit" element={<AuditLogPage />} />
              <Route path="/admin/leads" element={<LeadsListPage />} />
              <Route path="/admin/*" element={<PlaceholderPage title="后台管理" />} />
            </Route>
          </Routes>
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