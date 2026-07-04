import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputNumber, Select, Button, Space } from 'antd';
import {
  SearchOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  AppstoreOutlined,
  ControlOutlined,
  ExperimentOutlined,
  ApiOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPopularProducts } from '../../api/selection';
import type { SelectionInput } from '../../types/selection';
import { SelectionCard } from './SelectionCard';
import heroChipBoard from '../../assets/hero-chip-board.jpg';

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

interface UnitInputProps {
  value?: number;
  unit: string;
  placeholder: string;
  onChange: (value: number) => void;
}

function UnitInput({ value, unit, placeholder, onChange }: UnitInputProps) {
  return (
    <Space.Compact className="w-full">
      <InputNumber
        value={value}
        onChange={(next) => onChange(next ?? 0)}
        className="!w-full"
        placeholder={placeholder}
        min={0}
      />
      <span className="flex h-8 min-w-9 items-center justify-center rounded-r-md border border-l-0 border-slate-300 bg-slate-50 px-2 text-xs text-slate-500">
        {unit}
      </span>
    </Space.Compact>
  );
}

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
    <div className="page-shell">
      <section className="relative overflow-hidden bg-navy-950 text-white">
        <img
          src={heroChipBoard}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-[0.72]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,0.96)_0%,rgba(7,17,31,0.86)_42%,rgba(7,17,31,0.52)_100%)]" />
        <div className="container-page relative grid gap-8 py-9 md:grid-cols-[minmax(0,1fr)_420px] md:items-center md:py-12 lg:py-14">
          <div className="max-w-2xl">
            <div className="section-kicker text-copper-400">XM-SolutionHub</div>
            <h1 className="mt-3 text-[30px] font-bold leading-tight md:text-[42px] md:leading-[50px]">
              芯茂微智能选型平台
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 md:text-base">
              输入电气参数即可匹配可解释型号，联动规格书、方案资料与 AI 技术问答，减少工程师在资料表之间反复查找的时间。
            </p>
            <div className="mt-6 hidden max-w-2xl grid-cols-1 gap-3 sm:grid sm:grid-cols-3">
              <div className="metric-tile">
                <ThunderboltOutlined className="text-copper-400" />
                <div className="mt-2 text-sm font-semibold">毫秒级匹配</div>
                <div className="mt-1 text-xs text-slate-300">电压、电流、认证联动评分</div>
              </div>
              <div className="metric-tile">
                <FileTextOutlined className="text-copper-400" />
                <div className="mt-2 text-sm font-semibold">资料可追溯</div>
                <div className="mt-1 text-xs text-slate-300">型号、方案、PDF 统一入口</div>
              </div>
              <div className="metric-tile">
                <RobotOutlined className="text-copper-400" />
                <div className="mt-2 text-sm font-semibold">AI 有来源</div>
                <div className="mt-1 text-xs text-slate-300">基于知识库证据回答</div>
              </div>
            </div>
          </div>

          <div className="surface-card p-4 text-slate-900 shadow-soft md:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">快速选型</div>
                <div className="mt-1 text-xs text-slate-500">核心电气参数必填，应用与认证可选</div>
              </div>
              <SearchOutlined className="mt-1 text-copper-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  <span className="mr-1 text-red-500">*</span>输入电压下限
                </label>
                <UnitInput
                  value={form.inputVoltageMin}
                  onChange={(v) => setForm({ ...form, inputVoltageMin: v })}
                  unit="V"
                  placeholder="90"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  <span className="mr-1 text-red-500">*</span>输入电压上限
                </label>
                <UnitInput
                  value={form.inputVoltageMax}
                  onChange={(v) => setForm({ ...form, inputVoltageMax: v })}
                  unit="V"
                  placeholder="264"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  <span className="mr-1 text-red-500">*</span>输出电压
                </label>
                <UnitInput
                  value={form.outputVoltage}
                  onChange={(v) => setForm({ ...form, outputVoltage: v })}
                  unit="V"
                  placeholder="5"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  <span className="mr-1 text-red-500">*</span>输出电流
                </label>
                <UnitInput
                  value={form.outputCurrent}
                  onChange={(v) => setForm({ ...form, outputCurrent: v })}
                  unit="A"
                  placeholder="2"
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
              <label className="mb-1 block text-xs text-slate-500">认证要求（可选）</label>
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
              className="!mt-5 !h-11 !w-full !text-base"
            >
              开始选型
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page py-9 md:py-11">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="section-kicker">APPLICATIONS</div>
            <h2 className="section-title mt-1">热门应用</h2>
          </div>
          <p className="section-copy max-w-xl">
            按典型电源场景进入完整筛选，再微调电气参数与认证要求。
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {POPULAR_APPS.map((app) => (
            <button
              key={app.type}
              onClick={() =>
                navigate(`/selection?applicationType=${encodeURIComponent(app.type)}`)
              }
              className="surface-card flex min-h-[92px] items-center gap-4 p-4 text-left transition-colors hover:border-blue-600 hover:bg-blue-50/60"
            >
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-md bg-navy-950 text-copper-400">
                {app.icon}
              </div>
              <div>
                <div className="font-semibold text-slate-900">{app.type}</div>
                <div className="mt-1 text-xs text-slate-500">{app.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-9 md:py-11">
        <div className="container-page">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="section-kicker">RECOMMENDED MODELS</div>
              <h2 className="section-title mt-1">推荐型号</h2>
            </div>
            <Button onClick={() => navigate('/selection')} icon={<AppstoreOutlined />}>
              进入完整选型
            </Button>
          </div>
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
      </section>

      <section className="container-page py-9 md:py-11">
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-navy-950 p-6 text-white md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <div className="section-kicker text-copper-400">AI ASSISTANT</div>
            <h2 className="mt-2 text-xl font-semibold">AI 技术问答</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              用自然语言描述需求，系统会基于资料库返回带来源的回答，方便追溯到规格书页码和方案片段。
            </p>
          </div>
          <Button
            size="large"
            icon={<RobotOutlined />}
            onClick={() => navigate('/ai-chat')}
            className="!border-0 !bg-copper-500 !text-white hover:!bg-copper-400"
          >
            开始对话
          </Button>
        </div>
      </section>
    </div>
  );
}
