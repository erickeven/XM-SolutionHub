import { useQuery } from '@tanstack/react-query';
import { Button, Result, Skeleton, Tag } from 'antd';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getProductById } from '../../api/products';
import { ProductParamsMatrix } from './ProductParamsMatrix';
import { SolutionList } from './SolutionList';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    enabled: !!id,
  });

  const selectionQuery = searchParams.toString();
  const backToSelection = `/selection${selectionQuery ? `?${selectionQuery}` : ''}`;

  if (!id) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <Result
          status="404"
          title="产品未找到"
          subTitle="抱歉，您访问的产品不存在。"
          extra={
            <Link to="/selection">
              <Button type="primary">返回选型</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-8">
        <Result
          status="error"
          title="加载失败"
          subTitle="产品信息加载失败，请稍后重试。"
          extra={
            <Link to="/selection">
              <Button type="primary">返回选型</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const isInactive = product.status === 'INACTIVE';
  const applicationType =
    typeof product.params.applicationType === 'string' ? product.params.applicationType : '';

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8">
      <Link
        to={backToSelection}
        className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
      >
        ← 返回选型
      </Link>

      {isInactive && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
          产品已下架
        </div>
      )}

      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{product.model}</h1>
          <p className="text-slate-500 mt-1">{product.series}</p>
        </div>
        <div>
          {product.datasheetMaterialId ? (
            <Tag color="green">资料完整</Tag>
          ) : (
            <Tag color="gold">资料整理中</Tag>
          )}
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-3">关键参数</h2>
        <ProductParamsMatrix params={product.params} />
      </section>

      {applicationType && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">推荐应用</h2>
          <Tag color="blue">{applicationType}</Tag>
        </section>
      )}

      {product.advantages.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900 mb-3">产品优势</h2>
          <ul className="space-y-1">
            {product.advantages.map((adv, idx) => (
              <li key={idx} className="text-slate-700 text-sm flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>{adv}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-3">规格书</h2>
        {product.datasheetMaterialId ? (
          <div className="flex items-center gap-3">
            <Tag color="green">可预览</Tag>
            <Link to={`/solutions/${product.datasheetMaterialId}`}>
              <Button type="primary">查看规格书</Button>
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Tag color="gold">资料整理中</Tag>
            <Button type="primary" disabled>
              查看规格书
            </Button>
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-bold text-slate-900 mb-3">关联方案</h2>
        <SolutionList solutions={product.solutions ?? []} />
      </section>
    </div>
  );
}