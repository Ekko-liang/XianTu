<template>
  <div class="mission-history-panel">
    <div class="header">
      <h2>副本记录</h2>
      <span class="count">共 {{ missionHistory.length }} 条</span>
    </div>

    <div v-if="missionHistory.length === 0" class="empty">
      尚无副本结算记录，完成首个副本后会在此归档。
    </div>

    <div v-else class="list">
      <div v-for="(item, index) in missionHistory" :key="item.missionId + '_' + index" class="record" :class="{ fail: !item.success }">
        <div class="top">
          <span class="mid">{{ item.missionId }}</span>
          <span class="status">{{ item.success ? '成功' : '失败' }}</span>
        </div>
        <div class="meta">
          <span>神点：{{ item.pointsGained }}</span>
          <span>灵魂：{{ item.soulGrowth }}</span>
          <span>评分：{{ item.rating }}</span>
        </div>
        <div class="time">{{ formatTime(item.finishedAt) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';

const gameStateStore = useGameStateStore();
const missionHistory = computed(() => gameStateStore.missionHistory ?? []);

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
</script>

<style scoped>
.mission-history-panel {
  padding: 16px;
  color: var(--color-text);
  display: grid;
  gap: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  margin: 0;
}

.count {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.empty {
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  padding: 12px;
  color: var(--color-text-secondary);
}

.list {
  display: grid;
  gap: 8px;
}

.record {
  border: 1px solid rgba(var(--color-success-rgb), 0.4);
  background: rgba(var(--color-success-rgb), 0.08);
  border-radius: 10px;
  padding: 10px;
  display: grid;
  gap: 6px;
}

.record.fail {
  border-color: rgba(var(--color-error-rgb), 0.35);
  background: rgba(var(--color-error-rgb), 0.08);
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.mid {
  font-weight: 700;
}

.status {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.time {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>

