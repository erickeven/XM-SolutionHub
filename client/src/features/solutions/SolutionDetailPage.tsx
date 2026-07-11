import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Grid, Result, Skeleton, Tabs } from 'antd';
import { Link, useParams } from 'react-router-dom';
import { getSolutionById, getSolutionMaterials } from '../../api/solutions';
import { useAuth } from '../../hooks/useAuth';
import { MaterialList } from './MaterialList';
import { PdfPreview } from './PdfPreview';
import { SolutionSummary } from './SolutionSummary';
import { DownloadAllButton, DownloadButton } from './DownloadButton';
import { message } from 'antd';
import type { ProductSolution } from '../../types/solution';
import { useUiContent, useUiText } from '../../api/ui-content';

export function SolutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { text } = useUiContent();
  const screens = Grid.useBreakpoint();
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const notFoundTitle = useUiText('solution.detail.notFound', '方案未找到');
  const backSelectionText = useUiText('solution.detail.backSelection', '返回选型');
  const breadcrumbText = useUiText('solutions.title', '方案资料');
  const catalogText = useUiText('solution.material.catalog', '资料目录');
  const materialsLoadFailedText = useUiText('solution.material.loadFailed', '资料加载失败');
  const materialEmptyText = useUiText('solution.material.empty', '资料整理中');
  const materialTabText = useUiText('solution.tabs.materials', '资料');
  const previewTabText = useUiText('solution.tabs.preview', '预览');
  const productsTabText = useUiText('solution.tabs.products', '关联型号');
  const noProductsText = useUiText('solution.products.empty', '暂无关联型号');

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

  useEffect(() => {
    if (!selectedMaterialId && materials && materials.length > 0) {
      setSelectedMaterialId(materials[0]!.id);
    }
  }, [materials, selectedMaterialId]);

  if (!id) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-8">
        <Result
          status="404"
          title={notFoundTitle}
          subTitle={text('solution.detail.notFound.subtitle', '抱歉，您访问的方案不存在。')}
          extra={
            <Link to="/selection">
              <Button type="primary">{backSelectionText}</Button>
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
          title={text('solution.detail.loadFailed', '加载失败')}
          subTitle={text('solution.detail.loadFailed.subtitle', '方案信息加载失败，请稍后重试。')}
          extra={
            <Link to="/selection">
              <Button type="primary">{backSelectionText}</Button>
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
        ← {breadcrumbText}
      </Link>

      {screens.lg ? (
      <div className="flex gap-4" style={{ minHeight: 'calc(100vh - 200px)' }}>
        {/* Left: material directory */}
        <aside className="w-60 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-medium text-slate-700">{catalogText}</h3>
          </div>
          {materialsLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} className="p-4" />
          ) : materialsError ? (
            <div className="p-4 text-sm text-red-500">{materialsLoadFailedText}</div>
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
            hasMaterials={!!hasMaterials}
          />
        </aside>
      </div>
      ) : (
      <div>
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
              label: materialTabText,
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
                <Empty description={materialEmptyText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ),
            },
            {
              key: 'preview',
              label: previewTabText,
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
              label: productsTabText,
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
                <Empty description={noProductsText} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ),
            },
          ]}
        />

        {/* Bottom: fixed action bar */}
        {hasMaterials && (
          <div className="fixed inset-x-0 bottom-14 z-30 border-t border-slate-200 bg-white p-3 shadow-md">
            <div className="mx-auto flex max-w-[1280px] gap-3">
              <DownloadButton
                materialId={selectedMaterialId}
                isAuthenticated={isAuthenticated}
                onError={(msg) => message.error(msg)}
              />
              {id && (
                <DownloadAllButton
                  solutionId={id}
                  isAuthenticated={isAuthenticated}
                  disabled={!hasMaterials}
                  onError={(msg) => message.error(msg)}
                />
              )}
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}
