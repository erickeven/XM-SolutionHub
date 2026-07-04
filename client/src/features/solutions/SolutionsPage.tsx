import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Pagination, Result, Skeleton } from 'antd';
import { FileTextOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { listSolutions } from '../../api/solutions';

export function SolutionsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['solutions', page],
    queryFn: () => listSolutions(page, 12),
  });

  return (
    <div className="page-shell pb-20 md:pb-10">
      <div className="container-page py-6 md:py-10">
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-card md:p-6">
        <div className="section-kicker">SOLUTION LIBRARY</div>
        <h1 className="section-title mt-1">
          方案资料
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          按应用方案查看关联型号、测试报告与设计资料
        </p>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : isError ? (
        <Result
          status="error"
          title="方案加载失败"
          extra={<Button onClick={() => refetch()}>重试</Button>}
        />
      ) : !data?.items.length ? (
        <Empty description="暂无已上架方案" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data.items.map((solution) => (
              <article
                key={solution.id}
                className="surface-card p-5 transition-colors hover:border-blue-400 hover:bg-blue-50/40"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <FileTextOutlined className="mt-1 text-xl text-copper-500" />
                  <span className="text-xs text-green-600">已上架</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {solution.name}
                </h2>
                <p className="mt-2 min-h-[60px] text-sm leading-5 text-slate-600 line-clamp-3">
                  {solution.description}
                </p>
                <Link
                  to={`/solutions/${solution.id}`}
                  className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-blue-600"
                >
                  查看方案与资料 <RightOutlined />
                </Link>
              </article>
            ))}
          </div>
          {data.total > data.limit && (
            <div className="mt-8 flex justify-center">
              <Pagination
                current={page}
                pageSize={data.limit}
                total={data.total}
                showSizeChanger={false}
                onChange={setPage}
              />
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}
