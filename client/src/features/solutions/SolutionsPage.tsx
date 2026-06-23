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
    <div className="min-h-[calc(100vh-64px)] bg-slate-50">
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:py-12">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <h1 className="text-2xl font-bold text-slate-900 md:text-[28px]">
            方案资料
          </h1>
          <p className="mt-2 text-sm text-slate-600">
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
                  className="border border-slate-200 bg-white p-5 shadow-card"
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <FileTextOutlined className="mt-1 text-xl text-copper-500" />
                    <span className="text-xs text-green-600">已上架</span>
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {solution.name}
                  </h2>
                  <p className="mt-2 line-clamp-3 min-h-[60px] text-sm leading-5 text-slate-600">
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
