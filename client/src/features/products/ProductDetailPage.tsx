import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Modal, Result, Skeleton, Tag, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { getProductById } from '../../api/products';
import { useAuth } from '../../hooks/useAuth';
import { ProductParamsMatrix } from './ProductParamsMatrix';
import { SolutionList } from './SolutionList';
import { DownloadButton } from '../solutions/DownloadButton';
import { PdfPreview } from '../solutions/PdfPreview';
import { useUiContent, useUiText } from '../../api/ui-content';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [datasheetOpen, setDatasheetOpen] = useState(false);
  const { text } = useUiContent();
  const backSelectionText = useUiText('product.backSelection', '返回选型');
  const notFoundTitle = useUiText('product.notFound', '产品未找到');
  const loadFailedText = useUiText('product.loadFailed', '加载失败');
  const inactiveText = useUiText('product.inactive', '产品已下架');
  const completeText = useUiText('product.material.complete', '资料完整');
  const preparingText = useUiText('product.material.preparing', '资料整理中');
  const paramsTitle = useUiText('product.params.title', '关键参数');
  const applicationsTitle = useUiText('product.applications.title', '推荐应用');
  const advantagesTitle = useUiText('product.advantages.title', '产品优势');
  const datasheetTitle = useUiText('product.datasheet.title', '规格书');
  const previewableText = useUiText('product.datasheet.previewable', '可预览');
  const viewDatasheetText = useUiText('product.datasheet.view', '查看规格书');
  const solutionsTitle = useUiText('product.solutions.title', '关联方案');

  const { data: product, isLoading, isError } = useQuery({
    queryKey: ['product', id],
    queryFn: () => getProductById(id!),
    enabled: !!id,
  });

  const selectionQuery = searchParams.toString();
  const backToSelection = `/selection${selectionQuery ? `?${selectionQuery}` : ''}`;

  if (!id) {
    return (
      <div className="container-page py-8">
        <Result
          status="404"
          title={notFoundTitle}
          subTitle={text('product.notFound.subtitle', '抱歉，您访问的产品不存在。')}
          extra={
            <Link to="/selection">
              <Button type="primary">{backSelectionText}</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="container-page py-8">
        <Result
          status="error"
          title={loadFailedText}
          subTitle={text('product.loadFailed.subtitle', '产品信息加载失败，请稍后重试。')}
          extra={
            <Link to="/selection">
              <Button type="primary">{backSelectionText}</Button>
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
    <div className="page-shell pb-20 md:pb-10">
      <div className="container-page py-6 md:py-10">
        <Link
          to={backToSelection}
          className="mb-4 inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
        >
          <ArrowLeftOutlined /> {backSelectionText}
        </Link>

      {isInactive && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700">
          {inactiveText}
        </div>
      )}

      <div className="surface-card mb-6 flex items-start justify-between gap-4 p-5 md:p-6">
        <div>
          <div className="section-kicker">{text('product.kicker', 'PRODUCT DETAIL')}</div>
          <h1 className="mt-1 break-all text-2xl font-bold text-slate-900 md:text-[28px]">{product.model}</h1>
          <p className="mt-1 text-slate-500">{product.series}</p>
        </div>
        <div>
          {product.datasheetMaterialId ? (
            <Tag color="green">{completeText}</Tag>
          ) : (
            <Tag color="gold">{preparingText}</Tag>
          )}
        </div>
      </div>

      <section className="surface-card mb-5 p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">{paramsTitle}</h2>
        <ProductParamsMatrix params={product.params} />
      </section>

      {applicationType && (
        <section className="surface-card mb-5 p-5 md:p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">{applicationsTitle}</h2>
          <Tag color="blue">{applicationType}</Tag>
        </section>
      )}

      {product.advantages.length > 0 && (
        <section className="surface-card mb-5 p-5 md:p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-3">{advantagesTitle}</h2>
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

      <section className="surface-card mb-5 p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">{datasheetTitle}</h2>
        {product.datasheetMaterialId ? (
          <div className="flex items-center gap-3">
            <Tag color="green">{previewableText}</Tag>
            <Button type="primary" onClick={() => setDatasheetOpen(true)}>
              {viewDatasheetText}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Tag color="gold">{preparingText}</Tag>
            <Button type="primary" disabled>
              {viewDatasheetText}
            </Button>
          </div>
        )}
      </section>

      <section className="surface-card mb-5 p-5 md:p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-3">{solutionsTitle}</h2>
        <SolutionList solutions={product.solutions ?? []} />
      </section>

      <Modal
        title={`${product.model} ${datasheetTitle}`}
        open={datasheetOpen}
        onCancel={() => setDatasheetOpen(false)}
        footer={
          <DownloadButton
            materialId={product.datasheetMaterialId}
            isAuthenticated={isAuthenticated}
            onError={(msg) => message.error(msg)}
          />
        }
        width={960}
        destroyOnClose
      >
        <div className="h-[70vh] overflow-hidden rounded-md border border-slate-200">
          <PdfPreview
            materialId={product.datasheetMaterialId}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </Modal>
      </div>
    </div>
  );
}
