import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InputNumber, Select, Button, Space } from 'antd';
import {
  SearchOutlined,
  RobotOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getPopularProducts } from '../../api/selection';
import { listSolutions } from '../../api/solutions';
import type { SelectionInput } from '../../types/selection';
import { SelectionCard } from './SelectionCard';
import heroChipBoard from '../../assets/hero-chip-board.jpg';
import { useUiContent, useUiText } from '../../api/ui-content';

const APPLICATION_TYPES = [
  { label: '适配器', value: '适配器' },
  { label: '充电器', value: '充电器' },
  { label: 'LED驱动', value: 'LED驱动' },
  { label: '服务器电源', value: '服务器电源' },
  { label: 'PFC', value: 'PFC' },
  { label: '工业电源', value: '工业电源' },
];

const CERTIFICATIONS = ['CE', 'FCC', 'RoHS', 'UL', 'CCC', 'TUV'];

const APPLICATION_FILTERS = ['适配器', '充电器', 'LED驱动', '服务器电源', 'PFC', '工业电源'];
const APPLICATION_CONTENT_KEYS: Record<string, string> = {
  适配器: 'adapter',
  充电器: 'charger',
  LED驱动: 'led',
  服务器电源: 'server',
  PFC: 'pfc',
  工业电源: 'industrial',
};

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
  const { text } = useUiContent();
  const heroTitle = useUiText('home.hero.title', '芯茂微智能选型平台');
  const heroSubtitle = useUiText(
    'home.hero.subtitle',
    '输入电气参数即可匹配可解释型号，联动规格书、方案资料与 AI 技术问答，减少工程师在资料表之间反复查找的时间。',
  );
  const quickTitle = useUiText('home.quick.title', '快速选型');
  const quickHint = useUiText('home.quick.hint', '核心电气参数必填，应用与认证可选');
  const quickSubmit = useUiText('home.quick.submit', '开始选型');
  const applicationsTitle = useUiText('home.solutions.title', '热门应用方案');
  const viewSolutionText = useUiText('home.solutions.view', '查看方案资料');
  const emptySolutionsText = useUiText('home.solutions.empty', '暂无已上架方案');
  const recommendedTitle = useUiText('home.products.title', '推荐型号');
  const enterSelectionText = useUiText('home.products.enterSelection', '进入完整选型');
  const loadingText = useUiText('common.loading', '加载中...');
  const emptyProductsText = useUiText('home.products.empty', '暂无推荐型号');
  const aiTitle = useUiText('home.ai.title', 'AI 技术问答');
  const aiSubtitle = useUiText(
    'home.ai.subtitle',
    '用自然语言描述需求，系统会基于资料库返回带来源的回答，方便追溯到规格书页码和方案片段。',
  );
  const chatCta = useUiText('main.cta.chat', '开始对话');
  const applicationTypes = APPLICATION_TYPES.map((option) => ({
    ...option,
    label: text(
      `selection.application.${APPLICATION_CONTENT_KEYS[option.value] ?? option.value}`,
      option.label,
    ),
  }));
  const applicationFilters = APPLICATION_FILTERS.map((value) => ({
    value,
    label: text(
      `selection.application.${APPLICATION_CONTENT_KEYS[value] ?? value}`,
      value,
    ),
  }));
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

  const { data: popularSolutions } = useQuery({
    queryKey: ['popularSolutions'],
    queryFn: () => listSolutions(1, 6),
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
            <div className="section-kicker text-copper-400">{text('brand.platform', 'XM-SolutionHub')}</div>
            <h1 className="mt-3 text-[30px] font-bold leading-tight md:text-[42px] md:leading-[50px]">
              {heroTitle}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200 md:text-base">
              {heroSubtitle}
            </p>
            <div className="mt-6 hidden max-w-2xl grid-cols-1 gap-3 sm:grid sm:grid-cols-3">
              <div className="metric-tile">
                <ThunderboltOutlined className="text-copper-400" />
                <div className="mt-2 text-sm font-semibold">{text('home.metric.match.title', '毫秒级匹配')}</div>
                <div className="mt-1 text-xs text-slate-300">{text('home.metric.match.subtitle', '电压、电流、认证联动评分')}</div>
              </div>
              <div className="metric-tile">
                <FileTextOutlined className="text-copper-400" />
                <div className="mt-2 text-sm font-semibold">{text('home.metric.trace.title', '资料可追溯')}</div>
                <div className="mt-1 text-xs text-slate-300">{text('home.metric.trace.subtitle', '型号、方案、PDF 统一入口')}</div>
              </div>
              <div className="metric-tile">
                <RobotOutlined className="text-copper-400" />
                <div className="mt-2 text-sm font-semibold">{text('home.metric.ai.title', 'AI 有来源')}</div>
                <div className="mt-1 text-xs text-slate-300">{text('home.metric.ai.subtitle', '基于知识库证据回答')}</div>
              </div>
            </div>
          </div>

          <div className="surface-card p-4 text-slate-900 shadow-soft md:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{quickTitle}</div>
                <div className="mt-1 text-xs text-slate-500">{quickHint}</div>
              </div>
              <SearchOutlined className="mt-1 text-copper-500" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-slate-500">
                  <span className="mr-1 text-red-500">*</span>{text('selection.field.inputVoltageMin', '输入电压下限')}
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
                  <span className="mr-1 text-red-500">*</span>{text('selection.field.inputVoltageMax', '输入电压上限')}
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
                  <span className="mr-1 text-red-500">*</span>{text('selection.field.outputVoltage', '输出电压')}
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
                  <span className="mr-1 text-red-500">*</span>{text('selection.field.outputCurrent', '输出电流')}
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
              <label className="mb-1 block text-xs text-slate-500">{text('selection.field.applicationType', '应用类型')}</label>
              <Select
                value={form.applicationType || undefined}
                onChange={(v) => setForm({ ...form, applicationType: v })}
                className="!w-full"
                placeholder={text('selection.field.application.placeholder', '选择应用类型（可选）')}
                options={applicationTypes}
                allowClear
              />
            </div>
            <div className="mt-3">
              <label className="mb-1 block text-xs text-slate-500">{text('selection.field.certifications.optional', '认证要求（可选）')}</label>
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
                      {text(`selection.certification.${cert.toLowerCase()}`, cert)}
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
              {quickSubmit}
            </Button>
          </div>
        </div>
      </section>

      <section className="container-page py-9 md:py-11">
        <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="section-kicker">{text('home.solutions.kicker', 'APPLICATIONS')}</div>
            <h2 className="section-title mt-1">{applicationsTitle}</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {applicationFilters.map((app) => (
              <button
                key={app.value}
                onClick={() =>
                  navigate(`/solutions?search=${encodeURIComponent(app.value)}`)
                }
                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 transition-colors hover:border-blue-600 hover:text-blue-700"
              >
                {app.label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(popularSolutions?.items ?? []).map((solution) => (
            <article
              key={solution.id}
              className="surface-card flex min-h-[168px] flex-col p-5 transition-colors hover:border-blue-600 hover:bg-blue-50/50"
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-navy-950 text-copper-400">
                  <FileTextOutlined />
                </div>
                <span className="text-xs text-green-600">{text('common.active', '已上架')}</span>
              </div>
              <h3 className="text-lg font-bold text-slate-900 line-clamp-2">
                {solution.name}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-slate-600 line-clamp-2">
                {solution.description}
              </p>
              <button
                onClick={() => navigate(`/solutions/${solution.id}`)}
                className="mt-4 inline-flex items-center gap-1 text-left text-sm font-semibold text-blue-700"
              >
                {viewSolutionText} <RightOutlined />
              </button>
            </article>
          ))}
          {popularSolutions && popularSolutions.items.length === 0 && (
            <div className="col-span-full py-8 text-center text-slate-400">
              {emptySolutionsText}
            </div>
          )}
          {!popularSolutions && (
            <div className="col-span-full py-8 text-center text-slate-400">
              {loadingText}
            </div>
          )}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white py-9 md:py-11">
        <div className="container-page">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="section-kicker">{text('home.products.kicker', 'RECOMMENDED MODELS')}</div>
              <h2 className="section-title mt-1">{recommendedTitle}</h2>
            </div>
            <Button onClick={() => navigate('/selection')} icon={<AppstoreOutlined />}>
              {enterSelectionText}
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(popularProducts || []).slice(0, 9).map((product) => (
              <SelectionCard key={product.id} product={product} mode="popular" />
            ))}
            {!popularProducts && (
              <div className="col-span-full py-8 text-center text-slate-400">
                {loadingText}
              </div>
            )}
            {popularProducts && popularProducts.length === 0 && (
              <div className="col-span-full py-8 text-center text-slate-400">
                {emptyProductsText}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container-page py-9 md:py-11">
        <div className="grid gap-4 rounded-lg border border-slate-200 bg-navy-950 p-6 text-white md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <div className="section-kicker text-copper-400">{text('home.ai.kicker', 'AI ASSISTANT')}</div>
            <h2 className="mt-2 text-xl font-semibold">{aiTitle}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              {aiSubtitle}
            </p>
          </div>
          <Button
            size="large"
            icon={<RobotOutlined />}
            onClick={() => navigate('/ai-chat')}
            className="!border-0 !bg-copper-500 !text-white hover:!bg-copper-400"
          >
            {chatCta}
          </Button>
        </div>
      </section>
    </div>
  );
}
