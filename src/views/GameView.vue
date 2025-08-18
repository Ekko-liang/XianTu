<!-- src/views/GameView.vue -->
<template>
  <GameLayout style="position: relative;">
    <UtilityControls />
    <template #header>
      <WorldHeader :state="worldState" />
    </template>

    <template #main-content>
      <Transition name="fade" mode="out-in">
        <component 
          :is="mainViewComponent" 
          :messages="messages" 
          :mapData="mapData"
          @updateMapData="handleMapDataUpdate"
        />
      </Transition>
    </template>

    <template #right-sidebar>
      <StatusPanel :status="characterStatus" />
    </template>

    <template #action-bar>
      <div class="action-bar-container">
        <InteractionPanel @action="handleInteraction" class="interaction-panel"/>
        <InputBar @send="handleSendMessage" class="input-bar"/>
      </div>
    </template>
  </GameLayout>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';
import { loadWorldInstance, type WorldInstanceData } from '@/data/localData';
import { toast } from '@/utils/toast';

// 引入组合式心法
import { useCharacterStatus } from '@/composables/useCharacterStatus';
import { useGameView } from '@/composables/useGameView';

// 引入组件
import GameLayout from '@/components/game-view/GameLayout.vue';
import WorldHeader, { type WorldState } from '@/components/game-view/WorldHeader.vue';
import InteractionPanel from '@/components/game-view/InteractionPanel.vue';
import StatusPanel from '@/components/game-view/StatusPanel.vue';
import InputBar from '@/components/game-view/InputBar.vue';
import UtilityControls from '@/components/game-view/UtilityControls.vue';

const props = defineProps<{
  characterId: number;
  source: 'local' | 'cloud';
}>();

const characterStore = useCharacterStore();

// --- 核心数据状态 ---
const worldInstance = ref<WorldInstanceData | null>(null);

// --- 计算属性 ---
// 1. 从 Store 中获取当前角色
const character = computed(() => characterStore.getCharacterById(props.characterId, props.source));

// 2. 派生角色状态
const { characterStatus } = useCharacterStatus(character);

// 3. 管理游戏视图交互
const {
  messages,
  mainViewComponent,
  mapData,
  handleInteraction,
  handleSendMessage,
  handleMapDataUpdate,
} = useGameView(worldInstance);

// 4. 派生世界状态
const worldState = computed<WorldState>(() => ({
  time: '开元元年春', // TODO: 动态化
  location: worldInstance.value?.continentName || '未知之地',
}));

// --- 监听和初始化 ---
watch(character, (newChar) => {
  if (newChar) {
    const instanceData = loadWorldInstance(newChar.world_id);
    if (instanceData) {
      worldInstance.value = instanceData;
    } else {
      toast.error(`找不到ID为 ${newChar.world_id} 的世界数据！`);
    }
  }
}, { immediate: true });

onMounted(async () => {
  // 确保角色列表已加载
  await characterStore.fetchCharacters();
});

</script>

<style scoped>
/* --- 视图切换过渡动画 --- */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* --- 操作栏样式 --- */
.action-bar-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  width: 100%;
  height: 100%;
}

.interaction-panel {
  flex-shrink: 0;
}

.input-bar {
  flex-grow: 1;
}
</style>