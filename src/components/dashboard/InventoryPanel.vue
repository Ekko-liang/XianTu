<template>
  <div class="inventory-panel-content">
    <!-- 左侧: 筛选与物品列表 -->
    <div class="item-list-column">
      <div class="filters-bar">
        <div class="search-bar">
          <Search :size="16" class="search-icon" />
          <input type="text" v-model="searchQuery" placeholder="搜索物品..." />
        </div>
        <select v-model="selectedCategory" class="filter-select">
          <option value="all">所有类型</option>
          <option v-for="cat in itemCategories" :key="cat" :value="cat">{{ cat }}</option>
        </select>
        <select v-model="sortBy" class="filter-select">
          <option value="default">默认排序</option>
          <option value="quality">按品质</option>
          <option value="name">按名称</option>
        </select>
      </div>
      <div class="items-grid-container">
        <div v-if="loading" class="grid-state-overlay">加载中...</div>
        <div v-else-if="filteredItems.length === 0" class="grid-state-overlay">空空如也</div>
        <div
          v-for="item in filteredItems"
          :key="item.物品ID"
          class="item-cell"
          :class="[getItemQualityClass(item), { selected: selectedItem && selectedItem.物品ID === item.物品ID }]"
          @click="selectedItem = item"
        >
          <div class="item-icon">
            <component :is="getItemIconComponent(item)" :size="32" />
          </div>
          <div class="item-quantity" v-if="item.数量 > 1">{{ item.数量 }}</div>
        </div>
      </div>
       <div class="currency-bar">
        <div class="currency-item" v-for="grade in spiritStoneGrades" :key="grade.name">
          <div class="currency-top-line">
            <Gem :size="16" :class="grade.colorClass" />
            <span class="currency-amount">{{ inventory.灵石[grade.name] || 0 }}</span>
          </div>
          <div class="currency-bottom-line">
            {{ grade.name }}灵石
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧: 物品详情 -->
    <div class="item-details-column">
      <div v-if="selectedItem" class="details-content">
        <div class="details-header">
          <div class="details-icon" :class="getItemQualityClass(selectedItem)">
            <component :is="getItemIconComponent(selectedItem)" :size="40" />
          </div>
          <div class="details-title">
            <h3 :class="getItemQualityClass(selectedItem, 'text')">{{ selectedItem.名称 }}</h3>
            <span class="details-meta">{{ selectedItem.类型 }} / {{ selectedItem.品质?.quality || '凡品' }}</span>
          </div>
        </div>
        <div class="details-body">
          <p class="details-description">{{ selectedItem.描述 }}</p>
          <div v-if="selectedItem.装备增幅" class="details-attributes">
            <h4>装备增幅</h4>
            <ul>
              <li v-for="(value, key) in selectedItem.装备增幅" :key="key">
                <span>{{ key }}</span>
                <span>+{{ value }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div class="details-actions">
          <button class="action-btn use-btn">使用</button>
          <button class="action-btn">丢弃</button>
        </div>
      </div>
      <div v-else class="details-placeholder">
        <BoxSelect :size="48" />
        <p>选择一个物品查看详情</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, Component } from 'vue';
import { Search, Sword, Book, Pill, Shield, Box, BoxSelect, Gem } from 'lucide-vue-next';
import { useCharacterStore } from '@/stores/characterStore';
import type { Item, Inventory } from '@/types/game';

const characterStore = useCharacterStore();
const loading = ref(false);
const selectedItem = ref<Item | null>(null);
const searchQuery = ref('');
const selectedCategory = ref('all');
const sortBy = ref('default');

const inventory = computed<Inventory>(() => characterStore.activeSaveSlot?.存档数据?.背包 || { 
  灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 
  物品: {} 
});

const itemList = computed<Item[]>(() => Object.values(inventory.value.物品 || {}));

const itemCategories = computed(() => {
  const categories = new Set(itemList.value.map(item => item.类型));
  return Array.from(categories);
});

const qualityOrder: { [key: string]: number } = { '凡': 1, '人': 2, '地': 3, '天': 4, '仙': 5, '神': 6 };

const filteredItems = computed(() => {
  let items = [...itemList.value];

  if (searchQuery.value) {
    items = items.filter(item => item.名称.includes(searchQuery.value));
  }

  if (selectedCategory.value !== 'all') {
    items = items.filter(item => item.类型 === selectedCategory.value);
  }

  if (sortBy.value === 'quality') {
    items.sort((a, b) => (qualityOrder[b.品质?.quality || '凡'] || 0) - (qualityOrder[a.品质?.quality || '凡'] || 0));
  } else if (sortBy.value === 'name') {
    items.sort((a, b) => a.名称.localeCompare(b.名称));
  }
  
  return items;
});

const getItemIconComponent = (item: Item): Component => {
  const typeMap: { [key: string]: Component } = { '法宝': Sword, '功法': Book, '丹药': Pill, '防具': Shield };
  return typeMap[item.类型] || Box;
};

const getItemQualityClass = (item: Item, type: 'border' | 'text' = 'border'): string => {
  const quality = item.品质?.quality || '凡';
  return `${type}-quality-${quality}`;
};

const spiritStoneGrades = [
    { name: '极品', colorClass: 'text-red-400' },
    { name: '上品', colorClass: 'text-amber-400' },
    { name: '中品', colorClass: 'text-sky-400' },
    { name: '下品', colorClass: 'text-slate-400' },
] as const satisfies Readonly<{name: keyof Inventory['灵石'], colorClass: string}[]>;


onMounted(() => {
  if (!selectedItem.value && filteredItems.value.length > 0) {
    selectedItem.value = filteredItems.value[0];
  }
});
</script>

<style scoped>
.inventory-panel-content {
  display: flex;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

/* Left Column */
.item-list-column {
  width: 60%;
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.filters-bar {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  align-items: center;
}
.search-bar {
  position: relative;
  flex-grow: 1;
}
.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-secondary);
}
.search-bar input {
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px 8px 8px 32px;
  width: 100%;
  transition: all 0.2s ease;
}
.search-bar input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary-light);
}
.filter-select {
  flex-grow: 1;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 8px;
  max-width: 150px;
}
.items-grid-container {
  flex-grow: 1;
  overflow-y: auto;
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(68px, 1fr));
  gap: 12px;
  align-content: flex-start;
}
.grid-state-overlay {
  grid-column: 1 / -1;
  text-align: center;
  margin-top: 48px;
  color: var(--color-text-secondary);
}
.item-cell {
  position: relative;
  aspect-ratio: 1 / 1;
  background: var(--color-surface-hover);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.item-cell:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}
.item-cell.selected {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-primary);
}
.item-icon {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}
.item-quantity {
  position: absolute;
  bottom: 2px; right: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  text-shadow: 0 0 2px var(--color-background);
}
.currency-bar {
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 1rem;
    padding: 0.75rem;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
    background-color: var(--color-surface);
    flex-wrap: wrap; /* 允许换行 */
}
.currency-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    border-radius: var(--radius-lg); /* 更圆的边角 */
    background-color: var(--color-background);
    border: 1px solid var(--color-border-hover);
    min-width: 80px;
    transition: all 0.2s ease;
}
.currency-item:hover {
    transform: translateY(-2px);
    border-color: var(--color-primary);
    background-color: var(--color-surface-hover);
}
.currency-top-line {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}
.currency-bottom-line {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
}
.currency-amount {
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text);
}

/* Right Column */
.item-details-column {
  width: 40%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}
.details-placeholder {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: var(--color-text-secondary);
  padding: 24px;
}
.details-content {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.details-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.details-icon {
  flex-shrink: 0;
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--color-surface-hover);
  border: 2px solid var(--color-border);
}
.details-title h3 {
  font-size: 1.25rem;
  margin: 0;
}
.details-title .details-meta {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}
.details-body {
  flex-grow: 1;
  padding: 16px;
  overflow-y: auto;
}
.details-description {
  margin-bottom: 24px;
  color: var(--color-text-secondary);
  line-height: 1.6;
}
.details-attributes h4 {
  font-size: 1rem;
  margin-bottom: 8px;
}
.details-attributes ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.details-attributes li {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
}
.details-actions {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
}
.action-btn {
  flex-grow: 1;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-surface-hover);
  cursor: pointer;
  font-weight: 500;
}
.action-btn.use-btn {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

/* Quality Colors */
.border-quality-神 { border-color: #ef4444; }
.border-quality-仙 { border-color: #f59e0b; }
.border-quality-天 { border-color: #8b5cf6; }
.border-quality-地 { border-color: #3b82f6; }
.border-quality-人 { border-color: #10b981; }
.border-quality-凡 { border-color: var(--color-border); }
.text-quality-神 { color: #ef4444; }
.text-quality-仙 { color: #f59e0b; }
.text-quality-天 { color: #8b5cf6; }
.text-quality-地 { color: #3b82f6; }
.text-quality-人 { color: #10b981; }
.text-quality-凡 { color: var(--color-text); }

@media (max-width: 900px) {
  .inventory-panel-content {
    flex-direction: column;
  }
  .item-list-column, .item-details-column {
    width: 100%;
    height: 50%;
  }
  .item-list-column {
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
}
</style>