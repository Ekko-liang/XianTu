<template>
  <div class="talent-selection-container">
    <div v-if="isLoading" class="loading-state">于时光长河中搜寻天赋...</div>
    <div v-else-if="error" class="error-state">天机紊乱，无法搜寻：{{ error }}</div>

    <div v-else class="talent-layout">
      <!-- 左侧面板：列表和操作按钮 -->
      <div class="talent-left-panel">
        <div class="talent-list-container" :class="{ 'multi-mode': store.mode === 'multi' }">
          <div
            v-for="talent in talents"
            :key="talent.id"
            class="talent-item"
            :class="{
              selected: isSelected(talent),
              disabled: !canSelect(talent) || store.mode === 'multi'
            }"
            @click="toggleTalent(talent)"
          >
            <span class="talent-name">{{ talent.name }}</span>
            <span class="talent-cost">{{ talent.talent_cost }} 点</span>
          </div>
        </div>
        
        <!-- 单机模式功能按钮 -->
        <div v-if="store.mode === 'single'" class="single-actions-container">
          <div class="divider"></div>
          <button @click="customTalent" class="action-item">
            <span class="action-name">自定义天赋</span>
          </button>
          <button @click="aiGenerateTalent" class="action-item">
            <span class="action-name">AI推演</span>
          </button>
        </div>
      </div>

      <div class="talent-details-container">
        <div v-if="activeTalent" class="talent-details">
          <h2>{{ activeTalent.name }}</h2>
          <div class="description-scroll">
            <p>{{ activeTalent.description || '此天赋之玄妙，需自行领悟。' }}</p>
          </div>
          <div class="cost-display">
            消耗天道点: {{ activeTalent.talent_cost }}
          </div>
        </div>
        <div v-else class="placeholder">
          请选择天赋。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useCharacterCreationStore, type Talent } from '../../stores/characterCreationStore';
import { LOCAL_TALENTS } from '../../data/localData';
import { API_BASE_URL } from '../../services/api';

const store = useCharacterCreationStore();
const talents = ref<Talent[]>([]);
const isLoading = ref(true);
const error = ref<string | null>(null);
const activeTalent = ref<Talent | null>(null);

async function fetchTalents() {
  // 单机模式使用本地数据
  if (store.mode === 'single') {
    try {
      console.log('Loading local talents:', LOCAL_TALENTS);
      const localTalents: Talent[] = LOCAL_TALENTS.map(t => ({
        id: t.id,
        name: t.name,
        description: t.description || null,
        talent_cost: t.talent_cost,
        effects: t.effects || null,
        rarity: 1 // 默认稀有度
      }));
      
      talents.value = localTalents;
      console.log('Talents loaded:', talents.value);
      
      // 模拟加载延迟
      setTimeout(() => {
        isLoading.value = false;
      }, 300);
    } catch (e: any) {
      console.error('Failed to load talents:', e);
      error.value = '加载本地数据失败: ' + e.message;
      isLoading.value = false;
    }
    return;
  }
  
  // 联机模式请求后端
  if (!store.selectedWorld) {
    error.value = "尚未选择世界，无法获取天赋数据。";
    isLoading.value = false;
    return;
  }
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/creation_data?world_id=${store.selectedWorld.id}`);
    if (!response.ok) {
      throw new Error(`天网灵脉响应异常: ${response.status}`);
    }
    const data = await response.json();
    talents.value = data.talents || [];
  } catch (e: any) {
    error.value = e.message;
  } finally {
    isLoading.value = false;
  }
}

const isSelected = (talent: Talent) => {
  return store.selectedTalents.some(t => t.id === talent.id);
};

const canSelect = (talent: Talent) => {
  if (isSelected(talent)) {
    return true; // Always allow deselecting
  }
  return store.remainingTalentPoints >= talent.talent_cost;
};

function toggleTalent(talent: Talent) {
  if (store.mode === 'multi') return;
  activeTalent.value = talent;
  const index = store.selectedTalents.findIndex(t => t.id === talent.id);
  if (index > -1) {
    // Deselect
    store.selectedTalents.splice(index, 1);
  } else {
    // Select if possible
    if (canSelect(talent)) {
      store.selectedTalents.push(talent);
    } else {
      // Here you might want to show a toast notification to the user
      alert("天道点不足，无法选择此天赋。");
    }
  }
}

function customTalent() {
  // 自定义天赋功能
  alert("自定义天赋功能正在建设中。");
}

async function aiGenerateTalent() {
  if (store.mode === 'single') {
    // 单机模式使用本地AI生成逻辑
    isLoading.value = true;
    error.value = null;
    
    try {
      const aiTemplates = [
        { name: '道心天成', description: '天生便与大道契合，修行时常有顿悟，突破瓶颈如饮水般轻松。' },
        { name: '神识过人', description: '元神异常强大，神识范围远超同境界修士，更容易修炼神识类功法。' },
        { name: '法体双修', description: '体魄与法力同样出众，可同时修炼炼体与练气两条道路。' },
        { name: '天生剑骨', description: '骨骼中蕴含剑意，对剑道有着超乎常人的领悟力。' },
        { name: '阴阳同体', description: '体内阴阳二气天然平衡，修炼阴阳类功法事半功倍。' }
      ];
      
      const template = aiTemplates[Math.floor(Math.random() * aiTemplates.length)];
      const generatedTalent: Talent = {
        id: Date.now(),
        name: template.name,
        description: template.description,
        talent_cost: 0, // AI生成的天赋不消耗点数
        effects: null,
        rarity: 1
      };
      
      // 模拟生成延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 添加到列表顶部
      talents.value.unshift(generatedTalent);
      // 自动选择
      store.selectedTalents.push(generatedTalent);
      activeTalent.value = generatedTalent;
      
    } catch (e: any) {
      error.value = 'AI推演失败';
    } finally {
      isLoading.value = false;
    }
  } else {
    // 联机模式请求后端
    alert("联机模式AI推演功能开发中");
  }
}

onMounted(() => {
  fetchTalents();
});
</script>

<style scoped>
.talent-selection-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-state, .error-state, .placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.2rem;
  color: #888;
}

.talent-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
  height: 100%;
  overflow: hidden;
}

/* 左侧面板容器 */
.talent-left-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
}

.talent-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  transition: var(--transition-fast);
}

/* 美化滚动条 */
.talent-list-container::-webkit-scrollbar {
  width: 8px;
}

.talent-list-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.talent-list-container::-webkit-scrollbar-thumb {
  background: rgba(180, 142, 173, 0.3);
  border-radius: 4px;
}

.talent-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(180, 142, 173, 0.5);
}

.talent-list-container.multi-mode {
  opacity: 0.6;
  background: repeating-linear-gradient(
    -45deg,
    transparent,
    transparent 10px,
    rgba(var(--color-primary-rgb), 0.05) 10px,
    rgba(var(--color-primary-rgb), 0.05) 20px
  );
}

.talent-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border-left: 3px solid transparent;
}

.talent-item:hover {
  background: rgba(180, 142, 173, 0.1);
}

.talent-item.selected {
  background: rgba(180, 142, 173, 0.2);
  color: #b48ead;
  border-left: 3px solid #b48ead;
}

.talent-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: transparent;
  color: #888;
}

.talent-name {
  font-weight: 500;
}

.talent-cost {
  color: var(--color-accent);
}

.talent-details-container {
  border: 1px solid #444;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.talent-details {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.talent-details h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  color: #b48ead;
  flex-shrink: 0;
}

.description-scroll {
  flex: 1;
  overflow-y: auto;
  line-height: 1.6;
  margin-bottom: 1rem;
  padding-right: 0.5rem;
}

/* 美化详情滚动条 */
.description-scroll::-webkit-scrollbar {
  width: 8px;
}

.description-scroll::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.description-scroll::-webkit-scrollbar-thumb {
  background: rgba(180, 142, 173, 0.3);
  border-radius: 4px;
}

.description-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(180, 142, 173, 0.5);
}

.cost-display {
  text-align: right;
  font-weight: bold;
  color: var(--color-accent);
  flex-shrink: 0;
}

/* 单机模式功能按钮样式 */
.single-actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
}

.divider {
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(180, 142, 173, 0.3),
    transparent
  );
  margin: 0.5rem 0;
}

.action-item {
  display: flex;
  justify-content: space-between;
  padding: 0.8rem 1rem;
  margin-bottom: 0.5rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: none;
  background: transparent;
  color: var(--color-text);
  width: 100%;
  text-align: left;
  font-size: 1rem;
}

.action-item:hover {
  background: rgba(var(--color-primary-rgb), 0.1);
}

.action-name {
  font-weight: 500;
  color: var(--color-primary);
}
</style>