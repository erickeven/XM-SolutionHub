import { Tag } from 'antd';
import type { FieldConfigItem } from '../../api/admin-product-fields';
import { usePublicProductFields } from '../../api/product-fields';
import { useUiContent } from '../../api/ui-content';

interface ProductParamsMatrixProps {
  params: Record<string, unknown>;
}

const CORE_FIELDS = new Set(['model', 'series', 'status', 'advantages']);
const UNIT_BY_FIELD: Record<string, string> = {
  inputVoltageMin: 'V',
  inputVoltageMax: 'V',
  outputVoltage: 'V',
  outputCurrent: 'A',
  standbyPower: 'W',
  standbyPowerMax: 'W',
  operatingTempMin: '°C',
  operatingTempMax: '°C',
};

function formatValue(
  value: unknown,
  field: FieldConfigItem | undefined,
  text: (key: string, fallback: string) => string,
): string {
  if (value === undefined || value === null || value === '') return '-';
  if (typeof value === 'boolean') {
    return value ? text('common.yes', '是') : text('common.no', '否');
  }

  const optionLabel = (raw: unknown) =>
    field?.optionsJson?.find((option) => option.value === String(raw))?.label ?? String(raw);
  if (Array.isArray(value)) {
    return value.map(optionLabel).join('、') || '-';
  }

  const unit = field ? UNIT_BY_FIELD[field.fieldKey] : undefined;
  const formatted = field?.fieldType === 'single_select' ? optionLabel(value) : String(value);
  return unit ? `${formatted} ${unit}` : formatted;
}

export function ProductParamsMatrix({ params }: ProductParamsMatrixProps) {
  const { data: configuredFields } = usePublicProductFields();
  const { text } = useUiContent();
  const fields = [...(configuredFields ?? [])]
    .filter((field) => !CORE_FIELDS.has(field.fieldKey) && field.fieldKey !== 'certifications')
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const configuredKeys = new Set(fields.map((field) => field.fieldKey));
  const entries = fields
    .filter((field) => params[field.fieldKey] !== undefined)
    .map((field) => ({
      key: field.fieldKey,
      label: field.label,
      value: formatValue(params[field.fieldKey], field, text),
    }));

  for (const [key, value] of Object.entries(params)) {
    if (configuredKeys.has(key) || value === undefined || value === null || key === 'certifications') {
      continue;
    }
    entries.push({ key, label: key, value: formatValue(value, undefined, text) });
  }

  const certifications = Array.isArray(params.certifications)
    ? params.certifications.filter((value): value is string => typeof value === 'string')
    : [];

  return (
    <div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 md:grid-cols-3 lg:grid-cols-4">
        {entries.map((entry) => (
          <div key={entry.key} className="bg-white p-4">
            <div className="mb-1 text-xs text-slate-500">{entry.label}</div>
            <div className="break-words text-base font-bold text-slate-900">{entry.value}</div>
          </div>
        ))}
      </div>
      {certifications.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs text-slate-500">
            {text('selection.card.certification', '认证')}
          </div>
          <div className="flex flex-wrap gap-2">
            {certifications.map((certification) => (
              <Tag key={certification} color="blue">
                {text(`selection.certification.${certification.toLowerCase()}`, certification)}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
