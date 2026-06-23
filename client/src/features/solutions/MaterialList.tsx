import { LockOutlined, UnlockOutlined, FileTextOutlined } from '@ant-design/icons';
import { Empty } from 'antd';
import type { Material } from '../../types/solution';

interface MaterialListProps {
  materials: Material[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isAuthenticated: boolean;
}

export function MaterialList({ materials, selectedId, onSelect, isAuthenticated }: MaterialListProps) {
  if (materials.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Empty description="资料整理中" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <nav className="h-full overflow-y-auto">
      <ul className="space-y-1 p-2">
        {materials.map((material) => {
          const isActive = material.id === selectedId;
          const isLocked = !isAuthenticated;
          return (
            <li key={material.id}>
              <button
                onClick={() => onSelect(material.id)}
                className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-100 font-medium text-blue-700'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileTextOutlined className="shrink-0 text-slate-400" />
                <span className="flex-1 truncate">{material.title}</span>
                {isLocked ? (
                  <LockOutlined className="shrink-0 text-slate-400" />
                ) : (
                  <UnlockOutlined className="shrink-0 text-green-500" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}