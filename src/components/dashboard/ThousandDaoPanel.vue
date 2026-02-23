<template>
  <div class="ability-tree-overview">
    <header class="header">
      <div>
        <h2>能力树总览</h2>
        <p>已替代旧“三千大道”，用于规划永久成长路线。</p>
      </div>
      <div class="stat">已解锁 {{ unlockedSet.size }} / {{ allNodes.length }}</div>
    </header>

    <section class="branches">
      <article v-for="branch in branches" :key="branch.id" class="branch">
        <div class="branch-head">
          <h3>{{ branch.name }}</h3>
          <span>{{ unlockedCount(branch.id) }}/{{ branch.nodes.length }}</span>
        </div>
        <p class="branch-desc">{{ branch.description }}</p>
        <div class="nodes">
          <div
            v-for="node in branch.nodes"
            :key="node.id"
            class="node"
            :class="{ unlocked: unlockedSet.has(node.id), active: isInLoadout(node.id) }"
          >
            <div class="top">
              <span>{{ node.name }}</span>
              <span class="cost">{{ node.cost }} 神点</span>
            </div>
            <p>{{ node.description }}</p>
            <p v-if="node.prerequisites?.length" class="prereq">前置：{{ formatPrerequisites(node.prerequisites) }}</p>
            <div class="meta">
              <span>{{ node.tag }}</span>
              <span v-if="isInLoadout(node.id)">已携带</span>
            </div>
          </div>
        </div>
      </article>
    </section>

    <section class="mission-temp" v-if="missionTempAbilities.length > 0">
      <h3>副本临时能力</h3>
      <div class="temp-list">
        <span v-for="ability in missionTempAbilities" :key="ability" class="temp-tag">{{ ability }}</span>
      </div>
      <p>这些能力仅在当前副本内有效，结算后会清理或转化。</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { INFINITE_ABILITY_TREE_BRANCHES, getInfiniteAbilityNodeById } from '@/data/thousandDaoData';

const gameStateStore = useGameStateStore();

const branches = INFINITE_ABILITY_TREE_BRANCHES;

const allNodes = branches.flatMap((b) => b.nodes);
const unlockedSet = computed(() => new Set(gameStateStore.reincarnator?.abilities ?? []));
const loadout = computed(() => {
  const arr = (gameStateStore.reincarnator as any)?.loadout;
  return Array.isArray(arr) ? arr : [];
});
const missionTempAbilities = computed(() => {
  const arr = (gameStateStore.currentMission as any)?.临时状态?.临时能力;
  return Array.isArray(arr) ? arr.filter((v: unknown) => typeof v === 'string') : [];
});

const unlockedCount = (branchId: string) => {
  const branch = branches.find((b) => b.id === branchId);
  if (!branch) return 0;
  return branch.nodes.filter((n) => unlockedSet.value.has(n.id)).length;
};

const isInLoadout = (abilityId: string) => loadout.value.includes(abilityId);

const formatPrerequisites = (ids: string[]) => {
  return ids
    .map((id) => getInfiniteAbilityNodeById(id)?.name || id)
    .join('、');
};
</script>

<style scoped>
.ability-tree-overview {
  padding: 16px;
  color: var(--color-text);
  display: grid;
  gap: 12px;
}
.header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
h2 {
  margin: 0;
}
p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
}
.stat {
  color: var(--color-primary);
  font-weight: 700;
}
.branches {
  display: grid;
  gap: 10px;
}
.branch {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 10px;
}
.branch-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}
.branch h3 {
  margin: 0;
}
.branch-desc {
  margin: 0 0 8px;
  font-size: 12px;
  color: var(--color-text-secondary);
}
.nodes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 8px;
}
.node {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  background: var(--color-surface-light);
  display: grid;
  gap: 6px;
}
.node.unlocked {
  border-color: rgba(var(--color-success-rgb), 0.55);
}
.node.active {
  outline: 1px solid rgba(var(--color-primary-rgb), 0.55);
}
.top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-weight: 700;
}
.cost {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.node p {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-secondary);
}
.prereq {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}
.mission-temp {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 10px;
}
.mission-temp h3 {
  margin: 0 0 8px;
}
.temp-list {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.temp-tag {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 4px 10px;
  font-size: 12px;
  background: var(--color-surface-light);
}
</style>
