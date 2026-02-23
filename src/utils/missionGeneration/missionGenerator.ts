import { aiService } from '@/services/aiService';
import { parseJsonFromText } from '@/utils/jsonExtract';
import { LOCAL_MISSION_TEMPLATES } from '@/data/missionTemplates';
import type { Mission, MissionDifficulty, MissionWorldType } from '@/types/mission';
import { buildMissionGenerationPrompt } from './missionPrompts';
import { normalizeMissionDraftToMission, validateMissionDraft } from './missionValidator';

interface GenerateMissionOptions {
  difficulty?: MissionDifficulty;
  worldType?: MissionWorldType;
  seedHint?: string;
  useAI?: boolean;
}

const pickTemplate = (difficulty: MissionDifficulty, worldType?: MissionWorldType) => {
  const filteredByDifficulty = LOCAL_MISSION_TEMPLATES.filter((tpl) => tpl.difficulty === difficulty);
  const filtered = worldType
    ? filteredByDifficulty.filter((tpl) => tpl.worldType === worldType)
    : filteredByDifficulty;

  if (filtered.length > 0) return filtered[Math.floor(Math.random() * filtered.length)];
  if (filteredByDifficulty.length > 0) return filteredByDifficulty[Math.floor(Math.random() * filteredByDifficulty.length)];
  return LOCAL_MISSION_TEMPLATES[Math.floor(Math.random() * LOCAL_MISSION_TEMPLATES.length)];
};

const createMissionFromTemplate = (difficulty: MissionDifficulty, worldType?: MissionWorldType): Mission => {
  const tpl = pickTemplate(difficulty, worldType);
  const draft = {
    name: tpl.name,
    description: tpl.description,
    timeLimit: tpl.timeLimit,
    survivalCondition: tpl.survivalCondition,
    rewardBasePoints: tpl.rewardBasePoints,
    worldRules: {
      powerSystem: '世界特有',
      techLevel: '中等',
      socialOrder: '多势力对抗',
      specialRules: ['主线任务失败即结算', '副本内资源受限'],
    },
    mainQuest: {
      title: tpl.mainQuestTitle,
      description: tpl.mainQuestDescription,
      objectives: [tpl.mainQuestDescription],
    },
    sideQuest: {
      title: tpl.sideQuestTitle,
      description: tpl.sideQuestDescription,
      objectives: [tpl.sideQuestDescription],
    },
  };

  return normalizeMissionDraftToMission(draft, tpl.worldType, tpl.difficulty);
};

export async function generateMission(options: GenerateMissionOptions = {}): Promise<Mission> {
  const difficulty = options.difficulty ?? 'D';
  const worldType = options.worldType;
  const useAI = options.useAI !== false;

  if (!useAI) return createMissionFromTemplate(difficulty, worldType);

  try {
    const prompt = buildMissionGenerationPrompt({
      difficulty,
      worldType: worldType ?? 'modern',
      seedHint: options.seedHint,
    });

    const response = await aiService.generateRaw({
      usageType: 'world_generation',
      should_stream: false,
      user_input: prompt,
    });

    const draft = parseJsonFromText(response) as Record<string, unknown>;
    const validation = validateMissionDraft(draft);

    if (!validation.ok) {
      console.warn('[missionGenerator] AI副本草稿校验失败，回退模板:', validation.errors);
      return createMissionFromTemplate(difficulty, worldType);
    }

    return normalizeMissionDraftToMission(
      draft,
      worldType ?? 'modern',
      difficulty,
    );
  } catch (error) {
    console.warn('[missionGenerator] AI生成失败，回退模板:', error);
    return createMissionFromTemplate(difficulty, worldType);
  }
}
