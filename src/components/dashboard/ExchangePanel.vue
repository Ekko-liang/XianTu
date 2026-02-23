<template>
  <div class="exchange-panel">
    <div class="header">
      <h2>兑换大厅</h2>
      <div class="points">神点：{{ reincarnator.godPoints }}</div>
    </div>

    <p class="hint">在主神空间消耗神点兑换物资和服务。</p>

    <div class="grid">
      <div v-for="item in shopItems" :key="item.id" class="card">
        <div class="top">
          <span class="name">{{ item.name }}</span>
          <span class="category">{{ categoryLabel(item.category) }}</span>
        </div>
        <p class="desc">{{ item.description }}</p>
        <div class="meta">
          <span>价格：{{ item.price }}</span>
          <span>库存：{{ item.stock }}</span>
        </div>
        <button class="buy-btn" :disabled="item.stock <= 0" @click="buy(item.id)">
          {{ item.stock <= 0 ? '已售罄' : '购买' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';

const gameStateStore = useGameStateStore();
const shopItems = computed(() => gameStateStore.hubState.shopInventory ?? []);
const reincarnator = computed(() => gameStateStore.reincarnator);

const categoryLabel = (value: string) => {
  const map: Record<string, string> = {
    ability: '能力',
    item: '物品',
    info: '信息',
    service: '服务',
    special: '特殊',
  };
  return map[value] ?? value;
};

const buy = (itemId: string) => {
  const result = gameStateStore.buyHubShopItem(itemId, 1);
  if (result.ok) toast.success(result.message);
  else toast.warning(result.message);
};
</script>

<style scoped>
.exchange-panel {
  padding: 16px;
  color: var(--color-text);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
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
  color: var(--color-text-secondary);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 10px;
}

.card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 12px;
  display: grid;
  gap: 8px;
}

.top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.name {
  font-weight: 700;
}

.category {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.desc {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
}

.meta {
  display: flex;
  justify-content: space-between;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.buy-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  border-radius: 8px;
  padding: 7px 10px;
  cursor: pointer;
}

.buy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

