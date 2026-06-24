import { Tag, Button, Space, Tooltip } from 'antd';
import {
  FileTextOutlined,
  FolderOpenOutlined,
  PlusOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { MatchResult } from '../../types/selection';
import type { Product } from '../../types/product';

const MATCH_LEVEL_CONFIG: Record<
  MatchResult['matchLevel'],
  { color: string; label: string; hex: string }
> = {
  exact: { color: 'green', label: '精确匹配', hex: '#16A34A' },
  approximate: { color: 'gold', label: '近似匹配', hex: '#D97706' },
  fallback: { color: 'default', label: '备选方案', hex: '#6B7280' },
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
    <MatchCard
      result={result}
      onCompare={onCompare!}
      isComparing={isComparing}
    />
  );
}

function PopularCard({ product }: { product: Product }) {
  const p = product.params ?? {};
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
    <Link
      to={`/products/${product.id}`}
      className="block rounded-lg border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-blue-600"
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold text-slate-900">
          {product.model}
        </span>
        <span className="text-xs text-slate-400">{product.series}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
        <div>
          <div className="text-slate-400">输入</div>
          <div className="font-semibold text-slate-900">{inputRange}</div>
        </div>
        <div>
          <div className="text-slate-400">输出</div>
          <div className="font-semibold text-slate-900">{output}</div>
        </div>
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
  const config = MATCH_LEVEL_CONFIG[result.matchLevel];
  const visibleReasons = result.reasons.slice(0, 3);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-card transition-colors hover:border-blue-400">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Link
              to={`/products/${result.productId}`}
              className="text-lg font-semibold text-slate-900 hover:text-blue-600"
            >
              {result.model}
            </Link>
            <Tag color={config.color} className="!m-0">
              {config.label}
            </Tag>
          </div>
        </div>
        <div className="flex flex-shrink-0 items-baseline gap-1 text-right">
          <span className="text-xs text-slate-500">匹配度</span>
          <span
            className="text-xl font-semibold"
            style={{ color: config.hex }}
          >
            {result.score}%
          </span>
        </div>
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

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <Space size="small">
          <Link to={`/products/${result.productId}`}>
            <Button size="small" icon={<FileTextOutlined />}>
              规格书
            </Button>
          </Link>
          <Link to={`/products/${result.productId}`}>
            <Button size="small" icon={<FolderOpenOutlined />}>
              方案资料
            </Button>
          </Link>
          <Tooltip title={isComparing ? '取消对比' : '加入对比'}>
            <Button
              size="small"
              type={isComparing ? 'primary' : 'default'}
              icon={isComparing ? <CheckOutlined /> : <PlusOutlined />}
              onClick={() => onCompare(result.productId)}
            >
              {isComparing ? '已加入' : '对比'}
            </Button>
          </Tooltip>
        </Space>
      </div>
    </div>
  );
}
