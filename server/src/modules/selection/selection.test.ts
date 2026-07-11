import { describe, it, expect } from 'vitest';
import { ZodError } from 'zod';
import { matchProducts } from './selection.service';
import { selectionInputSchema } from './selection.schema';
import type { SelectionInput, ProductForMatching } from './selection.types';

function makeProduct(overrides: Partial<ProductForMatching> = {}): ProductForMatching {
  return {
    id: '1',
    model: 'LP3524',
    series: '驱动',
    status: 'ACTIVE',
    params: {
      inputVoltageMin: 85,
      inputVoltageMax: 265,
      outputVoltage: 12,
      outputCurrent: 2,
      applicationType: '适配器',
      efficiencyLevel: '94%',
      certifications: ['CE', 'RoHS'],
      operatingTempMax: 125,
    },
    advantages: ['高效'],
    datasheetMaterialId: null,
    ...overrides,
  };
}

const baseInput: SelectionInput = {
  inputVoltageMin: 100,
  inputVoltageMax: 240,
  outputVoltage: 12,
  outputCurrent: 1.5,
  applicationType: '适配器',
};

describe('Selection Algorithm', () => {
  it('exact match: product covers all electrical params → matchLevel=exact, score >= 80', () => {
    const products = [makeProduct()];
    const results = matchProducts(baseInput, products);
    expect(results).toHaveLength(1);
    expect(results[0]!.matchLevel).toBe('exact');
    expect(results[0]!.score).toBeGreaterThanOrEqual(80);
  });

  it('approximate: outputCurrent lower than required → matchLevel=approximate, diffs include current info', () => {
    const products = [
      makeProduct({
        id: '2',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 1.0,
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const results = matchProducts(baseInput, products);
    expect(results[0]!.matchLevel).toBe('approximate');
    expect(results[0]!.diffs.some((d) => d.includes('输出电流'))).toBe(true);
  });

  it('fallback: no product matches → matchLevel=fallback, top 3 returned with diffs', () => {
    const products = [
      makeProduct({
        id: 'a',
        model: 'P-A',
        params: {
          inputVoltageMin: 200,
          inputVoltageMax: 240,
          outputVoltage: 5,
          outputCurrent: 0.1,
          applicationType: '工业',
        },
      }),
      makeProduct({
        id: 'b',
        model: 'P-B',
        params: {
          inputVoltageMin: 180,
          inputVoltageMax: 220,
          outputVoltage: 3.3,
          outputCurrent: 0.05,
          applicationType: '照明',
        },
      }),
      makeProduct({
        id: 'c',
        model: 'P-C',
        params: {
          inputVoltageMin: 150,
          inputVoltageMax: 200,
          outputVoltage: 9,
          outputCurrent: 0.2,
          applicationType: '汽车',
        },
      }),
    ];
    const results = matchProducts(baseInput, products);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.matchLevel === 'fallback')).toBe(true);
    expect(results.every((r) => r.diffs.length > 0)).toBe(true);
  });

  it('missing required params → throws ZodError', () => {
    expect(() => selectionInputSchema.parse({ inputVoltageMin: 100 })).toThrow();
  });

  it('application type is optional: electrical params alone can match', () => {
    const input = selectionInputSchema.parse({
      inputVoltageMin: 100,
      inputVoltageMax: 240,
      outputVoltage: 12,
      outputCurrent: 1.5,
    });
    const results = matchProducts(input, [makeProduct()]);
    expect(results[0]!.matchLevel).toBe('exact');
    expect(results[0]!.reasons).toContain('未指定应用类型，默认满足');
  });

  it('uses standbyPowerMax in W when evaluating standby requirements', () => {
    const product = makeProduct();
    product.params.standbyPowerMax = 0.08;

    const results = matchProducts(
      { ...baseInput, standbyPowerMax: 0.1 },
      [product],
    );

    expect(results[0]!.reasons).toContain('待机功耗满足需求');
    expect(results[0]!.diffs.some((diff) => diff.includes('缺少待机功耗'))).toBe(false);
  });

  it('non-ACTIVE products excluded (filter happens before matching)', () => {
    const products = [
      makeProduct({ id: 'active', status: 'ACTIVE' }),
      makeProduct({ id: 'draft', status: 'DRAFT' }),
      makeProduct({ id: 'inactive', status: 'INACTIVE' }),
    ];
    const results = matchProducts(baseInput, products);
    expect(results).toHaveLength(1);
    expect(results[0]!.productId).toBe('active');
  });

  it('sort order: exact before approximate before fallback', () => {
    const products = [
      makeProduct({
        id: 'fallback',
        model: 'FB',
        params: {
          inputVoltageMin: 200,
          inputVoltageMax: 240,
          outputVoltage: 5,
          outputCurrent: 0.1,
          applicationType: '工业',
        },
      }),
      makeProduct({
        id: 'approx',
        model: 'AP',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 1.0,
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
      makeProduct({ id: 'exact', model: 'EX' }),
    ];
    const results = matchProducts(baseInput, products);
    // exact should come before approximate, approximate before fallback
    const levels = results.map((r) => r.matchLevel);
    const exactIdx = levels.indexOf('exact');
    const approxIdx = levels.indexOf('approximate');
    const fallbackIdx = levels.indexOf('fallback');
    expect(exactIdx).toBeLessThan(approxIdx);
    expect(approxIdx).toBeLessThan(fallbackIdx);
  });

  it('same score → product with datasheetMaterialId ranks higher', () => {
    const products = [
      makeProduct({ id: 'no-datasheet', model: 'ND', datasheetMaterialId: null }),
      makeProduct({ id: 'has-datasheet', model: 'HD', datasheetMaterialId: 'mat-123' }),
    ];
    const results = matchProducts(baseInput, products);
    // Both should be exact with same score; has-datasheet should rank first
    expect(results[0]!.productId).toBe('has-datasheet');
  });

  it('100 products performance: match time < 2000ms', () => {
    const products: ProductForMatching[] = [];
    for (let i = 0; i < 100; i++) {
      products.push(
        makeProduct({
          id: `p-${i}`,
          model: `LP-${i}`,
          params: {
            inputVoltageMin: 85 + Math.random() * 50,
            inputVoltageMax: 200 + Math.random() * 65,
            outputVoltage: 5 + Math.random() * 20,
            outputCurrent: 0.5 + Math.random() * 3,
            applicationType: i % 2 === 0 ? '适配器' : '工业',
            efficiencyLevel: '90%',
            certifications: ['CE'],
            operatingTempMax: 100,
          },
        }),
      );
    }
    const start = Date.now();
    matchProducts(baseInput, products);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });

  // --- TDD edge case tests ---

  it('multi-param deviation (approximate): input voltage OK but output current 80% → approximate with current diff', () => {
    const products = [
      makeProduct({
        id: 'approx-multi',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 1.2, // 80% of required 1.5
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const results = matchProducts(baseInput, products);
    expect(results[0]!.matchLevel).toBe('approximate');
    expect(results[0]!.diffs.some((d) => d.includes('输出电流低于需求'))).toBe(true);
  });

  it('multi-param deviation (fallback): product misses 3+ electrical params → fallback', () => {
    const products = [
      makeProduct({
        id: 'fallback-multi',
        params: {
          // Missing inputVoltageMin, inputVoltageMax, outputVoltage, outputCurrent
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const results = matchProducts(baseInput, products);
    expect(results[0]!.matchLevel).toBe('fallback');
  });

  it('score ordering within same level: higher score ranks first among exact matches', () => {
    const input: SelectionInput = {
      ...baseInput,
      certifications: ['CE', 'RoHS', 'UL'],
    };
    const products = [
      makeProduct({
        id: 'lower-score',
        model: 'LOW',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'], // 2/3 → partial cert score
          operatingTempMax: 125,
        },
      }),
      makeProduct({
        id: 'higher-score',
        model: 'HIGH',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS', 'UL'], // full cert score
          operatingTempMax: 125,
        },
      }),
    ];
    const results = matchProducts(input, products);
    expect(results[0]!.matchLevel).toBe('exact');
    expect(results[1]!.matchLevel).toBe('exact');
    expect(results[0]!.score).toBeGreaterThan(results[1]!.score);
    expect(results[0]!.productId).toBe('higher-score');
  });

  it('same score, different data completeness: product with datasheetMaterialId ranks higher', () => {
    const products = [
      makeProduct({ id: 'no-ds-2', model: 'ND2', datasheetMaterialId: null }),
      makeProduct({ id: 'has-ds-2', model: 'HD2', datasheetMaterialId: 'mat-456' }),
    ];
    const results = matchProducts(baseInput, products);
    expect(results[0]!.score).toBe(results[1]!.score);
    expect(results[0]!.productId).toBe('has-ds-2');
  });

  it('exact match boundary: inputVoltageMin/Max exactly matching user → still exact', () => {
    const products = [
      makeProduct({
        id: 'boundary',
        model: 'BND',
        params: {
          inputVoltageMin: 100, // exactly user's min
          inputVoltageMax: 240, // exactly user's max
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const results = matchProducts(baseInput, products);
    expect(results[0]!.matchLevel).toBe('exact');
  });

  it('application type partial match: exact → 15 pts, containment → partial', () => {
    // Exact application type match
    const exactProducts = [
      makeProduct({
        id: 'app-exact',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const exactResults = matchProducts(baseInput, exactProducts);
    expect(exactResults[0]!.reasons.some((r) => r.includes('应用类型匹配'))).toBe(true);

    // Partial match via keyword containment
    const partialProducts = [
      makeProduct({
        id: 'app-partial',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '电源适配器', // contains "适配器"
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const partialResults = matchProducts(baseInput, partialProducts);
    expect(partialResults[0]!.reasons.some((r) => r.includes('应用类型相似'))).toBe(true);
  });

  it('certifications matching: partial → partial score with diff, full → full score', () => {
    const input: SelectionInput = {
      ...baseInput,
      certifications: ['CE', 'RoHS', 'UL'],
    };

    // Partial: product has 2 of 3 required certs
    const partialProducts = [
      makeProduct({
        id: 'cert-partial',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const partialResults = matchProducts(input, partialProducts);
    expect(partialResults[0]!.diffs.some((d) => d.includes('缺少UL认证'))).toBe(true);

    // Full: product has all 3
    const fullProducts = [
      makeProduct({
        id: 'cert-full',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS', 'UL'],
          operatingTempMax: 125,
        },
      }),
    ];
    const fullResults = matchProducts(input, fullProducts);
    expect(fullResults[0]!.reasons.some((r) => r.includes('认证全部满足'))).toBe(true);
  });

  it('empty products list: returns empty array, no crash', () => {
    const results = matchProducts(baseInput, []);
    expect(results).toEqual([]);
  });

  it('efficiency level matching: product below requirement → deduction, above → full', () => {
    const input: SelectionInput = {
      ...baseInput,
      efficiencyLevel: '95%',
    };

    // Below requirement
    const belowProducts = [
      makeProduct({
        id: 'eff-low',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '适配器',
          efficiencyLevel: '85%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const belowResults = matchProducts(input, belowProducts);
    expect(belowResults[0]!.diffs.some((d) => d.includes('能效等级低于需求'))).toBe(true);

    // Above requirement
    const aboveProducts = [
      makeProduct({
        id: 'eff-high',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 2,
          applicationType: '适配器',
          efficiencyLevel: '96%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const aboveResults = matchProducts(input, aboveProducts);
    expect(aboveResults[0]!.reasons.some((r) => r.includes('能效等级满足需求'))).toBe(true);
  });

  it('Zod validation: inputVoltageMin > inputVoltageMax → ZodError', () => {
    expect(() =>
      selectionInputSchema.parse({
        inputVoltageMin: 240,
        inputVoltageMax: 100,
        outputVoltage: 12,
        outputCurrent: 1.5,
        applicationType: '适配器',
      }),
    ).toThrow(ZodError);
  });

  it('Zod validation: missing required electrical field → ZodError', () => {
    expect(() =>
      selectionInputSchema.parse({
        inputVoltageMin: 100,
        inputVoltageMax: 240,
        // missing outputVoltage and outputCurrent
      }),
    ).toThrow(ZodError);
  });

  it('Zod validation: output voltage/current must be positive', () => {
    expect(() =>
      selectionInputSchema.parse({
        inputVoltageMin: 100,
        inputVoltageMax: 240,
        outputVoltage: 0,
        outputCurrent: 1.5,
      }),
    ).toThrow(ZodError);
    expect(() =>
      selectionInputSchema.parse({
        inputVoltageMin: 100,
        inputVoltageMax: 240,
        outputVoltage: 12,
        outputCurrent: -1,
      }),
    ).toThrow(ZodError);
  });

  it('Zod validation: non-number passed as number field → ZodError', () => {
    expect(() =>
      selectionInputSchema.parse({
        inputVoltageMin: 'not-a-number',
        inputVoltageMax: 240,
        outputVoltage: 12,
        outputCurrent: 1.5,
        applicationType: '适配器',
      }),
    ).toThrow(ZodError);
  });

  it('reasons are user-readable: contain Chinese human-readable strings, not internal codes', () => {
    const products = [makeProduct()];
    const results = matchProducts(baseInput, products);
    expect(results[0]!.reasons.length).toBeGreaterThan(0);
    for (const reason of results[0]!.reasons) {
      expect(reason).toMatch(/[\u4e00-\u9fff]/); // contains Chinese characters
    }
    expect(results[0]!.reasons.some((r) => r.includes('输入电压范围全覆盖'))).toBe(true);
  });

  it('diffs are user-readable: contain Chinese strings with actual values, not internal codes', () => {
    const products = [
      makeProduct({
        id: 'diff-test',
        params: {
          inputVoltageMin: 85,
          inputVoltageMax: 265,
          outputVoltage: 12,
          outputCurrent: 1.0, // lower than required 1.5
          applicationType: '适配器',
          efficiencyLevel: '94%',
          certifications: ['CE', 'RoHS'],
          operatingTempMax: 125,
        },
      }),
    ];
    const results = matchProducts(baseInput, products);
    expect(results[0]!.diffs.length).toBeGreaterThan(0);
    for (const diff of results[0]!.diffs) {
      expect(diff).toMatch(/[\u4e00-\u9fff]/); // contains Chinese characters
    }
    // Should contain actual numeric value, not internal code like "outputCurrent delta: -0.5"
    expect(
      results[0]!.diffs.some((d) => d.includes('输出电流低于需求') && /\d/.test(d)),
    ).toBe(true);
  });
});
