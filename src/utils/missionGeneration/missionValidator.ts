import type { Mission, MissionDifficulty, MissionWorldType } from '@/types/mission';

interface MissionDraft {
  name?: unknown;
  description?: unknown;
  timeLimit?: unknown;
  survivalCondition?: unknown;
  rewardBasePoints?: unknown;
  worldRules?: {
    powerSystem?: unknown;
    techLevel?: unknown;
    socialOrder?: unknown;
    specialRules?: unknown;
  };
  mainQuest?: {
    title?: unknown;
    description?: unknown;
    objectives?: unknown;
  };
  sideQuest?: {
    title?: unknown;
    description?: unknown;
    objectives?: unknown;
  };
}

export interface MissionValidationResult {
  ok: boolean;
  errors: string[];
}

const ensureString = (value: unknown, fallback: string) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const ensureStringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];

const ensurePositiveNumber = (value: unknown, fallback: number) => {
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? Math.floor(num) : fallback;
};

export function validateMissionDraft(draft: MissionDraft): MissionValidationResult {
  const errors: string[] = [];

  if (!ensureString(draft.name, '')) errors.push('缺少副本名称');
  if (!ensureString(draft.description, '')) errors.push('缺少副本描述');
  if (!ensureString(draft.survivalCondition, '')) errors.push('缺少存活条件');

  if (!draft.mainQuest) errors.push('缺少主线任务');
  if (!draft.sideQuest) errors.push('缺少支线任务');

  if (!draft.worldRules) errors.push('缺少世界规则');

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function normalizeMissionDraftToMission(
  draft: MissionDraft,
  worldType: MissionWorldType,
  difficulty: MissionDifficulty,
): Mission {
  const now = new Date().toISOString();
  const missionId = `mission_${Date.now()}`;

  const mainObjectives = ensureStringArray(draft.mainQuest?.objectives);
  const sideObjectives = ensureStringArray(draft.sideQuest?.objectives);

  return {
    id: missionId,
    name: ensureString(draft.name, '未知副本'),
    worldType,
    difficulty,
    description: ensureString(draft.description, '主神发布了一项未知任务。'),
    worldRules: {
      powerSystem: ensureString(draft.worldRules?.powerSystem, '未知'),
      techLevel: ensureString(draft.worldRules?.techLevel, '未知'),
      socialOrder: ensureString(draft.worldRules?.socialOrder, '未知'),
      specialRules: ensureStringArray(draft.worldRules?.specialRules),
    },
    mainQuest: {
      id: `${missionId}_main`,
      title: ensureString(draft.mainQuest?.title, '主线任务'),
      description: ensureString(draft.mainQuest?.description, '完成主神指定目标。'),
      objectives: (mainObjectives.length ? mainObjectives : ['完成主线目标']).map((description, index) => ({
        id: `${missionId}_main_obj_${index + 1}`,
        description,
        completed: false,
      })),
      reward: {
        points: ensurePositiveNumber(draft.rewardBasePoints, 100),
      },
      isHidden: false,
      completed: false,
    },
    sideQuests: [
      {
        id: `${missionId}_side_1`,
        title: ensureString(draft.sideQuest?.title, '支线任务'),
        description: ensureString(draft.sideQuest?.description, '探索隐藏线索。'),
        objectives: (sideObjectives.length ? sideObjectives : ['完成可选目标']).map((description, index) => ({
          id: `${missionId}_side_obj_${index + 1}`,
          description,
          completed: false,
        })),
        reward: {
          points: Math.floor(ensurePositiveNumber(draft.rewardBasePoints, 100) * 0.3),
        },
        isHidden: false,
        completed: false,
      },
    ],
    timeLimit: ensurePositiveNumber(draft.timeLimit, 3),
    survivalCondition: ensureString(draft.survivalCondition, '活到副本结束'),
    rewards: {
      basePoints: ensurePositiveNumber(draft.rewardBasePoints, 100),
      bonusPoints: 0,
      items: [],
      abilities: [],
      evaluationBonus: 0,
    },
    penalties: {
      death: '抹杀',
      failure: '扣除神点并降低评价',
    },
    participants: [
      {
        id: 'player',
        name: '玩家',
        role: 'player',
        status: 'alive',
      },
    ],
    status: 'briefing',
    specialEvents: [
      {
        type: 'critical_choice',
        description: '副本初始化',
        weight: 1,
        timestamp: now,
      },
    ],
    day: 1,
  };
}

