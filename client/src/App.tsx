import { BrowserRouter, Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PlaceholderPage title="首页" />} />
        <Route path="/selection" element={<PlaceholderPage title="选型页" />} />
        <Route path="/products/:id" element={<PlaceholderPage title="产品详情" />} />
        <Route path="/solutions/:id" element={<PlaceholderPage title="方案资料" />} />
        <Route path="/ai-chat" element={<PlaceholderPage title="AI 问答" />} />
        <Route path="/login" element={<PlaceholderPage title="登录" />} />
        <Route path="/register" element={<PlaceholderPage title="注册" />} />
        <Route path="/profile" element={<PlaceholderPage title="个人中心" />} />
        <Route path="/admin/*" element={<PlaceholderPage title="后台管理" />} />
      </Routes>
    </BrowserRouter>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>{title}</h1>
      <p>页面建设中</p>
    </div>
  );
}