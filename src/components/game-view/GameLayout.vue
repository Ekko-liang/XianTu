<!-- src/components/game-view/GameLayout.vue -->
<template>
  <div
    class="game-layout"
    :class="{
      'right-sidebar-collapsed': isRightSidebarCollapsed,
    }"
  >
    <header class="game-header">
      <slot name="header"></slot>
    </header>

    <div class="game-body">
      <main class="game-main-content">
        <div class="main-content-area">
          <slot name="main-content"></slot>
        </div>
        <div class="action-bar-area">
          <slot name="action-bar"></slot>
        </div>
      </main>

      <aside class="game-sidebar right-sidebar">
        <div class="sidebar-header">
          <h3>角色面板</h3>
          <button @click="toggleRightSidebar" class="sidebar-close-btn" title="收缩右面板">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>
          </button>
        </div>
        <div class="sidebar-content">
          <slot name="right-sidebar"></slot>
        </div>
      </aside>
    </div>

    <button 
      v-if="isRightSidebarCollapsed" 
      @click="toggleRightSidebar" 
      class="sidebar-toggle right-toggle" 
      title="展开右面板"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const isRightSidebarCollapsed = ref(false);

const toggleRightSidebar = () => {
  isRightSidebarCollapsed.value = !isRightSidebarCollapsed.value;
};
</script>

<style scoped>
:root {
  --right-sidebar-width-desktop: 300px;
  --header-height: 40px;
  --action-bar-height: 120px; /* 新增：操作栏高度 */
  --sidebar-transition-duration: 0.3s;
}

.game-layout {
  display: grid;
  grid-template-rows: var(--header-height) 1fr; /* 移除 footer */
  grid-template-columns: 1fr var(--right-sidebar-width); /* 移除 left-sidebar */
  height: 100vh;
  width: 100vw;
  background-color: var(--color-background);
  color: var(--color-text);
  overflow: hidden;
  
  --right-sidebar-width: var(--right-sidebar-width-desktop);
}
.game-layout.right-sidebar-collapsed {
  --right-sidebar-width: 0px;
}

.game-header {
  grid-column: 1 / -1;
  grid-row: 1;
  display: flex;
  align-items: center;
  padding: 0.5rem 1rem;
  background-color: var(--color-surface-light);
  border-bottom: 1px solid var(--color-border);
  z-index: 10;
  min-height: var(--header-height);
  box-sizing: border-box;
}

.game-body {
  grid-column: 1 / -1;
  grid-row: 2;
  display: grid;
  grid-template-columns: 1fr var(--right-sidebar-width); /* 移除 left-sidebar */
  overflow: hidden;
  transition: grid-template-columns var(--sidebar-transition-duration) ease;
}

.game-sidebar {
  display: flex;
  flex-direction: column;
  background-color: var(--color-surface);
  overflow: hidden;
  transition: width var(--sidebar-transition-duration) ease;
}

.right-sidebar {
  grid-column: 2;
  border-left: 1px solid var(--color-border);
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background-color: var(--color-surface-light);
  flex-shrink: 0;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.sidebar-close-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.sidebar-close-btn:hover {
  background-color: var(--color-surface-heavy);
  color: var(--color-text);
}

.sidebar-content {
  flex-grow: 1;
  padding: 1rem;
  overflow-y: auto;
}

.right-sidebar-collapsed .right-sidebar {
  width: 0;
  padding: 0;
  overflow: hidden;
}

.game-main-content {
  grid-column: 1;
  display: grid;
  grid-template-rows: 1fr var(--action-bar-height);
  overflow: hidden;
  background-color: var(--color-background);
}

.main-content-area {
  overflow-y: auto;
  padding: 1rem;
}

.action-bar-area {
  border-top: 1px solid var(--color-border);
  background-color: var(--color-surface-light);
  padding: 1rem;
  display: flex;
  align-items: center;
}

.sidebar-toggle {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 20;
  background-color: var(--color-surface-light);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  width: 32px;
  height: 48px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--sidebar-transition-duration) ease;
  padding: 0;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.sidebar-toggle:hover {
  background-color: var(--color-primary);
  color: var(--color-background);
  transform: translateY(-50%) scale(1.1);
}


.right-toggle {
  right: 8px;
  border-radius: 8px 0 0 8px;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .game-layout {
    --right-sidebar-width: 0px;
    grid-template-columns: 1fr;
  }

  .game-body {
    position: relative;
    grid-template-columns: 1fr;
  }

  .game-sidebar {
    position: absolute;
    top: 0;
    height: 100%;
    width: 85%;
    max-width: 320px;
    z-index: 100;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    transform: translateX(0);
  }

  .right-sidebar {
    right: 0;
  }
  .right-sidebar-collapsed .right-sidebar {
    transform: translateX(100%);
  }

  .game-main-content {
    grid-column: 1;
  }

  .sidebar-toggle {
    top: 80px;
    height: 44px;
    width: 44px;
    border-radius: 50%;
  }
  
  
  .right-toggle {
    right: 12px;
  }

  /* 遮罩层 */
  .game-layout:not(.right-sidebar-collapsed)::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.4);
    z-index: 99;
    grid-column: 1 / -1;
    grid-row: 2;
  }
}

/* 全屏状态下的样式修正 */
:fullscreen .game-layout,
.game-layout:fullscreen {
  height: 100vh;
  width: 100vw;
}
</style>