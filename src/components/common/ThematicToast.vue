<template>
  <transition name="toast-fade">
    <div
      v-if="visible"
      :class="[
        'fixed top-20 left-1/2 -translate-x-1/2 z-[9999] flex items-center px-6 py-4 rounded-lg shadow-lg text-white text-lg font-semibold border-2',
        toastClasses[type]
      ]"
    >
      <div class="icon-wrapper mr-4">
        <!-- Success Icon: 祥云 -->
        <svg v-if="type === 'success'" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/></svg>
        
        <!-- Error Icon: 煞气 -->
        <svg v-if="type === 'error'" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        
        <!-- Warning Icon: 警示符 -->
        <svg v-if="type === 'warning'" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        
        <!-- Info Icon: 卷轴 -->
        <svg v-if="type === 'info'" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h10v2a2 2 0 1 1-4 0V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4Z"/></svg>
        
        <!-- Loading Icon: 阵法 -->
        <svg v-if="type === 'loading'" class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4"/><path d="M12 18v4"/><path d="m4.93 4.93 2.83 2.83"/><path d="m16.24 16.24 2.83 2.83"/><path d="M2 12h4"/><path d="M18 12h4"/><path d="m4.93 19.07 2.83-2.83"/><path d="m16.24 7.76 2.83-2.83"/></svg>
      </div>
      <span>{{ message }}</span>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

const props = defineProps<{
  type: ToastType;
  message: string;
  duration?: number;
  onDestroy: () => void;
}>();

const visible = ref(false);

onMounted(() => {
  visible.value = true;
  if (props.type !== 'loading') {
    setTimeout(() => {
      visible.value = false;
      // 在动画结束后再销毁组件
      setTimeout(() => props.onDestroy(), 300);
    }, props.duration || 3000);
  }
});

const toastClasses: Record<ToastType, string> = {
  success: 'bg-green-700/80 border-green-400 backdrop-blur-sm',
  error: 'bg-red-800/80 border-red-500 backdrop-blur-sm',
  warning: 'bg-yellow-700/80 border-yellow-400 backdrop-blur-sm',
  info: 'bg-blue-800/80 border-blue-500 backdrop-blur-sm',
  loading: 'bg-gray-800/80 border-gray-500 backdrop-blur-sm',
};

// 暴露一个关闭方法，主要给 loading 使用
const close = () => {
  visible.value = false;
  setTimeout(() => props.onDestroy(), 300);
};

defineExpose({ close });
</script>

<style scoped>
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -20px);
}
</style>