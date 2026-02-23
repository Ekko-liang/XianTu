<template>
  <div class="inventory-panel">
    <header class="header">
      <div>
        <h2>物资与经济</h2>
        <p>以神点为主货币，管理可携带物资与副本临时仓库。</p>
      </div>
      <div class="points">神点：{{ reincarnator.godPoints }}</div>
    </header>

    <div class="tabs">
      <button :class="{ active: activeTab === 'items' }" @click="activeTab = 'items'">永久物资</button>
      <button :class="{ active: activeTab === 'currency' }" @click="activeTab = 'currency'">神点结算</button>
      <button :class="{ active: activeTab === 'temp' }" @click="activeTab = 'temp'">副本临时仓库</button>
    </div>

    <section v-if="activeTab === 'items'" class="panel">
      <div class="tools">
        <input v-model.trim="keyword" placeholder="搜索物品名称" />
        <select v-model="typeFilter">
          <option value="all">全部</option>
          <option value="装备">装备</option>
          <option value="能力芯片">能力芯片</option>
          <option value="消耗品">消耗品</option>
          <option value="材料">材料</option>
          <option value="任务道具">任务道具</option>
          <option value="其他">其他</option>
        </select>
      </div>

      <div v-if="filteredItems.length === 0" class="empty">暂无物品。</div>
      <div v-else class="list">
        <div v-for="item in filteredItems" :key="item.物品ID" class="row">
          <div class="main">
            <div class="name">{{ item.名称 }}</div>
            <div class="meta">{{ item.类型 }} · {{ item.品质?.quality ?? '普通' }} · x{{ item.数量 ?? 1 }}</div>
            <div class="desc">{{ item.描述 || '暂无描述' }}</div>
          </div>
          <label class="carry">
            <input type="checkbox" :checked="item.可带入副本 === true" @change="toggleCarry(item.物品ID)" />
            <span>可带入副本</span>
          </label>
        </div>
      </div>
    </section>

    <section v-else-if="activeTab === 'currency'" class="panel">
      <div class="summary-grid">
        <div class="summary-card">
          <span>轮回者神点</span>
          <strong>{{ reincarnator.godPoints }}</strong>
        </div>
        <div class="summary-card">
          <span>背包神点余额</span>
          <strong>{{ godPointWallet }}</strong>
        </div>
        <div class="summary-card">
          <span>最近结算</span>
          <strong>{{ latestSettlementText }}</strong>
        </div>
      </div>

      <div class="actions">
        <button @click="syncGodPoints">同步神点到背包</button>
        <button @click="applyWalletAsProfile">以背包余额覆盖轮回者神点</button>
      </div>

      <div class="hint">
        神点闭环：副本结算 → 轮回者神点增长 → 同步背包货币.神点 → 兑换/消费后回写轮回者神点。
      </div>

      <div class="wallet-list">
        <div v-for="row in walletRows" :key="row.id" class="wallet-row">
          <span>{{ row.name }}</span>
          <span>{{ row.amount }}</span>
        </div>
      </div>
    </section>

    <section v-else class="panel">
      <div v-if="tempItemRows.length === 0" class="empty">当前副本没有临时物资。</div>
      <div v-else class="list">
        <div v-for="item in tempItemRows" :key="item.id" class="row">
          <div class="main">
            <div class="name">{{ item.name }}</div>
            <div class="meta">临时物资 · x{{ item.quantity }}</div>
            <div class="desc">{{ item.description || '副本结束后将清理或结算转化' }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';
import { ensureGodPointCurrency, setGodPointCurrency, syncGodPointsBetweenProfileAndInventory } from '@/utils/currencySystem';

const gameStateStore = useGameStateStore();

const activeTab = ref<'items' | 'currency' | 'temp'>('items');
const keyword = ref('');
const typeFilter = ref('all');

const reincarnator = computed(() => gameStateStore.reincarnator);

const itemList = computed(() => {
  const items = gameStateStore.inventory?.物品 || {};
  return Object.values(items).filter((v) => !!v && typeof v === 'object') as any[];
});

const filteredItems = computed(() => {
  const q = keyword.value.toLowerCase();
  return itemList.value.filter((item) => {
    if (typeFilter.value !== 'all' && item.类型 !== typeFilter.value) return false;
    if (q && !String(item.名称 || '').toLowerCase().includes(q)) return false;
    return true;
  });
});

const toggleCarry = (itemId: string) => {
  const inventory = gameStateStore.inventory;
  if (!inventory?.物品?.[itemId]) return;
  const next = {
    ...inventory,
    物品: {
      ...inventory.物品,
      [itemId]: {
        ...inventory.物品[itemId],
        可带入副本: !(inventory.物品[itemId] as any).可带入副本,
      },
    },
  } as any;
  gameStateStore.updateInventory(next);
};

const godPointWallet = computed(() => {
  if (!gameStateStore.inventory) return 0;
  return ensureGodPointCurrency(gameStateStore.inventory as any);
});

const latestSettlementText = computed(() => {
  const last = gameStateStore.missionHistory?.[0];
  if (!last) return '暂无';
  const sign = last.pointsGained >= 0 ? '+' : '';
  return `${sign}${last.pointsGained} 神点 / 评分 ${last.rating}`;
});

const syncGodPoints = () => {
  if (!gameStateStore.inventory) {
    toast.warning('背包未初始化');
    return;
  }
  const finalValue = syncGodPointsBetweenProfileAndInventory(
    gameStateStore.inventory as any,
    Number(gameStateStore.reincarnator.godPoints ?? 0),
    true,
  );
  gameStateStore.updateReincarnatorProfile({ godPoints: finalValue });
  toast.success('已同步轮回者神点到背包货币');
};

const applyWalletAsProfile = () => {
  if (!gameStateStore.inventory) {
    toast.warning('背包未初始化');
    return;
  }
  const walletValue = ensureGodPointCurrency(gameStateStore.inventory as any);
  gameStateStore.updateReincarnatorProfile({ godPoints: walletValue });
  setGodPointCurrency(gameStateStore.inventory as any, walletValue);
  toast.success('已使用背包神点余额覆盖轮回者神点');
};

const walletRows = computed(() => {
  const wallet = gameStateStore.inventory?.货币 || {};
  return Object.entries(wallet).map(([id, value]) => ({
    id,
    name: (value as any)?.名称 ?? id,
    amount: Number((value as any)?.数量 ?? 0),
  }));
});

const tempItemRows = computed(() => {
  const tempItems = (gameStateStore.currentMission as any)?.临时状态?.临时物品;
  if (!tempItems || typeof tempItems !== 'object') return [];
  return Object.entries(tempItems).map(([id, item]) => ({
    id,
    name: (item as any)?.name ?? (item as any)?.名称 ?? id,
    quantity: Number((item as any)?.quantity ?? (item as any)?.数量 ?? 1),
    description: (item as any)?.description ?? (item as any)?.描述,
  }));
});
</script>

<style scoped>
.inventory-panel {
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
.points {
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
  display: grid;
  gap: 10px;
}
.tools {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 8px;
}
input,
select,
button {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-light);
  color: var(--color-text);
  padding: 7px 10px;
}
button {
  cursor: pointer;
}
.empty {
  border: 1px dashed var(--color-border);
  border-radius: 8px;
  padding: 12px;
  color: var(--color-text-secondary);
}
.list {
  display: grid;
  gap: 8px;
}
.row {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-light);
  padding: 8px;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 8px;
}
.main {
  display: grid;
  gap: 4px;
}
.name {
  font-weight: 700;
}
.meta {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.desc {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.carry {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 8px;
}
.summary-card {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  background: var(--color-surface-light);
  display: grid;
  gap: 4px;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.hint {
  font-size: 12px;
  color: var(--color-text-secondary);
}
.wallet-list {
  display: grid;
  gap: 6px;
}
.wallet-row {
  display: flex;
  justify-content: space-between;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  background: var(--color-surface-light);
}
</style>
