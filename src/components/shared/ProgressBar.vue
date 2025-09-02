<template>
  <div class="progress-bar-wrapper">
    <div class="progress-bar-header">
      <span class="progress-bar-label">{{ label }}</span>
      <span class="progress-bar-value">{{ current }} / {{ max }}</span>
    </div>
    <div class="progress-bar-background">
      <div class="progress-bar-fill" :class="colorClass" :style="fillStyle"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, PropType } from 'vue';

type ColorProp = 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'accent';

export default defineComponent({
  name: 'ProgressBar',
  props: {
    label: {
      type: String as PropType<string>,
      required: true,
    },
    current: {
      type: Number as PropType<number>,
      required: true,
    },
    max: {
      type: Number as PropType<number>,
      required: true,
    },
    color: {
      type: String as PropType<ColorProp>,
      default: 'primary' as ColorProp,
    },
  },
  setup(props) {
    const progressPercent = computed(() => {
      if (props.max === 0) return 0;
      return (props.current / props.max) * 100;
    });

    const fillStyle = computed(() => ({
      width: `${progressPercent.value}%`,
    }));

    const colorClass = computed(() => `progress-color-${props.color}`);

    return {
      fillStyle,
      colorClass,
    };
  },
});
</script>

<style scoped>
.progress-bar-wrapper {
  width: 100%;
}

.progress-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
  font-size: 0.875rem;
}

.progress-bar-label {
  font-weight: 500;
  color: var(--color-text);
}

.progress-bar-value {
  font-family: monospace;
  color: var(--color-text-secondary);
}

.progress-bar-background {
  height: 8px;
  background-color: var(--color-surface-hover);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease-in-out;
}

/* Color Variants */
.progress-color-primary { background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover)); }
.progress-color-info { background: linear-gradient(90deg, var(--color-info), var(--color-info-hover)); }
.progress-color-success { background: linear-gradient(90deg, var(--color-success), var(--color-success-hover)); }
.progress-color-warning { background: linear-gradient(90deg, var(--color-warning), var(--color-warning-hover)); }
.progress-color-danger { background: linear-gradient(90deg, var(--color-danger), var(--color-error)); }
.progress-color-accent { background: linear-gradient(90deg, var(--color-accent), var(--color-accent-hover)); }
</style>