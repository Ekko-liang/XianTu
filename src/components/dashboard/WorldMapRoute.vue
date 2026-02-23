<template>
  <div class="world-map-route">
    <div v-if="isHub" class="hub-wrap">
      <HubMapPanel />
    </div>

    <div v-else class="mission-wrap">
      <aside class="tracker">
        <h3>副本目标追踪</h3>
        <div v-if="!mission" class="empty">当前无进行中副本。</div>
        <template v-else>
          <div class="mission-head">
            <strong>{{ mission.name }}</strong>
            <span>{{ mission.difficulty }} · 第{{ mission.day }}天</span>
          </div>
          <div class="objective-summary">
            <span>目标进度</span>
            <strong>{{ completedObjectives }}/{{ totalObjectives }}</strong>
          </div>

          <div class="objective-section">
            <h4>主线</h4>
            <label v-for="(obj, index) in mission.mainQuest.objectives" :key="obj.id" class="objective-row">
              <input type="checkbox" :checked="obj.completed" @change="setMainObjective(index, !obj.completed)" />
              <span :class="{ done: obj.completed }">{{ obj.description }}</span>
            </label>
          </div>

          <div class="objective-section" v-if="mission.sideQuests.length > 0">
            <h4>支线</h4>
            <div v-for="(quest, qIndex) in mission.sideQuests" :key="quest.id" class="quest-block">
              <div class="quest-title">{{ quest.title }}</div>
              <label v-for="(obj, oIndex) in quest.objectives" :key="obj.id" class="objective-row">
                <input type="checkbox" :checked="obj.completed" @change="setSideObjective(qIndex, oIndex, !obj.completed)" />
                <span :class="{ done: obj.completed }">{{ obj.description }}</span>
              </label>
            </div>
          </div>

          <div class="tracker-actions">
            <button @click="advanceMissionDay">推进一天</button>
            <button @click="toggleMapMode">{{ showTextMode ? '图形地图' : '文本地图' }}</button>
          </div>
        </template>
      </aside>

      <main class="map-main">
        <GameMapPanel v-if="!showTextMode" :is-online="isOnlineTraveling" @toggle-text-mode="showTextMode = true" />
        <OnlineTravelMapPanel v-else @toggle-graphic-mode="showTextMode = false" />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { useMissionStore } from '@/stores/missionStore';
import GameMapPanel from '@/components/dashboard/GameMapPanel.vue';
import HubMapPanel from '@/components/dashboard/HubMapPanel.vue';
import OnlineTravelMapPanel from '@/components/dashboard/OnlineTravelMapPanel.vue';

const gameStateStore = useGameStateStore();
const missionStore = useMissionStore();
const showTextMode = ref(false);

const isHub = computed(() => gameStateStore.gamePhase === 'hub');
const mission = computed(() => gameStateStore.currentMission as any);
const totalObjectives = computed(() => {
  if (!mission.value) return 0;
  const mainCount = Array.isArray(mission.value.mainQuest?.objectives) ? mission.value.mainQuest.objectives.length : 0;
  const sideCount = Array.isArray(mission.value.sideQuests)
    ? mission.value.sideQuests.reduce((sum: number, quest: any) => sum + (Array.isArray(quest?.objectives) ? quest.objectives.length : 0), 0)
    : 0;
  return mainCount + sideCount;
});
const completedObjectives = computed(() => {
  if (!mission.value) return 0;
  const mainDone = Array.isArray(mission.value.mainQuest?.objectives)
    ? mission.value.mainQuest.objectives.filter((obj: any) => obj?.completed === true).length
    : 0;
  const sideDone = Array.isArray(mission.value.sideQuests)
    ? mission.value.sideQuests.reduce(
        (sum: number, quest: any) => sum + (Array.isArray(quest?.objectives) ? quest.objectives.filter((obj: any) => obj?.completed === true).length : 0),
        0,
      )
    : 0;
  return mainDone + sideDone;
});

const isOnlineTraveling = computed(() => {
  const online = gameStateStore.onlineState as any;
  return online?.模式 === '联机' && !!online?.房间ID;
});

const applyMissionUpdate = (nextMission: any) => {
  if (!nextMission || typeof nextMission !== 'object') return;
  const now = new Date().toISOString();
  const normalizedMain = {
    ...nextMission.mainQuest,
    completed: Array.isArray(nextMission.mainQuest?.objectives)
      ? nextMission.mainQuest.objectives.every((obj: any) => obj?.completed === true)
      : false,
  };
  const normalizedSides = Array.isArray(nextMission.sideQuests)
    ? nextMission.sideQuests.map((quest: any) => ({
        ...quest,
        completed: Array.isArray(quest?.objectives) ? quest.objectives.every((obj: any) => obj?.completed === true) : false,
      }))
    : [];
  const objectiveLog = [
    ...(Array.isArray(nextMission.mainQuest?.objectives)
      ? nextMission.mainQuest.objectives.map((obj: any) => ({
          objectiveId: obj?.id ?? '',
          progress: obj?.completed ? 1 : 0,
          target: 1,
          updatedAt: now,
          note: obj?.description ?? '',
          completed: obj?.completed === true,
          scope: 'main',
        }))
      : []),
    ...(Array.isArray(nextMission.sideQuests)
      ? nextMission.sideQuests.flatMap((quest: any) =>
          Array.isArray(quest?.objectives)
            ? quest.objectives.map((obj: any) => ({
                objectiveId: obj?.id ?? '',
                progress: obj?.completed ? 1 : 0,
                target: 1,
                updatedAt: now,
                note: obj?.description ?? '',
                completed: obj?.completed === true,
                scope: `side:${quest?.id ?? 'unknown'}`,
              }))
            : [],
        )
      : []),
  ];
  const normalizedMission = {
    ...nextMission,
    mainQuest: normalizedMain,
    sideQuests: normalizedSides,
    临时状态: {
      ...((nextMission as any).临时状态 || {}),
      objectiveLog,
    },
  };

  gameStateStore.setCurrentMission(normalizedMission);
  missionStore.setCurrentMission(normalizedMission);
};

const setMainObjective = (index: number, completed: boolean) => {
  if (!mission.value) return;
  const next = {
    ...mission.value,
    mainQuest: {
      ...mission.value.mainQuest,
      objectives: mission.value.mainQuest.objectives.map((obj: any, i: number) =>
        i === index ? { ...obj, completed } : obj,
      ),
    },
  } as any;
  applyMissionUpdate(next);
};

const setSideObjective = (questIndex: number, objectiveIndex: number, completed: boolean) => {
  if (!mission.value) return;
  const next = {
    ...mission.value,
    sideQuests: mission.value.sideQuests.map((quest: any, q: number) => {
      if (q !== questIndex) return quest;
      return {
        ...quest,
        objectives: quest.objectives.map((obj: any, o: number) => (o === objectiveIndex ? { ...obj, completed } : obj)),
      };
    }),
  } as any;
  applyMissionUpdate(next);
};

const advanceMissionDay = () => {
  if (!mission.value) return;
  const nextDay = Math.max(1, Number(mission.value.day ?? 1) + 1);
  applyMissionUpdate({ ...mission.value, day: nextDay } as any);
};

const toggleMapMode = () => {
  showTextMode.value = !showTextMode.value;
};
</script>

<style scoped>
.world-map-route {
  width: 100%;
  height: 100%;
}
.hub-wrap,
.mission-wrap {
  width: 100%;
  height: 100%;
}
.mission-wrap {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 10px;
}
.tracker {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 12px;
  display: grid;
  gap: 10px;
  color: var(--color-text);
  overflow: auto;
}
.tracker h3 {
  margin: 0;
}
.empty {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 10px;
  color: var(--color-text-secondary);
}
.mission-head {
  display: grid;
  gap: 3px;
}
.objective-summary {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.mission-head span {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.objective-section {
  display: grid;
  gap: 6px;
}
.objective-section h4 {
  margin: 0;
  font-size: 13px;
}
.quest-block {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  display: grid;
  gap: 6px;
}
.quest-title {
  font-weight: 700;
  font-size: 13px;
}
.objective-row {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 13px;
}
.done {
  text-decoration: line-through;
  opacity: 0.7;
}
.tracker-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tracker-actions button {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-light);
  color: var(--color-text);
  padding: 6px 10px;
  cursor: pointer;
}
.map-main {
  min-width: 0;
}
@media (max-width: 960px) {
  .mission-wrap {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
}
</style>
