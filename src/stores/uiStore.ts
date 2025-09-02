import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUIStore = defineStore('ui', () => {
  const isLoading = ref(false);
  const loadingText = ref('');

  function startLoading(text = '正在加载...') {
    isLoading.value = true;
    loadingText.value = text;
  }

  function stopLoading() {
    isLoading.value = false;
    loadingText.value = '';
  }

  function updateLoadingText(text: string) {
    if (isLoading.value) {
      loadingText.value = text;
    }
  }

  return {
    isLoading,
    loadingText,
    startLoading,
    stopLoading,
    updateLoadingText,
  };
});