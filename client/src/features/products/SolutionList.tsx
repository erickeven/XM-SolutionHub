import { Empty } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useUiContent } from '../../api/ui-content';

interface SolutionListProps {
  solutions: { id: string; name: string; description: string }[];
}

export function SolutionList({ solutions }: SolutionListProps) {
  const { text } = useUiContent();
  if (solutions.length === 0) {
    return <Empty description={text('product.solutions.empty', '暂无关联方案')} />;
  }

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200">
      {solutions.map((sol) => (
        <Link
          key={sol.id}
          to={`/solutions/${sol.id}`}
          className="group flex items-center gap-4 px-1 py-4 transition-colors hover:bg-slate-50"
        >
          <div className="min-w-0 flex-1">
            <div className="font-bold text-slate-900">{sol.name}</div>
            <div className="mt-1 line-clamp-2 text-sm text-slate-500">{sol.description}</div>
          </div>
          <ArrowRightOutlined className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600" />
        </Link>
      ))}
    </div>
  );
}
