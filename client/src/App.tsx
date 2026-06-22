import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { antdTheme } from './styles/theme';
import { MainLayout } from './layouts/MainLayout';
import { HomePage } from './features/selection/HomePage';
import { SelectionPage } from './features/selection/SelectionPage';
import { ProductDetailPage } from './features/products/ProductDetailPage';

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
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/selection" element={<SelectionPage />} />
              <Route path="/products/:id" element={<ProductDetailPage />} />
              <Route path="/solutions/:id" element={<PlaceholderPage title="方案资料" />} />
              <Route path="/solutions" element={<PlaceholderPage title="方案资料" />} />
              <Route path="/ai-chat" element={<PlaceholderPage title="AI 问答" />} />
              <Route path="/login" element={<PlaceholderPage title="登录" />} />
              <Route path="/register" element={<PlaceholderPage title="注册" />} />
              <Route path="/profile" element={<PlaceholderPage title="个人中心" />} />
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