import { Button, Tooltip } from 'antd';
import { CloseOutlined, SwapOutlined } from '@ant-design/icons';
import type { MatchResult } from '../../types/selection';
import { useUiContent } from '../../api/ui-content';

interface CompareBarProps {
  items: MatchResult[];
  onRemove: (id: string) => void;
  onCompare: () => void;
}

const MAX_ITEMS = 3;

export function CompareBar({ items, onRemove, onCompare }: CompareBarProps) {
  const { text } = useUiContent();
  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-14 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 shadow-card backdrop-blur md:bottom-0">
      <div className="mx-auto flex max-w-[1280px] items-center gap-4 px-4 py-3">
        <span className="text-sm font-medium text-slate-700">
          {text('selection.compare.selected', '已选对比')} ({items.length}/{MAX_ITEMS})
        </span>
        <div className="flex flex-1 items-center gap-2 overflow-x-auto">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-1.5"
            >
              <span className="text-sm font-medium text-slate-900">{item.model}</span>
              <button
                onClick={() => onRemove(item.productId)}
                className="text-slate-400 hover:text-red-600"
              >
                <CloseOutlined style={{ fontSize: 12 }} />
              </button>
            </div>
          ))}
          {/* Placeholder slots */}
          {Array.from({ length: MAX_ITEMS - items.length }).map((_, idx) => (
            <div
              key={`empty-${idx}`}
              className="flex h-[34px] w-32 items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-300"
            >
              {text('selection.compare.emptySlot', '空位')}
            </div>
          ))}
        </div>
        <Tooltip title={items.length < 2 ? text('selection.compare.minimum', '至少选择2个产品进行对比') : ''}>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            disabled={items.length < 2}
            onClick={onCompare}
          >
            {text('selection.compare.start', '开始对比')}
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
