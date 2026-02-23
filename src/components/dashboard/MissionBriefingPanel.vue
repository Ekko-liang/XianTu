<template>
  <div class="briefing-panel">
    <h2>副本简报</h2>

    <div v-if="!mission" class="empty">
      当前没有已选择的副本，请先前往副本传送门选择任务。
    </div>

    <div v-else class="briefing-content">
      <div class="line">
        <span class="label">副本：</span>
        <span>{{ mission.name }}</span>
      </div>
      <div class="line">
        <span class="label">难度：</span>
        <span>{{ mission.difficulty }}</span>
      </div>
      <div class="line">
        <span class="label">背景：</span>
        <span>{{ mission.description }}</span>
      </div>
      <div class="line">
        <span class="label">主线：</span>
        <span>{{ mission.mainQuest.title }} - {{ mission.mainQuest.description }}</span>
      </div>
      <div class="line">
        <span class="label">生存条件：</span>
        <span>{{ mission.survivalCondition }}</span>
      </div>
      <div class="line">
        <span class="label">基础奖励：</span>
        <span>{{ mission.rewards.basePoints }} 神点</span>
      </div>

      <div class="actions">
        <button class="secondary" @click="backToSelect">返回副本列表</button>
        <button class="danger" @click="cancelMission">放弃任务</button>
        <button class="primary" @click="enterMission">传送进入</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useMissionStore } from '@/stores/missionStore';
import { useGameStateStore } from '@/stores/gameStateStore';

const router = useRouter();
const missionStore = useMissionStore();
const gameStateStore = useGameStateStore();

const mission = computed(() => missionStore.currentMission ?? gameStateStore.currentMission);

const syncMissionToGameState = () => {
  gameStateStore.setCurrentMission(missionStore.currentMission);
  gameStateStore.updateHubState({
    availableMissions: missionStore.availableMissions,
  });
};

const backToSelect = () => {
  router.push('/game/mission-select');
};

const cancelMission = () => {
  missionStore.clearCurrentMission();
  gameStateStore.setCurrentMission(null);
  gameStateStore.setGamePhase('hub');
  router.push('/game/mission-select');
};

const enterMission = () => {
  if (!missionStore.currentMission) return;
  missionStore.activateCurrentMission();
  syncMissionToGameState();
  gameStateStore.setGamePhase('mission');
  router.push('/game');
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
.briefing-panel {
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

.briefing-content {
  display: grid;
  gap: 10px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 14px;
  background: var(--color-surface);
}

.line {
  display: flex;
  gap: 8px;
  line-height: 1.5;
}

.label {
  min-width: 84px;
  color: var(--color-text-secondary);
}

.actions {
  margin-top: 6px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

button {
  border-radius: 8px;
  padding: 8px 12px;
  cursor: pointer;
  border: 1px solid var(--color-border);
}

.primary {
  background: var(--color-primary);
  color: #fff;
  border-color: var(--color-primary);
}

.secondary {
  background: var(--color-surface-light);
  color: var(--color-text);
}

.danger {
  background: transparent;
  color: #dc2626;
  border-color: rgba(220, 38, 38, 0.4);
}
</style>
