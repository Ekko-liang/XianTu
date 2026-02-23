import type { MissionDifficulty, MissionResult } from '@/types/mission';
import type { ReincarnatorDifficultyStats, ReincarnatorRank, SoulGrowthInput } from '@/types/reincarnator';

export const RANK_SOUL_RANGES: Record<ReincarnatorRank, { min: number; max: number }> = {
  D: { min: 0, max: 99 },
  C: { min: 100, max: 500 },
  B: { min: 501, max: 2000 },
  A: { min: 2001, max: 7000 },
  S: { min: 7001, max: 20000 },
  SS: { min: 20001, max: 60000 },
  SSS: { min: 60001, max: 120000 },
};

export const PROMOTION_REQUIREMENTS: Record<
  Exclude<ReincarnatorRank, 'SSS'>,
  { minStar: 4 | 5; minMissions: number; points: number }
> = {
  D: { minStar: 4, minMissions: 2, points: 500 },
  C: { minStar: 4, minMissions: 3, points: 2000 },
  B: { minStar: 4, minMissions: 4, points: 8000 },
  A: { minStar: 4, minMissions: 5, points: 30000 },
  S: { minStar: 4, minMissions: 6, points: 100000 },
  SS: { minStar: 4, minMissions: 8, points: 300000 },
};

export const RANK_ORDER: ReincarnatorRank[] = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];
const DIFFICULTY_ORDER: MissionDifficulty[] = ['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'];

export const getNextRank = (rank: ReincarnatorRank): ReincarnatorRank | null => {
  const index = RANK_ORDER.indexOf(rank);
  if (index < 0 || index >= RANK_ORDER.length - 1) return null;
  return RANK_ORDER[index + 1];
};

export const getRankFromSoulStrength = (value: number): ReincarnatorRank => {
  const soul = Number.isFinite(value) ? value : 0;
  const matched = RANK_ORDER.find((rank) => {
    const range = RANK_SOUL_RANGES[rank];
    return soul >= range.min && soul <= range.max;
  });
  return matched ?? 'SSS';
};

export const getSoulProgressPercent = (rank: ReincarnatorRank, soulStrength: number): number => {
  const range = RANK_SOUL_RANGES[rank];
  const total = range.max - range.min;
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, ((soulStrength - range.min) / total) * 100));
};

export const getStarFromSoulStrength = (rank: ReincarnatorRank, soulStrength: number): 1 | 2 | 3 | 4 | 5 => {
  const percent = getSoulProgressPercent(rank, soulStrength);
  if (percent >= 95) return 5;
  if (percent >= 70) return 4;
  if (percent >= 45) return 3;
  if (percent >= 20) return 2;
  return 1;
};

export const formatStarText = (star: number): string => {
  const clamped = Math.max(1, Math.min(5, Math.floor(star)));
  return `${'★'.repeat(clamped)}${'☆'.repeat(5 - clamped)}`;
};

export const getBaseSoulGrowthByDifficulty = (difficulty: string): number => {
  const map: Record<string, number> = {
    D: 10,
    C: 30,
    B: 80,
    A: 180,
    S: 380,
    SS: 900,
    SSS: 2000,
  };
  return map[difficulty] ?? 10;
};

export const createEmptyDifficultyStats = (): ReincarnatorDifficultyStats => ({
  D: 0,
  C: 0,
  B: 0,
  A: 0,
  S: 0,
  SS: 0,
  SSS: 0,
});

export const normalizeMissionDifficulty = (value: unknown): MissionDifficulty => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return (DIFFICULTY_ORDER.includes(normalized as MissionDifficulty) ? normalized : 'D') as MissionDifficulty;
};

export const isDifficultyAtLeast = (difficulty: MissionDifficulty, baseline: ReincarnatorRank): boolean => {
  return DIFFICULTY_ORDER.indexOf(difficulty) >= DIFFICULTY_ORDER.indexOf(baseline as MissionDifficulty);
};

export const normalizeDifficultyStats = (stats: unknown): ReincarnatorDifficultyStats => {
  const base = createEmptyDifficultyStats();
  if (!stats || typeof stats !== 'object') return base;
  for (const difficulty of DIFFICULTY_ORDER) {
    const n = Number((stats as Record<string, unknown>)[difficulty] ?? 0);
    base[difficulty] = Math.max(0, Math.floor(Number.isFinite(n) ? n : 0));
  }
  return base;
};

export const buildDifficultyStatsFromHistory = (history: MissionResult[] | null | undefined): ReincarnatorDifficultyStats => {
  const stats = createEmptyDifficultyStats();
  const list = Array.isArray(history) ? history : [];
  for (const mission of list) {
    if (!mission || mission.success !== true) continue;
    const difficulty = normalizeMissionDifficulty((mission as any).difficulty);
    stats[difficulty] += 1;
  }
  return stats;
};

export const incrementDifficultyStats = (
  stats: ReincarnatorDifficultyStats,
  missionDifficulty: unknown,
  success: boolean,
): ReincarnatorDifficultyStats => {
  const normalized = normalizeDifficultyStats(stats);
  if (!success) return normalized;
  const difficulty = normalizeMissionDifficulty(missionDifficulty);
  normalized[difficulty] += 1;
  return normalized;
};

export const getEffectiveMissionCountForRank = (
  stats: ReincarnatorDifficultyStats,
  level: ReincarnatorRank,
): number => {
  const normalized = normalizeDifficultyStats(stats);
  return DIFFICULTY_ORDER
    .filter((difficulty) => isDifficultyAtLeast(difficulty, level))
    .reduce((total, difficulty) => total + normalized[difficulty], 0);
};

export const calculateSoulGrowth = (input: SoulGrowthInput): number => {
  const baseValue = Math.max(0, Number(input.baseValue) || 0);
  const difficultyFactor = Math.max(0, Number(input.difficultyFactor) || 0);
  const evaluationFactor = Math.max(0, Number(input.evaluationFactor) || 0);
  const weights = Array.isArray(input.specialEventWeights) ? input.specialEventWeights : [];

  const specialEventMultiplier = weights.length
    ? weights.reduce((acc, weight) => {
        const safeWeight = Number(weight);
        const normalized = Number.isFinite(safeWeight) ? Math.max(0.8, Math.min(1.8, safeWeight)) : 1;
        return acc * normalized;
      }, 1)
    : 1;

  return Math.max(0, Math.round(baseValue * difficultyFactor * evaluationFactor * specialEventMultiplier));
};

export const canTriggerPromotionTrial = (input: {
  level: ReincarnatorRank;
  star: 1 | 2 | 3 | 4 | 5;
  effectiveMissionCount: number;
  promotionPoints: number;
}): { ok: boolean; target: ReincarnatorRank | null } => {
  if (input.level === 'SSS') return { ok: false, target: null };
  const requirement = PROMOTION_REQUIREMENTS[input.level as Exclude<ReincarnatorRank, 'SSS'>];
  const target = getNextRank(input.level);
  if (!requirement || !target) return { ok: false, target: null };

  const ok =
    input.star >= requirement.minStar
    && input.effectiveMissionCount >= requirement.minMissions
    && input.promotionPoints >= requirement.points;

  return { ok, target };
};
