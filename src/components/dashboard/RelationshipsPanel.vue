<template>
  <div class="relationships-panel-layout">
    <!-- 左侧列表 -->
    <div class="relationship-list-container" ref="listContainerRef">
      <div v-if="characterStore.isLoading" class="loading-state">
        <Loader2 :size="32" class="animate-spin text-primary" />
        <p>正在读取人际网络...</p>
      </div>
      <div v-else-if="relationships.length === 0" class="empty-state">
        <Users2 :size="48" class="text-gray-400" />
        <p class="empty-text">红尘万丈，尚未与人结缘。</p>
        <p class="empty-hint">主动探索，方能相识满天下。</p>
      </div>
      <div v-else class="relationship-list">
        <div
          v-for="person in relationships"
          :key="person.角色基础信息.名字"
          class="relationship-card"
          :class="{ selected: selectedPerson?.角色基础信息.名字 === person.角色基础信息.名字 }"
          @click="selectPerson(person)"
        >
          <div class="person-avatar" :class="getAvatarClass(person)">
            <span class="avatar-text">{{ person.角色基础信息.名字.charAt(0) }}</span>
            <div class="relationship-indicator" :class="getIntimacyClass(person.人物好感度 || 0)">
              {{ person.人物好感度 || 0 }}
            </div>
          </div>

          <div class="person-info">
            <div class="person-name">{{ person.角色基础信息.名字 }}</div>
            <div class="person-meta">
              <span class="relationship-type">{{ person.人物关系 || '相识' }}</span>
              <span class="person-location">{{ person.角色存档信息?.位置?.描述 || '未知' }}</span>
            </div>
          </div>
          <ChevronRight :size="16" class="arrow-icon" />
        </div>
      </div>
    </div>

    <!-- 右侧详情 -->
    <div class="relationship-detail-container" :class="{ 'show-detail': !!selectedPerson }">
      <div v-if="selectedPerson" class="detail-content-wrapper">
        <div class="detail-header">
          <div class="detail-avatar" :class="getAvatarClass(selectedPerson)">
            <span class="avatar-text">{{ selectedPerson.角色基础信息.名字.charAt(0) }}</span>
          </div>
          <div class="detail-info">
            <h3 class="detail-name">{{ selectedPerson.角色基础信息.名字 }}</h3>
            <div class="detail-badges">
              <span class="type-badge">{{ selectedPerson.人物关系 }}</span>
              <span class="intimacy-badge" :class="getIntimacyClass(selectedPerson.人物好感度)">
                好感 {{ selectedPerson.人物好感度 }}
              </span>
            </div>
          </div>
          <button class="close-detail-btn" @click="selectedPerson = null">
            <X :size="20" />
          </button>
        </div>

        <div class="detail-body">
           <div class="detail-section">
            <h5 class="section-title">
              <UserCircle2 :size="16" />
              <span>基础信息</span>
            </h5>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">性别</span>
                <span class="info-value">{{ selectedPerson.角色基础信息.性别 }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">天资</span>
                <span class="info-value">{{ selectedPerson.角色基础信息.天资 }}</span>
              </div>
               <div class="info-item">
                <span class="info-label">灵根</span>
                <span class="info-value">{{ selectedPerson.角色基础信息.灵根 }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">出生</span>
                <span class="info-value">{{ selectedPerson.角色基础信息.出生 }}</span>
              </div>
            </div>
          </div>

          <div class="detail-section">
            <h5 class="section-title">
                <BookText :size="16" />
                <span>人物记忆</span>
            </h5>
            <ul v-if="selectedPerson.人物记忆?.length" class="memory-list">
              <li v-for="(memory, index) in selectedPerson.人物记忆" :key="index" class="memory-item">
                {{ memory }}
              </li>
            </ul>
            <p v-else class="text-gray-400 text-sm">暂无特殊记忆。</p>
          </div>
          
          <div class="detail-section">
            <h5 class="section-title">
                <BarChart3 :size="16" />
                <span>关系统计</span>
            </h5>
             <div class="info-grid">
              <div class="info-item">
                <span class="info-label">互动次数</span>
                <span class="info-value">{{ selectedPerson.互动次数 || 0 }} 次</span>
              </div>
              <div class="info-item">
                <span class="info-label">最后互动</span>
                <span class="info-value">{{ formatLastInteraction(selectedPerson.最后互动时间) }}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
       <div v-else class="no-selection-placeholder">
        <Users2 :size="48" class="text-gray-400" />
        <p>选择一个人物查看详情</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useCharacterStore } from '@/utils/stores/characterStore';
import type { NpcProfile } from '@/types/game';
import { ChevronRight, X, Users2, Loader2, UserCircle2, BookText, BarChart3 } from 'lucide-vue-next';

const characterStore = useCharacterStore();
const relationships = computed(() => characterStore.relationships);
const selectedPerson = ref<NpcProfile | null>(null);
const listContainerRef = ref<HTMLElement | null>(null);


const selectPerson = (person: NpcProfile) => {
  if (selectedPerson.value?.角色基础信息.名字 === person.角色基础信息.名字) {
    selectedPerson.value = null;
  } else {
    selectedPerson.value = person;
  }
};

const getIntimacyClass = (intimacy: number): string => {
  if (intimacy >= 80) return 'intimacy-high';
  if (intimacy >= 50) return 'intimacy-medium';
  if (intimacy >= 0) return 'intimacy-low';
  return 'intimacy-enemy';
};

const getAvatarClass = (person: NpcProfile): string => {
    const intimacy = person.人物好感度 || 0;
    if (intimacy > 50) return 'avatar-friend';
    if (intimacy < 0) return 'avatar-enemy';
    return 'avatar-neutral';
}

const formatLastInteraction = (timeStr: string | null | undefined): string => {
    if (!timeStr) return '从未';
    try {
        const date = new Date(timeStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return '今天';
        if (diffDays === 1) return '昨天';
        if (diffDays < 7) return `${diffDays}天前`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
        return `${Math.floor(diffDays / 30)}个月前`;
    } catch {
        return '未知';
    }
};

</script>

<style scoped>
.relationships-panel-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  height: 100%;
  width: 100%;
  overflow: hidden;
  background-color: var(--color-background);
}

.relationship-list-container {
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: 0.5rem;
}

.relationship-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.relationship-card {
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color 0.2s, box-shadow 0.2s;
  border: 1px solid transparent;
}

.relationship-card:hover {
  background-color: var(--color-surface-hover);
}

.relationship-card.selected {
  background-color: var(--color-surface-active);
  border-color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.person-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
  margin-right: 0.75rem;
  position: relative;
  flex-shrink: 0;
}

.avatar-text {
    font-size: 1.25rem;
}

.avatar-friend { background: linear-gradient(135deg, #2ecc71, #27ae60); }
.avatar-neutral { background: linear-gradient(135deg, #3498db, #2980b9); }
.avatar-enemy { background: linear-gradient(135deg, #e74c3c, #c0392b); }

.relationship-indicator {
  position: absolute;
  bottom: -2px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 700;
  color: white;
  border: 2px solid var(--color-surface);
  padding: 0 4px;
}

.person-info {
  flex-grow: 1;
  min-width: 0;
}

.person-name {
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.person-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.relationship-type {
  background-color: var(--color-surface-hover);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.arrow-icon {
  color: var(--color-border-hover);
  transition: transform 0.2s;
}
.relationship-card.selected .arrow-icon {
  transform: translateX(2px);
  color: var(--color-primary);
}


.relationship-detail-container {
  padding: 1.5rem;
  overflow-y: auto;
}

.detail-content-wrapper {
    max-width: 600px;
    margin: 0 auto;
}

.detail-header {
  display: flex;
  align-items: center;
  margin-bottom: 2rem;
  position: relative;
}

.detail-header .detail-avatar {
    width: 64px;
    height: 64px;
    font-size: 2rem;
}

.detail-info {
  margin-left: 1rem;
}

.detail-name {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
}

.detail-badges {
  display: flex;
  gap: 0.5rem;
}

.type-badge, .intimacy-badge {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-weight: 500;
}

.type-badge {
  background-color: var(--color-surface-hover);
  color: var(--color-text-secondary);
}

.intimacy-badge { color: white; }

.close-detail-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.close-detail-btn:hover {
    background: var(--color-surface-hover);
    color: var(--color-primary);
}


.detail-body {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.detail-section {
    background-color: var(--color-surface);
    padding: 1rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
}

.section-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 0.75rem;
}
.section-title > span {
    opacity: 0.8;
}

.info-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
}
.info-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    background: var(--color-background);
    padding: 0.5rem;
    border-radius: var(--radius-sm);
}
.info-label {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
}
.info-value {
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--color-text);
}


.memory-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.memory-item {
  font-size: 0.875rem;
  padding: 0.5rem;
  background: var(--color-background);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--color-primary);
  color: var(--color-text-secondary);
}

.intimacy-high { background-color: #27ae60; }
.intimacy-medium { background-color: #2980b9; }
.intimacy-low { background-color: #7f8c8d; }
.intimacy-enemy { background-color: #c0392b; }

.loading-state, .empty-state, .no-selection-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}
.loading-state p, .empty-state p, .no-selection-placeholder p {
    margin-top: 1rem;
}
.empty-text {
    font-weight: 600;
    color: var(--color-text);
}
.empty-hint {
    font-size: 0.8rem;
}


@media (max-width: 768px) {
  .relationships-panel-layout {
    grid-template-columns: 1fr;
  }
  .relationship-detail-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--color-background);
    transform: translateX(100%);
    transition: transform 0.3s ease-in-out;
    z-index: 10;
    padding: 1rem;
  }
  .relationship-detail-container.show-detail {
    transform: translateX(0);
  }
  
  .close-detail-btn {
      /* Make sure close button is visible on mobile */
  }
}
</style>