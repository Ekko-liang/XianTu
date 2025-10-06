/**
 * @fileoverview 角色初始化服务
 * 负责角色创建生成和完整初始化流程，包括AI动态生成。
 */

import { getTavernHelper } from '@/utils/tavern';
import { syncToTavern } from '@/utils/judgement/heavenlyRules';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { useCharacterCreationStore } from '@/stores/characterCreationStore';
import { toast } from '@/utils/toast';
import type { CharacterBaseInfo, SaveData, PlayerStatus, WorldInfo } from '@/types/game';
import type { World } from '@/types';
import { generateInitialMessage } from '@/utils/tavernAI';
import { processGmResponse } from '@/utils/AIGameMaster';
import { createEmptyThousandDaoSystem } from '@/data/thousandDaoData';
import { buildCharacterInitializationPrompt } from '@/utils/prompts/characterInitializationPrompts';
import { validateGameData } from '@/utils/dataValidation';
// 移除未使用的旧生成器导入，改用增强版生成器
// import { WorldGenerationConfig } from '@/utils/worldGeneration/gameWorldConfig';
import { EnhancedWorldGenerator } from '@/utils/worldGeneration/enhancedWorldGenerator';
import { LOCAL_SPIRIT_ROOTS, LOCAL_ORIGINS } from '@/data/creationData';

/**
 * 判断是否为随机灵根（辅助函数）
 */
function isRandomSpiritRoot(spiritRoot: string | object): boolean {
  if (typeof spiritRoot === 'string') {
    return spiritRoot === '随机灵根' || spiritRoot.includes('随机');
  }
  return false;
}

/**
 * 询问用户是否继续重试的辅助函数
 * @param taskName 任务名称
 * @param errorMessage 错误信息
 * @returns 用户是否选择重试
 */
async function askUserForRetry(taskName: string, errorMessage: string): Promise<boolean> {
  return new Promise((resolve) => {
    const uiStore = useUIStore();
    uiStore.showRetryDialog({
      title: `${taskName}失败`,
      message: `${taskName}经过多次尝试后仍然失败。\n\n错误信息：${errorMessage}\n\n是否继续重试？\n选择"取消"将终止角色创建流程。`,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false)
    });
  });
}

/**
 * 创建一个健壮的、可重试的AI调用包装器，集成了自动重试和用户确认功能
 * @param aiFunction 要调用的AI生成函数
 * @param validator 验证AI响应是否有效的函数
 * @param maxRetries 最大自动重试次数
 * @param progressMessage 进行时显示的toast消息
 * @returns AI调用的返回结果
 */
async function robustAICall<T>(
  aiFunction: () => Promise<T>,
  validator: (response: T) => boolean,
  maxRetries: number,
  progressMessage: string
): Promise<T> {
  const uiStore = useUIStore();
  let lastError: Error | null = null;
  let attempt = 0;

  while (true) {
    attempt++;
    try {
      if (attempt > 1) {
        uiStore.updateLoadingText(`${progressMessage} (第 ${attempt - 1} 次重试)`);
      }
      console.log(`[robustAICall] 正在尝试: ${progressMessage}, 第 ${attempt} 次`);
      const response = await aiFunction();
      console.log(`[robustAICall] 收到响应 for ${progressMessage}:`, response);

      if (validator(response)) {
        console.log(`[robustAICall] 响应验证成功 for ${progressMessage}`);
        return response;
      }
      throw new Error(`AI响应格式无效或未通过验证`);

    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[AI调用重试] 第 ${attempt} 次尝试失败:`, lastError.message);

      if (attempt > maxRetries) {
        const userWantsToRetry = await askUserForRetry(progressMessage, lastError.message);
        if (userWantsToRetry) {
          attempt = 0; // 重置计数器，开始新一轮的用户确认重试
          continue;
        } else {
          throw new Error(`${progressMessage}失败，用户选择不继续重试: ${lastError.message}`);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
    }
  }
}

/**
 * 计算角色的初始属性值
 */
export function calculateInitialAttributes(baseInfo: CharacterBaseInfo, age: number): PlayerStatus {
  const { 先天六司 } = baseInfo;

  // 确保先天六司都是有效的数值，避免NaN
  const 根骨 = Number(先天六司?.根骨) || 10;
  const 灵性 = Number(先天六司?.灵性) || 10;
  const 悟性 = Number(先天六司?.悟性) || 10;

  // 基础属性计算公式
  const 初始气血 = 100 + 根骨 * 10;
  const 初始灵气 = 50 + 灵性 * 5;
  const 初始神识 = 30 + 悟性 * 3;

  // -- 寿命计算逻辑 --
  const 基础寿命 = 80; // 凡人基础寿命
  const 根骨寿命系数 = 5; // 每点根骨增加5年寿命
  const 最大寿命 = 基础寿命 + 根骨 * 根骨寿命系数;

  console.log(`[角色初始化] 属性计算: 气血=${初始气血}, 灵气=${初始灵气}, 神识=${初始神识}, 年龄=${age}/${最大寿命}`);
  console.log(`[角色初始化] 先天六司: 根骨=${根骨}, 灵性=${灵性}, 悟性=${悟性}`);

  return {
    境界: {
      名称: "凡人",
      阶段: "",
      当前进度: 0,
      下一级所需: 100,
      突破描述: "引气入体，开始修仙之路"
    },
    声望: 0, // 声望应该是数字类型
    位置: {
      描述: "位置生成失败" // 标记为错误状态而不是默认值
    },
    气血: { 当前: 初始气血, 上限: 初始气血 },
    灵气: { 当前: 初始灵气, 上限: 初始灵气 },
    神识: { 当前: 初始神识, 上限: 初始神识 },
    寿命: { 当前: age, 上限: 最大寿命 },
    状态效果: [] // 使用新的StatusEffect数组格式
  };
}

// =================================================================
// #region 角色初始化 - 辅助函数
// =================================================================

/**
 * 准备初始存档数据结构
 * @param baseInfo - 角色基础信息
 * @param age - 角色年龄
 * @returns 初始化后的存档数据和经过处理的baseInfo
 */
function prepareInitialData(baseInfo: CharacterBaseInfo, age: number): { saveData: SaveData; processedBaseInfo: CharacterBaseInfo } {
  console.log('[初始化流程] 1. 准备初始存档数据');

  // 深度克隆以移除响应式代理
  // 直接使用 JSON 方式，因为 baseInfo 可能包含 Vue 响应式对象
  let processedBaseInfo: CharacterBaseInfo;
  try {
    // 使用 JSON 序列化来移除响应式代理和不可序列化的属性
    processedBaseInfo = JSON.parse(JSON.stringify(baseInfo));
  } catch (jsonError) {
    console.error('[角色初始化] JSON 序列化失败，使用原始对象', jsonError);
    processedBaseInfo = baseInfo;
  }

  // 确保年龄信息存在
  if (!processedBaseInfo.年龄) {
    processedBaseInfo.年龄 = age;
  }

  // 注意：不再在此处理随机灵根和随机出生，完全交给 AI 处理
  // AI 会根据提示词中的引导，创造性地生成独特的灵根和出生
  // 这样可以避免固定的套路，每次初始化都会有不同的结果

  if (isRandomSpiritRoot(processedBaseInfo.灵根)) {
    console.log('[灵根生成] 检测到随机灵根，将由 AI 创造性生成');
    // 保留"随机灵根"字符串，让 AI 处理
  }

  if (typeof processedBaseInfo.出生 === 'string' &&
      (processedBaseInfo.出生 === '随机出生' || processedBaseInfo.出生.includes('随机'))) {
    console.log('[出生生成] 检测到随机出生，将由 AI 创造性生成');
    // 保留"随机出生"字符串，让 AI 处理
  }

  // 计算初始属性
  const playerStatus = calculateInitialAttributes(processedBaseInfo, age);

  // 创建基础存档结构
  const saveData: SaveData = {
    角色基础信息: processedBaseInfo,
    玩家角色状态: playerStatus,
    装备栏: { 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null },
    三千大道: createEmptyThousandDaoSystem(),
    背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
    人物关系: {},
    宗门系统: { availableSects: [], sectRelationships: {}, sectHistory: [] },
    记忆: { 短期记忆: [], 中期记忆: [], 长期记忆: [] },
    游戏时间: { 年: 1000, 月: 1, 日: 1, 小时: Math.floor(Math.random() * 12) + 6, 分钟: Math.floor(Math.random() * 60) },
    修炼功法: { 功法: null, 熟练度: 0, 已解锁技能: [], 修炼时间: 0, 突破次数: 0, 正在修炼: false, 修炼进度: 0 },
    掌握技能: [], // 初始化为空数组
    系统: {
      规则: {
        属性上限: { 先天六司: { 每项上限: 10 } },
        // 装备系统
        装备系统: '装备栏存储引用{物品ID,名称}，完整数据在背包.物品中',
        品质控制: '严格遵守境界对应品质范围，仙品世界上几乎没有，每一个都是令世界动荡的存在，神品不存在'
      },
      提示: [
        '⚠️ 先创建后修改：修改数据前必须确保数据已存在',
        '装备栏字段：装备1-6'
      ]
    }
  };

  // 注入AI元数据提示
  (saveData.装备栏 as any)._AI重要提醒 = '⚠️ 引用的物品ID必须已经在背包.物品数组中存在，否则会被系统清除！';
  (saveData.人物关系 as any)._AI重要提醒 = '⚠️ 每次与NPC对话或者在周围存在互动必须添加人物记忆';

  return { saveData, processedBaseInfo };
}

/**
 * 生成世界数据
 * @param baseInfo - 角色基础信息
 * @param world - 基础世界信息
 * @returns 生成的世界信息
 */
async function generateWorld(baseInfo: CharacterBaseInfo, world: World): Promise<WorldInfo> {
  console.log('[初始化流程] 2. 生成世界数据');
  const uiStore = useUIStore();
  uiStore.updateLoadingText('天道正在编织这个世界的命运...');

  const characterCreationStore = useCharacterCreationStore();
  const userWorldConfig = characterCreationStore.worldGenerationConfig;
  const selectedWorld = characterCreationStore.selectedWorld;

  const extractName = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (value && typeof value === 'object' && '名称' in (value as Record<string, unknown>)) {
      const n = (value as Record<string, unknown>).名称;
      if (typeof n === 'string') return n;
    }
    return String(value ?? '');
  };

  const enhancedConfig = {
    worldName: selectedWorld?.name || world.name,
    worldBackground: selectedWorld?.description || world.description,
    worldEra: selectedWorld?.era || world.era,
    factionCount: userWorldConfig.majorFactionsCount || 7,
    locationCount: userWorldConfig.totalLocations || 25,
    secretRealmsCount: userWorldConfig.secretRealmsCount || 8,
    continentCount: userWorldConfig.continentCount || Math.floor(Math.random() * 5) + 3,
    maxRetries: 3,
    retryDelay: 2000,
    characterBackground: extractName(baseInfo.出生),
    mapConfig: userWorldConfig.mapConfig
  };

  const enhancedWorldGenerator = new EnhancedWorldGenerator(enhancedConfig);
  const worldGenerationResult = await enhancedWorldGenerator.generateValidatedWorld();

  if (worldGenerationResult.success && worldGenerationResult.worldInfo) {
    console.log('[初始化流程] 世界生成成功');
    return worldGenerationResult.worldInfo;
  } else {
    throw new Error(`世界生成失败：${worldGenerationResult.errors?.join(', ') || '未知错误'}`);
  }
}

/**
 * 生成开场剧情和初始状态
 * @param saveData - 当前存档数据
 * @param baseInfo - 角色基础信息
 * @param world - 世界信息
 * @param age - 开局年龄
 * @returns 包含开场剧情和AI指令的响应
 */
async function generateOpeningScene(saveData: SaveData, baseInfo: CharacterBaseInfo, world: World, age: number) {
  console.log('[初始化流程] 3. 生成开场剧情');
  const uiStore = useUIStore();
  uiStore.updateLoadingText('天道正在为你书写命运之章...');

  // ⚠️ 重要：清空旧数据，准备同步新角色数据
  const helper = getTavernHelper();
  if (helper) {
    try {
      // 清空所有分片变量和旧的character变量
      console.log('[初始化流程] 清空旧的分片和character变量');
      const allVars = await helper.getVariables({ type: 'chat' });

      // 定义所有分片变量名
      const shardNames = [
        '基础信息', '境界', '属性', '位置', '修炼功法', '装备栏',
        '背包_灵石', '背包_物品', '人物关系', '三千大道', '世界信息',
        '记忆_短期', '记忆_中期', '记忆_长期', '游戏时间', '状态效果'
      ];

      // 删除所有分片变量
      for (const shardName of shardNames) {
        if (allVars[shardName] !== undefined) {
          await helper.deleteVariable(shardName, { type: 'chat' });
        }
      }

      // 删除旧的character.开头的变量（兼容旧版本）
      const characterKeys = Object.keys(allVars).filter(key => key.startsWith('character.'));
      for (const key of characterKeys) {
        await helper.deleteVariable(key, { type: 'chat' });
      }

      console.log('[初始化流程] 旧数据已清空（分片变量:', shardNames.length, '个 + character变量:', characterKeys.length, '个）');
    } catch (error) {
      console.warn('[初始化流程] 清空旧数据失败（非致命）:', error);
    }
  }

  // cacheSystemRulesToTavern 已废弃，规则通过提示词直接发送

  const userSelections = {
    name: baseInfo.名字,
    gender: baseInfo.性别,
    age: age,
    world: world.name,
    talentTier: baseInfo.天资,
    origin: baseInfo.出生,
    spiritRoot: baseInfo.灵根,
    talents: baseInfo.天赋 || [],
    attributes: (baseInfo.先天六司 || {}) as unknown as Record<string, number>
  };

  const customInitPrompt = buildCharacterInitializationPrompt(userSelections);

  // 为 AI 提供更完整的创建详情，便于处理“随机出身/随机灵根”等场景
  const getNameFrom = (val: unknown): string => {
    if (!val) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      const obj = val as Record<string, unknown>;
      if (typeof obj.名称 === 'string') return obj.名称;
      if (typeof obj.name === 'string') return obj.name;
    }
    return String(val);
  };

  const initialGameDataForAI = {
    baseInfo: baseInfo,
    saveData: saveData,
    world: { ...world, description: `世界名: ${world.name}, 纪元: ${world.era}. 背景: ${world.description}` },
    creationDetails: {
      age: age,
      originName: getNameFrom(baseInfo.出生),
      spiritRootName: getNameFrom(baseInfo.灵根),
      talentTierName: getNameFrom((baseInfo as any).天资详情 || baseInfo.天资),
      talentNames: Array.isArray((baseInfo as any).天赋详情)
        ? (baseInfo as any).天赋详情.map((t: any) => t?.name || t?.名称 || String(t)).filter(Boolean)
        : Array.isArray(baseInfo.天赋) ? baseInfo.天赋 : []
    },
    // 提供大洲信息供AI参考
    availableContinents: saveData.世界信息?.大陆信息?.map((continent: any) => ({
      名称: continent.名称 || continent.name,
      描述: continent.描述 || continent.description,
      大洲边界: continent.大洲边界 || continent.continent_bounds
    })) || [],
    // 提供地图配置供AI参考
    mapConfig: saveData.世界信息?.地图配置
  };

  const initialMessageResponse = await robustAICall(
    () => generateInitialMessage(initialGameDataForAI as any, {}, customInitPrompt),
    (response) => {
      if (!response || !response.text || typeof response.text !== 'string' || response.text.trim().length < 200) {
        console.warn('[AI验证] 生成的文本太短或无效');
        return false;
      }
      if (response.text.includes('随机') || response.text.includes('placeholder')) {
        console.warn('[AI验证] 生成的文本包含占位符');
        return false;
      }
      return true;
    },
    3,
    '天道正在书写命运之章'
  );

  // 处理AI返回的指令并更新存档
  const { saveData: saveDataAfterCommands, stateChanges } = await processGmResponse(initialMessageResponse, saveData, true);

  // 暂存状态变更
  const characterStore = useCharacterStore();
  characterStore.setInitialCreationStateChanges(stateChanges);

  // 验证开局故事存在性（记忆已在 processGmResponse 中添加，此处无需重复）
  const openingStory = String(initialMessageResponse.text || '');
  if (!openingStory.trim()) {
    throw new Error('AI生成的开场剧情为空');
  }

  return { finalSaveData: saveDataAfterCommands, aiResponse: initialMessageResponse };
}

/**
 * 从详情对象派生基础字段，确保数据一致性
 * @param baseInfo - 包含详情对象的基础信息
 * @param worldName - 世界名称
 * @returns 派生了基础字段的基础信息
 */
function deriveBaseFieldsFromDetails(baseInfo: CharacterBaseInfo, worldName: string): CharacterBaseInfo {
  const derivedInfo = { ...baseInfo };

  // 从详情对象派生基础字段
  derivedInfo.世界 = worldName;
  derivedInfo.天资 = derivedInfo.天资详情?.name || derivedInfo.天资详情?.名称 || derivedInfo.天资;
  derivedInfo.出生 = derivedInfo.出身详情?.name || derivedInfo.出身详情?.名称 || derivedInfo.出生;

  // 处理灵根：优先使用灵根详情，其次使用灵根对象本身，最后使用回退逻辑
  if (derivedInfo.灵根详情) {
    const detail = derivedInfo.灵根详情 as any;
    derivedInfo.灵根 = {
      名称: String(detail.name || detail.名称 || '五行灵根'),
      品级: String(detail.tier || detail.品级 || '凡品'),
      描述: String(detail.description || detail.描述 || '基础灵根')
    };
  } else if (typeof derivedInfo.灵根 === 'object' && derivedInfo.灵根) {
    // 如果灵根已经是对象格式但没有灵根详情，检查是否需要补充名称
    const rootObj = derivedInfo.灵根 as any;
    if (rootObj.名称 === '随机灵根' && rootObj.品级 && rootObj.品级 !== '凡品') {
      // 如果名称还是"随机灵根"但有品级，生成一个临时名称
      rootObj.名称 = `${rootObj.品级}灵根（待AI确定属性）`;
    }
  } else if (typeof derivedInfo.灵根 === 'string' && derivedInfo.灵根 === '随机灵根') {
    // 如果还是字符串"随机灵根"，转换为对象格式
    derivedInfo.灵根 = {
      名称: '随机灵根',
      品级: '凡品',
      描述: '大道五十，天衍四九，人遁其一'
    };
  }

  if (derivedInfo.天赋详情) {
    derivedInfo.天赋 = derivedInfo.天赋详情.map((talent: any) => talent.name || talent.名称 || talent);
  }

  return derivedInfo;
}


/**
 * 合并、验证并同步最终数据
 * @param saveData - 经过AI处理的存档
 * @param baseInfo - 原始角色基础信息
 * @param world - 原始世界信息
 * @param age - 原始年龄
 * @returns 最终完成的存档数据
 */
async function finalizeAndSyncData(saveData: SaveData, baseInfo: CharacterBaseInfo, world: World, age: number): Promise<SaveData> {
  console.log('[初始化流程] 4. 合并、验证并同步最终数据');
  const uiStore = useUIStore();
  uiStore.updateLoadingText(`正在同步数据，即将进入${baseInfo.名字}的修仙世界...`);

  const helper = getTavernHelper();
  if (!helper) throw new Error('无法连接到酒馆服务');

  // 1. 合并AI生成的数据和用户选择的原始数据，并保护核心字段
  const mergedBaseInfo: CharacterBaseInfo = {
    ...saveData.角色基础信息, // AI可能添加了新字段
    ...baseInfo,              // 用户的原始选择（包含*详情）优先级更高
    // 强制保护核心不可变字段
    名字: baseInfo.名字,
    性别: baseInfo.性别,
    年龄: age,
    先天六司: baseInfo.先天六司,
  };

  // 🔥 特殊处理：对于"随机"选项，使用AI生成的数据而不是用户的原始选择
  if (typeof baseInfo.灵根 === 'string' && baseInfo.灵根.includes('随机')) {
    console.log('[数据合并] 检测到随机灵根，使用AI生成的灵根数据');
    mergedBaseInfo.灵根 = saveData.角色基础信息?.灵根 || baseInfo.灵根;
  }
  if (typeof baseInfo.出生 === 'string' && baseInfo.出生.includes('随机')) {
    console.log('[数据合并] 检测到随机出生，使用AI生成的出生数据');
    mergedBaseInfo.出生 = saveData.角色基础信息?.出生 || baseInfo.出生;
  }

  // 2. 从详情对象派生基础字段，确保数据一致性
  const finalBaseInfo = deriveBaseFieldsFromDetails(mergedBaseInfo, world.name);
  saveData.角色基础信息 = finalBaseInfo;
  saveData.玩家角色状态.寿命.当前 = age;

  // 3. 最终位置信息修正
  const currentLocation = saveData.玩家角色状态?.位置?.描述;
  if (!currentLocation || !currentLocation.includes('·') || currentLocation.includes('某')) {
    const userBirthDescription = typeof baseInfo.出生 === 'string' ? baseInfo.出生 : (baseInfo.出生 as any)?.名称 || '';
    let fallbackLocation = '天星大陆·天青州·青石镇';
    if (userBirthDescription.includes('宗门')) fallbackLocation = '青云大陆·青云宗';
    else if (userBirthDescription.includes('世家')) fallbackLocation = '天星大陆·天青州·世家府邸';
    saveData.玩家角色状态.位置.描述 = fallbackLocation;
    console.log(`[数据修正] 位置格式不符合要求，已修正为: ${fallbackLocation}`);
  }

  // 4. 最终数据校验
  const finalValidation = validateGameData(saveData, { 角色基础信息: baseInfo, 模式: '单机' }, 'creation');
  if (!finalValidation.isValid) {
    throw new Error(`角色数据最终验证失败: ${finalValidation.errors.join(', ')}`);
  }

  // 5. 数据一致性校准：确保装备的功法在背包中存在实体
  if (saveData.修炼功法?.功法) {
    const equippedTechnique = saveData.修炼功法.功法;
    const techniqueName = typeof equippedTechnique === 'string' ? equippedTechnique : equippedTechnique.名称;

    // 检查背包中是否存在该功法物品
    const itemExists = Object.values(saveData.背包.物品).some(item => item.名称 === techniqueName && item.类型 === '功法');

    if (!itemExists) {
      console.warn(`[数据校准] 检测到已装备功法 "${techniqueName}" 在背包中不存在，正在自动创建物品实体...`);

      // 创建一个新的功法物品
      const itemId = `tech_${Date.now()}`;
      const newTechniqueItem: any = { // 使用 any 以便动态构建
        物品ID: itemId,
        名称: techniqueName,
        类型: '功法',
        品质: { quality: '神', grade: 1 }, // 默认给予一个高品质，因为通常初始功法都很重要
        数量: 1,
        已装备: true,
        描述: `初始功法：${techniqueName}。`,
        可叠加: false,
        功法效果: {
          修炼速度加成: 1.2, // 给予一个基础加成
        },
      };

      saveData.背包.物品[itemId] = newTechniqueItem;
      console.log(`[数据校准] 已成功为 "${techniqueName}" 创建背包物品实体。`);
    } else {
      // 如果物品已存在，确保其"已装备"状态为 true
      const existingItemEntry = Object.entries(saveData.背包.物品).find(([_, item]) => item.名称 === techniqueName && item.类型 === '功法');
      if (existingItemEntry) {
        const [itemId, existingItem] = existingItemEntry;
        if (existingItem && !existingItem.已装备) {
          existingItem.已装备 = true;
          console.log(`[数据校准] 已将背包中存在的功法 "${techniqueName}" 标记为已装备。`);
        }
      }
    }
  }

  // 6. 同步到Tavern
  try {
    // ⚠️ 清空所有分片变量和旧的character变量
    console.log('[初始化流程] 清空旧的分片和character变量');
    const allVars = await helper.getVariables({ type: 'chat' });

    // 定义所有分片变量名
    const shardNames = [
      '基础信息', '境界', '属性', '位置', '修炼功法', '装备栏',
      '背包_灵石', '背包_物品', '人物关系', '三千大道', '世界信息',
      '记忆_短期', '记忆_中期', '记忆_长期', '游戏时间', '状态效果'
    ];

    // 删除所有分片变量
    for (const shardName of shardNames) {
      if (allVars[shardName] !== undefined) {
        await helper.deleteVariable(shardName, { type: 'chat' });
      }
    }

    // 删除旧的character.开头的变量
    const characterKeys = Object.keys(allVars).filter(key => key.startsWith('character.'));
    for (const key of characterKeys) {
      await helper.deleteVariable(key, { type: 'chat' });
    }

    // 使用分片存储同步数据
    console.log('[初始化流程] 使用分片格式同步数据到酒馆');
    const { shardSaveData, saveAllShards } = await import('@/utils/storageSharding');
    const shards = shardSaveData(saveData);
    await saveAllShards(shards, helper);
    await helper.insertOrAssignVariables({ 'character.name': baseInfo.名字 }, { type: 'global' });

    console.log('[初始化流程] 数据同步到Tavern成功');
  } catch (err) {
    console.warn('保存游戏数据到酒馆失败，不影响本地游戏开始:', err);
  }

  return saveData;
}

// #endregion

/**
 * 完整的角色初始化流程 (AI驱动) - 重构版
 */
export async function initializeCharacter(
  charId: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number
): Promise<SaveData> {
  try {
    // 步骤 1: 准备初始数据
    const { saveData: initialSaveData, processedBaseInfo } = prepareInitialData(baseInfo, age);

    // 步骤 2: 生成世界
    const worldInfo = await generateWorld(processedBaseInfo, world);
    initialSaveData.世界信息 = worldInfo;

    // 步骤 3: 生成开场剧情
    const { finalSaveData } = await generateOpeningScene(initialSaveData, processedBaseInfo, world, age);

    // 步骤 4: 最终化并同步数据
    const completedSaveData = await finalizeAndSyncData(finalSaveData, baseInfo, world, age);

    console.log('[初始化流程] 角色创建成功！');
    return completedSaveData;

  } catch (error) {
    console.error('角色初始化失败：', error);
    // 错误由上层统一处理
    throw error;
  }
}

/**
 * 为现有角色创建新存档槽位
 */
export async function createNewSaveSlot(
  charId: string,
  slotName: string,
  baseInfo: CharacterBaseInfo,
  world: World,
  age: number
): Promise<SaveData> {
  // 调用初始化流程
  const saveData = await initializeCharacter(charId, baseInfo, world, age);

  // 添加一些新存档槽位特定的逻辑
  toast.success(`新存档《${slotName}》创建成功！`);

  return saveData;
}
