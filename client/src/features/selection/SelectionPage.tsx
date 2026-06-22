import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Drawer, Skeleton, Empty, message, Segmented, Alert } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { matchProducts, getPopularProducts } from '../../api/selection';
import type { SelectionInput, MatchResult } from '../../types/selection';
import { SelectionCard } from './SelectionCard';
import { FilterPanel } from './FilterPanel';
import { CompareBar } from './CompareBar';

const DEFAULT_FILTER: SelectionInput = {
  inputVoltageMin: 90,
  inputVoltageMax: 264,
  outputVoltage: 5,
  outputCurrent: 2,
  applicationType: '',
  certifications: [],
};

function parseParams(searchParams: URLSearchParams): SelectionInput {
  const filter: SelectionInput = { ...DEFAULT_FILTER };
  const ivMin = searchParams.get('inputVoltageMin');
  if (ivMin) filter.inputVoltageMin = Number(ivMin);
  const ivMax = searchParams.get('inputVoltageMax');
  if (ivMax) filter.inputVoltageMax = Number(ivMax);
  const ov = searchParams.get('outputVoltage');
  if (ov) filter.outputVoltage = Number(ov);
  const oc = searchParams.get('outputCurrent');
  if (oc) filter.outputCurrent = Number(oc);
  const at = searchParams.get('applicationType');
  if (at) filter.applicationType = at;
  const el = searchParams.get('efficiencyLevel');
  if (el) filter.efficiencyLevel = el;
  const certs = searchParams.get('certifications');
  if (certs) filter.certifications = certs.split(',').filter(Boolean);
  return filter;
}

/** 全部筛选条件为空/零值时返回 true */
function isFilterEmpty(f: SelectionInput): boolean {
  return (
    (!f.inputVoltageMin || f.inputVoltageMin === 0) &&
    (!f.inputVoltageMax || f.inputVoltageMax === 0) &&
    (!f.outputVoltage || f.outputVoltage === 0) &&
    (!f.outputCurrent || f.outputCurrent === 0) &&
    (!f.applicationType || f.applicationType === '') &&
    (!f.efficiencyLevel || f.efficiencyLevel === '') &&
    (!f.certifications || f.certifications.length === 0)
  );
}

type SortMode = 'score' | 'model';

export function SelectionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SelectionInput>(() => parseParams(searchParams));
  const [debouncedFilter, setDebouncedFilter] = useState<SelectionInput>(filter);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareItems, setCompareItems] = useState<MatchResult[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('score');

  const filterEmpty = useMemo(() => isFilterEmpty(debouncedFilter), [debouncedFilter]);

  // Debounce filter changes (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFilter(filter);
    }, 500);
    return () => clearTimeout(timer);
  }, [filter]);

  // Sync URL params when filter changes
  useEffect(() => {
    const params = new URLSearchParams();
    if (filter.inputVoltageMin) params.set('inputVoltageMin', String(filter.inputVoltageMin));
    if (filter.inputVoltageMax) params.set('inputVoltageMax', String(filter.inputVoltageMax));
    if (filter.outputVoltage) params.set('outputVoltage', String(filter.outputVoltage));
    if (filter.outputCurrent) params.set('outputCurrent', String(filter.outputCurrent));
    if (filter.applicationType) params.set('applicationType', filter.applicationType);
    if (filter.efficiencyLevel) params.set('efficiencyLevel', filter.efficiencyLevel);
    if (filter.certifications && filter.certifications.length > 0) {
      params.set('certifications', filter.certifications.join(','));
    }
    navigate(`/selection?${params.toString()}`, { replace: true });
  }, [filter, navigate]);

  const { data: results, isLoading, isError, refetch } = useQuery({
    queryKey: ['matchProducts', debouncedFilter],
    queryFn: () => matchProducts(debouncedFilter),
    enabled: !filterEmpty,
  });

  const { data: popularProducts, isLoading: popularLoading } = useQuery({
    queryKey: ['popularProducts'],
    queryFn: getPopularProducts,
    enabled: filterEmpty,
    staleTime: 5 * 60 * 1000,
  });

  const handleChange = useCallback((values: Partial<SelectionInput>) => {
    setFilter((prev) => ({ ...prev, ...values }));
  }, []);

  const handleRemove = useCallback((field: string) => {
    setFilter((prev) => {
      const next = { ...prev };
      if (field === 'certifications') {
        next.certifications = [];
      } else if (field === 'efficiencyLevel') {
        next.efficiencyLevel = undefined;
      } else if (field === 'applicationType') {
        next.applicationType = '';
      } else {
        (next as Record<string, unknown>)[field] = 0;
      }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setFilter({ ...DEFAULT_FILTER });
  }, []);

  const handleCompareToggle = useCallback((id: string) => {
    setCompareItems((prev) => {
      const existing = prev.find((item) => item.productId === id);
      if (existing) {
        return prev.filter((item) => item.productId !== id);
      }
      if (prev.length >= 3) {
        message.warning('最多选择3个产品进行对比');
        return prev;
      }
      const result = results?.find((r) => r.productId === id);
      if (result) {
        return [...prev, result];
      }
      return prev;
    });
  }, [results]);

  const handleCompareRemove = useCallback((id: string) => {
    setCompareItems((prev) => prev.filter((item) => item.productId !== id));
  }, []);

  const handleCompare = useCallback(() => {
    message.info('对比功能开发中');
  }, []);

  const sortedResults = (() => {
    if (!results) return [];
    const sorted = [...results];
    if (sortMode === 'score') {
      sorted.sort((a, b) => b.score - a.score);
    } else {
      sorted.sort((a, b) => a.model.localeCompare(b.model));
    }
    return sorted;
  })();

  const comparingIds = new Set(compareItems.map((item) => item.productId));

  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-slate-50">
      {/* PC: left sidebar filter */}
      <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <FilterOutlined />
          筛选条件
        </div>
        <FilterPanel
          values={filter}
          onChange={handleChange}
          onRemove={handleRemove}
          onSubmit={() => refetch()}
          onReset={handleReset}
        />
      </aside>

      {/* Main results area */}
      <main className="flex-1 overflow-y-auto p-4 pb-24">
        {/* Popular mode: hint banner */}
        {filterEmpty && (
          <Alert
            type="info"
            showIcon
            message="补充参数获取精准推荐"
            description="当前展示热门产品，请在左侧填写电气参数以获取精准匹配结果。"
            className="!mb-4"
          />
        )}

        {/* Query summary (only in match mode) */}
        {!filterEmpty && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-500">
              {filter.applicationType && (
                <span className="mr-2">
                  应用: <span className="font-medium text-slate-900">{filter.applicationType}</span>
                </span>
              )}
              <span>
                输入: <span className="font-medium text-slate-900">{filter.inputVoltageMin}-{filter.inputVoltageMax}V</span>
              </span>
              <span className="ml-2">
                输出: <span className="font-medium text-slate-900">{filter.outputVoltage}V/{filter.outputCurrent}A</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Segmented
                value={sortMode}
                onChange={(v) => setSortMode(v as SortMode)}
                options={[
                  { label: '按匹配度', value: 'score' },
                  { label: '按型号', value: 'model' },
                ]}
              />
              {/* Mobile filter button */}
              <Button
                icon={<FilterOutlined />}
                onClick={() => setDrawerOpen(true)}
                className="md:!hidden"
              >
                筛选
              </Button>
            </div>
          </div>
        )}

        {/* Mobile filter button (popular mode) */}
        {filterEmpty && (
          <div className="mb-4 flex justify-end md:hidden">
            <Button icon={<FilterOutlined />} onClick={() => setDrawerOpen(true)}>
              筛选
            </Button>
          </div>
        )}

        {/* Popular products (empty-params mode) */}
        {filterEmpty && (
          <>
            <div className="mb-3 text-sm text-slate-500">
              热门产品
            </div>
            {popularLoading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4">
                    <Skeleton active paragraph={{ rows: 2 }} />
                  </div>
                ))}
              </div>
            )}
            {popularProducts && popularProducts.length > 0 && (
              <div className="space-y-4">
                {popularProducts.map((product) => (
                  <SelectionCard key={product.id} product={product} mode="popular" />
                ))}
              </div>
            )}
            {popularProducts && popularProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Empty description="暂无热门产品" />
              </div>
            )}
          </>
        )}

        {/* Match results (non-empty params mode) */}
        {!filterEmpty && (
          <>
            {isLoading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="rounded-lg border border-slate-200 bg-white p-4">
                    <Skeleton active paragraph={{ rows: 3 }} />
                  </div>
                ))}
              </div>
            )}

            {isError && (
              <div className="flex flex-col items-center justify-center py-16">
                <Empty description="查询失败，请重试" />
                <Button icon={<ReloadOutlined />} onClick={() => refetch()} className="!mt-4">
                  重试
                </Button>
              </div>
            )}

            {!isLoading && !isError && sortedResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Empty description="暂无匹配结果" />
                <div className="mt-4 max-w-md text-center text-sm text-slate-500">
                  <p>建议调整以下参数后重试：</p>
                  <ul className="mt-2 list-inside list-disc">
                    <li>放宽输入电压范围</li>
                    <li>降低输出电流要求</li>
                    <li>减少认证筛选条件</li>
                    <li>更换应用类型</li>
                  </ul>
                  <Button icon={<ReloadOutlined />} onClick={handleReset} className="!mt-4">
                    重置条件
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && !isError && sortedResults.length > 0 && (
              <>
                <div className="mb-3 text-sm text-slate-500">
                  共 <span className="font-medium text-slate-900">{sortedResults.length}</span> 个匹配结果
                </div>
                <div className="space-y-4">
                  {sortedResults.map((result) => (
                    <SelectionCard
                      key={result.productId}
                      result={result}
                      onCompare={handleCompareToggle}
                      isComparing={comparingIds.has(result.productId)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      {/* Mobile: filter drawer */}
      <Drawer
        title="筛选条件"
        placement="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={320}
      >
        <FilterPanel
          values={filter}
          onChange={handleChange}
          onRemove={handleRemove}
          onSubmit={() => {
            setDrawerOpen(false);
            refetch();
          }}
          onReset={handleReset}
        />
      </Drawer>

      {/* Compare bar */}
      <CompareBar
        items={compareItems}
        onRemove={handleCompareRemove}
        onCompare={handleCompare}
      />
    </div>
  );
}