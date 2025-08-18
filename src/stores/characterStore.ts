import { ref } from 'vue';
import { defineStore } from 'pinia';
import { request } from '@/services/request';
import { loadLocalCharacters } from '@/data/localData';
import { toast } from '@/utils/toast';
import type { Character, LocalCharacter } from '@/types';

// 定义一个统一的角色数据类型，用于store内部管理
export type CharacterData = (LocalCharacter | Character) & { source: 'local' | 'cloud' };

export const useCharacterStore = defineStore('character', () => {
  const characters = ref<CharacterData[]>([]);
  const isLoading = ref(false);
  const hasLoaded = ref(false); // 标记是否已加载过数据

  async function fetchCharacters(forceRefresh = false) {
    if (hasLoaded.value && !forceRefresh) {
      return;
    }

    isLoading.value = true;
    const allCharacters: CharacterData[] = [];

    const [localResult, cloudResult] = await Promise.allSettled([
      loadLocalCharacters(),
      request.get<Character[]>('/api/v1/characters/my')
    ]);

    if (localResult.status === 'fulfilled') {
      const localChars = localResult.value.map(c => ({ ...c, source: 'local' as const }));
      allCharacters.push(...localChars);
    } else {
      console.error('本地角色加载失败:', localResult.reason);
      toast.error('本地洞府存档加载失败。');
    }

    if (cloudResult.status === 'fulfilled') {
      const cloudChars = cloudResult.value.map(c => ({ ...c, source: 'cloud' as const }));
      allCharacters.push(...cloudChars);
    } else {
      console.warn('云端角色同步失败:', cloudResult.reason);
      toast.warning('云端角色同步失败，可能无法连接仙界。');
    }

    // 按创建时间降序排序
    allCharacters.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    characters.value = allCharacters;
    isLoading.value = false;
    hasLoaded.value = true;
  }

  function getCharacterById(id: number, source: 'local' | 'cloud') {
    return characters.value.find(c => c.id === id && c.source === source);
  }

  return {
    characters,
    isLoading,
    hasLoaded,
    fetchCharacters,
    getCharacterById,
  };
});