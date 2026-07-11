import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Drawer, Skeleton, Empty, message, Segmented, Alert, Modal, Tag } from 'antd';
import { FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import { matchProducts, getPopularProducts } from '../../api/selection';
import type { SelectionInput, MatchResult } from '../../types/selection';
import { SelectionCard } from './SelectionCard';
import { FilterPanel } from './FilterPanel';
import { CompareBar } from './CompareBar';
import { useUiContent } from '../../api/ui-content';

const DEFAULT_FILTER: SelectionInput = {
  inputVoltageMin: 0,
  inputVoltageMax: 0,
  outputVoltage: 0,
  outputCurrent: 0,
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

function hasRequiredElectrical(f: SelectionInput): boolean {
  return (
    (f.inputVoltageMin ?? 0) > 0 &&
    (f.inputVoltageMax ?? 0) > 0 &&
    (f.outputVoltage ?? 0) > 0 &&
    (f.outputCurrent ?? 0) > 0
  );
}

type SortMode = 'score' | 'model';

function readParam(result: MatchResult, key: string): string {
  const value = result.params?.[key];
  if (Array.isArray(value)) {
    const list = value.filter((item): item is string => typeof item === 'string');
    return list.length > 0 ? list.join(', ') : '-';
  }
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return '-';
}

function formatOutput(result: MatchResult): string {
  const voltage = readParam(result, 'outputVoltage');
  const current = readParam(result, 'outputCurrent');
  return `${voltage === '-' ? '-' : `${voltage}V`} / ${current === '-' ? '-' : `${current}A`}`;
}

function formatInputRange(result: MatchResult): string {
  const min = readParam(result, 'inputVoltageMin');
  const max = readParam(result, 'inputVoltageMax');
  return min === '-' && max === '-' ? '-' : `${min}-${max}V`;
}

export function SelectionPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<SelectionInput>(() => parseParams(searchParams));
  const [debouncedFilter, setDebouncedFilter] = useState<SelectionInput>(filter);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [compareItems, setCompareItems] = useState<MatchResult[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>('score');
  const { text } = useUiContent();

  const canMatch = useMemo(() => hasRequiredElectrical(debouncedFilter), [debouncedFilter]);

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
    enabled: canMatch,
  });

  const { data: popularProducts, isLoading: popularLoading } = useQuery({
    queryKey: ['popularProducts'],
    queryFn: getPopularProducts,
    enabled: !canMatch,
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
        message.warning(text('selection.compare.max', '最多选择3个产品进行对比'));
        return prev;
      }
      const result = results?.find((r) => r.productId === id);
      if (result) {
        return [...prev, result];
      }
      return prev;
    });
  }, [results, text]);

  const handleCompareRemove = useCallback((id: string) => {
    setCompareItems((prev) => prev.filter((item) => item.productId !== id));
  }, []);

  const handleCompare = useCallback(() => {
    setCompareOpen(true);
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
    <div
      data-testid="selection-page"
      className="flex min-h-[calc(100vh-4rem-3.5rem)] flex-col bg-slate-50 md:flex-row md:min-h-[calc(100vh-4rem)]"
    >
      {/* PC: left sidebar filter */}
      <aside className="hidden w-80 shrink-0 border-r border-slate-200 bg-white p-4 md:block md:overflow-y-auto">
        <div className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
          <FilterOutlined />
          {text('selection.filters.title', '筛选条件')}
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
        {!canMatch && (
          <Alert
            type="info"
            showIcon
            message={text('selection.hint.title', '补充参数获取精准推荐')}
            description={text('selection.hint.subtitle', '当前展示热门产品，请填写输入电压、输出电压和输出电流以获取精准匹配结果。')}
            className="!mb-4"
          />
        )}

        {/* Query summary (only in match mode) */}
        {canMatch && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="text-sm text-slate-500">
              {filter.applicationType && (
                <span className="mr-2">
                  {text('selection.summary.application', '应用')}: <span className="font-medium text-slate-900">{filter.applicationType}</span>
                </span>
              )}
              <span>
                {text('selection.summary.input', '输入')}: <span className="font-medium text-slate-900">{filter.inputVoltageMin}-{filter.inputVoltageMax}V</span>
              </span>
              <span className="ml-2">
                {text('selection.summary.output', '输出')}: <span className="font-medium text-slate-900">{filter.outputVoltage}V/{filter.outputCurrent}A</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Segmented
                value={sortMode}
                onChange={(v) => setSortMode(v as SortMode)}
                options={[
                  { label: text('selection.sort.score', '按匹配度'), value: 'score' },
                  { label: text('selection.sort.model', '按型号'), value: 'model' },
                ]}
              />
              {/* Mobile filter button */}
              <Button
                icon={<FilterOutlined />}
                onClick={() => setDrawerOpen(true)}
                className="md:!hidden"
              >
                {text('selection.filters.action', '筛选')}
              </Button>
            </div>
          </div>
        )}

        {/* Mobile filter button (popular mode) */}
        {!canMatch && (
          <div className="mb-4 flex justify-end md:hidden">
            <Button icon={<FilterOutlined />} onClick={() => setDrawerOpen(true)}>
              {text('selection.filters.action', '筛选')}
            </Button>
          </div>
        )}

        {/* Popular products (empty-params mode) */}
        {!canMatch && (
          <>
            <div className="mb-3 text-sm text-slate-500">
              {text('selection.popular.title', '热门产品')}
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
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {popularProducts.map((product) => (
                  <SelectionCard key={product.id} product={product} mode="popular" />
                ))}
              </div>
            )}
            {popularProducts && popularProducts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Empty description={text('selection.popular.empty', '暂无热门产品')} />
              </div>
            )}
          </>
        )}

        {/* Match results (non-empty params mode) */}
        {canMatch && (
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
                <Empty description={text('selection.error', '查询失败，请重试')} />
                <Button icon={<ReloadOutlined />} onClick={() => refetch()} className="!mt-4">
                  {text('common.retry', '重试')}
                </Button>
              </div>
            )}

            {!isLoading && !isError && sortedResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <Empty description={text('selection.results.empty', '暂无匹配结果')} />
                <div className="mt-4 max-w-md text-center text-sm text-slate-500">
                  <p>{text('selection.results.suggestion', '建议调整以下参数后重试：')}</p>
                  <ul className="mt-2 list-inside list-disc">
                    <li>{text('selection.results.tip.input', '放宽输入电压范围')}</li>
                    <li>{text('selection.results.tip.current', '降低输出电流要求')}</li>
                    <li>{text('selection.results.tip.certification', '减少认证筛选条件')}</li>
                    <li>{text('selection.results.tip.application', '更换应用类型')}</li>
                  </ul>
                  <Button icon={<ReloadOutlined />} onClick={handleReset} className="!mt-4">
                    {text('selection.filters.reset', '重置条件')}
                  </Button>
                </div>
              </div>
            )}

            {!isLoading && !isError && sortedResults.length > 0 && (
              <>
                <div className="mb-3 text-sm text-slate-500">
                  {text('selection.results.prefix', '共')} <span className="font-medium text-slate-900">{sortedResults.length}</span> {text('selection.results.suffix', '个匹配结果')}
                </div>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
        title={text('selection.filters.title', '筛选条件')}
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

      <Modal
        title={text('selection.compare.title', '产品参数对比')}
        open={compareOpen}
        onCancel={() => setCompareOpen(false)}
        footer={null}
        width={880}
      >
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[680px] overflow-hidden rounded-lg border border-slate-200"
            style={{ gridTemplateColumns: `150px repeat(${Math.max(compareItems.length, 1)}, minmax(160px, 1fr))` }}
          >
            <div className="bg-slate-50 px-3 py-3 text-sm font-medium text-slate-500">
              {text('selection.compare.item', '对比项')}
            </div>
            {compareItems.map((item) => (
              <div key={item.productId} className="bg-slate-50 px-3 py-3">
                <div className="font-semibold text-slate-900">{item.model}</div>
                <div className="mt-1 text-xs text-slate-500">{item.series}</div>
              </div>
            ))}

            {[
              { label: text('selection.compare.score', '匹配度'), render: (item: MatchResult) => `${item.score}%` },
              {
                label: text('selection.compare.level', '匹配等级'),
                render: (item: MatchResult) => (
                  <Tag color={item.matchLevel === 'exact' ? 'green' : item.matchLevel === 'approximate' ? 'gold' : 'default'}>
                    {item.matchLevel === 'exact'
                      ? text('selection.match.exact', '精确匹配')
                      : item.matchLevel === 'approximate'
                        ? text('selection.match.approximate', '近似匹配')
                        : text('selection.match.fallback', '备选方案')}
                  </Tag>
                ),
              },
              { label: text('selection.compare.input', '输入范围'), render: formatInputRange },
              { label: text('selection.compare.output', '输出能力'), render: formatOutput },
              { label: text('selection.compare.efficiency', '能效等级'), render: (item: MatchResult) => readParam(item, 'efficiencyLevel') },
              { label: text('selection.compare.certification', '认证'), render: (item: MatchResult) => readParam(item, 'certifications') },
              {
                label: text('selection.compare.reasons', '主要理由'),
                render: (item: MatchResult) => item.reasons.slice(0, 2).join('；') || '-',
              },
              {
                label: text('selection.compare.diffs', '差异点'),
                render: (item: MatchResult) => item.diffs.slice(0, 2).join('；') || text('selection.compare.noDiff', '无明显差异'),
              },
              {
                label: text('selection.compare.material', '资料状态'),
                render: (item: MatchResult) => (item.datasheetMaterialId ? text('product.material.complete', '资料完整') : text('product.material.preparing', '资料整理中')),
              },
            ].map((row) => (
              <Fragment key={row.label}>
                <div key={`${row.label}-label`} className="border-t border-slate-200 px-3 py-3 text-sm font-medium text-slate-500">
                  {row.label}
                </div>
                {compareItems.map((item) => (
                  <div key={`${row.label}-${item.productId}`} className="border-t border-slate-200 px-3 py-3 text-sm text-slate-700">
                    {row.render(item)}
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}
