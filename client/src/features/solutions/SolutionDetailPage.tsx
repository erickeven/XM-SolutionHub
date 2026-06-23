import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Result, Skeleton, Tabs, Empty } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { getSolutionById, getSolutionMaterials } from '../../api/solutions';
import { useAuth } from '../../hooks/useAuth';
import { MaterialList } from './MaterialList';
import { PdfPreview } from './PdfPreview';
import { SolutionSummary } from './SolutionSummary';
import { DownloadButton } from './DownloadButton';
import { message } from 'antd';
import type { ProductSolution } from '../../types/solution';

export function SolutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);

  const {
    data: solution,
    isLoading: solutionLoading,
    isError: solutionError,
  } = useQuery({
    queryKey: ['solution', id],
    queryFn: () => getSolutionById(id!),
    enabled: !!id,
  });

  const {
    data: materials,
    isLoading: materialsLoading,
    isError: materialsError,
  } = useQuery({
    queryKey: ['solution-materials', id],
    queryFn: () => getSolutionMaterials(id!),
    enabled: !!id,
  });

  if (!id) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <Result
          status="404"
          title="方案未找到"
          subTitle="抱歉，您访问的方案不存在。"
          extra={
            <Link to="/selection">
              <Button type="primary">返回选型</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (solutionLoading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (solutionError || !solution) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <Result
          status="error"
          title="加载失败"
          subTitle="方案信息加载失败，请稍后重试。"
          extra={
            <Link to="/selection">
              <Button type="primary">返回选型</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const products: ProductSolution[] = solution.products ?? [];
  const hasMaterials = materials && materials.length > 0;

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-6">
      {/* Breadcrumb */}
      <Link to="/solutions" className="mb-4 inline-block text-sm text-blue-600 hover:text-blue-700">
        ← 方案资料
      </Link>

      {/* PC layout: three columns ≥1024px */}
      <div className="hidden lg:flex lg:gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Left: material directory */}
        <aside className="w-60 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-700">资料目录</h3>
          </div>
          {materialsLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} className="p-4" />
          ) : materialsError ? (
            <div className="p-4 text-sm text-red-500">资料加载失败</div>
          ) : (
            <MaterialList
              materials={materials ?? []}
              selectedId={selectedMaterialId}
              onSelect={setSelectedMaterialId}
              isAuthenticated={isAuthenticated}
            />
          )}
        </aside>

        {/* Center: PDF preview */}
        <main className="flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <PdfPreview materialId={selectedMaterialId} isAuthenticated={isAuthenticated} />
        </main>

        {/* Right: solution summary */}
        <aside className="w-72 shrink-0 overflow-y-auto rounded-lg border border-slate-200 bg-white">
          <SolutionSummary
            solution={solution}
            products={products}
            selectedMaterialId={selectedMaterialId}
            isAuthenticated={isAuthenticated}
          />
        </aside>
      </div>

      {/* Mobile layout: single column <1024px */}
      <div className="lg:hidden">
        {/* Top: solution summary */}
        <div className="mb-4 rounded-lg border border-slate-200 bg-white p-4">
          <h1 className="text-xl font-bold text-slate-900">{solution.name}</h1>
          <p className="mt-1 text-sm text-slate-600">{solution.description}</p>
        </div>

        {/* Tabs */}
        <Tabs
          defaultActiveKey="materials"
          items={[
            {
              key: 'materials',
              label: '资料',
              children: hasMaterials ? (
                <div className="rounded-lg border border-slate-200 bg-white">
                  <MaterialList
                    materials={materials!}
                    selectedId={selectedMaterialId}
                    onSelect={setSelectedMaterialId}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              ) : (
                <Empty description="资料整理中" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ),
            },
            {
              key: 'preview',
              label: '预览',
              children: (
                <div
                  className="rounded-lg border border-slate-200 bg-white"
                  style={{ height: '60vh' }}
                >
                  <PdfPreview materialId={selectedMaterialId} isAuthenticated={isAuthenticated} />
                </div>
              ),
            },
            {
              key: 'products',
              label: '关联型号',
              children: products.length > 0 ? (
                <ul className="space-y-2">
                  {products.map((p) => (
                    <li key={p.id}>
                      <Link
                        to={`/products/${p.id}`}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        {p.model} · {p.series}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty description="暂无关联型号" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ),
            },
          ]}
        />

        {/* Bottom: fixed action bar */}
        {hasMaterials && (
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white p-3 shadow-md">
            <div className="mx-auto flex max-w-[1280px] gap-3">
              <DownloadButton
                materialId={selectedMaterialId}
                isAuthenticated={isAuthenticated}
                onError={(msg) => message.error(msg)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
