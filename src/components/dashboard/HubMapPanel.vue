<template>
  <div class="hub-map-panel">
    <h2>主神空间地图</h2>
    <p class="hint">固定据点功能区，可在副本之间休整。</p>

    <div class="grid">
      <button
        v-for="area in areas"
        :key="area.id"
        class="area-card"
        :class="{ locked: !isUnlocked(area.id) }"
        :disabled="!isUnlocked(area.id)"
        @click="enterArea(area.id)"
      >
        <div class="name">{{ area.name }}</div>
        <div class="desc">{{ area.desc }}</div>
        <div class="status">{{ isUnlocked(area.id) ? '已解锁' : '未解锁' }}</div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useGameStateStore } from '@/stores/gameStateStore';

const gameStateStore = useGameStateStore();
const router = useRouter();

const areas = [
  { id: 'exchange', name: '兑换大厅', desc: '消耗神点购买物资和能力。' },
  { id: 'training', name: '训练场', desc: '练习能力并测试配置。' },
  { id: 'terminal', name: '信息终端', desc: '查看副本历史和规则。' },
  { id: 'social', name: '社交区', desc: '与轮回者沟通、组队。' },
  { id: 'portal', name: '副本传送门', desc: '选择并进入下一次任务。' },
];

const unlockedAreas = computed(() => gameStateStore.hubState?.unlockedAreas ?? []);
const isUnlocked = (areaId: string) => unlockedAreas.value.includes(areaId);

const areaRouteMap: Record<string, string> = {
  exchange: '/game/exchange',
  training: '/game/ability-tree',
  terminal: '/game/mission-history',
  social: '/game/team',
  portal: '/game/mission-select',
};

const enterArea = (areaId: string) => {
  const path = areaRouteMap[areaId];
  if (!path) return;
  router.push(path);
};
</script>

<style scoped>
.hub-map-panel {
  padding: 16px;
  color: var(--color-text);
}

h2 {
  margin: 0 0 8px;
}

.hint {
  margin: 0 0 12px;
  color: var(--color-text-secondary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.area-card {
  text-align: left;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 12px;
  cursor: pointer;
}

.area-card.locked {
  opacity: 0.55;
  cursor: not-allowed;
}

.area-card:disabled {
  opacity: 0.55;
}

.area-card:not(:disabled):hover {
  border-color: var(--color-primary);
}

.name {
  font-weight: 700;
}

.desc {
  color: var(--color-text-secondary);
  font-size: 13px;
  margin: 6px 0;
}

.status {
  font-size: 12px;
}
</style>
