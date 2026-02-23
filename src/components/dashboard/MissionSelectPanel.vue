<template>
  <div class="mission-select-panel">
    <div class="header">
      <h2>副本传送门</h2>
      <button class="generate-btn" :disabled="missionStore.isGenerating || promotionTrialPending" @click="generateMissions">
        {{ missionStore.isGenerating ? '生成中...' : '刷新副本' }}
      </button>
    </div>

    <p class="sub-title">主神会分配与当前阶段匹配的副本，请谨慎选择。</p>
    <p class="recommend">当前推荐难度：{{ recommendedDifficulty }}</p>
    <p class="recommend">有效副本进度：{{ effectiveMissionProgressText }}</p>
    <p class="recommend">晋升资格点：{{ promotionPointsProgressText }}</p>

    <div v-if="promotionTrialPending" class="promotion-trial">
      <div class="trial-title">晋升试炼已触发</div>
      <div class="trial-desc">
        你已满足晋升条件，下一次传送将强制进入 {{ currentLevel }}→{{ pendingPromotionTarget }} 试炼。
      </div>
      <button class="trial-btn" @click="startPromotionTrial">进入晋升试炼</button>
    </div>

    <div v-if="missionStore.availableMissions.length === 0" class="empty">
      暂无可用副本，请先生成任务。
    </div>

    <div v-else class="mission-list">
      <button
        v-for="mission in missionStore.availableMissions"
        :key="mission.id"
        class="mission-card"
        @click="openBriefing(mission.id)"
      >
        <div class="mission-head">
          <span class="name">{{ mission.name }}</span>
          <span class="badge">{{ mission.difficulty }}</span>
        </div>
        <p class="desc">{{ mission.description }}</p>
        <div class="meta">
          <span>类型：{{ worldTypeLabel(mission.worldType) }}</span>
          <span>时限：{{ mission.timeLimit || '无' }}天</span>
          <span>基础神点：{{ mission.rewards.basePoints }}</span>
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMissionStore } from '@/stores/missionStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import type { Mission, MissionDifficulty, MissionWorldType } from '@/types/mission';
import { PROMOTION_REQUIREMENTS, getEffectiveMissionCountForRank, normalizeDifficultyStats } from '@/utils/reincarnatorProgress';
import { toast } from '@/utils/toast';

const router = useRouter();
const missionStore = useMissionStore();
const gameStateStore = useGameStateStore();

const recommendedDifficulty = computed<MissionDifficulty>(() => {
  const rank = gameStateStore.reincarnator?.level ?? 'D';
  const map: Record<string, MissionDifficulty> = {
    D: 'D',
    C: 'C',
    B: 'B',
    A: 'A',
    S: 'S',
    SS: 'SS',
    SSS: 'SSS',
  };
  return map[rank] ?? 'D';
});

const promotionTrialPending = computed(() => gameStateStore.reincarnator?.promotionTrialPending === true);
const pendingPromotionTarget = computed(() => gameStateStore.reincarnator?.pendingPromotionTarget ?? null);
const currentLevel = computed(() => gameStateStore.reincarnator?.level ?? 'D');
const promotionRequirement = computed(() => {
  if (currentLevel.value === 'SSS') return null;
  return PROMOTION_REQUIREMENTS[currentLevel.value as keyof typeof PROMOTION_REQUIREMENTS] ?? null;
});
const effectiveMissionProgressText = computed(() => {
  if (!promotionRequirement.value) return '当前等级无需再触发晋升条件';
  const stats = normalizeDifficultyStats(gameStateStore.reincarnator?.effectiveMissionCountByDifficulty);
  const count = getEffectiveMissionCountForRank(stats, currentLevel.value);
  return `${count} / ${promotionRequirement.value.minMissions}`;
});
const promotionPointsProgressText = computed(() => {
  if (!promotionRequirement.value) return '--';
  const points = Math.max(0, Number(gameStateStore.reincarnator?.promotionPoints ?? 0));
  return `${points} / ${promotionRequirement.value.points}`;
});

const worldTypeLabel = (value: MissionWorldType) => {
  const map: Record<MissionWorldType, string> = {
    xianxia: '古典异能(兼容)',
    apocalypse: '末日',
    horror: '恐怖',
    sci_fi: '科幻',
    fantasy: '奇幻',
    martial_arts: '武侠',
    modern: '现代',
    history: '历史',
  };
  return map[value] ?? value;
};

const generateMissions = async () => {
  await missionStore.generateAvailableMissions(3, recommendedDifficulty.value);
  gameStateStore.updateHubState({
    availableMissions: missionStore.availableMissions,
  });
};

const openBriefing = (missionId: string) => {
  if (promotionTrialPending.value) {
    toast.warning('晋升试炼待触发，需先完成试炼');
    return;
  }
  missionStore.selectMission(missionId);
  gameStateStore.setCurrentMission(missionStore.currentMission);
  gameStateStore.setGamePhase('hub');
  router.push('/game/mission-briefing');
};

const startPromotionTrial = () => {
  if (!promotionTrialPending.value || !pendingPromotionTarget.value) return;

  const missionId = `trial_${Date.now()}`;
  const trialMission: Mission = {
    id: missionId,
    name: `${currentLevel.value}→${pendingPromotionTarget.value} 晋升试炼`,
    worldType: 'horror',
    difficulty: recommendedDifficulty.value,
    description: '主神强制触发的个人试炼，队友无法介入，必须独立完成。',
    worldRules: {
      powerSystem: '高压适应',
      techLevel: '未知',
      socialOrder: '封闭试炼场',
      specialRules: ['禁止队友介入', '仅可使用个人能力配置', '失败将导致灵魂强度回退'],
    },
    mainQuest: {
      id: `${missionId}_main`,
      title: '通过晋升试炼',
      description: '在主神构建的高压场景中完成核心目标并保持存活。',
      objectives: [
        { id: `${missionId}_obj_1`, description: '在试炼场景中保持存活', completed: false },
        { id: `${missionId}_obj_2`, description: '完成主神指定核心目标', completed: false },
      ],
      reward: { points: 0 },
      isHidden: false,
      completed: false,
    },
    sideQuests: [],
    timeLimit: 1,
    survivalCondition: '玩家本人存活且完成核心目标',
    rewards: {
      basePoints: 0,
      bonusPoints: 0,
      items: [],
      abilities: [],
      evaluationBonus: 0,
    },
    penalties: {
      death: '试炼失败',
      failure: '灵魂强度回退并记录失败次数',
    },
    participants: [{ id: 'player', name: '玩家', role: 'player', status: 'alive' }],
    status: 'briefing',
    specialEvents: [],
    day: 1,
  };

  missionStore.setCurrentMission(trialMission);
  gameStateStore.setCurrentMission(trialMission);
  gameStateStore.setGamePhase('mission');
  router.push('/game/mission-briefing');
};

onMounted(async () => {
  if (missionStore.availableMissions.length === 0 && (gameStateStore.hubState?.availableMissions?.length ?? 0) > 0) {
    missionStore.syncFromGameState({
      availableMissions: gameStateStore.hubState.availableMissions,
      currentMission: gameStateStore.currentMission,
      missionHistory: gameStateStore.missionHistory,
    });
  }

  if (missionStore.availableMissions.length === 0) {
    await generateMissions();
  }
});
</script>

<style scoped>
.mission-select-panel {
  padding: 16px;
  color: var(--color-text);
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.header h2 {
  margin: 0;
  font-size: 20px;
}

.generate-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
}

.sub-title {
  margin: 10px 0 6px;
  color: var(--color-text-secondary);
}

.recommend {
  margin: 0 0 14px;
  color: var(--color-primary);
  font-size: 13px;
}

.promotion-trial {
  margin-bottom: 14px;
  border: 1px solid rgba(var(--color-warning-rgb), 0.5);
  background: rgba(var(--color-warning-rgb), 0.12);
  border-radius: 10px;
  padding: 12px;
  display: grid;
  gap: 6px;
}

.trial-title {
  font-weight: 700;
  color: var(--color-warning);
}

.trial-desc {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.trial-btn {
  justify-self: start;
  border: 1px solid rgba(var(--color-warning-rgb), 0.5);
  background: rgba(var(--color-warning-rgb), 0.15);
  color: var(--color-warning);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}

.empty {
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  padding: 18px;
  color: var(--color-text-secondary);
  text-align: center;
}

.mission-list {
  display: grid;
  gap: 12px;
}

.mission-card {
  text-align: left;
  width: 100%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  border-radius: 10px;
  padding: 12px;
  cursor: pointer;
}

.mission-card:hover {
  border-color: var(--color-primary);
}

.mission-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.name {
  font-weight: 700;
}

.badge {
  font-size: 12px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 2px 8px;
}

.desc {
  margin: 0 0 8px;
  color: var(--color-text-secondary);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
