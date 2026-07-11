import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Empty, Input, Pagination, Result, Skeleton } from 'antd';
import { FileTextOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { Link, useSearchParams } from 'react-router-dom';
import { listSolutions } from '../../api/solutions';
import { useUiContent, useUiText } from '../../api/ui-content';

export function SolutionsPage() {
  const [page, setPage] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();
  const search = searchParams.get('search') ?? '';
  const { text } = useUiContent();
  const title = useUiText('solutions.title', '方案资料');
  const subtitle = useUiText('solutions.subtitle', '按应用方案查看关联型号、测试报告与设计资料');
  const searchPlaceholder = useUiText('solutions.search.placeholder', '搜索方案名称或应用场景');
  const loadFailedText = useUiText('solutions.error', '方案加载失败');
  const retryText = useUiText('solution.preview.retry', '重试');
  const emptyText = useUiText('solutions.empty', '暂无已上架方案');
  const viewText = useUiText('solutions.card.view', '查看方案与资料');
  const activeText = useUiText('common.active', '已上架');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['solutions', page, search],
    queryFn: () => listSolutions(page, 12, search || undefined),
  });

  const handleSearch = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value.trim()) next.set('search', value.trim());
    else next.delete('search');
    setPage(1);
    setSearchParams(next);
  };

  return (
    <div className="page-shell pb-20 md:pb-10">
      <div className="container-page py-6 md:py-10">
      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5 shadow-card md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="section-kicker">{text('solutions.kicker', 'SOLUTION LIBRARY')}</div>
            <h1 className="section-title mt-1">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              {subtitle}
            </p>
          </div>
          <Input.Search
            defaultValue={search}
            allowClear
            enterButton={<SearchOutlined />}
            placeholder={searchPlaceholder}
            onSearch={handleSearch}
            className="md:!w-80"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : isError ? (
        <Result
          status="error"
          title={loadFailedText}
          extra={<Button onClick={() => refetch()}>{retryText}</Button>}
        />
      ) : !data?.items.length ? (
        <Empty description={emptyText} />
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
                  <span className="text-xs text-green-600">{activeText}</span>
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
                  {viewText} <RightOutlined />
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
