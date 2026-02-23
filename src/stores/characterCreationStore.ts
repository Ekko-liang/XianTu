import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import type {
  World,
  TalentTier,
  Origin,
  SpiritRoot,
  Talent,
  DADCustomData,
} from '../types';
import { aiService } from '@/services/aiService';
// Import the Tavern helper to interact with Tavern's variable system
import { getTavernHelper, getCurrentCharacterName } from '../utils/tavern';
import { fetchWorlds, fetchTalentTiers, fetchOrigins, fetchSpiritRoots, fetchTalents } from '../services/request';
import {
  INFINITE_GOLDEN_FINGERS,
  INFINITE_ATTRIBUTE_POINTS,
} from '../data/infiniteCreationData';

// =======================================================================
//                           本地类型定义
// =======================================================================

export type AttributeKey = 'root_bone' | 'spirituality' | 'comprehension' | 'fortune' | 'charm' | 'temperament';
export type InfiniteAttributeKey = 'strength' | 'perception' | 'intelligence' | 'luck' | 'charisma' | 'willpower';

export const INFINITE_TO_LEGACY_ATTRIBUTE_MAP: Record<InfiniteAttributeKey, AttributeKey> = {
  strength: 'root_bone',
  perception: 'spirituality',
  intelligence: 'comprehension',
  luck: 'fortune',
  charisma: 'charm',
  willpower: 'temperament',
};

export interface CharacterCreationPayload {
  character_name: string;
  gender: string;
  race: string;
  current_age: number;
  /** 金手指 ID */
  golden_finger_id: number | '';
  /** 穿越前身份（选填，纯叙事） */
  pre_reincarnation_identity: string;
  /** 先天六司（兼容旧字段名，固定 30 点分配） */
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
  /** @deprecated 兼容旧逻辑 */
  world_id?: number | '';
  talent_tier_id?: number | '';
  origin_id?: number | null;
  spirit_root_id?: number | null;
  selected_talent_ids?: number[];
}

type DataSource = 'local' | 'cloud';
type WorldWithSource = World & { source: DataSource };
type TalentTierWithSource = TalentTier & { source: DataSource };
type OriginWithSource = Origin & { source: DataSource };
type SpiritRootWithSource = SpiritRoot & { source: DataSource };
type TalentWithSource = Talent & { source: DataSource };

interface CharacterCreationDataWithSource {
  worlds: WorldWithSource[];
  talentTiers: TalentTierWithSource[];
  origins: OriginWithSource[];
  spiritRoots: SpiritRootWithSource[];
  talents: TalentWithSource[];
  /** 无限流简化：金手指 */
  goldenFingers: import('../data/infiniteCreationData').GoldenFinger[];
}

/** 无限流简化流程：3 步（金手指 → 属性 → 确认） */
const TOTAL_STEPS = 3;

// Type guard to validate the structure of DAD_creationData from Tavern
function isDADCustomData(data: unknown): data is DADCustomData {
  if (data === null || typeof data !== 'object') {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    Array.isArray(obj.worlds) &&
    Array.isArray(obj.talentTiers) &&
    Array.isArray(obj.origins) &&
    Array.isArray(obj.spiritRoots) &&
    Array.isArray(obj.talents)
  );
}

/** 无限流固定 30 点档位（兼容 CharacterBaseInfo 天资字段） */
const INFINITE_FIXED_TIER: TalentTier = {
  id: 0,
  name: '无限流标准',
  description: '基础属性固定 30 点分配',
  total_points: INFINITE_ATTRIBUTE_POINTS,
  rarity: 1,
  color: '#94a3b8',
};


// =======================================================================
//                           Store 定义
// =======================================================================

export const useCharacterCreationStore = defineStore('characterCreation', () => {
  // --- STATE ---
  const mode = ref<'single' | 'cloud'>('single');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  const creationData = ref<CharacterCreationDataWithSource>({
    worlds: [],
    talentTiers: [],
    origins: [],
    spiritRoots: [],
    talents: [],
    goldenFingers: INFINITE_GOLDEN_FINGERS,
  });

  const characterPayload = ref<CharacterCreationPayload>({
    gender: '男',
    character_name: '无名者',
    race: '人族',
    current_age: 16,
    golden_finger_id: '',
    pre_reincarnation_identity: '',
    root_bone: 0,
    spirituality: 0,
    comprehension: 0,
    fortune: 0,
    charm: 0,
    temperament: 0,
  });
  const currentStep = ref(1);
  const isLocalCreation = ref(true);
  const initialGameMessage = ref<string | null>(null);
  const useStreamingStart = ref(true); // 开局是否使用流式传输（默认启用）

  // ========== 角色创建流程状态管理 ==========
  // 用于跟踪创建流程的状态，确保按钮状态正确
  const isCreating = ref(false); // 是否正在创建角色
  type CreationPhase = 'idle' | 'preparing' | 'world_generation' | 'opening_scene' | 'finalizing' | 'completed' | 'failed';
  const creationPhase = ref<CreationPhase>('idle'); // 当前创建阶段
  const creationError = ref<string | null>(null); // 创建过程中的错误信息
  const generateMode = ref<'generate' | 'generateRaw'>('generate'); // 开局生成模式（默认使用 generate）
  const splitResponseGeneration = ref(true); // 第七步是否使用分步生成（默认启用，提高开局稳定性）

  // 世界生成配置 - 使用固定默认值，用户可在界面中修改
  const worldGenerationConfig = ref({
    majorFactionsCount: 5, // 默认5个主要势力
    totalLocations: 12, // 默认12个地点
    secretRealmsCount: 5, // 默认5个秘境
    continentCount: 4, // 默认4片大陆
    generateOnlyContinents: true // 默认只生成大陆（开局优化）
  });

  // 无限流难度配置
  type DifficultyLevel = '简单' | '普通' | '困难' | '噩梦';
  const gameDifficulty = ref<DifficultyLevel>('普通');

  // 难度提示词配置（切换式，非叠加）
  const difficultyPrompts: Record<DifficultyLevel, string> = {
    简单: `【难度模式：简单】
- 副本环境相对友善，关键线索更容易发现
- 敌对单位强度偏低，容错空间较高
- 资源与补给更充足，任务压力降低
- 团队协作收益更高，冲突惩罚更轻
- 判定难度-10，幸运点+5`,
    普通: `【难度模式：普通】
- 副本遵循标准无限流规则，机会与风险并存
- 敌我强度大体匹配，需要策略推进
- 资源获取需要行动成本，神点收益正常
- NPC态度中立，需要通过行为建立信任
- 判定难度正常，无额外修正`,
    困难: `【难度模式：困难】主神判定显著收紧！
- 副本威胁密度更高，误判代价明显放大
- 敌对单位普遍更强，正面冲突风险上升
- 资源稀缺，容错与恢复窗口变窄
- 关键节点需精确决策，否则连锁失败
- NPC更谨慎，建立协作需要更高成本
【困难模式惩罚】
- 所有判定难度+10
- 幸运点上限-5
- 大失败阈值扩大：<难度-10即为大失败
- 失败必有代价，不可轻描淡写
- 敌人威胁等级普遍高于玩家半级到一级`,
    噩梦: `【难度模式：噩梦】主神开启极限筛选！
- 副本极度危险，陷阱与高压事件持续叠加
- 敌对强度远超常规，硬拼几乎必败
- 资源极度稀缺，恢复和补给窗口极短
- 关键目标强制时限，拖延会触发惩罚链
- NPC高度戒备，信任建立极慢
- 生存风险极高，每一步都可能致命
【噩梦模式惩罚】
- 所有判定难度+20
- 幸运点上限-10，下限-15
- 大失败阈值扩大：<难度-5即为大失败
- 大失败惩罚翻倍（重伤变濒死，损失翻倍）
- 失败也有严重代价
- 敌人评级普遍比主角高一到两级
- 开局自带负面状态：【天道试炼】（所有判定-5，持续整个游戏）
- 机缘出现概率减半，陷阱出现概率翻倍`
  };

  // 获取当前难度的提示词
  const currentDifficultyPrompt = computed(() => difficultyPrompts[gameDifficulty.value]);

  // 同步“开局流式/生成模式”与 AI 配置，并做本地持久化（网页版/酒馆版本都适用）
  try {
    const cfg = aiService.getConfig();
    useStreamingStart.value = cfg.streaming !== false;
    generateMode.value = (cfg.initMode === 'generateRaw' ? 'generateRaw' : 'generate');
  } catch {
    // ignore (e.g. storage unavailable)
  }

  try {
    const savedUseStreamingStart = localStorage.getItem('dad_creation_useStreamingStart');
    if (savedUseStreamingStart !== null) {
      useStreamingStart.value = savedUseStreamingStart !== 'false';
    }
    const savedGenerateMode = localStorage.getItem('dad_creation_generateMode');
    if (savedGenerateMode === 'generate' || savedGenerateMode === 'generateRaw') {
      generateMode.value = savedGenerateMode;
    }
  } catch {
    // ignore
  }

  // 工坊“开局配置”落地：允许从本地存储读取并覆盖默认开局参数（一次性应用，可在界面继续修改）
  const applyStartConfig = (cfg: unknown) => {
    if (!cfg || typeof cfg !== 'object') return;
    const anyCfg = cfg as any;

    const aiCfg = (anyCfg.ai && typeof anyCfg.ai === 'object') ? anyCfg.ai : anyCfg;
    const streaming = aiCfg.streaming ?? aiCfg.useStreamingStart;
    if (typeof streaming === 'boolean') useStreamingStart.value = streaming;
    const initMode = aiCfg.initMode ?? aiCfg.generateMode;
    if (initMode === 'generate' || initMode === 'generateRaw') generateMode.value = initMode;

    const worldCfg =
      (anyCfg.world && typeof anyCfg.world === 'object')
        ? anyCfg.world
        : (anyCfg.worldGenerationConfig && typeof anyCfg.worldGenerationConfig === 'object')
          ? anyCfg.worldGenerationConfig
          : null;

    const clampInt = (value: unknown, min: number, max: number): number | null => {
      const n = Number(value);
      if (!Number.isFinite(n)) return null;
      const i = Math.floor(n);
      return Math.min(max, Math.max(min, i));
    };

    if (worldCfg) {
      const next = { ...worldGenerationConfig.value };
      const majorFactionsCount = clampInt(worldCfg.majorFactionsCount, 1, 30);
      const totalLocations = clampInt(worldCfg.totalLocations, 1, 60);
      const secretRealmsCount = clampInt(worldCfg.secretRealmsCount, 0, 30);
      const continentCount = clampInt(worldCfg.continentCount, 1, 12);
      if (majorFactionsCount !== null) next.majorFactionsCount = majorFactionsCount;
      if (totalLocations !== null) next.totalLocations = totalLocations;
      if (secretRealmsCount !== null) next.secretRealmsCount = secretRealmsCount;
      if (continentCount !== null) next.continentCount = continentCount;
      worldGenerationConfig.value = next;
    }

    const charCfg = (anyCfg.character && typeof anyCfg.character === 'object') ? anyCfg.character : null;
    if (charCfg) {
      const next = { ...characterPayload.value };
      const name = typeof charCfg.character_name === 'string' ? charCfg.character_name.trim() : null;
      const gender = typeof charCfg.gender === 'string' ? charCfg.gender.trim() : null;
      const race = typeof charCfg.race === 'string' ? charCfg.race.trim() : null;
      const currentAge = clampInt(charCfg.current_age, 1, 3000);

      if (name) next.character_name = name;
      if (gender) next.gender = gender;
      if (race) next.race = race;
      if (currentAge !== null) next.current_age = currentAge;

      characterPayload.value = next;
    }
  };

  try {
    const rawStartConfig = localStorage.getItem('dad_start_config');
    if (rawStartConfig) {
      applyStartConfig(JSON.parse(rawStartConfig));
    }
  } catch {
    // ignore (invalid json / storage unavailable)
  }

  watch(useStreamingStart, (val) => {
    try {
      localStorage.setItem('dad_creation_useStreamingStart', String(val));
    } catch {
      // ignore
    }
  });

  watch(generateMode, (val) => {
    try {
      localStorage.setItem('dad_creation_generateMode', val);
    } catch {
      // ignore
    }
  });

  // --- GETTERS ---
  const totalSteps = computed(() => TOTAL_STEPS);
  const attributes = computed(() => ({
    root_bone: characterPayload.value.root_bone,
    spirituality: characterPayload.value.spirituality,
    comprehension: characterPayload.value.comprehension,
    fortune: characterPayload.value.fortune,
    charm: characterPayload.value.charm,
    temperament: characterPayload.value.temperament,
  }));
  const infiniteAttributes = computed(() => ({
    strength: characterPayload.value.root_bone,
    perception: characterPayload.value.spirituality,
    intelligence: characterPayload.value.comprehension,
    luck: characterPayload.value.fortune,
    charisma: characterPayload.value.charm,
    willpower: characterPayload.value.temperament,
  }));
  /** 金手指 */
  const selectedGoldenFinger = computed(() =>
    creationData.value.goldenFingers.find((g) => g.id === characterPayload.value.golden_finger_id) || null
  );
  /** 穿越前身份（选填文本） */
  const preReincarnationIdentity = computed(() => characterPayload.value.pre_reincarnation_identity);
  /** 兼容：世界（无限流不选世界，返回固定占位） */
  const selectedWorld = computed((): WorldWithSource | null => ({
    id: 0,
    name: '主神空间',
    era: '无限流',
    description: '轮回者的起点',
    source: 'local' as DataSource,
  } as WorldWithSource));
  /** 兼容：天资 <- 固定 30 点档位 */
  const selectedTalentTier = computed(() => INFINITE_FIXED_TIER);
  /** 兼容：穿越契机已移除 */
  const selectedOrigin = computed(() => null);
  /** 兼容：天赋潜能已移除 */
  const selectedSpiritRoot = computed(() => null);
  /** 兼容：无限流不再有模版初始技能，由 AI 根据身份动态生成 */
  const selectedTalents = computed((): TalentWithSource[] => []);

  const bonusTalentPoints = computed(() => 0);

  /** 无限流：固定 30 点，剩余 = 30 - 已分配属性总和 */
  const remainingTalentPoints = computed(() => {
    const allocated = Object.values(attributes.value).reduce((sum, val) => sum + val, 0);
    return INFINITE_ATTRIBUTE_POINTS - allocated;
  });

  const totalTalentCost = computed(() => 0);

  // --- ACTIONS ---

  async function persistCustomData() {
    const dataToSave: DADCustomData = {
      worlds: creationData.value.worlds.filter(item => item.source === 'cloud'),
      talentTiers: creationData.value.talentTiers.filter(item => item.source === 'cloud'),
      origins: creationData.value.origins.filter(item => item.source === 'cloud'),
      spiritRoots: creationData.value.spiritRoots.filter(item => item.source === 'cloud'),
      talents: creationData.value.talents.filter(item => item.source === 'cloud'),
    };

    // 保存到 IndexedDB
    const { saveData } = await import('@/utils/indexedDBManager');
    await saveData('customCreationData', dataToSave);
    console.log("【创世神殿】自定义创世数据已保存到数据库！");
  }

  async function createEmptyPayload(): Promise<CharacterCreationPayload> {
    let character_name = '无名者';
    try {
      const userName = await getCurrentCharacterName();
      character_name = userName || '无名者';
    } catch {
      character_name = '无名者';
    }
    return {
      gender: '男',
      character_name,
      race: '人族',
      current_age: 16,
      golden_finger_id: '',
      pre_reincarnation_identity: '',
      root_bone: 0,
      spirituality: 0,
      comprehension: 0,
      fortune: 0,
      charm: 0,
      temperament: 0,
    };
  }

  async function initializeStore(currentMode: 'single' | 'cloud') {
    isLoading.value = true;
    error.value = null;
    mode.value = currentMode;
    isLocalCreation.value = (currentMode === 'single'); // 同步设置 isLocalCreation

    // 初始化时获取用户名字
    try {
      const userName = await getCurrentCharacterName();
      characterPayload.value.character_name = userName || '无名者';
      console.log("【创世神殿】已获取用户道号:", characterPayload.value.character_name);
    } catch (error) {
      console.warn('【创世神殿】获取用户道号失败，使用默认名', error);
      characterPayload.value.character_name = '无名者';
    }

    try {
      console.log("【创世神殿】初始化模式:", currentMode, "加载金手指数据");
      creationData.value.goldenFingers = INFINITE_GOLDEN_FINGERS;
      creationData.value.worlds = [];
      creationData.value.talentTiers = [];
      creationData.value.origins = [];
      creationData.value.spiritRoots = [];
      creationData.value.talents = [];
    } catch (e) {
      console.error("加载数据失败:", e);
      error.value = "加载数据失败";
      creationData.value.goldenFingers = INFINITE_GOLDEN_FINGERS;
    } finally {
      isLoading.value = false;
    }
  }
  /** 无限流简化：金手指使用本地数据 */
  async function fetchCloudWorlds() {
    creationData.value.goldenFingers = INFINITE_GOLDEN_FINGERS;
  }

  /** 无限流简化：云端创角数据暂用本地金手指 */
  async function fetchAllCloudData(): Promise<number> {
    creationData.value.goldenFingers = INFINITE_GOLDEN_FINGERS;
    return 0;
  }


  function addWorld(world: World) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.worlds.unshift({ ...world, source });
    persistCustomData();
  }
  function addTalentTier(tier: TalentTier) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.talentTiers.unshift({ ...tier, source });
    persistCustomData();
  }
  function addOrigin(origin: Origin) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.origins.unshift({ ...origin, source });
    persistCustomData();
  }
  function addSpiritRoot(root: SpiritRoot) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.spiritRoots.unshift({ ...root, source });
    persistCustomData();
  }
  function addTalent(talent: Talent) {
    // 用户自定义创建的数据都标记为'cloud'以便持久化，不管当前是否为单机模式
    const source = 'cloud' as const;
    creationData.value.talents.unshift({ ...talent, source });
    persistCustomData();
  }

  function addGeneratedData(type: string, data: unknown) {
    switch (type) {
      case 'world': addWorld(data as World); break;
      case 'talent_tier': addTalentTier(data as TalentTier); break;
      case 'origin': addOrigin(data as Origin); break;
      case 'spirit_root': addSpiritRoot(data as SpiritRoot); break;
      case 'talent': addTalent(data as Talent); break;
      default: console.warn(`Unknown data type for addGeneratedData: ${type}`);
    }
  }
  
  // --- 新增：删除功能 ---
  type CreationDataType = 'worlds' | 'talentTiers' | 'origins' | 'spiritRoots' | 'talents';

  async function removeItem(type: CreationDataType, id: number) {
    const index = creationData.value[type].findIndex(item => item.id === id);
    if (index > -1) {
      const removedItem = creationData.value[type][index];
      creationData.value[type].splice(index, 1);
      console.log(`【创世神殿】已删除 ${type} 项目，ID: ${id}，来源: ${removedItem.source}`);
      
      // 立即持久化到酒馆全局变量
      await persistCustomData();
      
      // 关键修复：如果删除的是云端数据，需要强制刷新酒馆全局变量
      if (removedItem.source === 'cloud') {
        console.log(`【创世神殿】删除云端数据，强制同步酒馆全局变量`);
        try {
          const helper = getTavernHelper();
          if (helper) {
            // 方案1：先尝试完全重置 DAD_creationData
            console.log(`【创世神殿】方案1：完全重置 DAD_creationData`);
            
            // 构建当前内存中的所有云端数据（已删除目标项）
            const newData: DADCustomData = {
              worlds: creationData.value.worlds.filter(item => item.source === 'cloud'),
              talentTiers: creationData.value.talentTiers.filter(item => item.source === 'cloud'),
              origins: creationData.value.origins.filter(item => item.source === 'cloud'),
              spiritRoots: creationData.value.spiritRoots.filter(item => item.source === 'cloud'),
              talents: creationData.value.talents.filter(item => item.source === 'cloud'),
            };
            
            console.log(`【创世神殿】准备保存的新数据:`, JSON.stringify(newData, null, 2));
            
            // 先删除旧的 DAD_creationData
            try {
              await helper.deleteVariable('DAD_creationData', { type: 'global' });
              console.log(`【创世神殿】已删除旧的 DAD_creationData`);
            } catch (e) {
              console.warn(`【创世神殿】删除旧变量失败（可能不存在）:`, e);
            }
            
            // 清理数据，移除不可序列化的值（修复酒馆助手3.6.11的structuredClone问题）
            const { deepCleanForClone } = await import('@/utils/dataValidation');
            const cleanedNewData = deepCleanForClone({ 'DAD_creationData': newData });

            // 重新创建 DAD_creationData
            await helper.insertOrAssignVariables(cleanedNewData, { type: 'global' });
            
            console.log(`【创世神殿】已重新创建 DAD_creationData`);
            
            // 验证删除是否成功
            const verifyVars = await helper.getVariables({ type: 'global' });
            const verifyData = verifyVars['DAD_creationData'];
            console.log(`【创世神殿】验证：更新后的 DAD_creationData:`, JSON.stringify(verifyData, null, 2));
            
            if (verifyData && isDADCustomData(verifyData)) {
              const remainingItems = (verifyData[type] as any[]).filter((item: any) => item.id === id);
              if (remainingItems.length === 0) {
                console.log(`【创世神殿】✅ 验证成功：${type} 项目 ID: ${id} 已从酒馆全局变量中删除`);
              } else {
                console.error(`【创世神殿】❌ 验证失败：${type} 项目 ID: ${id} 仍在酒馆全局变量中`);
                console.error(`【创世神殿】剩余项目:`, remainingItems);
              }
            } else {
              console.error(`【创世神殿】❌ 验证失败：DAD_creationData 格式无效`);
            }
          } else {
            console.error(`【创世神殿】❌ 酒馆助手不可用`);
          }
        } catch (error) {
          console.error('【创世神殿】❌ 同步酒馆全局变量失败:', error);
        }
      }
    } else {
      console.warn(`【创世神殿】删除失败：未找到 ${type} 项目，ID: ${id}`);
    }
  }

  const removeWorld = async (id: number) => await removeItem('worlds', id);
  const removeTalentTier = async (id: number) => await removeItem('talentTiers', id);
  const removeOrigin = async (id: number) => await removeItem('origins', id);
  const removeSpiritRoot = async (id: number) => await removeItem('spiritRoots', id);
  const removeTalent = async (id: number) => await removeItem('talents', id);

  // --- 新增：编辑功能 ---
  function updateItem<T extends { id: number }>(type: CreationDataType, id: number, updatedData: Partial<T>) {
    const index = creationData.value[type].findIndex(item => item.id === id);
    if (index > -1) {
      // 保持原有数据源标记，只更新内容
      const currentItem = creationData.value[type][index];
      creationData.value[type][index] = { ...currentItem, ...updatedData };
      console.log(`【创世神殿】已更新 ${type} 项目，ID: ${id}`);
      persistCustomData();
      return true;
    }
    return false;
  }

  const updateWorld = (id: number, data: Partial<World>) => updateItem('worlds', id, data);
  const updateTalentTier = (id: number, data: Partial<TalentTier>) => updateItem('talentTiers', id, data);
  const updateOrigin = (id: number, data: Partial<Origin>) => updateItem('origins', id, data);
  const updateSpiritRoot = (id: number, data: Partial<SpiritRoot>) => updateItem('spiritRoots', id, data);
  const updateTalent = (id: number, data: Partial<Talent>) => updateItem('talents', id, data);

  // 获取单个项目数据（用于编辑时填充表单）
  const getItemById = <T extends { id: number }>(type: CreationDataType, id: number): T | null => {
    return creationData.value[type].find(item => item.id === id) as T || null;
  };
  
  function selectGoldenFinger(goldenFingerId: number | '') {
    characterPayload.value.golden_finger_id = goldenFingerId;
  }
  function setPreReincarnationIdentity(text: string) {
    characterPayload.value.pre_reincarnation_identity = text;
  }
  function selectWorld(_worldId: number | '') {
    // 无限流不选世界
  }
  function selectTalentTier(_tierId: number | '') {
    // 无限流无天资选择，固定 30 点
  }
  function selectOrigin(_originId: number | null) {}
  function selectSpiritRoot(_rootId: number | null) {}
  function toggleTalent(_talentId: number) {}
  function setAttribute(key: AttributeKey, value: number) { if (key in characterPayload.value) characterPayload.value[key] = value; }
  function setInfiniteAttribute(key: InfiniteAttributeKey, value: number) {
    const legacyKey = INFINITE_TO_LEGACY_ATTRIBUTE_MAP[key];
    setAttribute(legacyKey, value);
  }

  function setAIGeneratedSpiritRoot(spiritRoot: SpiritRoot) {
    if (!spiritRoot || typeof spiritRoot !== 'object' || !spiritRoot.name) return;
    let existingRoot = creationData.value.spiritRoots.find(r => r.name === spiritRoot.name);
    if (!existingRoot) {
      const newId = Math.max(...creationData.value.spiritRoots.map(r => r.id), 0) + 1;
      const newRootWithId = { ...spiritRoot, id: newId };
      addSpiritRoot(newRootWithId);
      existingRoot = creationData.value.spiritRoots.find(r => r.name === spiritRoot.name); // Re-find it to be safe
      console.log(`[创世神殿] AI生成了新的灵根 "${spiritRoot.name}" 并已添加到列表中 (ID: ${newId})`);
    }
    if (existingRoot) {
        characterPayload.value.spirit_root_id = existingRoot.id;
        console.log(`[创世神殿] 已将玩家选择的灵根更新为AI生成的结果: "${existingRoot.name}"`);
    }
  }

  function setAIGeneratedOrigin(origin: Origin) {
    if (!origin || typeof origin !== 'object' || !origin.name) return;
    let existingOrigin = creationData.value.origins.find(o => o.name === origin.name);
    if (!existingOrigin) {
      const newId = Math.max(...creationData.value.origins.map(o => o.id), 0) + 1;
      const newOriginWithId = { ...origin, id: newId };
      addOrigin(newOriginWithId);
      existingOrigin = creationData.value.origins.find(o => o.name === origin.name); // Re-find it to be safe
      console.log(`[创世神殿] AI生成了新的出身 "${origin.name}" 并已添加到列表中 (ID: ${newId})`);
    }
    if (existingOrigin) {
        characterPayload.value.origin_id = existingOrigin.id;
        console.log(`[创世神殿] 已将玩家选择的出身更新为AI生成的结果: "${existingOrigin.name}"`);
    }
  }

  async function resetCharacter() {
    const newPayload = await createEmptyPayload();
    characterPayload.value = newPayload;
    currentStep.value = 1;
    // 重置世界生成配置为默认值
    worldGenerationConfig.value = {
      majorFactionsCount: 5,
      totalLocations: 12,
      secretRealmsCount: 5,
      continentCount: 4,
      generateOnlyContinents: true // 默认只生成大陆（开局优化）
    };
  }
  function nextStep() { if (currentStep.value < TOTAL_STEPS) currentStep.value++; }
  function prevStep() { if (currentStep.value > 1) currentStep.value--; }
  function goToStep(step: number) { if (step >= 1 && step <= TOTAL_STEPS) currentStep.value = step; }
  function setMode(newMode: 'single' | 'cloud') { mode.value = newMode; isLocalCreation.value = (newMode === 'single'); }
  function toggleLocalCreation() { isLocalCreation.value = !isLocalCreation.value; }
  function setInitialGameMessage(message: string) { initialGameMessage.value = message; }
  
  // 设置世界生成配置
  function setWorldGenerationConfig(config: Partial<typeof worldGenerationConfig.value>) {
    worldGenerationConfig.value = { ...worldGenerationConfig.value, ...config };
  }
  async function resetOnExit() { await resetCharacter(); mode.value = 'single'; isLocalCreation.value = true; }
  async function startLocalCreation() { await resetCharacter(); isLocalCreation.value = true; mode.value = 'single'; }
  async function startCloudCreation() { await resetCharacter(); isLocalCreation.value = false; mode.value = 'cloud'; }

  // ========== 创建流程状态管理函数 ==========
  function startCreation() {
    isCreating.value = true;
    creationPhase.value = 'preparing';
    creationError.value = null;
    console.log('[创世神殿] 开始创建角色流程');
  }

  function setCreationPhase(phase: CreationPhase) {
    creationPhase.value = phase;
    console.log(`[创世神殿] 创建阶段更新: ${phase}`);
  }

  function completeCreation() {
    isCreating.value = false;
    creationPhase.value = 'completed';
    creationError.value = null;
    console.log('[创世神殿] 角色创建完成');
  }

  function failCreation(errorMsg: string) {
    isCreating.value = false;
    creationPhase.value = 'failed';
    creationError.value = errorMsg;
    console.log(`[创世神殿] 角色创建失败: ${errorMsg}`);
  }

  function resetCreationState() {
    isCreating.value = false;
    creationPhase.value = 'idle';
    creationError.value = null;
    console.log('[创世神殿] 重置创建状态');
  }

  return {
    mode, isLoading, error, creationData, characterPayload, currentStep, isLocalCreation, initialGameMessage, worldGenerationConfig, useStreamingStart, generateMode, splitResponseGeneration,
    isCreating, creationPhase, creationError,
    gameDifficulty, currentDifficultyPrompt,
    totalSteps, attributes, infiniteAttributes,
    selectedGoldenFinger, preReincarnationIdentity, selectedWorld, selectedTalentTier, selectedOrigin, selectedSpiritRoot, selectedTalents, remainingTalentPoints, totalTalentCost, bonusTalentPoints,
    initializeStore, fetchCloudWorlds, fetchAllCloudData, addWorld, addTalentTier, addOrigin, addSpiritRoot, addTalent, addGeneratedData,
    removeWorld, removeTalentTier, removeOrigin, removeSpiritRoot, removeTalent, // 导出删除函数
    updateWorld, updateTalentTier, updateOrigin, updateSpiritRoot, updateTalent, getItemById, // 导出编辑函数
    selectGoldenFinger, setPreReincarnationIdentity, selectWorld, selectTalentTier, selectOrigin, selectSpiritRoot, toggleTalent, setAttribute, setInfiniteAttribute,
    resetCharacter, nextStep, prevStep, goToStep, setMode, toggleLocalCreation, setInitialGameMessage, setWorldGenerationConfig,
    resetOnExit, startLocalCreation, startCloudCreation, persistCustomData,
    setAIGeneratedSpiritRoot,
    setAIGeneratedOrigin,
    // 创建流程状态管理函数
    startCreation, setCreationPhase, completeCreation, failCreation, resetCreationState,
  };
});
