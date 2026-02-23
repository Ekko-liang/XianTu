/**
 * @fileoverview 灵魂成长结算计算器（兼容旧模块名称）
 *
 * 历史说明：
 * - 旧版用于“修炼速度”计算。
 * - 现版用于“副本结算灵魂成长”估算，并保留原导出函数名与结果结构，避免旧模块崩溃。
 */

import type {
  CultivationSpeedFactors,
  CultivationSpeedResult,
} from '@/types/game';
import { calculateSoulGrowth } from '@/utils/reincarnatorProgress';

export interface SixSiData {
  根骨: number;
  灵性: number;
  悟性: number;
  气运: number;
  魅力: number;
  心性: number;
}

export interface StatusEffect {
  状态名称: string;
  类型: 'buff' | 'debuff';
  强度?: number;
  状态描述?: string;
}

export interface CultivationSpeedInput {
  // 兼容旧字段
  灵气浓度: number;
  先天六司: SixSiData;
  后天六司: SixSiData;
  当前效果?: StatusEffect[];
  功法品质?: string;
  修炼进度?: number;
  当前境界: string;
  当前阶段: string;
  当前进度: number;
  下一级所需: number;
  环境加成?: number;

  // 新体系字段（可选）
  副本难度?: string;
  通关系数?: number;
  评价系数?: number;
  特殊事件权重?: number[];
  世界规则修正?: number;
}

interface InternalBreakthroughTime {
  境界名称: string;
  阶段: string;
  最短月数: number;
  标准月数: number;
  最长月数: number;
}

const DIFFICULTY_BASE_GROWTH: Record<string, number> = {
  D: 10,
  C: 30,
  B: 80,
  A: 180,
  S: 380,
  SS: 900,
  SSS: 2000,
};

const LEGACY_REALM_TO_DIFFICULTY: Array<{ matcher: RegExp; difficulty: keyof typeof DIFFICULTY_BASE_GROWTH }> = [
  { matcher: /(凡人|候选|新人)/i, difficulty: 'D' },
  { matcher: /(练气|见习)/i, difficulty: 'C' },
  { matcher: /(筑基|正式)/i, difficulty: 'B' },
  { matcher: /(金丹|资深)/i, difficulty: 'A' },
  { matcher: /(元婴|精英)/i, difficulty: 'S' },
  { matcher: /(化神|传说)/i, difficulty: 'SS' },
  { matcher: /(炼虚|合体|渡劫|超越)/i, difficulty: 'SSS' },
];

const TECHNIQUE_QUALITY_BONUS: Record<string, number> = {
  普通: 0.03,
  精良: 0.06,
  稀有: 0.1,
  史诗: 0.16,
  传说: 0.24,
  神话: 0.3,
  黄: 0.04,
  玄: 0.08,
  地: 0.12,
  天: 0.18,
  仙: 0.24,
  神: 0.3,
  凡: 0,
};

export const SIX_SI_WEIGHTS = {
  根骨: 0.2,
  灵性: 0.2,
  悟性: 0.2,
  心性: 0.15,
  气运: 0.15,
  魅力: 0.1,
} as const;

/**
 * 兼容旧字段名“灵气浓度”：
 * 在无限流体系中，该值可理解为当前场景危险度/压强（1-100）。
 */
export const SPIRIT_DENSITY_RANGES = [
  { min: 1, max: 20, minFactor: 0.85, maxFactor: 0.95, desc: '低压区（收益偏低）' },
  { min: 21, max: 40, minFactor: 0.95, maxFactor: 1.05, desc: '常规区（风险可控）' },
  { min: 41, max: 60, minFactor: 1.05, maxFactor: 1.15, desc: '高压区（收益上升）' },
  { min: 61, max: 80, minFactor: 1.15, maxFactor: 1.3, desc: '极限区（高风险高收益）' },
  { min: 81, max: 100, minFactor: 1.3, maxFactor: 1.5, desc: '死亡边缘区（波动极大）' },
] as const;

/**
 * 兼容旧结构，字段名保留“月数”：
 * 在无限流语境下视为“副本结算批次”的经验标尺。
 */
export const REALM_BREAKTHROUGH_STANDARDS: InternalBreakthroughTime[] = [
  { 境界名称: 'D', 阶段: '晋升C', 最短月数: 1, 标准月数: 2, 最长月数: 4 },
  { 境界名称: 'C', 阶段: '晋升B', 最短月数: 2, 标准月数: 3, 最长月数: 6 },
  { 境界名称: 'B', 阶段: '晋升A', 最短月数: 3, 标准月数: 4, 最长月数: 8 },
  { 境界名称: 'A', 阶段: '晋升S', 最短月数: 4, 标准月数: 5, 最长月数: 10 },
  { 境界名称: 'S', 阶段: '晋升SS', 最短月数: 5, 标准月数: 6, 最长月数: 12 },
  { 境界名称: 'SS', 阶段: '晋升SSS', 最短月数: 6, 标准月数: 8, 最长月数: 16 },
];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  const t = clamp((value - inMin) / Math.max(1, inMax - inMin), 0, 1);
  return outMin + t * (outMax - outMin);
}

function normalizeDifficultyLabel(value: string): keyof typeof DIFFICULTY_BASE_GROWTH {
  const upper = String(value || '').trim().toUpperCase();
  if (upper in DIFFICULTY_BASE_GROWTH) return upper as keyof typeof DIFFICULTY_BASE_GROWTH;

  for (const item of LEGACY_REALM_TO_DIFFICULTY) {
    if (item.matcher.test(value)) return item.difficulty;
  }

  return 'D';
}

function normalizeStageLabel(value: string): string {
  const text = String(value || '').trim();
  if (!text) return '';
  if (/初期|一星|1星/.test(text)) return '一星';
  if (/中期|二星|2星/.test(text)) return '二星';
  if (/后期|三星|3星/.test(text)) return '三星';
  if (/圆满|四星|4星/.test(text)) return '四星';
  if (/极境|五星|5星/.test(text)) return '五星';
  return text;
}

function calculateWeightedSixSi(sixSi: SixSiData): number {
  return (
    sixSi.根骨 * SIX_SI_WEIGHTS.根骨
    + sixSi.灵性 * SIX_SI_WEIGHTS.灵性
    + sixSi.悟性 * SIX_SI_WEIGHTS.悟性
    + sixSi.心性 * SIX_SI_WEIGHTS.心性
    + sixSi.气运 * SIX_SI_WEIGHTS.气运
    + sixSi.魅力 * SIX_SI_WEIGHTS.魅力
  );
}

export function calculateInnateSixSiFactor(sixSi: SixSiData): number {
  const weighted = calculateWeightedSixSi(sixSi);
  return lerp(weighted, 0, 10, 0.85, 1.25);
}

export function calculateAcquiredSixSiFactor(sixSi: SixSiData): number {
  const weighted = calculateWeightedSixSi(sixSi);
  return lerp(weighted, 0, 20, 0, 0.35);
}

export function calculateCombinedSixSiFactor(
  innateSixSi: SixSiData,
  acquiredSixSi: SixSiData,
): { innate: number; acquired: number; combined: number } {
  const innate = calculateInnateSixSiFactor(innateSixSi);
  const acquired = calculateAcquiredSixSiFactor(acquiredSixSi);
  const combined = clamp((innate * 0.8) + ((1 + acquired) * 0.2), 0.7, 1.6);
  return { innate, acquired, combined };
}

export function calculateSpiritDensityFactor(density: number): number {
  const value = clamp(Number(density) || 1, 1, 100);
  for (const range of SPIRIT_DENSITY_RANGES) {
    if (value >= range.min && value <= range.max) {
      return lerp(value, range.min, range.max, range.minFactor, range.maxFactor);
    }
  }
  return 1;
}

export function getSpiritDensityDescription(density: number): string {
  const value = clamp(Number(density) || 1, 1, 100);
  for (const range of SPIRIT_DENSITY_RANGES) {
    if (value >= range.min && value <= range.max) return range.desc;
  }
  return '常规区（风险可控）';
}

export function calculateStatusEffectFactor(effects: StatusEffect[]): number {
  if (!effects || effects.length === 0) return 1;

  let factor = 1;
  for (const effect of effects) {
    const intensity = clamp(Number(effect.强度 ?? 50), 0, 100) / 100;
    const delta = intensity * 0.2;
    factor += effect.类型 === 'buff' ? delta : -delta;
  }

  return clamp(factor, 0.7, 1.4);
}

export function calculateTechniqueBonus(quality: string, proficiency: number): number {
  const base = TECHNIQUE_QUALITY_BONUS[String(quality).trim()] ?? 0;
  const progress = clamp(Number(proficiency) || 0, 0, 100) / 100;
  return base * progress;
}

function estimateBreakthroughTime(
  realm: string,
  stage: string,
  remainingProgress: number,
  settlementGain: number,
): string {
  if (settlementGain <= 0 || remainingProgress <= 0) return '已满足晋升条件';

  const normalized = normalizeDifficultyLabel(realm);
  const standard = REALM_BREAKTHROUGH_STANDARDS.find((item) => item.境界名称 === normalized);
  const stageLabel = normalizeStageLabel(stage);
  if (!standard) {
    const settlements = Math.ceil(remainingProgress / settlementGain);
    return `约${settlements}次副本结算`;
  }

  const scale = clamp(remainingProgress / 100, 0, 10);
  const estimatedByStandard = Math.ceil(standard.标准月数 * scale);
  const estimatedByGain = Math.ceil(remainingProgress / settlementGain);
  let estimated = Math.max(1, Math.min(estimatedByStandard, estimatedByGain));

  if (stageLabel === '四星' || stageLabel === '五星') {
    estimated = Math.max(1, estimated - 1);
    return `约${estimated}次副本结算（已达四星门槛）`;
  }
  return `约${estimated}次副本结算`;
}

function getSpecialEventMultiplier(weights: number[]): number {
  if (!weights.length) return 1;
  return weights.reduce((acc, weight) => {
    const safeWeight = Number(weight);
    const normalized = Number.isFinite(safeWeight) ? Math.max(0.8, Math.min(1.8, safeWeight)) : 1;
    return acc * normalized;
  }, 1);
}

export function calculateCultivationSpeed(input: CultivationSpeedInput): CultivationSpeedResult {
  const effects = input.当前效果 ?? [];
  const rank = normalizeDifficultyLabel(input.副本难度 ?? input.当前境界);
  const baseValue = DIFFICULTY_BASE_GROWTH[rank];

  const spiritDensityFactor = calculateSpiritDensityFactor(input.灵气浓度);
  const sixSiResult = calculateCombinedSixSiFactor(input.先天六司, input.后天六司);
  const statusFactor = calculateStatusEffectFactor(effects);
  const techniqueBonus = input.功法品质 ? calculateTechniqueBonus(input.功法品质, input.修炼进度 ?? 0) : 0;
  const environmentBonus = clamp(Number(input.环境加成 ?? 0), 0, 0.5);
  const worldRuleBonus = clamp(Number(input.世界规则修正 ?? 0), -0.3, 0.5);

  const inferredDifficultyFactor = clamp(
    Number(input.通关系数 ?? (spiritDensityFactor * statusFactor * (1 + environmentBonus))),
    0.1,
    1.8,
  );

  const inferredEvaluationFactor = clamp(
    Number(
      input.评价系数
      ?? (sixSiResult.combined * (1 + techniqueBonus + Math.max(0, worldRuleBonus))),
    ),
    0.1,
    1.8,
  );

  const specialWeights = Array.isArray(input.特殊事件权重) ? input.特殊事件权重 : [];
  const specialEventMultiplier = getSpecialEventMultiplier(specialWeights);

  const finalGrowth = calculateSoulGrowth({
    baseValue,
    difficultyFactor: inferredDifficultyFactor,
    evaluationFactor: inferredEvaluationFactor,
    specialEventWeights: specialWeights,
  });

  const combinedFactor = inferredDifficultyFactor * inferredEvaluationFactor * specialEventMultiplier;
  const remaining = Math.max(0, Number(input.下一级所需 ?? 0) - Number(input.当前进度 ?? 0));

  return {
    基础速度: baseValue,
    综合系数: Number(combinedFactor.toFixed(4)),
    最终速度: Number(finalGrowth.toFixed(4)),
    预计突破时间: estimateBreakthroughTime(input.当前境界, input.当前阶段, remaining, finalGrowth),
    因子详情: {
      // 字段名保留以兼容历史UI，语义已切换为“副本结算因子”
      灵气浓度系数: Number(inferredDifficultyFactor.toFixed(4)),
      先天六司系数: Number(sixSiResult.innate.toFixed(4)),
      后天六司系数: Number(sixSiResult.acquired.toFixed(4)),
      状态效果系数: Number(statusFactor.toFixed(4)),
      功法加成系数: Number((techniqueBonus + Math.max(0, worldRuleBonus)).toFixed(4)),
      环境加成系数: Number((environmentBonus + Math.max(0, worldRuleBonus)).toFixed(4)),
    } as CultivationSpeedFactors,
  };
}

export function getBreakthroughStandard(realm: string, stage: string): InternalBreakthroughTime | undefined {
  const rank = normalizeDifficultyLabel(realm);
  const stageLabel = String(stage || '');
  const exact = REALM_BREAKTHROUGH_STANDARDS.find((item) => item.境界名称 === rank && item.阶段 === stageLabel);
  if (exact) return exact;
  return REALM_BREAKTHROUGH_STANDARDS.find((item) => item.境界名称 === rank);
}

export function validateCultivationProgress(
  realm: string,
  stage: string,
  progressGain: number,
  elapsedMonths: number,
  speed: number,
): { valid: boolean; reason: string } {
  const standard = getBreakthroughStandard(realm, stage);
  if (!standard) return { valid: true, reason: '未匹配标准，按默认通过' };

  const theoreticalMax = ((100 / Math.max(1, standard.最短月数)) * Math.max(0.1, speed)) * Math.max(1, elapsedMonths);
  if (progressGain > theoreticalMax * 1.3) {
    return {
      valid: false,
      reason: `增长过快：${progressGain.toFixed(2)} > 允许上限 ${theoreticalMax.toFixed(2)}`,
    };
  }

  return { valid: true, reason: '增长区间合理' };
}
