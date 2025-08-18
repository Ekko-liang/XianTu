import { ref, shallowRef, watch, type Component, type Ref } from 'vue';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { saveWorldInstance, type WorldInstanceData } from '@/data/localData';
import { toast } from '@/utils/toast';

// 引入视图组件
import MessagePanel from '@/components/game-view/MessagePanel.vue';
import MapView from '@/components/game-view/MapView.vue';

export function useGameView(worldInstance: Ref<WorldInstanceData | null>) {
  const creationStore = useCharacterCreationStore();
  
  const messages = ref<string[]>([]);
  const mainViewComponent = shallowRef<Component>(MessagePanel);
  const mapData = ref<any>(null);

  // --- 初始化消息 ---
  const initializeMessages = () => {
    messages.value = []; // 清空旧消息
    if (creationStore.initialGameMessage) {
      messages.value.push(creationStore.initialGameMessage);
      creationStore.setInitialGameMessage(''); 
    } else {
      messages.value.push('你睁开双眼，一段新的因果，就此开始。');
    }
  };

  // --- 事件处理函数 ---
  const handleInteraction = async (actionId: string) => {
    console.log(`[useGameView] 接到指令: ${actionId}`);
    
    switch (actionId) {
      case 'explore':
        if (mainViewComponent.value === MessagePanel) {
          if (mapData.value) {
            mainViewComponent.value = MapView;
            toast.info('打开坤舆图志...');
          } else {
            toast.error('此方天地尚未衍化舆图！');
          }
        } else {
          mainViewComponent.value = MessagePanel;
          toast.info('返回通天玄镜...');
        }
        break;
        
      default:
        messages.value.push(`你执行了【${actionId}】指令...（此法门尚未实现）`);
        break;
    }
  };

  const handleSendMessage = (message: string) => {
    console.log(`[useGameView] 接到传音: ${message}`);
    messages.value.push(`你说道: "${message}"`);
  };

  const handleMapDataUpdate = async (newMapData: any) => {
    console.log('[useGameView] 更新地图数据:', newMapData);
    mapData.value = newMapData;
    
    if (worldInstance.value) {
      worldInstance.value.mapInfo = newMapData;
      try {
        await saveWorldInstance(worldInstance.value);
      } catch (error) {
        console.error('[useGameView] 保存地图数据失败:', error);
      }
    }
  };
  
  // 监听 worldInstance 的变化来初始化或更新地图和消息
  watch(worldInstance, (newInstance) => {
    if (newInstance) {
      mapData.value = newInstance.mapInfo;
      console.log('[useGameView] 侦测到世界实例变化，已更新地图数据');
      initializeMessages();
    }
  }, { immediate: true });


  return {
    messages,
    mainViewComponent,
    mapData,
    handleInteraction,
    handleSendMessage,
    handleMapDataUpdate,
  };
}