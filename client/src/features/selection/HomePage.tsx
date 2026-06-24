import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputNumber, Select, Button, Card } from 'antd';
import {
  SearchOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  AppstoreOutlined,
  ControlOutlined,
  ExperimentOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPopularProducts } from '../../api/selection';
import type { SelectionInput } from '../../types/selection';
import { SelectionCard } from './SelectionCard';

const APPLICATION_TYPES = [
  { label: '适配器', value: '适配器' },
  { label: '充电器', value: '充电器' },
  { label: 'LED驱动', value: 'LED驱动' },
  { label: '服务器电源', value: '服务器电源' },
  { label: 'PFC', value: 'PFC' },
  { label: '工业电源', value: '工业电源' },
];

const CERTIFICATIONS = ['CE', 'FCC', 'RoHS', 'UL', 'CCC', 'TUV'];

const POPULAR_APPS = [
  {
    type: '适配器',
    icon: <ApiOutlined style={{ fontSize: 22, color: '#B7791F' }} />,
    desc: '快充/常规适配器方案',
  },
  {
    type: '充电器',
    icon: <ThunderboltOutlined style={{ fontSize: 22, color: '#B7791F' }} />,
    desc: '多口/高功率充电方案',
  },
  {
    type: 'LED驱动',
    icon: <BulbOutlined style={{ fontSize: 22, color: '#B7791F' }} />,
    desc: '恒流/调光LED驱动',
  },
  {
    type: '服务器电源',
    icon: <ControlOutlined style={{ fontSize: 22, color: '#B7791F' }} />,
    desc: '高效率服务器电源方案',
  },
  {
    type: 'PFC',
    icon: <ThunderboltOutlined style={{ fontSize: 22, color: '#B7791F' }} />,
    desc: '功率因数校正方案',
  },
  {
    type: '工业电源',
    icon: <ExperimentOutlined style={{ fontSize: 22, color: '#B7791F' }} />,
    desc: '工业级高可靠性电源',
  },
];

export function HomePage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<SelectionInput>({
    inputVoltageMin: 90,
    inputVoltageMax: 264,
    outputVoltage: 5,
    outputCurrent: 2,
    applicationType: '',
    certifications: [],
  });

  const { data: popularProducts } = useQuery({
    queryKey: ['popularProducts'],
    queryFn: getPopularProducts,
    staleTime: 5 * 60 * 1000,
  });

  function handleQuickSelect() {
    const params = new URLSearchParams();
    if (form.inputVoltageMin)
      params.set('inputVoltageMin', String(form.inputVoltageMin));
    if (form.inputVoltageMax)
      params.set('inputVoltageMax', String(form.inputVoltageMax));
    if (form.outputVoltage) params.set('outputVoltage', String(form.outputVoltage));
    if (form.outputCurrent) params.set('outputCurrent', String(form.outputCurrent));
    if (form.applicationType) params.set('applicationType', form.applicationType);
    if (form.efficiencyLevel) params.set('efficiencyLevel', form.efficiencyLevel);
    if (form.certifications && form.certifications.length > 0) {
      params.set('certifications', form.certifications.join(','));
    }
    navigate(`/selection?${params.toString()}`);
  }

  return (
    <div className="bg-slate-50">
      {/* Hero */}
      <div className="bg-navy-900">
        <div className="container-page flex flex-col py-10 md:flex-row md:items-center md:gap-10 md:py-16">
          <div className="flex-1 text-white md:py-4">
            <h1 className="text-[28px] font-bold leading-tight md:text-[40px] md:leading-[48px]">
              芯茂微智能选型平台
            </h1>
            <p className="mt-3 max-w-md text-sm text-slate-300 md:text-base">
              毫秒级匹配 · 可解释推荐 · 全规格书可预览
            </p>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
              <div className="flex items-center gap-2">
                <ThunderboltOutlined className="text-copper-500" />
                <span className="text-sm text-slate-300">毫秒级匹配</span>
              </div>
              <div className="flex items-center gap-2">
                <RobotOutlined className="text-copper-500" />
                <span className="text-sm text-slate-300">AI 辅助选型</span>
              </div>
              <div className="flex items-center gap-2">
                <AppstoreOutlined className="text-copper-500" />
                <span className="text-sm text-slate-300">全型号覆盖</span>
              </div>
            </div>
          </div>

          <div className="mt-6 w-full flex-shrink-0 md:mt-0 md:w-[380px]">
            <Card className="!rounded-lg !border !border-slate-200 !shadow-card">
              <div className="mb-4 text-lg font-semibold text-slate-900">快速选型</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    <span className="mr-1 text-red-500">*</span>输入电压下限
                  </label>
                  <InputNumber
                    value={form.inputVoltageMin}
                    onChange={(v) => setForm({ ...form, inputVoltageMin: v ?? 0 })}
                    addonAfter="V"
                    className="!w-full"
                    placeholder="90"
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    <span className="mr-1 text-red-500">*</span>输入电压上限
                  </label>
                  <InputNumber
                    value={form.inputVoltageMax}
                    onChange={(v) => setForm({ ...form, inputVoltageMax: v ?? 0 })}
                    addonAfter="V"
                    className="!w-full"
                    placeholder="264"
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    <span className="mr-1 text-red-500">*</span>输出电压
                  </label>
                  <InputNumber
                    value={form.outputVoltage}
                    onChange={(v) => setForm({ ...form, outputVoltage: v ?? 0 })}
                    addonAfter="V"
                    className="!w-full"
                    placeholder="5"
                    min={0}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-500">
                    <span className="mr-1 text-red-500">*</span>输出电流
                  </label>
                  <InputNumber
                    value={form.outputCurrent}
                    onChange={(v) => setForm({ ...form, outputCurrent: v ?? 0 })}
                    addonAfter="A"
                    className="!w-full"
                    placeholder="2"
                    min={0}
                  />
                </div>
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs text-slate-500">应用类型</label>
                <Select
                  value={form.applicationType || undefined}
                  onChange={(v) => setForm({ ...form, applicationType: v })}
                  className="!w-full"
                  placeholder="选择应用类型（可选）"
                  options={APPLICATION_TYPES}
                  allowClear
                />
              </div>
              <div className="mt-3">
                <label className="mb-1 block text-xs text-slate-500">
                  认证要求（可选）
                </label>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
                  {CERTIFICATIONS.map((cert) => {
                    const checked = form.certifications?.includes(cert) ?? false;
                    return (
                      <label
                        key={cert}
                        className="inline-flex cursor-pointer items-center gap-1 text-slate-700"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            const cur = form.certifications ?? [];
                            setForm({
                              ...form,
                              certifications: checked
                                ? cur.filter((c) => c !== cert)
                                : [...cur, cert],
                            });
                          }}
                          className="accent-blue-600"
                        />
                        {cert}
                      </label>
                    );
                  })}
                </div>
              </div>
              <Button
                type="primary"
                size="large"
                icon={<SearchOutlined />}
                onClick={handleQuickSelect}
                className="!mt-5 !h-10 !w-full !text-base"
              >
                开始选型
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Popular apps */}
      <div className="container-page py-10 md:py-12">
        <h2 className="mb-5 text-xl font-semibold text-slate-900 md:text-2xl">热门应用</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_APPS.map((app) => (
            <button
              key={app.type}
              onClick={() =>
                navigate(
                  `/selection?applicationType=${encodeURIComponent(app.type)}`,
                )
              }
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left shadow-card transition-colors hover:border-blue-600 hover:bg-blue-50"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-slate-50">
                {app.icon}
              </div>
              <div>
                <div className="font-medium text-slate-900">{app.type}</div>
                <div className="text-xs text-slate-500">{app.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Popular products */}
      <div className="bg-white py-10 md:py-12">
        <div className="container-page">
          <h2 className="mb-5 text-xl font-semibold text-slate-900 md:text-2xl">推荐型号</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(popularProducts || []).slice(0, 9).map((product) => (
              <SelectionCard key={product.id} product={product} mode="popular" />
            ))}
            {!popularProducts && (
              <div className="col-span-full py-8 text-center text-slate-400">
                加载中...
              </div>
            )}
            {popularProducts && popularProducts.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400">
                暂无推荐型号
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI entry */}
      <div className="container-page py-10 md:py-12">
        <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-navy-900 p-6 text-white md:flex-row md:p-8">
          <div>
            <h2 className="text-lg font-semibold md:text-xl">AI 技术问答</h2>
            <p className="mt-1 text-sm text-slate-300">
              用自然语言描述需求，AI 帮你找到最合适的芯片方案
            </p>
          </div>
          <Button
            size="large"
            icon={<RobotOutlined />}
            onClick={() => navigate('/ai-chat')}
            className="!border-0 !bg-copper-500 !text-white hover:!bg-amber-600"
          >
            开始对话
          </Button>
        </div>
      </div>
    </div>
  );
}
