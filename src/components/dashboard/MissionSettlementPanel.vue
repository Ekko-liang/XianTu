<template>
  <div class="settlement-panel">
    <h2>副本结算</h2>

    <div v-if="!mission" class="empty">当前没有可结算的副本。</div>

    <div v-else class="content">
      <div class="summary">
        <div><span class="label">副本：</span>{{ mission.name }}</div>
        <div><span class="label">状态：</span>{{ mission.status }}</div>
        <div><span class="label">基础神点：</span>{{ mission.rewards.basePoints }}</div>
        <div><span class="label">团队影响：</span>{{ teamImpactText }}</div>
      </div>

      <div class="actions">
        <button class="fail" @click="settleFailure">结算失败</button>
        <button class="success" @click="settleSuccess">结算成功</button>
      </div>
    </div>

    <div v-if="latestResult" class="result-card">
      <div><span class="label">最近记录：</span>{{ latestResult.success ? '成功' : '失败' }}</div>
      <div><span class="label">神点：</span>{{ latestResult.pointsGained }}</div>
      <div><span class="label">灵魂增长：</span>{{ latestResult.soulGrowth }}</div>
      <div><span class="label">评分：</span>{{ latestResult.rating }}</div>
      <div v-if="latestResult.teamImpact"><span class="label">队伍影响：</span>{{ formatTeamImpact(latestResult.teamImpact) }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMissionStore } from '@/stores/missionStore';
import { useGameStateStore } from '@/stores/gameStateStore';
import { calculateSoulGrowth, getBaseSoulGrowthByDifficulty } from '@/utils/reincarnatorProgress';
import { toast } from '@/utils/toast';

const router = useRouter();
const missionStore = useMissionStore();
const gameStateStore = useGameStateStore();

const mission = computed(() => missionStore.currentMission ?? gameStateStore.currentMission);
const latestResult = computed(() => missionStore.missionHistory[0] ?? gameStateStore.missionHistory[0] ?? null);
const isPromotionTrial = computed(() => String(mission.value?.id ?? '').startsWith('trial_'));

const teamImpact = computed(() => {
  const members = gameStateStore.teamState?.members ?? [];
  const deathCount = members.filter((m) => m.status === 'dead').length;
  const betrayCount = members.filter((m) => m.status === 'betrayed').length;
  const cooperationEvents = ((gameStateStore.teamState as any)?.teamEvents ?? []).filter((e: any) => e.type === 'cooperate').length;

  return {
    deathCount,
    betrayCount,
    cooperationBonus: cooperationEvents,
  };
});

const teamImpactText = computed(() => formatTeamImpact(teamImpact.value));

const formatTeamImpact = (impact: { deathCount?: number; betrayCount?: number; cooperationBonus?: number }) => {
  return `阵亡 ${impact.deathCount ?? 0} / 背叛 ${impact.betrayCount ?? 0} / 协作加成 ${impact.cooperationBonus ?? 0}`;
};

const calcSettlementAdjustments = (success: boolean) => {
  const impact = teamImpact.value;
  const deathPenalty = (impact.deathCount ?? 0) * 15;
  const betrayPenalty = (impact.betrayCount ?? 0) * 20;
  const coopBonus = (impact.cooperationBonus ?? 0) * 6;

  const ratingBase = success ? 82 : 38;
  const rating = Math.max(0, Math.min(100, ratingBase - deathPenalty - betrayPenalty + coopBonus));

  const pointsDelta = success
    ? (coopBonus * 4) - (deathPenalty * 3) - (betrayPenalty * 4)
    : (coopBonus * 2) - (deathPenalty * 2) - (betrayPenalty * 3);

  return {
    rating,
    pointsDelta,
    impact,
  };
};

const syncBackToHub = () => {
  gameStateStore.setCurrentMission(null);
  gameStateStore.updateHubState({
    availableMissions: missionStore.availableMissions,
  });
  gameStateStore.setGamePhase('hub');
  missionStore.clearCurrentMission();
  router.push('/game/mission-select');
};

const settleSuccess = () => {
  if (!mission.value) return;
  const eventWeights = mission.value.specialEvents?.map((event) => event.weight) ?? [];
  const adjustments = calcSettlementAdjustments(true);

  const soulGrowth = calculateSoulGrowth({
    baseValue: getBaseSoulGrowthByDifficulty(mission.value.difficulty),
    difficultyFactor: 1,
    evaluationFactor: Math.max(0.6, adjustments.rating / 80),
    specialEventWeights: eventWeights,
  });

  const pointsGained = Math.max(0, mission.value.rewards.basePoints + Math.max(0, mission.value.rewards.bonusPoints) + adjustments.pointsDelta);
  const result = missionStore.markMissionCompleted({
    pointsGained,
    soulGrowth,
    rating: adjustments.rating,
    teamImpact: adjustments.impact,
    summary: `成功结算，${teamImpactText.value}`,
  });

  if (result) {
    if (isPromotionTrial.value) {
      gameStateStore.appendMissionHistory(result);
      const trialResult = gameStateStore.resolvePromotionTrial(true);
      if (trialResult.ok) toast.success(trialResult.message);
      else toast.warning(trialResult.message);
    } else {
      gameStateStore.applyMissionSettlement(result);
      toast.success(`结算成功，获得 ${pointsGained} 神点`);
    }
  }
  syncBackToHub();
};

const settleFailure = () => {
  if (!mission.value) return;
  const eventWeights = mission.value.specialEvents?.map((event) => event.weight) ?? [];
  const adjustments = calcSettlementAdjustments(false);

  const soulGrowth = calculateSoulGrowth({
    baseValue: getBaseSoulGrowthByDifficulty(mission.value.difficulty),
    difficultyFactor: 0.1,
    evaluationFactor: Math.max(0.2, adjustments.rating / 100),
    specialEventWeights: eventWeights,
  });

  const pointsGained = Math.max(0, Math.floor(mission.value.rewards.basePoints * 0.2) + adjustments.pointsDelta);
  const result = missionStore.markMissionFailed({
    pointsGained,
    soulGrowth,
    rating: adjustments.rating,
    teamImpact: adjustments.impact,
    summary: `失败结算，${teamImpactText.value}`,
  });

  if (result) {
    if (isPromotionTrial.value) {
      gameStateStore.appendMissionHistory(result);
      const trialResult = gameStateStore.resolvePromotionTrial(false);
      if (trialResult.ok) toast.warning(trialResult.message);
      else toast.warning(trialResult.message);
    } else {
      gameStateStore.applyMissionSettlement(result);
      toast.warning(`结算失败，保留 ${pointsGained} 神点`);
    }
  }
  syncBackToHub();
};

onMounted(() => {
  missionStore.syncFromGameState({
    availableMissions: gameStateStore.hubState?.availableMissions ?? [],
    currentMission: gameStateStore.currentMission,
    missionHistory: gameStateStore.missionHistory,
  });
});
</script>

<style scoped>
.settlement-panel {
  padding: 16px;
  color: var(--color-text);
}

h2 {
  margin: 0 0 12px;
}

.empty {
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  padding: 16px;
  color: var(--color-text-secondary);
}

.content {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  background: var(--color-surface);
}

.summary {
  display: grid;
  gap: 6px;
}

.label {
  color: var(--color-text-secondary);
  margin-right: 6px;
}

.actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

button {
  border-radius: 8px;
  border: 1px solid var(--color-border);
  padding: 8px 12px;
  cursor: pointer;
}

.success {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.fail {
  color: #b91c1c;
  border-color: rgba(185, 28, 28, 0.4);
  background: transparent;
}

.result-card {
  margin-top: 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  background: var(--color-surface-light);
  display: grid;
  gap: 4px;
}
</style>
