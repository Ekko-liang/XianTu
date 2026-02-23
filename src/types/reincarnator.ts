export type ReincarnatorRank = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
export type ReincarnatorDifficultyStats = Record<ReincarnatorRank, number>;

export interface ReincarnatorBaseAttributes {
  STR: number;
  PER: number;
  INT: number;
  LUK: number;
  CHA: number;
  WIL: number;
}

export interface ReincarnatorPair {
  current: number;
  max: number;
}

export interface ReincarnatorVitals {
  HP: ReincarnatorPair;
  EP: ReincarnatorPair;
  MP: ReincarnatorPair;
}

/** 金手指状态：创角选择后可进阶 */
export interface GoldenFingerState {
  id: number;
  name: string;
  currentLevel: '未激活' | ReincarnatorRank;
  advancePath: ('未激活' | ReincarnatorRank)[];
}

export interface ReincarnatorProfile {
  level: ReincarnatorRank;
  soulStrength: number;
  soulStrengthCapMultiplier: number;
  star: 1 | 2 | 3 | 4 | 5;
  missionCount: number;
  effectiveMissionCountByDifficulty: ReincarnatorDifficultyStats;
  survivalRate: number;
  promotionPoints: number;
  promotionFailureStreak: number;
  promotionTrialFailures: number;
  promotionTrialPending: boolean;
  pendingPromotionTarget: ReincarnatorRank | null;
  godPoints: number;
  abilities: string[];
  attributes: ReincarnatorBaseAttributes;
  vitals: ReincarnatorVitals;
  /** 金手指：创角时选择，D级/未激活起步 */
  goldenFinger?: GoldenFingerState | null;
}

export interface SoulGrowthInput {
  baseValue: number;
  difficultyFactor: number;
  evaluationFactor: number;
  specialEventWeights?: number[];
}
