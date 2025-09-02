import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { CharacterProfile, SaveSlot, SaveData, NpcProfile, Item, PlayerStatus, CharacterBaseInfo } from '@/types/game';
import { toast } from '@/utils/toast';

// 模拟一个辅助函数，因为我们无法直接访问 Tavern हेल्पर
const getMockTavernHelper = () => ({
  getVariables: async (options: { type: string }) => {
    console.log(`[MockTavernHelper] Getting variables for type: ${options.type}`);
    // 在这里返回模拟的存档数据
    // 注意：这只是一个用于UI开发的模拟，实际数据应由Tavern提供
    const mockSaveData: Partial<SaveData> = {
      人物关系: {
        npc_1: {
          角色基础信息: { 名字: '李青崖', 性别: '男', 世界: '玄黄界', 天资: '凡人', 出生: '山村', 灵根: '无', 天赋: ['健壮'], 先天六司: { 根骨: 10, 灵性: 8, 悟性: 9, 气运: 5, 魅力: 7, 心性: 8 } },
          人物关系: '道侣',
          人物好感度: 100,
          互动次数: 152,
          最后互动时间: new Date().toISOString(),
          角色存档信息: { 位置: { 描述: '青竹峰' } } as any,
          AI行为: { 行为模式: '友好', 日常路线: [] },
          人物记忆: ['共同经历了青竹峰的考验'],
          特殊标记: ['信赖'],
        } as NpcProfile,
        npc_2: {
          角色基础信息: { 名字: '萧炎', 性别: '男', 世界: '斗气大陆', 天资: '天骄', 出生: '萧家', 灵根: '火', 天赋: ['坚韧'], 先天六司: { 根骨: 10, 灵性: 10, 悟性: 10, 气运: 10, 魅力: 10, 心性: 10 } },
          人物关系: '宿敌',
          人物好感度: -50,
          互动次数: 20,
          最后互动时间: new Date(Date.now() - 86400000 * 5).toISOString(),
          角色存档信息: { 位置: { 描述: '黑角域' } } as any,
          AI行为: { 行为模式: '敌对', 日常路线: [] },
          人物记忆: ['在黑角域发生过冲突'],
          特殊标记: ['警惕'],
        } as NpcProfile,
      },
    };
    return { 'character.saveData': mockSaveData };
  },
});


export const useCharacterStore = defineStore('character', () => {
  // --- STATE ---
  const activeCharacterProfile = ref<CharacterProfile | null>(null);
  const activeSaveSlot = ref<SaveSlot | null>(null);
  const isLoading = ref(false);

  // --- GETTERS / COMPUTED ---

  /** 所有人物关系，并按好感度降序排列 */
  const relationships = computed((): NpcProfile[] => {
    const relationshipsRecord = activeSaveSlot.value?.存档数据?.人物关系;
    if (!relationshipsRecord) {
      return [];
    }
    return Object.values(relationshipsRecord).sort((a, b) => (b.人物好感度 || 0) - (a.人物好感度 || 0));
  });

  /** 背包中的所有物品 */
  const inventoryItems = computed((): Item[] => {
    const itemsRecord = activeSaveSlot.value?.存档数据?.背包?.物品;
    if (!itemsRecord) return [];
    return Object.values(itemsRecord);
  });
  
  /** 当前玩家的动态状态 */
  const playerStatus = computed<PlayerStatus | undefined>(() => activeSaveSlot.value?.存档数据?.玩家角色状态);
  
  /** 当前角色的静态基础信息 */
  const baseInfo = computed<CharacterBaseInfo | undefined>(() => activeCharacterProfile.value?.角色基础信息);


  // --- ACTIONS ---
  
  /**
   * 设置当前激活的角色和存档槽位
   * @param profile 角色档案
   * @param saveSlotId 存档槽位ID, e.g., "存档1"
   */
  function setActiveCharacter(profile: CharacterProfile, saveSlotId: string) {
    activeCharacterProfile.value = profile;
    if (profile.存档列表 && profile.存档列表[saveSlotId]) {
      activeSaveSlot.value = profile.存档列表[saveSlotId];
    } else if (profile.存档) {
      activeSaveSlot.value = profile.存档;
    } 
    else {
      activeSaveSlot.value = null;
    }
  }

  /**
   * 从Tavern后端刷新当前激活存档的所有动态数据
   */
  async function refreshActiveSaveData() {
    isLoading.value = true;
    try {
      // 在实际环境中，我们会使用真实的 getTavernHelper
      // 为了在UI开发中解耦，我们暂时使用模拟函数
      const helper = getMockTavernHelper(); 
      if (!helper) {
        toast.error("Tavern Helper not available.");
        return;
      }
      
      const chatVars = await helper.getVariables({ type: 'chat' });
      const saveData = chatVars['character.saveData'] as SaveData;

      if (saveData && typeof saveData === 'object') {
        if (activeSaveSlot.value) {
            // 将获取到的最新数据合并到当前存档中
            activeSaveSlot.value.存档数据 = { ...activeSaveSlot.value.存档数据, ...saveData };
            toast.success('角色数据已刷新！');
        } else {
            console.warn("存档数据已加载，但当前没有激活的存档槽位。");
        }
      } else {
        toast.info("未能从Tavern变量中找到有效的存档数据。");
      }

    } catch (error) {
      console.error('[CharacterStore] 刷新存档数据失败:', error);
      toast.error('刷新角色数据失败。');
    } finally {
      isLoading.value = false;
    }
  }

  return {
    // State
    activeCharacterProfile,
    activeSaveSlot,
    isLoading,
    // Getters
    relationships,
    inventoryItems,
    playerStatus,
    baseInfo,
    // Actions
    setActiveCharacter,
    refreshActiveSaveData,
  };
});