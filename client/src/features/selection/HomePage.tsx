import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputNumber, Select, Button, Checkbox, Card } from 'antd';
import { SearchOutlined, RobotOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
  { type: '适配器', icon: '🔌', desc: '快充/常规适配器方案' },
  { type: '充电器', icon: '🔋', desc: '多口/高功率充电方案' },
  { type: 'LED驱动', icon: '💡', desc: '恒流/调光LED驱动' },
  { type: '服务器电源', icon: '🖥️', desc: '高效率服务器电源方案' },
  { type: 'PFC', icon: '⚡', desc: '功率因数校正方案' },
  { type: '工业电源', icon: '🏭', desc: '工业级高可靠性电源' },
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
    if (form.inputVoltageMin) params.set('inputVoltageMin', String(form.inputVoltageMin));
    if (form.inputVoltageMax) params.set('inputVoltageMax', String(form.inputVoltageMax));
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
    <div>
      {/* Hero section: left brand + right quick selection */}
      <div className="flex min-h-[520px] flex-col md:flex-row">
        {/* Left: dark navy brand area */}
        <div className="flex flex-col justify-center bg-navy-900 px-8 py-12 text-white md:w-1/2 md:px-12">
          <h1 className="text-3xl font-bold leading-tight md:text-4xl">
            芯茂微智能选型平台
          </h1>
          <p className="mt-4 max-w-md text-base text-slate-300">
            基于电气参数的智能匹配引擎，快速从芯茂微全系列电源芯片中找到最优方案。
          </p>
          <div className="mt-8 flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <ThunderboltOutlined className="text-copper-500" />
              <span className="text-sm text-slate-300">毫秒级匹配</span>
            </div>
            <div className="flex items-center gap-2">
              <RobotOutlined className="text-copper-500" />
              <span className="text-sm text-slate-300">AI 辅助选型</span>
            </div>
            <div className="flex items-center gap-2">
              <SearchOutlined className="text-copper-500" />
              <span className="text-sm text-slate-300">全型号覆盖</span>
            </div>
          </div>
        </div>

        {/* Right: quick selection panel */}
        <div className="flex items-center justify-center bg-slate-50 px-8 py-12 md:w-1/2">
          <Card className="w-full max-w-md !border !border-slate-200 !shadow-none">
            <div className="mb-4 text-lg font-semibold text-slate-900">快速选型</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">输入电压下限 (V)</label>
                <InputNumber
                  value={form.inputVoltageMin}
                  onChange={(v) => setForm({ ...form, inputVoltageMin: v ?? 0 })}
                  className="!w-full"
                  placeholder="90"
                  min={0}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">输入电压上限 (V)</label>
                <InputNumber
                  value={form.inputVoltageMax}
                  onChange={(v) => setForm({ ...form, inputVoltageMax: v ?? 0 })}
                  className="!w-full"
                  placeholder="264"
                  min={0}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">输出电压 (V)</label>
                <InputNumber
                  value={form.outputVoltage}
                  onChange={(v) => setForm({ ...form, outputVoltage: v ?? 0 })}
                  className="!w-full"
                  placeholder="5"
                  min={0}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">输出电流 (A)</label>
                <InputNumber
                  value={form.outputCurrent}
                  onChange={(v) => setForm({ ...form, outputCurrent: v ?? 0 })}
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
                placeholder="选择应用类型"
                options={APPLICATION_TYPES}
                allowClear
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-slate-500">认证要求 (可选)</label>
              <Checkbox.Group
                value={form.certifications || []}
                onChange={(v) => setForm({ ...form, certifications: v as string[] })}
                className="!flex !flex-wrap !gap-2"
              >
                {CERTIFICATIONS.map((cert) => (
                  <Checkbox key={cert} value={cert} className="!text-sm">
                    {cert}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </div>
            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={handleQuickSelect}
              className="!mt-4 !w-full"
            >
              开始选型
            </Button>
          </Card>
        </div>
      </div>

      {/* Hint for below-fold content */}
      <div className="border-b border-slate-200 bg-white py-3 text-center">
        <span className="text-sm text-slate-400">↓ 热门应用 · 推荐型号 · AI 入口</span>
      </div>

      {/* Below fold: popular applications */}
      <div className="mx-auto max-w-[1280px] px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold text-slate-900">热门应用</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_APPS.map((app) => (
            <button
              key={app.type}
              onClick={() => navigate(`/selection?applicationType=${encodeURIComponent(app.type)}`)}
              className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-600 hover:bg-blue-50"
            >
              <span className="text-3xl">{app.icon}</span>
              <div>
                <div className="font-medium text-slate-900">{app.type}</div>
                <div className="text-sm text-slate-500">{app.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Popular products */}
      <div className="bg-slate-50 py-12">
        <div className="mx-auto max-w-[1280px] px-4">
          <h2 className="mb-6 text-2xl font-bold text-slate-900">推荐型号</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(popularProducts || []).slice(0, 10).map((product) => (
              <SelectionCard key={product.id} product={product} mode="popular" />
            ))}
            {!popularProducts && (
              <div className="col-span-full py-8 text-center text-slate-400">加载中...</div>
            )}
            {popularProducts && popularProducts.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400">暂无推荐型号</div>
            )}
          </div>
        </div>
      </div>

      {/* AI entry */}
      <div className="mx-auto max-w-[1280px] px-4 py-12">
        <div className="flex flex-col items-center justify-between gap-4 rounded-lg border border-slate-200 bg-navy-900 p-8 text-white md:flex-row">
          <div>
            <h2 className="text-xl font-bold">AI 智能问答</h2>
            <p className="mt-2 text-slate-300">用自然语言描述需求，AI 帮你找到最合适的芯片方案</p>
          </div>
          <Button
            size="large"
            icon={<RobotOutlined />}
            onClick={() => navigate('/ai-chat')}
            className="!bg-copper-500 !border-0 !text-white hover:!bg-copper-500/80"
          >
            开始对话
          </Button>
        </div>
      </div>
    </div>
  );
}