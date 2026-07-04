import { InputNumber, Select, Checkbox, Button, Divider } from 'antd';
import { CloseOutlined, RedoOutlined, SearchOutlined } from '@ant-design/icons';
import type { SelectionInput } from '../../types/selection';

const APPLICATION_TYPES = [
  { label: '适配器', value: '适配器' },
  { label: '充电器', value: '充电器' },
  { label: 'LED驱动', value: 'LED驱动' },
  { label: '服务器电源', value: '服务器电源' },
  { label: 'PFC', value: 'PFC' },
  { label: '工业电源', value: '工业电源' },
];

const EFFICIENCY_LEVELS = [
  { label: 'VI级能效', value: 'VI' },
  { label: 'V级能效', value: 'V' },
  { label: '钛金级', value: 'titanium' },
  { label: '白金级', value: 'platinum' },
  { label: '金牌级', value: 'gold' },
];

const CERTIFICATIONS = ['CE', 'FCC', 'RoHS', 'UL', 'CCC', 'TUV'];

const FIELD_LABELS: Record<keyof SelectionInput, string> = {
  inputVoltageMin: '输入电压下限',
  inputVoltageMax: '输入电压上限',
  outputVoltage: '输出电压',
  outputCurrent: '输出电流',
  applicationType: '应用类型',
  efficiencyLevel: '能效等级',
  certifications: '认证要求',
};

interface FilterPanelProps {
  values: SelectionInput;
  onChange: (values: Partial<SelectionInput>) => void;
  onRemove: (field: string) => void;
  onSubmit?: () => void;
  onReset?: () => void;
  compact?: boolean;
}

export function FilterPanel({
  values,
  onChange,
  onRemove,
  onSubmit,
  onReset,
  compact = false,
}: FilterPanelProps) {
  const activeChips: { field: string; label: string; value: string }[] = [];

  if (values.inputVoltageMin !== undefined && values.inputVoltageMin !== null && values.inputVoltageMin > 0) {
    activeChips.push({
      field: 'inputVoltageMin',
      label: '输入电压下限',
      value: `${values.inputVoltageMin}V`,
    });
  }
  if (values.inputVoltageMax !== undefined && values.inputVoltageMax !== null && values.inputVoltageMax > 0) {
    activeChips.push({
      field: 'inputVoltageMax',
      label: '输入电压上限',
      value: `${values.inputVoltageMax}V`,
    });
  }
  if (values.outputVoltage !== undefined && values.outputVoltage !== null && values.outputVoltage > 0) {
    activeChips.push({ field: 'outputVoltage', label: '输出电压', value: `${values.outputVoltage}V` });
  }
  if (values.outputCurrent !== undefined && values.outputCurrent !== null && values.outputCurrent > 0) {
    activeChips.push({
      field: 'outputCurrent',
      label: '输出电流',
      value: `${values.outputCurrent}A`,
    });
  }
  if (values.applicationType) {
    activeChips.push({ field: 'applicationType', label: '应用类型', value: values.applicationType });
  }
  if (values.efficiencyLevel) {
    activeChips.push({ field: 'efficiencyLevel', label: '能效等级', value: values.efficiencyLevel });
  }
  if (values.certifications && values.certifications.length > 0) {
    activeChips.push({
      field: 'certifications',
      label: '认证',
      value: values.certifications.join(', '),
    });
  }

  return (
    <div className="flex h-full flex-col">
      {/* Selected condition chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 pb-3">
          {activeChips.map((chip) => (
            <span
              key={chip.field}
              className="inline-flex items-center gap-1 rounded border border-blue-600 bg-blue-50 px-2 py-1 text-xs text-slate-700"
            >
              <span className="text-slate-500">{chip.label}:</span>
              <span className="font-medium">{chip.value}</span>
              <button
                onClick={() => onRemove(chip.field)}
                className="ml-1 text-slate-400 hover:text-red-600"
              >
                <CloseOutlined style={{ fontSize: 10 }} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Electrical params */}
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-slate-900">电气参数</div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-slate-500">输入电压下限 (V)</label>
            <InputNumber
              value={values.inputVoltageMin}
              onChange={(v) => onChange({ inputVoltageMin: v ?? 0 })}
              className="!w-full"
              placeholder="90"
              min={0}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">输入电压上限 (V)</label>
            <InputNumber
              value={values.inputVoltageMax}
              onChange={(v) => onChange({ inputVoltageMax: v ?? 0 })}
              className="!w-full"
              placeholder="264"
              min={0}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">输出电压 (V)</label>
            <InputNumber
              value={values.outputVoltage}
              onChange={(v) => onChange({ outputVoltage: v ?? 0 })}
              className="!w-full"
              placeholder="5"
              min={0}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">输出电流 (A)</label>
            <InputNumber
              value={values.outputCurrent}
              onChange={(v) => onChange({ outputCurrent: v ?? 0 })}
              className="!w-full"
              placeholder="2"
              min={0}
            />
          </div>
        </div>
      </div>

      {/* Application type */}
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-slate-900">应用类型</div>
        <Select
          value={values.applicationType || undefined}
          onChange={(v) => onChange({ applicationType: v })}
          className="!w-full"
          placeholder="选择应用类型"
          options={APPLICATION_TYPES}
          allowClear
        />
      </div>

      {/* Performance */}
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-slate-900">性能参数</div>
        <Select
          value={values.efficiencyLevel || undefined}
          onChange={(v) => onChange({ efficiencyLevel: v })}
          className="!w-full"
          placeholder="能效等级"
          options={EFFICIENCY_LEVELS}
          allowClear
        />
      </div>

      {/* Compliance */}
      <div className="mb-4">
        <div className="mb-2 text-sm font-medium text-slate-900">合规参数</div>
        <Checkbox.Group
          value={values.certifications || []}
          onChange={(v) => onChange({ certifications: v as string[] })}
          className="!flex !flex-wrap !gap-2"
        >
          {CERTIFICATIONS.map((cert) => (
            <Checkbox key={cert} value={cert} className="!text-sm">
              {cert}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </div>

      <Divider className="!my-2" />

      {/* Sticky bottom actions */}
      <div className="mt-auto flex gap-2 pt-2">
        <Button
          type="primary"
          icon={<SearchOutlined />}
          onClick={onSubmit}
          className="!flex-1"
        >
          开始选型
        </Button>
        <Button icon={<RedoOutlined />} onClick={onReset}>
          重置
        </Button>
      </div>

      {/* Compact mode: hide labels for inline use */}
      {compact && (
        <span className="hidden">{Object.keys(FIELD_LABELS).join(',')}</span>
      )}
    </div>
  );
}
