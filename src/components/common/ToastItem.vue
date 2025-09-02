<template>
  <div :class="['toast-item', `toast-item--${type}`]">
    <div class="icon-wrapper">
      <component :is="iconComponent" :size="22" stroke-width="2" />
    </div>
    <span class="message">{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import type { MessageType } from '@/utils/toast';
import { CheckCircle2, AlertCircle, ShieldAlert, Info, LoaderCircle } from 'lucide-vue-next';

const props = defineProps<{
  type: MessageType;
  message: string;
}>();

// 图标映射
const iconMap = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: ShieldAlert,
  info: Info,
  loading: LoaderCircle,
};

const iconComponent = computed(() => iconMap[props.type]);

</script>

<style scoped>
.toast-item {
  display: flex;
  align-items: center;
  padding: 14px 20px;
  border-radius: 10px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
  border: 1px solid transparent;
  width: 360px;
  max-width: 90vw;
  background-color: #fff;
  color: #333;
}

.icon-wrapper {
  margin-right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.message {
  font-size: 15px;
  font-weight: 500;
  line-height: 1.4;
}

/* --- Thematic Styles --- */

.toast-item--success {
  border-color: #D1FAE5; /* green-100 */
  background-color: #F0FDF4; /* green-50 */
}
.toast-item--success .icon-wrapper {
  color: #10B981; /* green-500 */
}

.toast-item--error {
  border-color: #FEE2E2; /* red-100 */
  background-color: #FEF2F2; /* red-50 */
}
.toast-item--error .icon-wrapper {
  color: #EF4444; /* red-500 */
}

.toast-item--warning {
  border-color: #FEF3C7; /* amber-100 */
  background-color: #FFFBEB; /* amber-50 */
}
.toast-item--warning .icon-wrapper {
  color: #F59E0B; /* amber-500 */
}

.toast-item--info {
  border-color: #DBEAFE; /* blue-100 */
  background-color: #EFF6FF; /* blue-50 */
}
.toast-item--info .icon-wrapper {
  color: #3B82F6; /* blue-500 */
}

.toast-item--loading {
  border-color: #E5E7EB; /* gray-200 */
  background-color: #F9FAFB; /* gray-50 */
}
.toast-item--loading .icon-wrapper {
  color: #6B7280; /* gray-500 */
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
