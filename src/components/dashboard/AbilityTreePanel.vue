<template>
  <div class="ability-tree-panel">
    <div class="header">
      <h2>能力树</h2>
      <div class="points">神点：{{ reincarnator.godPoints }}</div>
    </div>
    <p class="hint">能力树替代旧成长路径。解锁后能力可携带进副本。</p>

    <div class="branches">
      <div v-for="branch in branches" :key="branch.id" class="branch">
        <h3>{{ branch.name }}</h3>
        <p class="branch-desc">{{ branch.description }}</p>
        <div class="nodes">
          <div
            v-for="node in branch.nodes"
            :key="node.id"
            class="node"
            :class="{ unlocked: isUnlocked(node.id), locked: !canUnlock(node.id) && !isUnlocked(node.id) }"
          >
            <div class="node-name">{{ node.name }}</div>
            <div class="node-desc">{{ node.description }}</div>
            <div v-if="node.prerequisites?.length" class="node-prereq">
              前置：{{ formatPrerequisites(node.prerequisites) }}
            </div>
            <div class="node-meta">
              <span>消耗 {{ node.cost }}</span>
              <button :disabled="isUnlocked(node.id) || !canUnlock(node.id)" @click="unlock(node.id, node.cost)">
                {{ isUnlocked(node.id) ? '已解锁' : canUnlock(node.id) ? '解锁' : '前置未满足' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';
import { INFINITE_ABILITY_TREE_BRANCHES, getInfiniteAbilityNodeById } from '@/data/thousandDaoData';

const gameStateStore = useGameStateStore();
const reincarnator = computed(() => gameStateStore.reincarnator);

const branches = INFINITE_ABILITY_TREE_BRANCHES;

const isUnlocked = (abilityId: string) => {
  return reincarnator.value.abilities?.includes(abilityId) ?? false;
};

const canUnlock = (abilityId: string) => {
  const node = getInfiniteAbilityNodeById(abilityId);
  if (!node) return false;
  if (!node.prerequisites || node.prerequisites.length === 0) return true;
  return node.prerequisites.every((reqId) => isUnlocked(reqId));
};

const formatPrerequisites = (ids: string[]) => {
  return ids
    .map((id) => getInfiniteAbilityNodeById(id)?.name || id)
    .join('、');
};

const unlock = (abilityId: string, cost: number) => {
  const result = gameStateStore.unlockAbility(abilityId, cost);
  if (result.ok) toast.success(result.message);
  else toast.warning(result.message);
};
</script>

<style scoped>
.ability-tree-panel {
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

.points {
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid rgba(var(--color-primary-rgb), 0.35);
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  font-weight: 700;
}

.hint {
  margin: 0;
  color: var(--color-text-secondary);
}

.branches {
  display: grid;
  gap: 12px;
}

.branch {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 12px;
}

h3 {
  margin: 0;
}

.branch-desc {
  margin: 4px 0 10px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.nodes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.node {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 10px;
  background: var(--color-surface-light);
  display: grid;
  gap: 6px;
}

.node.unlocked {
  border-color: rgba(var(--color-success-rgb), 0.55);
}

.node.locked {
  opacity: 0.85;
}

.node-name {
  font-weight: 700;
}

.node-desc {
  color: var(--color-text-secondary);
  font-size: 13px;
}

.node-prereq {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.node-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

button {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  border-radius: 8px;
  padding: 5px 10px;
  cursor: pointer;
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
