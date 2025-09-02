<template>
  <div v-if="isDataReady" class="game-view">
    <!-- 顶部栏 -->
    <TopBar />

    <!-- 移动端底部导航 -->
    <div class="mobile-nav" v-if="isMobile">
      <button
        @click="toggleLeft"
        :class="['nav-btn', { active: !leftCollapsed }]"
      >
        <Menu :size="20" />
        <span>功能</span>
      </button>
      <button
        @click="toggleRight"
        :class="['nav-btn', { active: !rightCollapsed }]"
      >
        <User :size="20" />
        <span>角色</span>
      </button>
    </div>

    <!-- 主要内容区域 -->
    <div class="game-content">
      <!-- 左侧功能栏 -->
      <div
        :class="['left-sidebar', { 'mobile-overlay': isMobile }]"
        v-show="!leftCollapsed"
        @click="handleMobileOverlayClick"
      >
        <div class="sidebar-wrapper" @click.stop>
          <LeftSidebar @open-panel="openFunctionPanel" />
        </div>
      </div>

      <!-- 左侧收缩按钮 -->
      <div class="collapse-btn left-btn" v-if="!isMobile" @click="toggleLeft" :class="{ collapsed: leftCollapsed }">
        <div class="button-content">
          <ChevronRight v-if="leftCollapsed" :size="20" />
          <ChevronLeft v-else :size="20" />
        </div>
        <span class="button-tooltip">{{ leftCollapsed ? '展开功能栏' : '收缩功能栏' }}</span>
      </div>

      <!-- 主游戏区域 -->
      <div class="main-content">
        <MainGamePanel />
      </div>

      <!-- 右侧收缩按钮 (仅在非功能面板模式下显示) -->
      <div class="collapse-btn right-btn" v-if="!isMobile && !currentPanel" @click="toggleRight" :class="{ collapsed: rightCollapsed }">
        <div class="button-content">
          <ChevronLeft v-if="rightCollapsed" :size="20" />
          <ChevronRight v-else :size="20" />
        </div>
        <span class="button-tooltip">{{ rightCollapsed ? '展开角色信息' : '收缩角色信息' }}</span>
      </div>
      
      <!-- 右侧区域: 功能面板 或 角色信息栏 -->
      <div class="right-panel-area">
        <!-- 功能面板 -->
        <div v-if="currentPanel" class="function-panel-wrapper">
          <FunctionPanelWrapper
            :title="currentPanelData.title"
            :icon="currentPanelData.icon"
            @close="closeRightPanel"
          >
            <component :is="currentPanelData.component" />
          </FunctionPanelWrapper>
        </div>
        <!-- 角色信息栏 -->
        <div
          v-else
          :class="['right-sidebar', { 'mobile-overlay': isMobile }]"
          v-show="!rightCollapsed"
          @click="handleMobileOverlayClick"
        >
          <div class="sidebar-wrapper" @click.stop>
            <RightSidebar />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, markRaw } from 'vue'
import { useCharacterStore } from '@/stores/characterStore';
import {
  ChevronLeft, ChevronRight, Menu, User, BrainCircuit, UserSquare, Package,
  Heart, Flame, Swords, Settings, Save, Map, BookText, Landmark, Users
} from 'lucide-vue-next'
import TopBar from '@/components/dashboard/TopBar.vue'
import LeftSidebar from '@/components/dashboard/LeftSidebar.vue'
import MainGamePanel from '@/components/dashboard/MainGamePanel.vue'
import RightSidebar from '@/components/dashboard/RightSidebar.vue'
import FunctionPanelWrapper from '@/components/dashboard/FunctionPanelWrapper.vue'
import MemoryCenterPanel from '@/components/dashboard/MemoryCenterPanel.vue'
import CharacterDetailsPanel from '@/components/dashboard/CharacterDetailsPanel.vue'
import InventoryPanel from '@/components/dashboard/InventoryPanel.vue'
import RelationshipsPanel from '@/components/dashboard/RelationshipsPanel.vue'
import CultivationPanel from '@/components/dashboard/CultivationPanel.vue'
import SkillsPanel from '@/components/dashboard/SkillsPanel.vue'
import SettingsPanel from '@/components/dashboard/SettingsPanel.vue'
import SavePanel from '@/components/dashboard/SavePanel.vue'
import WorldMapPanel from '@/components/dashboard/WorldMapPanel.vue'
import QuestPanel from '@/components/dashboard/QuestPanel.vue'
import SectPanel from '@/components/dashboard/SectPanel.vue'

const characterStore = useCharacterStore();

const isDataReady = computed(() => {
  return !!characterStore.activeCharacterProfile && !!characterStore.activeSaveSlot?.存档数据;
});

const leftCollapsed = ref(false)
const rightCollapsed = ref(false)
const screenWidth = ref(window.innerWidth)
const currentPanel = ref('')

// 面板配置
const panelMap = {
  'memory': { component: markRaw(MemoryCenterPanel), title: '记忆中枢', icon: markRaw(BrainCircuit) },
  'character-details': { component: markRaw(CharacterDetailsPanel), title: '角色详情', icon: markRaw(UserSquare) },
  'inventory': { component: markRaw(InventoryPanel), title: '储物袋', icon: markRaw(Package) },
  'relationships': { component: markRaw(RelationshipsPanel), title: '人际关系', icon: markRaw(Users) },
  'cultivation': { component: markRaw(CultivationPanel), title: '修行', icon: markRaw(Flame) },
  'skills': { component: markRaw(SkillsPanel), title: '功法神通', icon: markRaw(Swords) },
  'settings': { component: markRaw(SettingsPanel), title: '设置', icon: markRaw(Settings) },
  'save': { component: markRaw(SavePanel), title: '存档/读档', icon: markRaw(Save) },
  'world-map': { component: markRaw(WorldMapPanel), title: '世界地图', icon: markRaw(Map) },
  'quests': { component: markRaw(QuestPanel), title: '任务', icon: markRaw(BookText) },
  'sect': { component: markRaw(SectPanel), title: '宗门', icon: markRaw(Landmark) },
  'online-play': { component: markRaw(RightSidebar), title: '拜访道友', icon: markRaw(Users) }, // 占位
};

// 计算当前面板数据
const currentPanelData = computed(() => {
  return panelMap[currentPanel.value as keyof typeof panelMap] || null;
});

const isMobile = computed(() => screenWidth.value < 768)

const handleResize = () => {
  screenWidth.value = window.innerWidth
  // 手机端默认收起侧边栏
  if (isMobile.value) {
    leftCollapsed.value = true
    rightCollapsed.value = true
  } else {
    // 桌面端默认展开
    leftCollapsed.value = false
    rightCollapsed.value = false
  }
}

const toggleLeft = () => {
  leftCollapsed.value = !leftCollapsed.value
}

const toggleRight = () => {
  rightCollapsed.value = !rightCollapsed.value
}

const handleMobileOverlayClick = (event: Event) => {
  if (isMobile.value && event.target === event.currentTarget) {
    leftCollapsed.value = true
    rightCollapsed.value = true
  }
}

// 打开功能面板
const openFunctionPanel = (panelType: string) => {
  currentPanel.value = panelType

  // 桌面端：确保右侧面板显示
  if (!isMobile.value) {
    rightCollapsed.value = false
  } else {
    // 手机端：隐藏左右侧栏，让功能面板全屏显示
    leftCollapsed.value = true
    rightCollapsed.value = true
  }
}

// 关闭功能面板，回到默认状态
const closeRightPanel = () => {
  currentPanel.value = ''
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize() // 初始化设置
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped>
.game-view {
  width: 100%;
  height: 100%;
  background: #f8fafc;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  font-size: 14px;
  display: flex;
  flex-direction: column;
}

.game-content {
  flex: 1;
  display: flex;
  align-items: stretch;
  gap: 0; /* 移除缝隙 */
  padding: 0; /* 移除内边距 */
  position: relative;
  min-height: 0;
  flex: 1;
  border-top: 1px solid var(--color-border);
}

.left-sidebar {
  width: 240px;
  background: var(--color-surface); /* 使用表面色 */
  transition: all 0.3s ease;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--color-border); /* 右侧分割线 */
}

.right-panel-area {
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  border-left: 1px solid var(--color-border); /* 左侧分割线 */
}

.function-panel-wrapper {
  width: 280px; /* 与 right-sidebar 保持一致 */
  height: 100%;
  display: flex;
  flex-direction: column;
}

.right-sidebar {
  width: 280px;
  background: var(--color-surface); /* 使用表面色 */
  transition: all 0.3s ease;
  z-index: 10;
  display: flex;
  flex-direction: column;
  border-left: 1px solid var(--color-border); /* 左侧分割线 */
}

.sidebar-wrapper {
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.main-content {
  flex: 1;
  background: var(--color-background); /* 使用背景色 */
  margin: 0; /* 移除左右margin */
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.collapse-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 24px; /* 增大宽度 */
  height: 72px; /* 增大高度 */
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  box-shadow: none;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 15;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  color: var(--color-text-secondary);
  overflow: visible; /* 允许 tooltip 显示 */
}

.collapse-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.collapse-btn:active {
  transform: translateY(-50%) scale(0.98); /* 调整 active 状态下的 transform */
}

.collapse-btn.collapsed {
  color: #10b981;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #10b981;
}

.collapse-btn.collapsed:hover {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.left-btn {
  border-radius: 0 8px 8px 0; /* 右侧圆角 */
  left: 240px;
  border-left: none; /* 贴合侧无边框 */
  transition: left 0.3s ease;
}

.left-btn.collapsed {
  left: 0;
}

.right-btn {
  border-radius: 8px 0 0 8px; /* 左侧圆角 */
  right: 280px; /* 初始位置 */
  border-right: none; /* 贴合侧无边框 */
  transition: right 0.3s ease;
}

.right-btn.collapsed {
  right: 0;
}

.button-content {
  transition: none;
}

.button-tooltip {
  position: absolute;
  bottom: -30px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  z-index: 1000;
}

.collapse-btn:hover .button-tooltip {
  opacity: 1;
  visibility: visible;
  bottom: -35px;
}

/* 移动端底部导航 */
.mobile-nav {
  display: none;
  background: white;
  border-top: 1px solid #e2e8f0;
  padding: 8px;
  gap: 8px;
  justify-content: space-around;
  z-index: 20;
}

.nav-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 8px 16px;
  background: transparent;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #64748b;
  font-size: 0.75rem;
}

.nav-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.nav-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.nav-btn.active:hover {
  background: #2563eb;
}

/* 手机端适配 */
@media (max-width: 767px) {
  .game-content {
    padding: 4px;
    position: relative;
  }

  .right-panel-area {
    position: fixed;
    top: 60px; /* 假设顶部栏高度为 60px */
    right: 0;
    bottom: 60px; /* 假设底部导航高度为 60px */
    width: 100%;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    z-index: 100;
  }

  /* 移动端，当功能面板打开时，从右侧滑入 */
  .function-panel-wrapper {
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 60px;
    width: 100%;
    z-index: 1000;
  }

  .main-content {
    margin: 0;
  }

  .mobile-nav {
    display: flex;
  }

  .left-sidebar.mobile-overlay,
  .right-sidebar.mobile-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 100;
    display: flex;
    align-items: flex-start;
    padding-top: 60px;
  }

  .right-sidebar.mobile-overlay {
    justify-content: flex-end;
  }

  .sidebar-wrapper {
    width: 85%;
    max-width: 320px;
    height: auto;
    max-height: calc(100% - 60px);
    background: white;
    border-radius: 0 8px 8px 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    overflow: auto;
  }

  .right-sidebar .sidebar-wrapper {
    border-radius: 8px 0 0 8px;
  }

  .collapse-btn {
    display: none;
  }
}

/* 深色主题 */
[data-theme="dark"] .game-view {
  background: #0f172a;
}

[data-theme="dark"] .left-sidebar,
[data-theme="dark"] .right-sidebar,
[data-theme="dark"] .main-content {
  background: #1e293b;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

[data-theme="dark"] .collapse-btn {
  background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
  border-color: #475569;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  color: #94a3b8;
}

[data-theme="dark"] .collapse-btn:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.6);
  color: #e2e8f0;
  background: linear-gradient(135deg, #334155 0%, #475569 100%);
}

[data-theme="dark"] .collapse-btn.collapsed {
  color: #34d399;
  background: linear-gradient(135deg, #064e3b 0%, #065f46 100%);
  border-color: #34d399;
}

[data-theme="dark"] .collapse-btn.collapsed:hover {
  background: linear-gradient(135deg, #065f46 0%, #047857 100%);
}

[data-theme="dark"] .mobile-nav {
  background: #1e293b;
  border-top-color: #334155;
}

[data-theme="dark"] .nav-btn {
  color: #94a3b8;
  border-color: #334155;
}

[data-theme="dark"] .nav-btn:hover {
  background: #334155;
  border-color: #475569;
}

[data-theme="dark"] .nav-btn.active {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

[data-theme="dark"] .nav-btn.active:hover {
  background: #2563eb;
}

[data-theme="dark"] .left-sidebar.mobile-overlay,
[data-theme="dark"] .right-sidebar.mobile-overlay {
  background: rgba(0, 0, 0, 0.7);
}

[data-theme="dark"] .sidebar-wrapper {
  background: #1e293b;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}
</style>