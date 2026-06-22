import { Tag } from 'antd';

interface ProductParamsMatrixProps {
  params: Record<string, unknown>;
}

function getNumber(params: Record<string, unknown>, key: string): number | undefined {
  const v = params[key];
  return typeof v === 'number' ? v : undefined;
}

function getString(params: Record<string, unknown>, key: string): string | undefined {
  const v = params[key];
  return typeof v === 'string' ? v : undefined;
}

function getStringArray(params: Record<string, unknown>, key: string): string[] {
  const v = params[key];
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function formatRange(min: number | undefined, max: number | undefined, separator: string): string | undefined {
  if (min === undefined && max === undefined) return undefined;
  const parts: string[] = [];
  if (min !== undefined) parts.push(String(min));
  if (max !== undefined) parts.push(String(max));
  return parts.length > 0 ? parts.join(separator) : undefined;
}

export function ProductParamsMatrix({ params }: ProductParamsMatrixProps) {
  const inputMin = getNumber(params, 'inputVoltageMin');
  const inputMax = getNumber(params, 'inputVoltageMax');
  const outputVoltage = getNumber(params, 'outputVoltage');
  const outputCurrent = getNumber(params, 'outputCurrent');
  const efficiency = getString(params, 'efficiencyLevel');
  const tempMin = getNumber(params, 'operatingTempMin');
  const tempMax = getNumber(params, 'operatingTempMax');
  const packageSize = getString(params, 'packageSize');
  const certs = getStringArray(params, 'certifications');

  const entries: { label: string; value: string }[] = [];

  const inputRange = formatRange(inputMin, inputMax, '-');
  if (inputRange) entries.push({ label: '输入电压', value: `${inputRange} V` });

  if (outputVoltage !== undefined) {
    entries.push({ label: '输出电压', value: `${outputVoltage} V` });
  }

  if (outputCurrent !== undefined) {
    entries.push({ label: '输出电流', value: `${outputCurrent} A` });
  }

  if (efficiency) {
    entries.push({ label: '效率', value: efficiency });
  }

  const tempRange = formatRange(tempMin, tempMax, '~');
  if (tempRange) entries.push({ label: '工作温度范围', value: `${tempRange} °C` });

  if (packageSize) {
    entries.push({ label: '封装', value: packageSize });
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-lg overflow-hidden md:grid-cols-3 lg:grid-cols-4">
        {entries.map((entry) => (
          <div key={entry.label} className="bg-white p-4">
            <div className="text-xs text-slate-500 mb-1">{entry.label}</div>
            <div className="text-lg font-bold text-slate-900">{entry.value}</div>
          </div>
        ))}
      </div>
      {certs.length > 0 && (
        <div className="mt-4">
          <div className="text-xs text-slate-500 mb-2">认证</div>
          <div className="flex flex-wrap gap-2">
            {certs.map((cert) => (
              <Tag key={cert} color="blue">
                {cert}
              </Tag>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}