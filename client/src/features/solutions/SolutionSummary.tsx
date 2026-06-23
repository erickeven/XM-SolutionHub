import { Link } from 'react-router-dom';
import { Tag, message } from 'antd';
import type { Solution, ProductSolution } from '../../types/solution';
import { DownloadButton } from './DownloadButton';

interface SolutionSummaryProps {
  solution: Solution;
  products: ProductSolution[];
  selectedMaterialId: string | null;
  isAuthenticated: boolean;
}

export function SolutionSummary({
  solution,
  products,
  selectedMaterialId,
  isAuthenticated,
}: SolutionSummaryProps) {
  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{solution.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{solution.description}</p>
      </div>

      <div>
        <Tag color={solution.status === 'ACTIVE' ? 'green' : 'gold'}>
          {solution.status === 'ACTIVE' ? '已发布' : '整理中'}
        </Tag>
      </div>

      {products.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">关联型号</h3>
          <ul className="space-y-1">
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
        </div>
      )}

      <div className="mt-auto">
        <DownloadButton
          materialId={selectedMaterialId}
          isAuthenticated={isAuthenticated}
          onError={(msg) => message.error(msg)}
        />
      </div>
    </div>
  );
}

