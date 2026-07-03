import type { SelectionInput, MatchResult, ProductForMatching, MatchLevel } from './selection.types';

// Scoring weights (total 100): electrical 45 (split into 3×15), application 15, efficiency 15, certification 15, environment 10
const WEIGHT_APPLICATION = 15;
const WEIGHT_EFFICIENCY = 15;
const WEIGHT_CERTIFICATION = 15;
const WEIGHT_ENVIRONMENT = 10;

function getNum(params: Record<string, unknown>, key: string): number | undefined {
  const val = params[key];
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const n = Number(val);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

function getStr(params: Record<string, unknown>, key: string): string | undefined {
  const val = params[key];
  return typeof val === 'string' ? val : undefined;
}

function getStrArr(params: Record<string, unknown>, key: string): string[] {
  const val = params[key];
  return Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : [];
}

function scoreElectrical(
  input: SelectionInput,
  params: Record<string, unknown>,
): { score: number; reasons: string[]; diffs: string[]; fullyCovers: boolean } {
  const reasons: string[] = [];
  const diffs: string[] = [];
  let score = 0;
  let fullyCovers = true;

  const pInMin = getNum(params, 'inputVoltageMin');
  const pInMax = getNum(params, 'inputVoltageMax');
  const pOutV = getNum(params, 'outputVoltage');
  const pOutI = getNum(params, 'outputCurrent');

  // Input voltage range coverage
  if (pInMin !== undefined && pInMax !== undefined) {
    if (pInMin <= input.inputVoltageMin && pInMax >= input.inputVoltageMax) {
      score += 15;
      reasons.push('输入电压范围全覆盖');
    } else {
      fullyCovers = false;
      if (pInMin > input.inputVoltageMin) {
        diffs.push(`输入电压下限高于需求 ${pInMin - input.inputVoltageMin}V`);
      }
      if (pInMax < input.inputVoltageMax) {
        diffs.push(`输入电压上限低于需求 ${input.inputVoltageMax - pInMax}V`);
      }
      // Partial credit: proportional overlap
      const overlap = Math.max(0, Math.min(pInMax, input.inputVoltageMax) - Math.max(pInMin, input.inputVoltageMin));
      const reqRange = input.inputVoltageMax - input.inputVoltageMin;
      score += reqRange > 0 ? Math.round((overlap / reqRange) * 15) : 0;
    }
  } else {
    fullyCovers = false;
    diffs.push('缺少输入电压范围参数');
  }

  // Output voltage
  if (pOutV !== undefined) {
    if (pOutV >= input.outputVoltage) {
      score += 15;
      reasons.push('输出电压满足需求');
    } else {
      fullyCovers = false;
      score += Math.round((pOutV / input.outputVoltage) * 15);
      diffs.push(`输出电压低于需求 ${input.outputVoltage - pOutV}V`);
    }
  } else {
    fullyCovers = false;
    diffs.push('缺少输出电压参数');
  }

  // Output current
  if (pOutI !== undefined) {
    if (pOutI >= input.outputCurrent) {
      score += 15;
      reasons.push('输出电流满足需求');
    } else {
      fullyCovers = false;
      score += Math.round((pOutI / input.outputCurrent) * 15);
      diffs.push(`输出电流低于需求 ${(input.outputCurrent - pOutI).toFixed(2)}A`);
    }
  } else {
    fullyCovers = false;
    diffs.push('缺少输出电流参数');
  }

  return { score, reasons, diffs, fullyCovers };
}

function scoreApplication(
  input: SelectionInput,
  params: Record<string, unknown>,
): { score: number; reasons: string[]; diffs: string[] } {
  const reasons: string[] = [];
  const diffs: string[] = [];
  const pApp = getStr(params, 'applicationType');

  if (!input.applicationType) {
    return { score: WEIGHT_APPLICATION, reasons: ['未指定应用类型，默认满足'], diffs };
  }

  if (pApp === undefined) {
    return { score: 0, reasons, diffs: ['缺少应用类型参数'] };
  }

  if (pApp === input.applicationType) {
    return { score: WEIGHT_APPLICATION, reasons: [`应用类型匹配: ${pApp}`], diffs };
  }

  // Keyword containment check (either direction)
  if (
    pApp.includes(input.applicationType) ||
    input.applicationType.includes(pApp)
  ) {
    return { score: 7, reasons: [`应用类型相似: ${pApp}`], diffs };
  }

  diffs.push(`应用类型不匹配: 产品为${pApp}，需求为${input.applicationType}`);
  return { score: 0, reasons, diffs };
}

function scoreEfficiency(
  input: SelectionInput,
  params: Record<string, unknown>,
): { score: number; reasons: string[]; diffs: string[] } {
  const reasons: string[] = [];
  const diffs: string[] = [];

  // If user didn't specify efficiency requirement → neutral, full score
  if (!input.efficiencyLevel && input.standbyPowerMax === undefined) {
    return { score: WEIGHT_EFFICIENCY, reasons: ['未指定能效要求，默认满足'], diffs };
  }

  let score = 0;
  let hasRequirement = false;

  if (input.efficiencyLevel) {
    hasRequirement = true;
    const pEff = getStr(params, 'efficiencyLevel');
    if (pEff !== undefined) {
      // Extract numeric percentage for comparison
      const userPct = Number(input.efficiencyLevel.replace(/[^0-9.]/g, ''));
      const prodPct = Number(pEff.replace(/[^0-9.]/g, ''));
      if (!Number.isNaN(userPct) && !Number.isNaN(prodPct)) {
        if (prodPct >= userPct) {
          score += 8;
          reasons.push('能效等级满足需求');
        } else {
          score += Math.round((prodPct / userPct) * 8);
          diffs.push(`能效等级低于需求: 产品${pEff}，需求${input.efficiencyLevel}`);
        }
      } else if (pEff === input.efficiencyLevel) {
        score += 8;
        reasons.push('能效等级满足需求');
      } else {
        diffs.push(`能效等级不匹配: 产品${pEff}，需求${input.efficiencyLevel}`);
      }
    } else {
      diffs.push('缺少能效等级参数');
    }
  }

  if (input.standbyPowerMax !== undefined) {
    hasRequirement = true;
    const pStandby = getNum(params, 'standbyPower');
    if (pStandby !== undefined) {
      if (pStandby <= input.standbyPowerMax) {
        score += 7;
        reasons.push('待机功耗满足需求');
      } else {
        score += Math.round((input.standbyPowerMax / pStandby) * 7);
        diffs.push(`待机功耗高于需求: 产品${pStandby}W，需求≤${input.standbyPowerMax}W`);
      }
    } else {
      diffs.push('缺少待机功耗参数');
    }
  }

  // If only one sub-dimension was specified, scale to full 15
  if (hasRequirement && score < WEIGHT_EFFICIENCY) {
    // Already proportional, leave as-is
  }

  return { score: Math.min(score, WEIGHT_EFFICIENCY), reasons, diffs };
}

function scoreCertification(
  input: SelectionInput,
  params: Record<string, unknown>,
): { score: number; reasons: string[]; diffs: string[] } {
  const reasons: string[] = [];
  const diffs: string[] = [];

  if (!input.certifications || input.certifications.length === 0) {
    return { score: WEIGHT_CERTIFICATION, reasons: ['未指定认证要求，默认满足'], diffs };
  }

  const pCerts = getStrArr(params, 'certifications');
  if (pCerts.length === 0) {
    return { score: 0, reasons, diffs: ['缺少认证参数'] };
  }

  const required = input.certifications;
  const matched = required.filter((c) =>
    pCerts.some((pc) => pc.toUpperCase() === c.toUpperCase()),
  );
  const missing = required.filter(
    (c) => !pCerts.some((pc) => pc.toUpperCase() === c.toUpperCase()),
  );

  if (matched.length === required.length) {
    return { score: WEIGHT_CERTIFICATION, reasons: ['认证全部满足'], diffs };
  }

  if (matched.length > 0) {
    reasons.push(`部分认证满足: ${matched.join(', ')}`);
  }
  for (const m of missing) {
    diffs.push(`缺少${m}认证`);
  }

  return {
    score: Math.round((matched.length / required.length) * WEIGHT_CERTIFICATION),
    reasons,
    diffs,
  };
}

function scoreEnvironment(
  input: SelectionInput,
  params: Record<string, unknown>,
): { score: number; reasons: string[]; diffs: string[] } {
  const reasons: string[] = [];
  const diffs: string[] = [];

  // If user didn't specify any environment/size requirement → full score
  if (
    input.maxAmbientTemp === undefined &&
    input.pcbaSize === undefined
  ) {
    return { score: WEIGHT_ENVIRONMENT, reasons: ['未指定环境尺寸要求，默认满足'], diffs };
  }

  let score = 0;
  let dimensions = 0;

  if (input.maxAmbientTemp !== undefined) {
    dimensions++;
    const pTempMax = getNum(params, 'operatingTempMax');
    if (pTempMax !== undefined) {
      if (pTempMax >= input.maxAmbientTemp) {
        score += 5;
        reasons.push('工作温度满足需求');
      } else {
        score += Math.round((pTempMax / input.maxAmbientTemp) * 5);
        diffs.push(`最高工作温度低于需求: 产品${pTempMax}°C，需求≥${input.maxAmbientTemp}°C`);
      }
    } else {
      diffs.push('缺少最高工作温度参数');
    }
  }

  if (input.pcbaSize !== undefined) {
    dimensions++;
    const pWidth = getNum(params, 'packageSizeWidth');
    const pHeight = getNum(params, 'packageSizeHeight');
    const pSize = getStr(params, 'packageSize');

    if (pWidth !== undefined && pHeight !== undefined) {
      if (pWidth <= input.pcbaSize.width && pHeight <= input.pcbaSize.height) {
        score += 5;
        reasons.push('封装尺寸满足需求');
      } else {
        // Partial: check if at least one dimension fits
        const wFits = pWidth <= input.pcbaSize.width;
        const hFits = pHeight <= input.pcbaSize.height;
        if (wFits || hFits) {
          score += 2;
        }
        if (!wFits) diffs.push(`封装宽度超出需求: 产品${pWidth}mm，需求≤${input.pcbaSize.width}mm`);
        if (!hFits) diffs.push(`封装高度超出需求: 产品${pHeight}mm，需求≤${input.pcbaSize.height}mm`);
      }
    } else if (pSize !== undefined) {
      // Try to parse "WxH" format
      const match = pSize.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
      if (match) {
        const w = Number(match[1]);
        const h = Number(match[2]);
        if (w <= input.pcbaSize.width && h <= input.pcbaSize.height) {
          score += 5;
          reasons.push('封装尺寸满足需求');
        } else {
          if (w > input.pcbaSize.width) diffs.push(`封装宽度超出需求: 产品${w}mm，需求≤${input.pcbaSize.width}mm`);
          if (h > input.pcbaSize.height) diffs.push(`封装高度超出需求: 产品${h}mm，需求≤${input.pcbaSize.height}mm`);
          score += 2;
        }
      } else {
        diffs.push('封装尺寸格式无法解析');
      }
    } else {
      diffs.push('缺少封装尺寸参数');
    }
  }

  // Scale to full 10 if only one dimension was checked
  if (dimensions === 1 && score > 0) {
    score = Math.min(Math.round((score / 5) * WEIGHT_ENVIRONMENT), WEIGHT_ENVIRONMENT);
  }

  return { score: Math.min(score, WEIGHT_ENVIRONMENT), reasons, diffs };
}

// Electrical score threshold: if electrical score < 20/45, product is fallback
// regardless of optional dimension inflation from unspecified user requirements
const ELECTRICAL_FALLBACK_THRESHOLD = 20;

function determineMatchLevel(
  score: number,
  electricalFullyCovers: boolean,
  electricalScore: number,
): MatchLevel {
  if (electricalFullyCovers && score >= 80) return 'exact';
  if (score >= 50 && electricalScore >= ELECTRICAL_FALLBACK_THRESHOLD) return 'approximate';
  return 'fallback';
}

export function matchProducts(
  input: SelectionInput,
  products: ProductForMatching[],
): MatchResult[] {
  const results: MatchResult[] = [];

  for (const product of products) {
    // Non-ACTIVE products are excluded (defensive — repository already filters)
    if (product.status !== 'ACTIVE') continue;

    const params = product.params;

    const electrical = scoreElectrical(input, params);
    const application = scoreApplication(input, params);
    const efficiency = scoreEfficiency(input, params);
    const certification = scoreCertification(input, params);
    const environment = scoreEnvironment(input, params);

    const totalScore =
      electrical.score +
      application.score +
      efficiency.score +
      certification.score +
      environment.score;

    const matchLevel = determineMatchLevel(totalScore, electrical.fullyCovers, electrical.score);

    results.push({
      productId: product.id,
      model: product.model,
      series: product.series,
      params: product.params,
      advantages: product.advantages,
      datasheetMaterialId: product.datasheetMaterialId,
      matchLevel,
      score: totalScore,
      reasons: [...electrical.reasons, ...application.reasons, ...efficiency.reasons, ...certification.reasons, ...environment.reasons],
      diffs: [...electrical.diffs, ...application.diffs, ...efficiency.diffs, ...certification.diffs, ...environment.diffs],
    });
  }

  // Sort: exact > approximate > fallback, then score DESC, then datasheet completeness
  const levelOrder: Record<MatchLevel, number> = { exact: 0, approximate: 1, fallback: 2 };

  results.sort((a, b) => {
    if (levelOrder[a.matchLevel] !== levelOrder[b.matchLevel]) {
      return levelOrder[a.matchLevel] - levelOrder[b.matchLevel];
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // Same score → product with datasheet ranks higher
    const aHasDatasheet = products.find((p) => p.id === a.productId)?.datasheetMaterialId != null;
    const bHasDatasheet = products.find((p) => p.id === b.productId)?.datasheetMaterialId != null;
    return (bHasDatasheet ? 1 : 0) - (aHasDatasheet ? 1 : 0);
  });

  // If no exact or approximate found, return top 3 fallback
  const hasExactOrApprox = results.some((r) => r.matchLevel !== 'fallback');
  if (!hasExactOrApprox && results.length > 0) {
    return results.slice(0, 3);
  }

  // Return exact + approximate results (fallback only if no better found)
  return results.filter((r) => r.matchLevel !== 'fallback').concat(
    results.filter((r) => r.matchLevel === 'fallback').slice(0, 3),
  );
}
