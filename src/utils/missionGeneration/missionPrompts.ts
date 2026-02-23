import type { MissionDifficulty, MissionWorldType } from '@/types/mission';

interface MissionPromptInput {
  worldType: MissionWorldType;
  difficulty: MissionDifficulty;
  seedHint?: string;
}

export function buildMissionGenerationPrompt(input: MissionPromptInput): string {
  const { worldType, difficulty, seedHint } = input;

  return `你是“主神空间副本生成器”。
请生成一个可执行的副本任务，并严格返回 JSON 对象，不要返回 markdown 代码块。

约束：
- worldType 必须是 "${worldType}"
- difficulty 必须是 "${difficulty}"
- 叙事要包含明确生存压力
- 主线任务必须可判定完成/失败
- 支线任务仅1个
- 所有字段必须完整，不可省略

返回结构：
{
  "name": "副本名称",
  "description": "副本背景",
  "timeLimit": 3,
  "survivalCondition": "存活条件",
  "worldRules": {
    "powerSystem": "力量体系",
    "techLevel": "科技水平",
    "socialOrder": "社会秩序",
    "specialRules": ["规则1", "规则2"]
  },
  "mainQuest": {
    "title": "主线任务名",
    "description": "主线任务描述",
    "objectives": ["目标1", "目标2"]
  },
  "sideQuest": {
    "title": "支线任务名",
    "description": "支线任务描述",
    "objectives": ["目标1"]
  },
  "rewardBasePoints": 200
}

${seedHint ? `参考线索：${seedHint}` : ''}`.trim();
}

