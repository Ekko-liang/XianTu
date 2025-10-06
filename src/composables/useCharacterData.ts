/**
 * 统一角色数据访问组合式API
 * 直接对应酒馆变量，确保数据双向同步
 *
 * 数据结构完全对应酒馆分片变量：
 * - 基础信息 (角色基础信息)
 * - 境界 (玩家角色状态.境界)
 * - 属性 (玩家角色状态.气血/灵气/神识/寿命)
 * - 位置 (玩家角色状态.位置)
 * - 修炼功法
 * - 掌握技能
 * - 装备栏
 * - 背包_灵石 (背包.灵石)
 * - 背包_物品 (背包.物品)
 * - 人物关系
 * - 三千大道
 * - 世界信息
 * - 游戏时间
 * - 状态效果 (玩家角色状态.状态效果)
 * - 记忆_短期/中期/长期 (记忆.短期/中期/长期)
 */

import { computed } from 'vue';
import { useCharacterStore } from '@/stores/characterStore';

export function useUnifiedCharacterData() {
  const characterStore = useCharacterStore();

  const saveData = computed(() => characterStore.activeSaveSlot?.存档数据);
  const isDataLoaded = computed(() => !!saveData.value);

  // 直接映射酒馆变量结构
  const characterData = computed(() => {
    if (!saveData.value) return null;

    const data = saveData.value;
    const playerStatus = data.玩家角色状态;

    return {
      // 基础信息 - 对应酒馆变量 {{get_chat_variable::基础信息}}
      基础信息: data.角色基础信息,

      // 境界 - 对应酒馆变量 {{get_chat_variable::境界}}
      境界: playerStatus?.境界,

      // 属性 - 对应酒馆变量 {{get_chat_variable::属性}}
      属性: {
        气血: playerStatus?.气血,
        灵气: playerStatus?.灵气,
        神识: playerStatus?.神识,
        寿命: playerStatus?.寿命
      },

      // 位置 - 对应酒馆变量 {{get_chat_variable::位置}}
      位置: playerStatus?.位置,

      // 修炼功法 - 对应酒馆变量 {{get_chat_variable::修炼功法}}
      修炼功法: data.修炼功法,

      // 掌握技能 - 对应酒馆变量 {{get_chat_variable::掌握技能}}
      掌握技能: data.掌握技能,

      // 装备栏 - 对应酒馆变量 {{get_chat_variable::装备栏}}
      装备栏: data.装备栏,

      // 背包_灵石 - 对应酒馆变量 {{get_chat_variable::背包_灵石}}
      背包_灵石: data.背包?.灵石,

      // 背包_物品 - 对应酒馆变量 {{get_chat_variable::背包_物品}}
      背包_物品: data.背包?.物品,

      // 人物关系 - 对应酒馆变量 {{get_chat_variable::人物关系}}
      人物关系: data.人物关系,

      // 三千大道 - 对应酒馆变量 {{get_chat_variable::三千大道}}
      三千大道: data.三千大道,

      // 世界信息 - 对应酒馆变量 {{get_chat_variable::世界信息}}
      世界信息: data.世界信息,

      // 游戏时间 - 对应酒馆变量 {{get_chat_variable::游戏时间}}
      游戏时间: data.游戏时间,

      // 状态效果 - 对应酒馆变量 {{get_chat_variable::状态效果}}
      状态效果: playerStatus?.状态效果 || [],

      // 记忆 - 对应酒馆变量 {{get_chat_variable::记忆_短期/中期/长期}}
      记忆: data.记忆,

      // 完整玩家状态（包含所有属性）
      玩家角色状态: playerStatus
    };
  });

  return {
    characterData,
    saveData,
    isDataLoaded
  };
}

/**
 * 获取基础信息和状态
 * 兼容旧版本组件
 */
export function useCharacterBasicData() {
  const { characterData } = useUnifiedCharacterData();

  const basicInfo = computed(() => characterData.value?.基础信息);
  const status = computed(() => characterData.value?.玩家角色状态);

  return {
    basicInfo,
    status
  };
}

/**
 * 获取修炼相关数据
 * 兼容旧版本组件
 */
export function useCharacterCultivationData() {
  const { characterData, saveData } = useUnifiedCharacterData();

  const realm = computed(() => characterData.value?.境界);
  const techniques = computed(() => characterData.value?.修炼功法 || []);
  const daoSystem = computed(() => characterData.value?.三千大道);

  return {
    saveData,
    realm,
    techniques,
    daoSystem
  };
}
