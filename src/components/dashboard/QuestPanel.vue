<template>
  <div class="not-implemented-container">
    <div class="icon">🚧</div>
    <h2 class="title">功能暂未开放</h2>
    <p class="description">任务系统正在紧张开发中，敬请期待后续更新。</p>
  </div>
</template>

<script setup lang="ts">
// This component is currently a placeholder.
</script>

<style scoped>
.not-implemented-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 20px;
  text-align: center;
  background-color: var(--color-background);
  color: var(--color-text-secondary);
  user-select: none;
}

.icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.6;
  animation: bounce 2s infinite;
}

.title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.description {
  font-size: 1rem;
  max-width: 300px;
  line-height: 1.5;
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-20px);
  }
  60% {
    transform: translateY(-10px);
  }
}
</style>