<!-- src/components/game-view/StatusPanel.vue -->
<template>
  <div class="character-status-panel">
    <!-- 角色基本信息 -->
    <div v-if="status" class="character-info-section">
      <div class="character-name">
        <h2>{{ status.name }}</h2>
        <span class="realm-badge">{{ status.realm }}</span>
      </div>
      
      <!-- 核心属性 -->
      <div class="core-stats">
        <div class="stat-row">
          <span class="stat-label">年龄</span>
          <span class="stat-value">{{ status.age }} 岁</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">寿元</span>
          <span class="stat-value">{{ status.lifespan }} 载</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">气血</span>
          <span class="stat-value">{{ status.hp }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">灵力</span>
          <span class="stat-value">{{ status.mana }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">神识</span>
          <span class="stat-value">{{ status.spirit }}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">声望</span>
          <span class="stat-value">{{ status.reputation }}</span>
        </div>
        
        <!-- 修为进度 -->
        <div class="cultivation-progress">
          <div class="progress-label">修为</div>
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: cultivationProgress + '%' }"
            ></div>
          </div>
          <div class="progress-text">
            {{ status.cultivation_exp }} / {{ status.cultivation_exp_max }}
          </div>
        </div>
      </div>
      
      <!-- 六合命盘 -->
      <div class="hexagon-section">
        <h4>六合命盘</h4>
        <HexagonChart 
          :stats="sixDimensionStats" 
          :size="200" 
          :max-value="10"
        />
      </div>
    </div>
    
    <!-- 无角色数据提示 -->
    <div v-else class="no-character-info">
      <p>角色数据加载中...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import HexagonChart from '@/components/common/HexagonChart.vue';

// 外部传入的角色状态接口
export interface CharacterStatus {
  name: string;
  realm: string;
  age: number; // 新增：年龄
  hp: string;
  mana: string;
  spirit: string;
  lifespan: number; // 修改：只显示最大寿元
  reputation: number;
  cultivation_exp: number;
  cultivation_exp_max: number;
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
}

const props = defineProps<{
  status: CharacterStatus | null;
}>();

// 六维属性数据
const sixDimensionStats = computed(() => {
  if (!props.status) return {};
  return {
    root_bone: props.status.root_bone,
    spirituality: props.status.spirituality,
    comprehension: props.status.comprehension,
    fortune: props.status.fortune,
    charm: props.status.charm,
    temperament: props.status.temperament,
  };
});

// 修为进度百分比
const cultivationProgress = computed(() => {
  if (!props.status || !props.status.cultivation_exp_max) return 0;
  return Math.floor((props.status.cultivation_exp / props.status.cultivation_exp_max) * 100);
});
</script>

<style scoped>
/* --- 右侧角色状态面板样式 --- */
.character-status-panel {
  height: 100%;
  overflow-y: auto;
  padding: 5px; /* 增加一点内边距，防止滚动条紧贴边缘 */
}

/* 美化滚动条 */
.character-status-panel::-webkit-scrollbar {
  width: 6px;
}
.character-status-panel::-webkit-scrollbar-track {
  background: transparent;
}
.character-status-panel::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 3px;
}
.character-status-panel::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-primary);
}


.character-info-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.character-name {
  text-align: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.character-name h2 {
  margin: 0 0 0.5rem 0;
  color: var(--color-primary);
  font-family: var(--font-family-serif);
  font-size: 1.4rem;
}

.realm-badge {
  background-color: var(--color-accent);
  color: var(--color-background);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.core-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border-light);
}

.stat-label {
  font-weight: 500;
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.stat-value {
  font-weight: bold;
  color: var(--color-text);
  font-family: 'Consolas', 'monospace';
  font-size: 0.9rem;
}

.cultivation-progress {
  margin-top: 1rem;
  padding: 1rem;
  background-color: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.progress-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: var(--color-surface-heavy);
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-align: center;
  font-family: 'Consolas', 'monospace';
}

.hexagon-section {
  padding: 1rem;
  background-color: var(--color-surface-light);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.hexagon-section h4 {
  margin: 0 0 1rem 0;
  text-align: center;
  color: var(--color-primary);
  font-family: var(--font-family-serif);
  font-size: 1.1rem;
}

.no-character-info {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: var(--color-text-secondary);
  font-style: italic;
}
</style>