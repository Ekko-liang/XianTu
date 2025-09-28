import type { CharacterBaseInfo, SaveData, WorldInfo, PlayerStatus } from '@/types/game';
import type { World } from '@/types';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { calculateInitialAttributes } from './characterInitialization';

/**
 * 单机模式下的本地初始化（不依赖酒馆/AI）
 * 创建一个结构正确、包含基础物品的存档
 */
export async function initializeCharacterOffline(
  charId: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number
): Promise<SaveData> {
  console.log('[离线初始化] 开始执行本地角色创建...');

  // 1. 计算基础属性
  const playerStatus: PlayerStatus = calculateInitialAttributes(baseInfo, age);

  // 2. 设置一个合理的默认位置
  playerStatus.位置 = { 描述: '一个宁静的凡人村落' };

  // 3. 构建一个符合最新数据结构的完整 SaveData 对象
  const saveData: SaveData = {
    角色基础信息: baseInfo,
    玩家角色状态: playerStatus,
    装备栏: {
      装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null,
    },
    三千大道: createEmptyThousandDaoSystem(),
    背包: {
      灵石: { 下品: 10, 中品: 0, 上品: 0, 极品: 0 }, // 给予10个下品灵石作为启动资金
      物品: [ // [REFACTORED] 物品现在是数组
        {
          名称: '新手丹药',
          类型: '丹药',
          数量: 3,
          品级: '凡品',
          描述: '一颗普通的丹药，能恢复少量气血。',
        },
        {
          名称: '粗布衣',
          类型: '装备',
          数量: 1,
          品级: '凡品',
          描述: '一件朴素的粗布衣服，能提供微不足道的防御。',
        }
      ],
    },
    人物关系: {},
    宗门系统: {
      availableSects: [], sectRelationships: {}, sectHistory: [],
    },
    记忆: {
      短期记忆: ['你从一个宁静的村落开始了你的旅程，前路漫漫，道阻且长。'],
      中期记忆: [],
      长期记忆: [],
    },
    游戏时间: {
      年: 1, 月: 1, 日: 1, 小时: 8, 分钟: 0,
    },
    修炼功法: {
      功法: null, 熟练度: 0, 已解锁技能: [], 修炼时间: 0, 突破次数: 0, 正在修炼: false, 修炼进度: 0,
    },
    世界信息: {
      世界名称: world.name,
      世界背景: world.description,
      大陆信息: [],
      势力信息: [],
      地点信息: [],
      生成信息: {
        生成时间: new Date().toISOString(),
        世界背景: world.description,
        世界纪元: world.era || '未知纪元',
        特殊设定: [],
        版本: 'offline-1.1' // 版本号提升
      }
    }
  };

  console.log('[离线初始化] 本地角色创建完成:', saveData);
  return saveData;
}