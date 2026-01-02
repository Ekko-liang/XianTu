<template>
  <div class="action-menu" :class="positionClass" :style="offsetStyle">
    <transition name="menu-fade">
      <div v-if="open" class="overlay" @click="close"></div>
    </transition>

    <transition name="menu-pop">
      <div v-if="open" class="menu" @click.stop>
        <slot name="menu" :close="close" />
      </div>
    </transition>

    <button
      class="fab"
      :title="open ? closeTitle : openTitle"
      :aria-label="open ? closeTitle : openTitle"
      :aria-expanded="open"
      @click="toggle"
    >
      <component :is="open ? X : Menu" :size="22" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Menu, X } from 'lucide-vue-next';

const props = withDefaults(
  defineProps<{
    position?: 'top-right' | 'bottom-right';
    offsetPx?: number;
    openTitle?: string;
    closeTitle?: string;
  }>(),
  {
    position: 'bottom-right',
    offsetPx: 24,
    openTitle: '菜单',
    closeTitle: '关闭',
  },
);

const open = ref(false);

const close = () => {
  open.value = false;
};

const toggle = () => {
  open.value = !open.value;
};

const positionClass = computed(() => {
  return props.position === 'top-right' ? 'pos-top-right' : 'pos-bottom-right';
});

const offsetStyle = computed(() => {
  const px = `${props.offsetPx}px`;
  if (props.position === 'top-right') return { top: px, right: px };
  return { bottom: px, right: px };
});
</script>

<style scoped>
.action-menu {
  position: fixed;
  z-index: 120;
}

.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
  z-index: 0;
}

.fab {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: var(--mode-selection-float-bg, rgba(30, 41, 59, 0.8));
  backdrop-filter: blur(10px);
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.08));
  color: var(--mode-selection-subtitle, #94a3b8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.25s ease;
  position: relative;
  z-index: 2;
}

.fab:hover {
  background: var(--mode-selection-float-hover, rgba(51, 65, 85, 0.9));
  color: var(--mode-selection-text-hover, #e2e8f0);
  border-color: var(--mode-selection-accent, rgba(147, 197, 253, 0.2));
}

.menu {
  position: absolute;
  right: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.82);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  z-index: 2;
  min-width: 160px;
}

:deep(.action-menu-item) {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(30, 41, 59, 0.55);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  width: 100%;
}

:deep(.action-menu-item:hover) {
  background: rgba(51, 65, 85, 0.75);
  border-color: rgba(147, 197, 253, 0.22);
}

:deep(.action-menu-item span) {
  font-size: 0.95rem;
  letter-spacing: 0.05em;
}

:deep(.action-menu-item.is-danger) {
  border-color: rgba(239, 68, 68, 0.25);
}

:deep(.action-menu-item.is-danger:hover) {
  border-color: rgba(239, 68, 68, 0.45);
  background: rgba(127, 29, 29, 0.35);
}

.pos-bottom-right .menu {
  bottom: 62px;
}

.pos-top-right .menu {
  top: 62px;
}

.menu-fade-enter-active,
.menu-fade-leave-active {
  transition: opacity 0.18s ease;
}

.menu-fade-enter-from,
.menu-fade-leave-to {
  opacity: 0;
}

.menu-pop-enter-active,
.menu-pop-leave-active {
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.menu-pop-enter-from,
.menu-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

@media (max-width: 600px) {
  .action-menu {
    bottom: 12px;
    right: 12px;
    top: auto;
  }

  .pos-top-right {
    top: 12px;
    bottom: auto;
  }

  .fab {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }

  .pos-bottom-right .menu {
    bottom: 52px;
    min-width: 150px;
  }

  .pos-top-right .menu {
    top: 52px;
    min-width: 150px;
  }
}
</style>
