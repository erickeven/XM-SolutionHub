import { Tag, Button, Space, Tooltip } from 'antd';
import { FileTextOutlined, SolutionOutlined, PlusOutlined, CheckOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { MatchResult } from '../../types/selection';
import type { Product } from '../../types/product';

const MATCH_LEVEL_CONFIG: Record<
  MatchResult['matchLevel'],
  { color: string; label: string; bg: string; border: string }
> = {
  exact: { color: '#16A34A', label: '精确匹配', bg: 'bg-green-50', border: 'border-green-600' },
  approximate: { color: '#D97706', label: '近似匹配', bg: 'bg-amber-50', border: 'border-amber-600' },
  fallback: { color: '#6B7280', label: '备选方案', bg: 'bg-slate-50', border: 'border-slate-500' },
};

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
    <MatchCard result={result} onCompare={onCompare!} isComparing={isComparing} />
  );
}

function PopularCard({ product }: { product: Product }) {
  const p = product.params;
  const inputRange =
    p.inputVoltageMin != null && p.inputVoltageMax != null
      ? `${p.inputVoltageMin}-${p.inputVoltageMax}V`
      : p.inputVoltageMin != null
        ? `${p.inputVoltageMin}V`
        : p.inputVoltageMax != null
          ? `${p.inputVoltageMax}V`
          : '-';
  const output = `${p.outputVoltage ?? '-'}V/${p.outputCurrent ?? '-'}A`;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-blue-600">
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-slate-900">{product.model}</span>
        <span className="text-sm text-slate-400">{product.series}</span>
      </div>
      <div className="mt-2 flex gap-4 text-sm text-slate-600">
        <span>输入: <span className="font-medium text-slate-900">{inputRange}</span></span>
        <span>输出: <span className="font-medium text-slate-900">{output}</span></span>
      </div>
      <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3">
        <Space>
          <Link to={`/products/${product.id}`}>
            <Button size="small" icon={<FileTextOutlined />}>规格书</Button>
          </Link>
          <Link to={`/products/${product.id}`}>
            <Button size="small" icon={<SolutionOutlined />}>方案资料</Button>
          </Link>
        </Space>
      </div>
    </div>
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
  const config = MATCH_LEVEL_CONFIG[result.matchLevel];
  const visibleReasons = result.reasons.slice(0, 3);

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-4 transition-colors`}>
      {/* Row 1: Model + match badge + score */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-slate-900">{result.model}</span>
          <Tag color={config.color} className="!m-0 !rounded">
            {config.label}
          </Tag>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">匹配度</span>
          <span className="text-lg font-bold" style={{ color: config.color }}>
            {result.score}%
          </span>
        </div>
      </div>

      {/* Row 2: Reasons */}
      {visibleReasons.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-slate-500">推荐理由</div>
          <ul className="mt-1 space-y-1">
            {visibleReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1 text-sm text-slate-700">
                <span className="mt-0.5 text-green-600">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Row 3: Diffs (only for approximate/fallback) */}
      {result.matchLevel !== 'exact' && result.diffs.length > 0 && (
        <div className="mt-3">
          <div className="text-xs font-medium text-slate-500">差异点</div>
          <ul className="mt-1 space-y-1">
            {result.diffs.map((diff, idx) => (
              <li key={idx} className="flex items-start gap-1 text-sm text-amber-600">
                <span className="mt-0.5">⚠</span>
                <span>{diff}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Row 4: Action buttons */}
      <div className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-3">
        <Space>
          <Link to={`/products/${result.productId}`}>
            <Button size="small" icon={<FileTextOutlined />}>
              规格书
            </Button>
          </Link>
          <Link to={`/products/${result.productId}`}>
            <Button size="small" icon={<SolutionOutlined />}>
              方案资料
            </Button>
          </Link>
          <Tooltip title={isComparing ? '已加入对比' : '加入对比'}>
            <Button
              size="small"
              type={isComparing ? 'primary' : 'default'}
              icon={isComparing ? <CheckOutlined /> : <PlusOutlined />}
              onClick={() => onCompare(result.productId)}
            >
              {isComparing ? '已加入对比' : '加入对比'}
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
}