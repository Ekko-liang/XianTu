<template>
  <div class="skills-panel">
    <header class="header">
      <div>
        <h2>能力管理</h2>
        <p>主神空间永久能力与副本携带配置。</p>
      </div>
      <div class="summary">
        <span>已解锁 {{ unlockedAbilities.length }}</span>
        <span>神点 {{ reincarnator.godPoints }}</span>
      </div>
    </header>

    <div class="tabs">
      <button :class="{ active: activeTab === 'unlocked' }" @click="activeTab = 'unlocked'">已解锁能力</button>
      <button :class="{ active: activeTab === 'loadout' }" @click="activeTab = 'loadout'">副本携带</button>
      <button :class="{ active: activeTab === 'cooldown' }" @click="activeTab = 'cooldown'">冷却状态</button>
    </div>

    <section v-if="activeTab === 'unlocked'" class="panel">
      <div v-if="unlockedAbilities.length === 0" class="empty">
        暂无永久能力。可在“能力树/兑换大厅”解锁后返回配置。
      </div>
      <div v-else class="ability-grid">
        <article v-for="ability in unlockedAbilityDetails" :key="ability.id" class="card">
          <div class="card-top">
            <h3>{{ ability.name }}</h3>
            <span class="tag">{{ ability.category }}</span>
          </div>
          <p>{{ ability.description }}</p>
          <div class="meta">建议携带：{{ ability.recommendedIn }}</div>
        </article>
      </div>
    </section>

    <section v-else-if="activeTab === 'loadout'" class="panel">
      <div class="loadout-header">
        <span>当前可携带：{{ selectedLoadout.length }}/{{ loadoutLimit }}</span>
        <span v-if="isMissionActive" class="warn">副本进行中：会同步到当前副本临时状态</span>
      </div>

      <div v-if="unlockedAbilities.length === 0" class="empty">未解锁能力，无法配置携带栏。</div>
      <div v-else class="ability-list">
        <label v-for="ability in unlockedAbilityDetails" :key="ability.id" class="line">
          <input
            type="checkbox"
            :checked="selectedLoadout.includes(ability.id)"
            :disabled="!selectedLoadout.includes(ability.id) && selectedLoadout.length >= loadoutLimit"
            @change="toggleLoadout(ability.id)"
          />
          <span class="name">{{ ability.name }}</span>
          <span class="desc">{{ ability.description }}</span>
        </label>
      </div>
    </section>

    <section v-else class="panel">
      <div v-if="cooldownRows.length === 0" class="empty">当前无能力冷却。</div>
      <div v-else class="cooldowns">
        <div v-for="row in cooldownRows" :key="row.id" class="cooldown-row">
          <span>{{ row.name }}</span>
          <span>{{ row.value }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';

const gameStateStore = useGameStateStore();
const activeTab = ref<'unlocked' | 'loadout' | 'cooldown'>('unlocked');

const loadoutLimit = 4;

const abilityCatalog: Record<string, { name: string; description: string; category: string; recommendedIn: string }> = {
  combat_close_quarters: { name: '近战精通', description: '提升贴身压制与反制能力。', category: '战斗', recommendedIn: '近距离高压副本' },
  combat_ranged_focus: { name: '远程专注', description: '提高命中稳定性与远程收割能力。', category: '战斗', recommendedIn: '开阔地图副本' },
  survival_camouflage: { name: '战场隐匿', description: '降低暴露概率，提升潜入成功率。', category: '生存', recommendedIn: '潜入/恐怖副本' },
  survival_adapt: { name: '环境适应', description: '提高极端环境下生存能力。', category: '生存', recommendedIn: '末日/极端环境副本' },
  mental_anchor: { name: '精神锚定', description: '强化恐惧与污染抗性。', category: '精神', recommendedIn: '恐怖/精神污染副本' },
  mental_prediction: { name: '危机预判', description: '提升先手、规避与陷阱识别。', category: '精神', recommendedIn: '高难度综合副本' },
};

const reincarnator = computed(() => gameStateStore.reincarnator);
const unlockedAbilities = computed(() => reincarnator.value?.abilities ?? []);
const unlockedAbilityDetails = computed(() => {
  return unlockedAbilities.value.map((id) => ({
    id,
    name: abilityCatalog[id]?.name ?? id,
    description: abilityCatalog[id]?.description ?? '未登记能力描述。',
    category: abilityCatalog[id]?.category ?? '未分类',
    recommendedIn: abilityCatalog[id]?.recommendedIn ?? '通用',
  }));
});

const selectedLoadout = computed<string[]>(() => {
  const loadout = (reincarnator.value as any)?.loadout;
  return Array.isArray(loadout) ? loadout.filter((v) => typeof v === 'string') : [];
});

const isMissionActive = computed(() => gameStateStore.gamePhase === 'mission' && !!gameStateStore.currentMission);

const toggleLoadout = (abilityId: string) => {
  const current = [...selectedLoadout.value];
  const exists = current.includes(abilityId);

  const next = exists ? current.filter((id) => id !== abilityId) : [...current, abilityId];
  if (!exists && next.length > loadoutLimit) {
    toast.warning(`最多携带 ${loadoutLimit} 个能力`);
    return;
  }

  gameStateStore.updateState('reincarnator', {
    ...gameStateStore.reincarnator,
    loadout: next,
  } as any);

  if (isMissionActive.value && gameStateStore.currentMission) {
    const mission = {
      ...gameStateStore.currentMission,
      临时状态: {
        ...((gameStateStore.currentMission as any).临时状态 || {}),
        携带能力: next,
      },
    } as any;
    gameStateStore.setCurrentMission(mission);
  }
};

const cooldownRows = computed(() => {
  const cooldown = (gameStateStore.skillState as any)?.冷却;
  if (!cooldown || typeof cooldown !== 'object') return [];
  return Object.entries(cooldown).map(([id, value]) => ({
    id,
    name: abilityCatalog[id]?.name ?? id,
    value: typeof value === 'number' ? `${value} 回合` : String(value),
  }));
});
</script>

<style scoped>
.skills-panel {
  padding: 16px;
  display: grid;
  gap: 12px;
  color: var(--color-text);
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
.summary {
  display: grid;
  gap: 6px;
  text-align: right;
  color: var(--color-primary);
  font-weight: 700;
}
.tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.tabs button {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  padding: 6px 10px;
  cursor: pointer;
}
.tabs button.active {
  border-color: var(--color-primary);
  color: var(--color-primary);
}
.panel {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 12px;
}
.empty {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 12px;
  color: var(--color-text-secondary);
}
.ability-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}
.card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-light);
  padding: 10px;
  display: grid;
  gap: 8px;
}
.card-top {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
}
.card h3 {
  margin: 0;
  font-size: 15px;
}
.tag {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.card p {
  margin: 0;
  font-size: 13px;
}
.meta {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.loadout-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
}
.warn {
  color: var(--color-warning);
  font-size: 12px;
}
.ability-list {
  display: grid;
  gap: 8px;
}
.line {
  display: grid;
  grid-template-columns: auto 160px 1fr;
  gap: 8px;
  align-items: center;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
}
.name {
  font-weight: 700;
}
.desc {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.cooldowns {
  display: grid;
  gap: 8px;
}
.cooldown-row {
  display: flex;
  justify-content: space-between;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--color-surface-light);
}
</style>
