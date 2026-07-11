import { Tag, Button, Space, Tooltip } from 'antd';
import {
  FileTextOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { MatchResult } from '../../types/selection';
import type { Product, ProductParams } from '../../types/product';
import { useUiContent } from '../../api/ui-content';

const MATCH_LEVEL_CONFIG: Record<
  MatchResult['matchLevel'],
  { color: string; label: string; hex: string }
> = {
  exact: { color: 'green', label: '精确匹配', hex: '#16A34A' },
  approximate: { color: 'gold', label: '近似匹配', hex: '#D97706' },
  fallback: { color: 'default', label: '备选方案', hex: '#6B7280' },
};

function formatNumber(value: unknown, suffix: string): string {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value}${suffix}`;
  if (typeof value === 'string' && value.trim()) return `${value}${suffix}`;
  return '-';
}

function buildParamItems(
  params: ProductParams | Record<string, unknown>,
  text: (key: string, fallback: string) => string,
) {
  const inputRange =
    params.inputVoltageMin != null && params.inputVoltageMax != null
      ? `${params.inputVoltageMin}-${params.inputVoltageMax}V`
      : '-';
  const output =
    params.outputVoltage != null || params.outputCurrent != null
      ? `${formatNumber(params.outputVoltage, 'V')}/${formatNumber(params.outputCurrent, 'A')}`
      : '-';
  const standby =
    params.standbyPower != null
      ? `${params.standbyPower}W`
      : params.standbyPowerMax != null
        ? `≤${params.standbyPowerMax}W`
        : '-';
  const certs = Array.isArray(params.certifications)
    ? params.certifications.filter((item): item is string => typeof item === 'string').join(', ')
    : '-';

  return [
    { label: text('selection.card.input', '输入'), value: inputRange },
    { label: text('selection.card.output', '输出'), value: output },
    { label: text('selection.card.standby', '待机'), value: standby },
    { label: text('selection.card.certification', '认证'), value: certs || '-' },
  ];
}

interface SelectionCardProps {
  result?: MatchResult;
  product?: Product;
  mode?: 'match' | 'popular';
  onCompare?: (id: string) => void;
  isComparing?: boolean;
}

export function SelectionCard({
  result,
  product,
  mode = 'match',
  onCompare,
  isComparing = false,
}: SelectionCardProps) {
  if (mode === 'popular' && product) {
    return <PopularCard product={product} />;
  }

  if (!result) return null;
  return (
    <MatchCard
      result={result}
      onCompare={onCompare!}
      isComparing={isComparing}
    />
  );
}

function PopularCard({ product }: { product: Product }) {
  const { text } = useUiContent();
  const paramItems = buildParamItems(product.params ?? {}, text);

  return (
    <Link
      to={`/products/${product.id}`}
      className="group block rounded-lg border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-blue-600 hover:bg-blue-50/40"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="break-all text-lg font-semibold text-slate-900 group-hover:text-blue-700">
          {product.model}
        </span>
        <Tag color={product.datasheetMaterialId ? 'green' : 'gold'} className="!m-0">
          {product.datasheetMaterialId
            ? text('product.material.complete', '资料完整')
            : text('product.material.preparingShort', '整理中')}
        </Tag>
      </div>
      <div className="mt-1 text-xs text-slate-500">{product.series}</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
        {paramItems.map((item) => (
          <div key={item.label} className="rounded-md bg-slate-50 px-2 py-2">
            <div className="text-slate-400">{item.label}</div>
            <div className="truncate font-semibold text-slate-900">{item.value}</div>
          </div>
        ))}
      </div>
      {product.advantages && product.advantages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {product.advantages.slice(0, 3).map((adv) => (
            <Tag key={adv} color="blue" className="!m-0 !text-xs">
              {adv}
            </Tag>
          ))}
        </div>
      )}
    </Link>
  );
}

function MatchCard({
  result,
  onCompare,
  isComparing,
}: {
  result: MatchResult;
  onCompare: (id: string) => void;
  isComparing: boolean;
}) {
  const { text } = useUiContent();
  const config = MATCH_LEVEL_CONFIG[result.matchLevel];
  const visibleReasons = result.reasons.slice(0, 3);
  const paramItems = buildParamItems(result.params ?? {}, text);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-blue-400">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/products/${result.productId}`}
              className="break-all text-lg font-semibold text-slate-900 hover:text-blue-600"
            >
              {result.model}
            </Link>
            <Tag color={config.color} className="!m-0">
              {text(`selection.match.${result.matchLevel}`, config.label)}
            </Tag>
          </div>
          <div className="mt-1 text-xs text-slate-500">{result.series}</div>
        </div>
        <div className="flex flex-shrink-0 items-baseline gap-1 text-right">
          <span className="text-xs text-slate-500">{text('selection.compare.score', '匹配度')}</span>
          <span
            className="text-xl font-semibold"
            style={{ color: config.hex }}
          >
            {result.score}%
          </span>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        {paramItems.map((item) => (
          <div key={item.label} className="rounded-md border border-slate-100 bg-slate-50 px-2 py-2">
            <div className="text-slate-400">{item.label}</div>
            <div className="truncate font-semibold text-slate-900">{item.value}</div>
          </div>
        ))}
      </div>

      {visibleReasons.length > 0 && (
        <ul className="mt-3 space-y-1">
          {visibleReasons.map((reason, idx) => (
            <li key={idx} className="flex items-start gap-1 text-xs text-slate-700">
              <span className="mt-0.5 text-green-600">✓</span>
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      )}

      {result.matchLevel !== 'exact' && result.diffs.length > 0 && (
        <ul className="mt-2 space-y-1">
          {result.diffs.slice(0, 2).map((diff, idx) => (
            <li
              key={idx}
              className="flex items-start gap-1 text-xs text-amber-600"
            >
              <span className="mt-0.5">!</span>
              <span>{diff}</span>
            </li>
          ))}
        </ul>
      )}

      {result.advantages.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {result.advantages.slice(0, 3).map((adv) => (
            <Tag key={adv} className="!m-0 !text-xs">
              {adv}
            </Tag>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <Space size="small">
          <Link to={`/products/${result.productId}`}>
            <Button size="small" icon={<FileTextOutlined />}>
              {text('product.datasheet.title', '规格书')}
            </Button>
          </Link>
          <Link to={`/products/${result.productId}`}>
            <Button size="small" icon={<FolderOpenOutlined />}>
              {text('main.nav.solutions', '方案资料')}
            </Button>
          </Link>
          <Tooltip title={isComparing ? text('selection.compare.remove', '取消对比') : text('selection.compare.add', '加入对比')}>
            <Button
              size="small"
              type={isComparing ? 'primary' : 'default'}
              icon={isComparing ? <CheckOutlined /> : <PlusOutlined />}
              onClick={() => onCompare(result.productId)}
            >
              {isComparing ? text('selection.compare.added', '已加入') : text('selection.compare.action', '对比')}
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
}
