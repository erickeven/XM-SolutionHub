import { Card, Empty } from 'antd';
import { Link } from 'react-router-dom';

interface SolutionListProps {
  solutions: { id: string; name: string; description: string }[];
}

export function SolutionList({ solutions }: SolutionListProps) {
  if (solutions.length === 0) {
    return <Empty description="暂无关联方案" />;
  }

  return (
    <div className="space-y-3">
      {solutions.map((sol) => (
        <Link key={sol.id} to={`/solutions/${sol.id}`}>
          <Card hoverable size="small" className="border-slate-200">
            <div className="font-bold text-slate-900">{sol.name}</div>
            <div className="text-sm text-slate-500 mt-1">{sol.description}</div>
          </Card>
        </Link>
      ))}
    </div>
  );
}