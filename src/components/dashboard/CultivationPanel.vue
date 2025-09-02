<template>
  <div class="cultivation-panel game-panel">
    <!-- 头部统计 -->
    <div class="panel-header">
      <div class="header-left">
        <div class="header-icon">⚡</div>
        <div class="header-info">
          <h3 class="panel-title">修炼系统</h3>
          <span class="panel-subtitle">功法与天赋</span>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="refreshCultivationData" :disabled="loading">
          <RefreshCw :size="16" :class="{ 'animate-spin': loading }" />
          <span class="btn-text">刷新</span>
        </button>
      </div>
    </div>

    <div class="panel-content">
      <div v-if="loading" class="loading-state">
        <div class="loading-spinner">⏳</div>
        <div class="loading-text">正在读取修炼数据...</div>
      </div>

      <div v-else class="cultivation-sections">
        <!-- 三千大道卡片 -->
        <div class="detail-section dao-card">
          <div class="detail-header">
            <div class="header-icon">🌌</div>
            <h4 class="detail-title">三千大道</h4>
            <div class="dao-count">{{ unlockedDaoCount }}条已解锁</div>
          </div>
          
          <div v-if="unlockedDaoList.length === 0" class="empty-state">
            <div class="empty-icon">📿</div>
            <div class="empty-text"></div>
            <div class="empty-hint"></div>
          </div>
          
          <div v-else class="dao-list">
            <div 
              v-for="daoName in unlockedDaoList.slice(0, 5)" 
              :key="daoName"
              class="dao-item"
            >
              <div class="dao-icon">{{ getDaoIcon(daoName) }}</div>
              <div class="dao-info">
                <div class="dao-name">{{ daoName }}</div>
                <div class="dao-stage">{{ getCurrentStageName(daoName) }}</div>
                <div class="dao-progress">
                  <div class="progress-bar">
                    <div 
                      class="progress-fill" 
                      :style="{ width: getProgressPercent(daoName) + '%' }"
                    ></div>
                  </div>
                  <span class="progress-text">{{ getProgressPercent(daoName).toFixed(0) }}%</span>
                </div>
              </div>
            </div>
            <div v-if="unlockedDaoList.length > 5" class="more-dao">
              还有{{ unlockedDaoList.length - 5 }}条大道...
            </div>
          </div>
        </div>

        <!-- 装备系统卡片 -->
        <div class="detail-section equipment-card">
          <div class="detail-header">
            <div class="header-icon">⚔️</div>
            <h4 class="detail-title">装备法宝</h4>
            <div class="equipment-count">{{ equippedCount }}/6</div>
          </div>
          
          <div class="equipment-slots">
            <div 
              v-for="(equipName, slotName) in equipmentSlots" 
              :key="slotName"
              class="equipment-slot"
              :class="{ equipped: equipName }"
            >
              <div class="slot-icon">{{ getEquipmentIcon(slotName) }}</div>
              <div class="slot-info">
                <div class="slot-name">{{ slotName }}</div>
                <div class="slot-equipment">{{ equipName || '' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 天赋显示卡片 -->
        <div class="detail-section talents-card">
          <div class="detail-header">
            <div class="header-icon">🌟</div>
            <h4 class="detail-title">先天天赋</h4>
            <div class="talent-count">{{ talentsCount }}项天赋</div>
          </div>
          
          <div v-if="characterTalents.length === 0" class="empty-state">
            <div class="empty-icon">⭐</div>
            <div class="empty-text"></div>
            <div class="empty-hint"></div>
          </div>
          
          <div v-else class="talents-list">
            <div 
              v-for="talent in characterTalents" 
              :key="talent"
              class="talent-item"
            >
              <div class="talent-icon">🌟</div>
              <div class="talent-info">
                <div class="talent-name">{{ talent }}</div>
                <div class="talent-description">先天天赋，无法修炼提升</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { RefreshCw } from 'lucide-vue-next';
import { useCharacterCultivationData, useCharacterBasicData } from '@/composables/useCharacterData';
import { toast } from '@/utils/toast';

const cultivationData = useCharacterCultivationData();
const basicData = useCharacterBasicData();

const loading = computed(() => !cultivationData.value && !basicData.value);

const daoSystemData = computed(() => cultivationData.value.daoSystem);
const equipmentData = computed(() => cultivationData.value.equipment);
const characterTalents = computed(() => basicData.value?.talents || []);

// 计算属性
const unlockedDaoList = computed(() => daoSystemData.value?.已解锁大道 || []);
const unlockedDaoCount = computed(() => unlockedDaoList.value.length);

const equipmentSlots = computed(() => ({
  '法宝1': equipmentData.value?.法宝1,
  '法宝2': equipmentData.value?.法宝2,
  '法宝3': equipmentData.value?.法宝3,
  '法宝4': equipmentData.value?.法宝4,
  '法宝5': equipmentData.value?.法宝5,
  '法宝6': equipmentData.value?.法宝6
}));

const equippedCount = computed(() => {
  return Object.values(equipmentSlots.value).filter(Boolean).length;
});

const talentsCount = computed(() => characterTalents.value.length);

// 获取大道图标
const getDaoIcon = (daoName: string): string => {
  const iconMap: Record<string, string> = {
    '丹道': '💊', '器道': '⚔️', '符道': '📜', '阵道': '🔮',
    '剑道': '⚔️', '刀道': '🔪', '拳道': '👊', '身法道': '🏃',
    '音律道': '🎵', '画道': '🎨', '茶道': '🍃', '医道': '⚕️'
  };
  return iconMap[daoName] || '✨';
};

// 获取装备图标
const getEquipmentIcon = (slotName: string): string => {
  const iconMap: Record<string, string> = {
    '法宝1': '⚔️',
    '法宝2': '🛡️',
    '法宝3': '💍',
    '法宝4': '📿',
    '法宝5': '👑',
    '法宝6': '🦄'
  };
  return iconMap[slotName] || '⚔️';
};

// 获取当前阶段名称
const getCurrentStageName = (daoName: string): string => {
  const ds = daoSystemData.value;
  if (!ds) return '';
  const progress = ds.大道进度[daoName];
  const daoPath = ds.大道路径定义[daoName];
  
  if (!progress || !daoPath) return '';
  
  const stageIndex = progress.当前阶段;
  return daoPath.阶段列表[stageIndex]?.名称 || '';
};

// 获取进度百分比
const getProgressPercent = (daoName: string): number => {
  const ds = daoSystemData.value;
  if (!ds) return 0;
  const progress = ds.大道进度[daoName];
  const daoPath = ds.大道路径定义[daoName];
  
  if (!progress || !daoPath) return 0;
  
  const currentStage = daoPath.阶段列表[progress.当前阶段];
  if (!currentStage || !currentStage.突破经验) return 0;
  
  return Math.min(100, (progress.当前经验 / currentStage.突破经验) * 100);
};

// 刷新修炼数据
const refreshCultivationData = async () => {
  // 数据是响应式的，理论上不需要手动刷新
  // 如果需要强制刷新，应该在 store 中实现
  toast.info('数据已通过中央存储自动更新');
};
</script>

<style scoped>
.cultivation-panel {
  /* 使用统一的 game-panel 基础样式 */
}

/* 头部 */
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: var(--color-surface);
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
  flex-shrink: 0;
  margin: 1rem 1rem 0 1rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.header-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.panel-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
}

.panel-subtitle {
  font-size: 0.875rem;
  color: var(--color-accent);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

/* 修炼容器 */
.panel-content {
  flex: 1;
  margin: 0 1rem 1rem 1rem;
  overflow-y: auto;
  min-height: 0;
}

.cultivation-sections {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  text-align: center;
}

.loading-spinner {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.loading-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.5rem;
}

.empty-icon {
  font-size: 2rem;
  margin-bottom: 0.5rem;
}

.empty-text {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.empty-hint {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

/* 大道列表 */
.dao-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.dao-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.dao-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  transition: var(--transition-fast);
}

.dao-item:hover {
  background: rgba(var(--color-primary-rgb), 0.05);
  border-color: var(--color-primary);
}

.dao-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.dao-info {
  flex: 1;
  min-width: 0;
}

.dao-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.dao-stage {
  font-size: 0.75rem;
  color: var(--color-accent);
  margin-bottom: 0.25rem;
}

.dao-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(var(--color-border-rgb), 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-primary));
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.625rem;
  color: var(--color-text-secondary);
  font-weight: 500;
  min-width: 2rem;
  text-align: right;
}

.more-dao {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-align: center;
  padding: 0.5rem;
  font-style: italic;
}

/* 装备系统 */
.equipment-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.equipment-slots {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.equipment-slot {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  transition: var(--transition-fast);
}

.equipment-slot.equipped {
  background: rgba(var(--color-success-rgb), 0.05);
  border-color: var(--color-success);
}

.slot-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.slot-info {
  flex: 1;
  min-width: 0;
}

.slot-name {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.125rem;
}

.slot-equipment {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.equipment-slot:not(.equipped) .slot-equipment {
  color: var(--color-text-secondary);
  font-style: italic;
}

/* 天赋列表 */
.talent-count {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  background: var(--color-surface-light);
  padding: 0.25rem 0.5rem;
  border-radius: 0.75rem;
  border: 1px solid var(--color-border);
}

.talents-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.talent-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface-light);
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
}

.talent-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
  color: var(--color-warning);
}

.talent-info {
  flex: 1;
  min-width: 0;
}

.talent-name {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.talent-description {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  font-style: italic;
}

/* 按钮样式 */
.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fef3e2;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.action-btn:hover:not(:disabled) {
  background: #fed7aa;
  transform: translateY(-1px);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 动画 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .header-actions .btn-text {
    display: none;
  }
  
  .equipment-slots {
    grid-template-columns: 1fr;
  }
}
</style>