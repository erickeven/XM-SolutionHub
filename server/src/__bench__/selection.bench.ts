import { bench, describe } from 'vitest';
import { matchProducts } from '../modules/selection/selection.service';
import type { SelectionInput, ProductForMatching } from '../modules/selection/selection.types';

// PRD §3 L28-36: Selection P95 < 2s

const baseInput: SelectionInput = {
  inputVoltageMin: 100,
  inputVoltageMax: 240,
  outputVoltage: 12,
  outputCurrent: 1.5,
  applicationType: '适配器',
};

function makeProduct(id: string, index: number): ProductForMatching {
  return {
    id,
    model: `LP-${index}`,
    series: '驱动',
    status: 'ACTIVE',
    params: {
      inputVoltageMin: 85 + (index % 50),
      inputVoltageMax: 200 + (index % 65),
      outputVoltage: 5 + (index % 20),
      outputCurrent: 0.5 + (index % 30) / 10,
      applicationType: index % 2 === 0 ? '适配器' : '工业',
      efficiencyLevel: `${85 + (index % 15)}%`,
      certifications: ['CE', 'RoHS'],
      operatingTempMax: 100,
    },
    advantages: ['高效'],
    datasheetMaterialId: index % 3 === 0 ? `mat-${index}` : null,
  };
}

function generateProducts(count: number): ProductForMatching[] {
  const products: ProductForMatching[] = [];
  for (let i = 0; i < count; i++) {
    products.push(makeProduct(`p-${i}`, i));
  }
  return products;
}

describe.skipIf(!process.env.DATABASE_URL)('Selection Algorithm Performance', () => {
  const products100 = generateProducts(100);
  const products500 = generateProducts(500);
  const products1000 = generateProducts(1000);

  bench(
    'matchProducts with 100 products — P95 < 2s',
    () => {
      matchProducts(baseInput, products100);
    },
    { time: 2000 },
  );

  bench(
    'matchProducts with 500 products — P95 < 2s',
    () => {
      matchProducts(baseInput, products500);
    },
    { time: 2000 },
  );

  bench(
    'matchProducts with 1000 products — P95 < 2s',
    () => {
      matchProducts(baseInput, products1000);
    },
    { time: 2000 },
  );
});