<template>
  <div class="function-panel-wrapper">
    <div class="panel-header">
      <div class="title-group">
        <component :is="icon" :size="20" class="title-icon" v-if="icon" />
        <h2>{{ title }}</h2>
      </div>
      <button @click="handleClose" class="close-panel-btn">
        <X :size="18" />
      </button>
    </div>
    <div class="panel-content">
      <slot></slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { X } from 'lucide-vue-next';
import type { Component } from 'vue';

interface Props {
  title: string;
  icon?: Component;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const handleClose = () => {
  emit('close');
};
</script>

<style scoped>
.function-panel-wrapper {
  width: 100%;
  height: 100%;
  background: var(--color-surface);
  color: var(--color-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-radius: 0;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 1rem; /* 使用变量或一致单位 */
  height: 56px;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  background-color: var(--color-surface-heavy); /* 增加头部背景色以示区分 */
}

.title-group {
  display: flex;
  align-items: center;
  gap: 0.75rem; /* 使用变量或一致单位 */
}

.title-group h2 {
  font-size: 1.125rem; /* 18px */
  font-weight: 600;
  margin: 0;
}

.title-icon {
  color: var(--color-text-secondary);
}

.close-panel-btn {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 0; /* 彻底移除圆角 */
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-panel-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-text);
}

.panel-content {
  flex-grow: 1;
  overflow: auto; /* Allow content to scroll if it overflows */
}
</style>