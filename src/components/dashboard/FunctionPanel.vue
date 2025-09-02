<template>
  <div class="function-panel">
    <div class="panel-header">
      <h2 class="panel-title">{{ title }}</h2>
      <button @click="$emit('close')" class="close-btn" aria-label="Close panel">
        <X :size="20" />
      </button>
    </div>
    <div class="panel-body">
      <div class="panel-content-wrapper">
        <slot>
          <div class="placeholder-content">
            <p>{{ title }}功能开发中...</p>
          </div>
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  title: string
}>()

defineEmits<{
  close: []
}>()
</script>

<style scoped>
.function-panel {
  width: 100%;
  height: 100%;
  background: var(--color-background);
  display: flex;
  flex-direction: column;
  font-family: var(--font-family-sans-serif);
  overflow: hidden; /* 确保内容被父容器的圆角裁切 */
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px; /* 调整为更紧凑的内边距 */
  flex-shrink: 0;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.panel-title { /* 使用独立的class以避免全局h2污染 */
  margin: 0;
  font-size: 1.125rem; /* 调整字号 */
  font-weight: 600;
  color: var(--color-text);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  padding: 8px;
  border-radius: 50%; /* 圆形按钮 */
  color: var(--color-text-secondary);
  transition: all 0.2s ease-in-out;
}

.close-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
  transform: rotate(90deg); /* 增加旋转效果 */
}

.panel-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.panel-content-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 24px; /* 为内容区提供统一的内边距 */
  background: var(--color-background);
  /* 优化的滚动条样式 */
  scrollbar-width: thin;
  scrollbar-color: var(--scrollbar-thumb) transparent;
}

.panel-content-wrapper::-webkit-scrollbar {
  width: 6px;
}

.panel-content-wrapper::-webkit-scrollbar-track {
  background: rgba(var(--color-border-rgb), 0.1);
  border-radius: 3px;
}

.panel-content-wrapper::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);
  border-radius: 3px;
  opacity: 0.6;
}

.panel-content-wrapper::-webkit-scrollbar-thumb:hover {
  opacity: 0.8;
}

.placeholder-content {
  text-align: center;
  color: var(--color-text-secondary);
  font-size: 1rem;
  margin-top: 40px;
  padding: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface-light);
}

/* 移除深色主题硬编码，使用CSS变量自动适配 */
</style>