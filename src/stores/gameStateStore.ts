/**
 * 主神空间无限流 - 游戏状态管理
 * @author 千夜 | GitHub: qianye60 | Bilibili: 477576651
 * @license CC BY-NC-SA 4.0 - 商业使用需授权
 */
import { defineStore } from 'pinia';
import { set, get, cloneDeep } from 'lodash';
import type {
  CharacterBaseInfo,
  PlayerAttributes,
  PlayerLocation,
  Inventory,
  NpcProfile,
  WorldInfo,
  WorldFaction,
  Memory,
  GameTime,
  SaveData,
  Equipment,
  GameMessage,
  EventSystem,
  SectMemberInfo,
  SectSystemV2,
  StatusEffect,
} from '@/types/game';
import type {
  GamePhase,
  HubState,
  Mission,
  MissionResult,
  TeamState,
} from '@/types/mission';
import type { ReincarnatorProfile } from '@/types/reincarnator';
import { isTavernEnv } from '@/utils/tavern';
import { ensureSystemConfigHasNsfw } from '@/utils/nsfw';
import { isSaveDataV3, migrateSaveDataToLatest } from '@/utils/saveMigration';
import { normalizeInventoryCurrencies, syncGodPointsBetweenProfileAndInventory } from '@/utils/currencySystem';
import { detectPlayerSectLeadership } from '@/utils/sectLeadershipUtils';
import { createDefaultInfiniteAbilityTree, createNewDaoData, getInfiniteAbilityNodeById } from '@/data/thousandDaoData';
import {
  RANK_SOUL_RANGES,
  buildDifficultyStatsFromHistory,
  canTriggerPromotionTrial,
  getEffectiveMissionCountForRank,
  getRankFromSoulStrength,
  getStarFromSoulStrength,
  incrementDifficultyStats,
  normalizeDifficultyStats,
  normalizeMissionDifficulty,
} from '@/utils/reincarnatorProgress';

function buildTechniqueProgress(inventory: Inventory | null) {
  const progress: Record<string, { 熟练度: number; 已解锁技能: string[] }> = {};
  const items = inventory?.物品 || {};

  Object.values(items).forEach((item: any) => {
    if (item?.类型 !== '功法' && item?.类型 !== '能力芯片') return;
    const itemId = item.物品ID;
    if (!itemId) return;
    progress[itemId] = {
      熟练度: Number(item.修炼进度 ?? item.熟练度 ?? 0),
      已解锁技能: Array.isArray(item.已解锁技能) ? item.已解锁技能 : []
    };
  });

  return progress;
}

function cloneOrCreateDaoSystem(thousandDao: unknown): any {
  if (thousandDao && typeof thousandDao === 'object' && (thousandDao as any).大道列表) {
    return JSON.parse(JSON.stringify(thousandDao));
  }
  return createDefaultInfiniteAbilityTree();
}

function unlockAbilityInDaoSystem(
  daoSystem: any,
  abilityId: string,
  options?: {
    fallbackName?: string;
    fallbackDescription?: string;
    minStage?: number;
    minTotalExp?: number;
  },
) {
  const id = String(abilityId || '').trim();
  if (!id) return;
  if (!daoSystem || typeof daoSystem !== 'object') return;
  if (!daoSystem.大道列表 || typeof daoSystem.大道列表 !== 'object') daoSystem.大道列表 = {};

  const node = getInfiniteAbilityNodeById(id);
  const currentDao = daoSystem.大道列表[id];
  const fallbackDao = createNewDaoData(
    node?.name || String(options?.fallbackName || currentDao?.道名 || id),
    node?.description || String(options?.fallbackDescription || currentDao?.描述 || '能力路径'),
  );
  const minStage = Math.max(1, Number(options?.minStage ?? 1));
  const minTotalExp = Math.max(0, Number(options?.minTotalExp ?? 0));

  daoSystem.大道列表[id] = {
    ...fallbackDao,
    ...(currentDao || {}),
    道名: node?.name || currentDao?.道名 || fallbackDao.道名,
    描述: node?.description || currentDao?.描述 || fallbackDao.描述,
    是否解锁: true,
    当前阶段: Math.max(minStage, Number(currentDao?.当前阶段 ?? minStage)),
    总经验: Math.max(Number(currentDao?.总经验 ?? 0), minTotalExp),
  };
}

function normalizeRelationshipMatrixV3(raw: unknown, npcNames: string[]): any | null {
  const names = (Array.isArray(npcNames) ? npcNames : [])
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter(Boolean);

  const ensureBase = (): any => ({
    version: 1,
    nodes: Array.from(new Set(names)).slice(0, 300),
    edges: [],
  });

  if (raw == null) {
    // 没有任何 NPC 时不强制生成该字段（保持可选）
    return names.length > 0 ? ensureBase() : null;
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) return ensureBase();

  const matrix: any = raw as any;

  const nodes = Array.isArray(matrix.nodes)
    ? matrix.nodes
        .map((n: any) => (typeof n === 'string' ? n.trim() : ''))
        .filter(Boolean)
    : [];
  const mergedNodes = Array.from(new Set([...nodes, ...names])).slice(0, 300);

  const edgesRaw = Array.isArray(matrix.edges) ? matrix.edges : [];
  const seen = new Set<string>();
  const edges: any[] = [];
  for (const e of edgesRaw) {
    if (!e || typeof e !== 'object') continue;
    const from = typeof (e as any).from === 'string' ? (e as any).from.trim() : '';
    const to = typeof (e as any).to === 'string' ? (e as any).to.trim() : '';
    if (!from || !to || from === to) continue;

    // 以无向边去重（UI 也是按无向合并）
    const a = from < to ? from : to;
    const b = from < to ? to : from;
    const key = `${a}::${b}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const relation = typeof (e as any).relation === 'string' ? (e as any).relation : undefined;
    const score = typeof (e as any).score === 'number' && Number.isFinite((e as any).score) ? (e as any).score : undefined;
    const tags = Array.isArray((e as any).tags)
      ? (e as any).tags.filter((t: any) => typeof t === 'string' && t.trim()).slice(0, 12)
      : undefined;
    const updatedAt = typeof (e as any).updatedAt === 'string' ? (e as any).updatedAt : undefined;

    edges.push({ from, to, relation, score, tags, updatedAt });
    if (edges.length >= 2000) break;
  }

  return {
    version: typeof matrix.version === 'number' && Number.isFinite(matrix.version) ? matrix.version : 1,
    nodes: mergedNodes.length ? mergedNodes : Array.from(new Set(names)).slice(0, 300),
    edges,
  };
}

function ensureRelationshipMatrix(raw: unknown): any {
  const matrix = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as any) : {};
  const nodes = Array.isArray(matrix.nodes) ? matrix.nodes.filter((v: unknown) => typeof v === 'string' && v.trim()) : [];
  const edges = Array.isArray(matrix.edges) ? matrix.edges.filter((v: unknown) => v && typeof v === 'object') : [];
  return {
    version: Number.isFinite(Number(matrix.version)) ? Number(matrix.version) : 1,
    nodes: Array.from(new Set(nodes)).slice(0, 300),
    edges: edges.slice(0, 2000),
  } as any;
}

function upsertRelationshipEdge(
  raw: unknown,
  from: string,
  to: string,
  relation: string,
  scoreDelta: number,
  tags: string[] = [],
  updatedAt = new Date().toISOString(),
): any {
  const matrix = ensureRelationshipMatrix(raw);
  if (!from || !to || from === to) return matrix;

  const nodes = Array.from(new Set([...(matrix.nodes as string[]), from, to])).slice(0, 300);
  const idx = (matrix.edges as any[]).findIndex((edge) => {
    const a = String(edge?.from ?? '');
    const b = String(edge?.to ?? '');
    return (a === from && b === to) || (a === to && b === from);
  });

  const prev = idx >= 0 ? (matrix.edges[idx] as any) : null;
  const prevScore = Number(prev?.score ?? 0);
  const nextScore = Math.max(-100, Math.min(100, Math.round(prevScore + scoreDelta)));
  const mergedTags = Array.from(
    new Set([
      ...(Array.isArray(prev?.tags) ? prev.tags.filter((t: unknown) => typeof t === 'string') : []),
      ...tags.filter((t) => !!t),
    ]),
  ).slice(0, 12);

  const nextEdge = {
    from,
    to,
    relation,
    score: nextScore,
    tags: mergedTags.length > 0 ? mergedTags : undefined,
    updatedAt,
  };

  const edges = [...(matrix.edges as any[])];
  if (idx >= 0) edges[idx] = nextEdge;
  else edges.push(nextEdge);

  return {
    ...matrix,
    nodes,
    edges: edges.slice(0, 2000),
  };
}

function buildTeamMemberNpcProfile(name: string, location?: PlayerLocation | null): NpcProfile {
  return {
    名字: name,
    性别: '其他',
    出生日期: { 年: 1000, 月: 1, 日: 1 },
    种族: '人类',
    出生: '主神空间招募',
    外貌描述: '神情警觉，装备简洁，随时准备投入副本。',
    性格特征: ['谨慎', '务实'],
    境界: { 名称: '轮回者', 阶段: '新人', 当前进度: 0, 下一级所需: 100, 突破描述: '完成更多副本提升生存能力' } as any,
    灵根: '未觉醒',
    天赋: [],
    先天六司: { 根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5 },
    属性: {
      气血: { 当前: 100, 上限: 100 },
      灵气: { 当前: 80, 上限: 80 },
      神识: { 当前: 80, 上限: 80 },
      寿元上限: 120,
    },
    与玩家关系: '队友',
    好感度: 10,
    当前位置: location ? { ...location } : { 描述: '主神空间·休息区' },
    人格底线: ['背叛队伍', '抛弃同伴'],
    记忆: [],
    当前外貌状态: '保持戒备',
    当前内心想法: '评估下一次副本风险',
    背包: { 灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 }, 物品: {} },
    实时关注: false,
  };
}

const createDefaultHubState = (): HubState => ({
  unlockedAreas: ['exchange', 'training', 'social', 'terminal', 'portal'],
  shopInventory: [
    {
      id: 'shop_basic_medkit',
      name: '应急治疗包',
      category: 'item',
      price: 120,
      stock: 10,
      description: '副本内快速恢复生命值。',
    },
    {
      id: 'shop_info_scan',
      name: '副本信息扫描',
      category: 'info',
      price: 200,
      stock: 99,
      description: '显示副本基础规则与初始威胁。',
    },
  ],
  availableMissions: [],
  npcs: [
    { id: 'hub_guide', name: '引导者', role: '空间接待员', favor: 0 },
    { id: 'hub_merchant', name: '灰市商人', role: '商店管理员', favor: 0 },
  ],
});

const createDefaultTeamState = (): TeamState => ({
  members: [],
  sharedResources: [],
  teamLevel: 1,
  collaborationLogs: [],
  teamEvents: [],
});

const createDefaultReincarnatorProfile = (): ReincarnatorProfile => ({
  level: 'D',
  soulStrength: 0,
  soulStrengthCapMultiplier: 1,
  star: 1,
  missionCount: 0,
  effectiveMissionCountByDifficulty: {
    D: 0,
    C: 0,
    B: 0,
    A: 0,
    S: 0,
    SS: 0,
    SSS: 0,
  },
  survivalRate: 1,
  promotionPoints: 0,
  promotionFailureStreak: 0,
  promotionTrialFailures: 0,
  promotionTrialPending: false,
  pendingPromotionTarget: null,
  godPoints: 0,
  abilities: [],
  attributes: {
    STR: 5,
    PER: 5,
    INT: 5,
    LUK: 5,
    CHA: 5,
    WIL: 5,
  },
  vitals: {
    HP: { current: 100, max: 100 },
    EP: { current: 80, max: 80 },
    MP: { current: 80, max: 80 },
  },
});

const buildReincarnatorFromLegacy = (input: {
  character?: CharacterBaseInfo | null;
  attributes?: PlayerAttributes | null;
  missionCount?: number;
}): ReincarnatorProfile => {
  const fallback = createDefaultReincarnatorProfile();
  const character = input.character;
  const attributes = input.attributes as any;
  const innate = character?.先天六司 as any;

  const hpCurrent = Number(attributes?.气血?.当前 ?? fallback.vitals.HP.current);
  const hpMax = Number(attributes?.气血?.上限 ?? fallback.vitals.HP.max);
  const epCurrent = Number(attributes?.灵气?.当前 ?? fallback.vitals.EP.current);
  const epMax = Number(attributes?.灵气?.上限 ?? fallback.vitals.EP.max);
  const mpCurrent = Number(attributes?.神识?.当前 ?? fallback.vitals.MP.current);
  const mpMax = Number(attributes?.神识?.上限 ?? fallback.vitals.MP.max);

  const soulStrength = Number(input.missionCount ?? 0) * 8;
  const level = getRankFromSoulStrength(soulStrength);
  const star = getStarFromSoulStrength(level, soulStrength);

  return {
    level,
    soulStrength,
    soulStrengthCapMultiplier: 1,
    star,
    missionCount: Number(input.missionCount ?? 0),
    effectiveMissionCountByDifficulty: {
      D: Number(input.missionCount ?? 0),
      C: 0,
      B: 0,
      A: 0,
      S: 0,
      SS: 0,
      SSS: 0,
    },
    survivalRate: 1,
    promotionPoints: 0,
    promotionFailureStreak: 0,
    promotionTrialFailures: 0,
    promotionTrialPending: false,
    pendingPromotionTarget: null,
    godPoints: 0,
    abilities: [],
    attributes: {
      STR: Number(innate?.根骨 ?? fallback.attributes.STR),
      PER: Number(innate?.灵性 ?? fallback.attributes.PER),
      INT: Number(innate?.悟性 ?? fallback.attributes.INT),
      LUK: Number(innate?.气运 ?? fallback.attributes.LUK),
      CHA: Number(innate?.魅力 ?? fallback.attributes.CHA),
      WIL: Number(innate?.心性 ?? fallback.attributes.WIL),
    },
    vitals: {
      HP: { current: hpCurrent, max: hpMax },
      EP: { current: epCurrent, max: epMax },
      MP: { current: mpCurrent, max: mpMax },
    },
  };
};

// 定义各个模块的接口
interface GameState {
  // --- V3 元数据/系统字段（随存档保存）---
  saveMeta: any | null;
  onlineState: any | null;
  userSettings: any | null;

  character: CharacterBaseInfo | null;
  attributes: PlayerAttributes | null;
  location: PlayerLocation | null;
  inventory: Inventory | null;
  equipment: Equipment | null;
  relationships: Record<string, NpcProfile> | null;
  /**
   * NPC-NPC 关系网（可选）。
   * 之前该字段未落入 store，会导致 AI 写入的 `社交.关系矩阵` 在 UI/保存时丢失。
   */
  relationshipMatrix: any | null;
  worldInfo: WorldInfo | null;
  /** 【境界地图集】开关开启时使用， key 为境界名称，如 "练气期" */
  realmMapCollection: Record<string, WorldInfo> | null;
  sectSystem: SectSystemV2 | null;
  sectMemberInfo: SectMemberInfo | null;
  memory: Memory | null;
  gameTime: GameTime | null;
  narrativeHistory: GameMessage[] | null;
  isGameLoaded: boolean;

  // 无限流核心状态
  gamePhase: GamePhase;
  hubState: HubState;
  currentMission: Mission | null;
  missionHistory: MissionResult[];
  teamState: TeamState;
  reincarnator: ReincarnatorProfile;

  // 三千大道系统
  thousandDao: any | null;
  // 事件系统
  eventSystem: EventSystem;
  // 修炼功法
  cultivationTechnique: any | null;
  // 修炼模块（完整结构）
  cultivation: any | null;
  // 功法模块（进度/套装）
  techniqueSystem: any | null;
  // 技能模块（掌握技能/冷却）
  skillState: any | null;
  // 效果（buff/debuff数组）
  effects: StatusEffect[] | null;
  // 掌握技能
  masteredSkills: any[] | null;
  // 系统配置
  systemConfig: any | null;
  // 角色.身体（完整对象，包含酒馆端扩展字段）
  body: Record<string, any> | null;
  // 身体部位开发
  bodyPartDevelopment: Record<string, any> | null;

  // 时间点存档配置
  timeBasedSaveEnabled: boolean; // 是否启用时间点存档
  timeBasedSaveInterval: number; // 时间点存档间隔（分钟）
  lastTimeBasedSave: number | null; // 上次时间点存档的时间戳

  // 对话后自动存档配置
  conversationAutoSaveEnabled: boolean; // 是否启用对话后自动存档
}

export const useGameStateStore = defineStore('gameState', {
  state: (): GameState => ({
    saveMeta: null,
    onlineState: null,
    userSettings: null,

    character: null,
    attributes: null,
    location: null,
    inventory: null,
    equipment: null,
    relationships: null,
    relationshipMatrix: null,
    worldInfo: null,
    realmMapCollection: null,
    sectSystem: null,
    sectMemberInfo: null,
    memory: null,
    gameTime: null,
    narrativeHistory: [],
    isGameLoaded: false,

    gamePhase: 'hub',
    hubState: createDefaultHubState(),
    currentMission: null,
    missionHistory: [],
    teamState: createDefaultTeamState(),
    reincarnator: createDefaultReincarnatorProfile(),

    // 其他游戏系统
    thousandDao: createDefaultInfiniteAbilityTree(),
    eventSystem: {
      配置: {
        启用随机事件: true,
        最小间隔年: 1,
        最大间隔年: 10,
        事件提示词: '',
      },
      下次事件时间: null,
      事件记录: [],
    },
    cultivationTechnique: null,
    cultivation: null,
    techniqueSystem: null,
    skillState: null,
    effects: [],
    masteredSkills: null,
    systemConfig: null,
    body: null,
    bodyPartDevelopment: null,

    // 时间点存档配置（默认关闭，用户可在设置中开启）
    timeBasedSaveEnabled: false,
    timeBasedSaveInterval: 10, // 默认10分钟
    lastTimeBasedSave: null,

    // 对话后自动存档配置（默认开启）
    conversationAutoSaveEnabled: true,
  }),

  actions: {
    /**
     * 从 IndexedDB 加载游戏存档到 Pinia Store
     * @param characterId 角色ID
     * @param saveSlot 存档槽位名称
     */
    async loadGame(characterId: string, saveSlot: string) {
      console.log(`[GameState] Loading game for character ${characterId}, slot ${saveSlot}`);

      // 从 characterStore 获取存档数据
      const { useCharacterStore } = await import('./characterStore');
      const characterStore = useCharacterStore();

      const profile = characterStore.rootState.角色列表[characterId];
      if (!profile) {
        console.error(`[GameState] Character ${characterId} not found`);
        return;
      }

      // 新架构：从 characterStore 加载存档数据，它会处理从 IndexedDB 读取的逻辑
      const saveData = await characterStore.loadSaveData(characterId, saveSlot);

      if (saveData) {
        this.loadFromSaveData(saveData);
        console.log('[GameState] Game loaded successfully');
      } else {
        console.error(`[GameState] No save data found for character ${characterId}, slot ${saveSlot}`);
      }
    },

    /**
     * 将当前 Pinia Store 中的游戏状态保存到 IndexedDB
     */
    async saveGame() {
      if (!this.isGameLoaded) {
        console.warn('[GameState] Game not loaded, skipping save.');
        return;
      }

      console.log('[GameState] Saving game state...');

      // 通过 characterStore 的 saveCurrentGame 来保存
      const { useCharacterStore } = await import('./characterStore');
      const characterStore = useCharacterStore();

      await characterStore.saveCurrentGame();
      console.log('[GameState] Game saved successfully');
    },

    /**
     * 从 SaveData 对象加载状态
     * @param saveData 完整的存档数据
     */
    loadFromSaveData(saveData: SaveData) {
      const v3 = (isSaveDataV3(saveData) ? saveData : migrateSaveDataToLatest(saveData).migrated) as any;

      const deepCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

      // V3 保存的元数据/联机/设置也读入到 store（用于后续保存回写）
      this.saveMeta = v3?.元数据 ? deepCopy(v3.元数据) : null;
      this.onlineState = v3?.系统?.联机 ? deepCopy(v3.系统.联机) : null;
      this.userSettings = v3?.系统?.设置 ? deepCopy(v3.系统.设置) : null;
      const infiniteFlowState = v3;
      const rawPhase = String(v3?.元数据?.当前阶段 ?? infiniteFlowState?.当前阶段 ?? 'hub');
      const gamePhase: GamePhase =
        rawPhase === 'mission' || rawPhase === 'settlement' ? rawPhase : 'hub';
      const normalizeQualitySuffix = (obj: any, field: string) => {
        if (!obj || typeof obj !== 'object') return;

        const raw = obj[field];
        if (raw == null) return;

        if (typeof raw === 'string') {
          if (raw && !raw.endsWith('品')) obj[field] = `${raw}品`;
          return;
        }

        if (typeof raw === 'object') {
          const qualityName = String((raw as any).quality ?? (raw as any).品质 ?? (raw as any).品阶 ?? '');
          if (!qualityName) return;
          obj[field] = qualityName.endsWith('品') ? qualityName : `${qualityName}品`;
        }
      };

      const reincarnatorRoot = v3?.轮回者 && typeof v3.轮回者 === 'object' ? deepCopy(v3.轮回者) : null;
      const roleMirror = v3?.角色 && typeof v3.角色 === 'object' ? deepCopy(v3.角色) : null;

      const character: CharacterBaseInfo | null = reincarnatorRoot?.身份 ?? roleMirror?.身份 ?? null;
      const attributes: PlayerAttributes | null = reincarnatorRoot?.属性 ?? roleMirror?.属性 ?? null;
      const location: PlayerLocation | null = reincarnatorRoot?.位置 ?? roleMirror?.位置 ?? null;
      if (location && (this.onlineState as any)?.模式 === '联机') {
        delete (location as any).x;
        delete (location as any).y;
      }
      const inventory: Inventory | null = reincarnatorRoot?.背包 ?? roleMirror?.背包 ?? null;
      const equipment: Equipment | null = reincarnatorRoot?.装备 ?? roleMirror?.装备 ?? null;
      const relationships: Record<string, NpcProfile> | null = v3?.社交?.关系 ? deepCopy(v3.社交.关系) : null;
      const relationshipMatrix = normalizeRelationshipMatrixV3(v3?.社交?.关系矩阵, Object.keys(relationships || {}));
      const worldInfo: WorldInfo | null = v3?.世界?.信息 ? deepCopy(v3.世界.信息) : null;
      const realmMapCollection: Record<string, WorldInfo> | null =
        v3?.世界?.地图集 && typeof v3.世界.地图集 === 'object' && !Array.isArray(v3.世界.地图集)
          ? deepCopy(v3.世界.地图集)
          : null;
      const sectSystem: SectSystemV2 | null = v3?.社交?.宗门 ? deepCopy(v3.社交.宗门) : null;
      let sectMemberInfo: SectMemberInfo | null = (v3?.社交?.宗门 as any)?.成员信息 ? deepCopy((v3.社交.宗门 as any).成员信息) : null;

      // 🔥 兜底：若玩家在“宗门档案领导层”中被识别为高层，但存档缺失 成员信息，则在 store 中补齐一份（仅用于 UI/保存时回写）
      try {
        if (!sectMemberInfo) {
          const playerNameForDetect = String((character as any)?.名字 || '').trim();
          const factions = (worldInfo?.势力信息 || []) as WorldFaction[];
          const leader = detectPlayerSectLeadership(playerNameForDetect, factions, null);

          const sectNameCandidate = String((sectSystem as any)?.当前宗门 || leader.sectName || '').trim();
          if (sectNameCandidate) {
            const sectProfile = factions.find((s) => String((s as any)?.名称 || '').trim() === sectNameCandidate) ?? null;
            sectMemberInfo = {
              宗门名称: sectNameCandidate,
              宗门类型: ((sectProfile as any)?.类型 as any) || '主神阵营',
              职位: leader.position || '外门弟子',
              贡献: 0,
              关系: '友好',
              声望: 0,
              加入日期: new Date().toISOString(),
              描述: ((sectProfile as any)?.描述 as any) || '',
            } as any;
          }
        }
      } catch (e) {
        console.warn('[gameStateStore.loadFromSaveData] 自动补齐 sectMemberInfo 失败（非致命）:', e);
      }
      const coerceMemoryArray = (value: unknown): string[] => {
        if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
        if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
        return [];
      };
      const memoryCandidate: any = v3?.社交?.记忆 ? deepCopy(v3.社交.记忆) : {};
      const memory: Memory = {
        短期记忆: coerceMemoryArray(memoryCandidate?.短期记忆),
        中期记忆: coerceMemoryArray(memoryCandidate?.中期记忆),
        长期记忆: coerceMemoryArray(memoryCandidate?.长期记忆),
        隐式中期记忆: coerceMemoryArray(memoryCandidate?.隐式中期记忆),
      };
      const gameTime: GameTime | null = v3?.元数据?.时间 ? deepCopy(v3.元数据.时间) : null;
      const hubState: HubState =
        v3?.主神空间 && typeof v3.主神空间 === 'object'
          ? deepCopy(v3.主神空间)
          : infiniteFlowState?.主神空间 && typeof infiniteFlowState.主神空间 === 'object'
            ? deepCopy(infiniteFlowState.主神空间)
          : createDefaultHubState();
      const currentMission: Mission | null =
        v3?.当前副本 && typeof v3.当前副本 === 'object'
          ? deepCopy(v3.当前副本)
          : infiniteFlowState?.当前副本 && typeof infiniteFlowState.当前副本 === 'object'
            ? deepCopy(infiniteFlowState.当前副本)
          : null;
      const missionHistory: MissionResult[] = Array.isArray(v3?.副本记录)
        ? deepCopy(v3.副本记录)
        : Array.isArray(infiniteFlowState?.副本记录)
          ? deepCopy(infiniteFlowState.副本记录)
        : [];
      const teamState: TeamState =
        v3?.团队 && typeof v3.团队 === 'object'
          ? deepCopy(v3.团队)
          : infiniteFlowState?.团队 && typeof infiniteFlowState.团队 === 'object'
            ? deepCopy(infiniteFlowState.团队)
          : createDefaultTeamState();
      const reincarnator: ReincarnatorProfile =
        v3?.轮回者 && typeof v3.轮回者 === 'object'
          ? deepCopy(v3.轮回者)
          : infiniteFlowState?.轮回者 && typeof infiniteFlowState.轮回者 === 'object'
            ? deepCopy(infiniteFlowState.轮回者)
          : buildReincarnatorFromLegacy({
              character,
              attributes,
              missionCount: missionHistory.length,
            });

      const narrativeHistory: GameMessage[] = Array.isArray(v3?.系统?.历史?.叙事) ? deepCopy(v3.系统.历史.叙事) : [];

      const daoSystem = reincarnatorRoot?.大道 ?? roleMirror?.大道 ?? null;
      const eventSystem: EventSystem | null = v3?.社交?.事件 ? deepCopy(v3.社交.事件) : null;
      const cultivation =
        reincarnatorRoot?.修炼
        ?? reincarnatorRoot?.能力状态
        ?? roleMirror?.修炼
        ?? roleMirror?.能力状态
        ?? null;
      const techniqueSystem =
        reincarnatorRoot?.功法
        ?? reincarnatorRoot?.能力
        ?? roleMirror?.功法
        ?? roleMirror?.能力
        ?? null;
      const skillState = reincarnatorRoot?.技能 ?? roleMirror?.技能 ?? null;

      const effects: StatusEffect[] = Array.isArray(reincarnatorRoot?.效果)
        ? deepCopy(reincarnatorRoot.效果)
        : Array.isArray(roleMirror?.效果)
          ? deepCopy(roleMirror.效果)
          : [];

      const systemConfig = v3?.系统?.配置 ? deepCopy(v3.系统.配置) : null;

      const body = reincarnatorRoot?.身体 ?? roleMirror?.身体 ?? null;
      let bodyPartDevelopment =
        body && typeof body === 'object' && (body as any).部位开发 ? deepCopy((body as any).部位开发) : null;

      // 基础模块
      this.character = character;
      this.attributes = attributes;
      this.location = location;

      // 灵根/境界品质字段容错（AI偶尔会返回 {quality,grade} 结构）
      if (this.character?.灵根 && typeof this.character.灵根 === 'object') {
        normalizeQualitySuffix(this.character.灵根 as any, 'tier');
      }
      if (this.attributes?.境界 && typeof this.attributes.境界 === 'object') {
        normalizeQualitySuffix(this.attributes.境界 as any, '品质');
        normalizeQualitySuffix(this.attributes.境界 as any, '品阶');
      }

      this.inventory = inventory;
      // 兼容旧存档/旧字段：确保货币系统已迁移（避免打开背包卡死/显示异常）
      normalizeInventoryCurrencies(this.inventory);
      this.equipment = equipment;
      this.relationships = relationships;
      this.relationshipMatrix = relationshipMatrix;
      this.worldInfo = worldInfo;
      this.realmMapCollection = realmMapCollection;
      this.sectSystem = sectSystem;
      this.sectMemberInfo = sectMemberInfo;
      this.memory = memory;
      this.gameTime = gameTime;
      this.narrativeHistory = narrativeHistory;

      this.gamePhase = gamePhase;
      this.hubState = hubState;
      this.currentMission = currentMission;
      this.missionHistory = missionHistory;
      this.teamState = teamState;
      const effectiveMissionCountByDifficulty = normalizeDifficultyStats(
        (reincarnator as any)?.effectiveMissionCountByDifficulty
        ?? buildDifficultyStatsFromHistory(missionHistory),
      );
      const soulStrengthCapMultiplier = Math.max(
        0.1,
        Math.min(1, Number((reincarnator as any)?.soulStrengthCapMultiplier ?? 1)),
      );
      const promotionFailureStreak = Math.max(
        0,
        Math.floor(
          Number(
            (reincarnator as any)?.promotionFailureStreak
            ?? (reincarnator as any)?.promotionTrialFailures
            ?? 0,
          ),
        ),
      );
      this.reincarnator = {
        ...createDefaultReincarnatorProfile(),
        ...reincarnator,
        soulStrengthCapMultiplier,
        effectiveMissionCountByDifficulty,
        promotionFailureStreak,
        promotionTrialFailures: Math.max(
          0,
          Math.floor(Number((reincarnator as any)?.promotionTrialFailures ?? promotionFailureStreak)),
        ),
        level: reincarnator?.level ?? getRankFromSoulStrength(Number(reincarnator?.soulStrength ?? 0)),
        star: reincarnator?.star ?? getStarFromSoulStrength(
          reincarnator?.level ?? getRankFromSoulStrength(Number(reincarnator?.soulStrength ?? 0)),
          Number(reincarnator?.soulStrength ?? 0),
        ),
      };
      if (this.inventory) {
        this.reincarnator.godPoints = syncGodPointsBetweenProfileAndInventory(
          this.inventory as any,
          Number(this.reincarnator?.godPoints ?? 0),
          true,
        );
      }

      // 系统模块
      const defaultDaoSystem = createDefaultInfiniteAbilityTree();
      if (daoSystem && typeof daoSystem === 'object' && (daoSystem as any).大道列表) {
        const mergedDao = deepCopy(defaultDaoSystem);
        const sourceList = (daoSystem as any).大道列表 as Record<string, any>;
        for (const [abilityId, rawDao] of Object.entries(sourceList || {})) {
          if (!rawDao || typeof rawDao !== 'object') continue;
          const node = getInfiniteAbilityNodeById(abilityId);
          const fallback = mergedDao.大道列表[abilityId]
            ?? createNewDaoData(
              node?.name || String((rawDao as any).道名 || abilityId),
              node?.description || String((rawDao as any).描述 || '能力路径'),
            );

          mergedDao.大道列表[abilityId] = {
            ...fallback,
            ...(rawDao as any),
            道名: String((rawDao as any).道名 || fallback.道名),
            描述: String((rawDao as any).描述 || fallback.描述),
            阶段列表:
              Array.isArray((rawDao as any).阶段列表) && (rawDao as any).阶段列表.length > 0
                ? (rawDao as any).阶段列表
                : fallback.阶段列表,
          };
        }
        this.thousandDao = mergedDao;
      } else {
        this.thousandDao = deepCopy(defaultDaoSystem);
      }
      const reincarnatorAbilities = Array.isArray(this.reincarnator?.abilities)
        ? this.reincarnator.abilities.map((id) => String(id || '').trim()).filter(Boolean)
        : [];
      if (reincarnatorAbilities.length > 0) {
        const nextDao = cloneOrCreateDaoSystem(this.thousandDao);
        for (const abilityId of reincarnatorAbilities) {
          unlockAbilityInDaoSystem(nextDao, abilityId, { minStage: 1 });
        }
        this.thousandDao = nextDao;
      }
      this.eventSystem = eventSystem
        ? deepCopy(eventSystem)
        : {
            配置: {
              启用随机事件: true,
              最小间隔年: 1,
              最大间隔年: 10,
              事件提示词: '',
            },
            下次事件时间: null,
            事件记录: [],
          };

      this.cultivation = cultivation ? deepCopy(cultivation) : null;
      this.cultivationTechnique = (this.cultivation as any)?.修炼功法 ?? null;

      this.techniqueSystem = techniqueSystem ? deepCopy(techniqueSystem) : null;
      this.skillState = skillState ? deepCopy(skillState) : null;
      this.masteredSkills = (this.skillState as any)?.掌握技能
        ? deepCopy((this.skillState as any).掌握技能)
        : deepCopy((v3?.系统?.缓存?.掌握技能 ?? []) as any);

      this.effects = Array.isArray(effects) ? deepCopy(effects) : [];
      this.systemConfig = systemConfig ? deepCopy(systemConfig) : null;
      if (isTavernEnv() && this.systemConfig) {
        this.systemConfig = ensureSystemConfigHasNsfw(this.systemConfig) as any;
      }

      // Tavern 兜底：即使存档没带“角色.身体”，也保证 UI/变量面板有可写路径
      if (isTavernEnv()) {
        const bodyObj: Record<string, any> =
          body && typeof body === 'object' ? deepCopy(body) : {};
        if (bodyObj.部位 === undefined) bodyObj.部位 = {};
        if (bodyObj.部位开发 === undefined) bodyObj.部位开发 = bodyPartDevelopment ?? {};
        bodyPartDevelopment = bodyObj.部位开发 ?? bodyPartDevelopment;
        this.body = bodyObj;
      } else {
        this.body = body && typeof body === 'object' ? deepCopy(body) : null;
      }

      this.bodyPartDevelopment = bodyPartDevelopment ? deepCopy(bodyPartDevelopment) : null;

      // 兜底：旧存档可能没有模块对象
      if (!this.skillState) {
        this.skillState = {
          掌握技能: this.masteredSkills ?? [],
          装备栏: [],
          冷却: {},
        } as any;
      }

      if (!this.cultivation) {
        this.cultivation = { 修炼功法: this.cultivationTechnique ?? null } as any;
      }

      this.isGameLoaded = true;
    },

    /**
     * 将当前 state 转换为 SaveData 对象
     * @returns 完整的存档数据
     */
    toSaveData(): SaveData | null {
      // 🔥 详细的数据检查和日志输出，帮助诊断联机模式下的问题
      const missingFields: string[] = [];
      if (!this.character) missingFields.push('character');
      if (!this.attributes) missingFields.push('attributes');
      if (!this.location) missingFields.push('location');
      if (!this.inventory) missingFields.push('inventory');
      if (!this.relationships) missingFields.push('relationships');
      if (!this.memory) missingFields.push('memory');
      if (!this.gameTime) missingFields.push('gameTime');
      if (!this.equipment) missingFields.push('equipment');

      if (missingFields.length > 0) {
        console.error('[gameStateStore.toSaveData] 存档数据不完整，缺少以下字段:', missingFields.join(', '));
        console.error('[gameStateStore.toSaveData] 联机状态:', this.onlineState);
        console.error('[gameStateStore.toSaveData] 游戏是否已加载:', this.isGameLoaded);
        return null;
      }

      const deepCopy = <T>(value: T): T => JSON.parse(JSON.stringify(value));

      const techniqueProgress = buildTechniqueProgress(this.inventory);
      const currentTechniqueId = (this.cultivationTechnique as any)?.物品ID ?? null;

      const techniqueSystem = {
        ...(this.techniqueSystem || {}),
        当前功法ID: (this.techniqueSystem as any)?.当前功法ID ?? currentTechniqueId,
        功法进度: (this.techniqueSystem as any)?.功法进度 ?? techniqueProgress,
        功法套装: (this.techniqueSystem as any)?.功法套装 ?? { 主修: null, 辅修: [] },
      } as any;

      const skillState = {
        ...(this.skillState || {}),
        掌握技能: (this.skillState as any)?.掌握技能 ?? this.masteredSkills ?? [],
        装备栏: (this.skillState as any)?.装备栏 ?? [],
        冷却: (this.skillState as any)?.冷却 ?? {},
      } as any;

      const cultivation = {
        ...(this.cultivation || {}),
        修炼功法: (this.cultivation as any)?.修炼功法 ?? this.cultivationTechnique ?? null,
      } as any;

      const nowIso = new Date().toISOString();
      const meta = {
        ...(this.saveMeta || {}),
        版本号: 3,
        存档ID: (this.saveMeta as any)?.存档ID ?? `save_${Date.now()}`,
        存档名: (this.saveMeta as any)?.存档名 ?? '自动存档',
        游戏版本: (this.saveMeta as any)?.游戏版本,
        创建时间: (this.saveMeta as any)?.创建时间 ?? nowIso,
        更新时间: nowIso,
        游戏时长秒: Number((this.saveMeta as any)?.游戏时长秒 ?? 0),
        时间: this.gameTime,
        当前阶段: this.gamePhase,
      };

      const daoNormalized =
        this.thousandDao && typeof this.thousandDao === 'object' && (this.thousandDao as any).大道列表
          ? this.thousandDao
          : deepCopy(createDefaultInfiniteAbilityTree());

      const sectNormalized =
        this.sectSystem || this.sectMemberInfo
          ? { ...(this.sectSystem || {}), ...(this.sectMemberInfo ? { 成员信息: this.sectMemberInfo } : {}) }
          : null;

      const settings =
        this.userSettings ?? {
          timeBasedSaveEnabled: this.timeBasedSaveEnabled,
          timeBasedSaveInterval: this.timeBasedSaveInterval,
          conversationAutoSaveEnabled: this.conversationAutoSaveEnabled,
        };

      const online =
        this.onlineState ?? { 模式: '单机', 房间ID: null, 玩家ID: null, 只读路径: ['世界'], 世界曝光: false, 冲突策略: '服务器' };

      const location = deepCopy(this.location);
      if (location && (online as any)?.模式 === '联机') {
        delete (location as any).x;
        delete (location as any).y;
      }

      // 神点主导化：轮回者神点与背包货币.神点保持一致（以轮回者为权威）
      if (this.inventory) {
        this.reincarnator.godPoints = syncGodPointsBetweenProfileAndInventory(
          this.inventory as any,
          Number(this.reincarnator?.godPoints ?? 0),
          true,
        );
      }

      const body = (() => {
        const baseBody: Record<string, any> =
          this.body && typeof this.body === 'object' ? deepCopy(this.body) : {};

        if (this.bodyPartDevelopment && typeof this.bodyPartDevelopment === 'object') {
          baseBody.部位开发 = deepCopy(this.bodyPartDevelopment);
        }

        if (isTavernEnv()) {
          if (baseBody.部位 === undefined) baseBody.部位 = {};
          if (baseBody.部位开发 === undefined) baseBody.部位开发 = {};
        }

        return Object.keys(baseBody).length > 0 ? baseBody : undefined;
      })();

      const legacyRoleMirror = {
        身份: this.character,
        属性: this.attributes,
        位置: location,
        效果: this.effects ?? [],
        身体: body,
        背包: this.inventory,
        装备: this.equipment,
        功法: techniqueSystem,
        修炼: cultivation,
        能力: techniqueSystem,
        能力状态: cultivation,
        大道: daoNormalized,
        技能: skillState,
      } as any;

      const reincarnatorState = {
        ...this.reincarnator,
        ...legacyRoleMirror,
      } as any;

      const v3: any = {
        元数据: meta,
        轮回者: reincarnatorState,
        主神空间: this.hubState ?? createDefaultHubState(),
        团队: this.teamState ?? createDefaultTeamState(),
        副本记录: this.missionHistory ?? [],
        当前副本: this.currentMission ?? null,
        // 兼容旧模块：保留角色镜像字段
        角色: legacyRoleMirror,
        社交: {
          关系: this.relationships ?? {},
          关系矩阵: this.relationshipMatrix ?? undefined,
          宗门: sectNormalized,
          事件: this.eventSystem,
          记忆: this.memory,
        },
        世界: {
          信息: this.worldInfo ?? {},
          ...(this.realmMapCollection ? { 地图集: this.realmMapCollection } : {}),
          状态: {},
        },
        系统: {
          配置: this.systemConfig ?? {},
          设置: settings,
          缓存: { 掌握技能: this.masteredSkills ?? (skillState as any)?.掌握技能 ?? [] },
          历史: { 叙事: this.narrativeHistory || [] },
          联机: online,
        },
      };

      // 动态计算后天六司（装备/天赋加成）
      // 注意：这里不能将计算后的"后天六司"（总值）保存回 character.后天六司（基值），
      // 否则会导致下次加载时重复叠加天赋/装备加成（基值被污染为总值，再算一遍加成）。
      // character.后天六司 应该只存储永久性的消耗品加成。
      // 天赋/装备加成应在运行时动态计算，不落盘到该字段。

      return deepCopy(v3 as any);
    },

    /**
     * 更新玩家属性（动态数值）
     * @param updates 部分属性对象
     */
    updatePlayerStatus(updates: Partial<PlayerAttributes>) {
      if (this.attributes) {
        this.attributes = { ...this.attributes, ...(updates as any) };
      }
    },

    updateLocation(updates: Partial<PlayerLocation>) {
      if (this.location) {
        this.location = { ...this.location, ...(updates as any) };
      }
    },

    /**
     * 更新背包
     * @param updates 部分 Inventory 对象
     */
    updateInventory(updates: Partial<Inventory>) {
      if (this.inventory) {
        this.inventory = { ...this.inventory, ...updates };
      }
    },

    /**
     * 更新特定NPC的人物关系
     * @param npcName NPC名字
     * @param updates 部分 NpcProfile 对象
     */
    updateRelationship(npcName: string, updates: Partial<NpcProfile>) {
      if (this.relationships && this.relationships[npcName]) {
        this.relationships[npcName] = { ...this.relationships[npcName], ...updates };
      }
    },

    setGamePhase(phase: GamePhase) {
      this.gamePhase = phase;
      if (this.saveMeta && typeof this.saveMeta === 'object') {
        (this.saveMeta as any).当前阶段 = phase;
      }
    },

    updateHubState(updates: Partial<HubState>) {
      this.hubState = {
        ...this.hubState,
        ...updates,
      };
    },

    setCurrentMission(mission: Mission | null) {
      this.currentMission = mission;
    },

    appendMissionHistory(result: MissionResult) {
      this.missionHistory = [result, ...(this.missionHistory || [])];
    },

    updateTeamState(updates: Partial<TeamState>) {
      this.teamState = {
        ...this.teamState,
        ...updates,
      };
    },

    updateReincarnatorProfile(updates: Partial<ReincarnatorProfile>) {
      this.reincarnator = {
        ...this.reincarnator,
        ...updates,
      };
    },

    buyHubShopItem(itemId: string, quantity = 1): { ok: boolean; message: string } {
      const safeQty = Math.max(1, Math.floor(Number(quantity) || 1));
      const inventory = Array.isArray(this.hubState?.shopInventory) ? this.hubState.shopInventory : [];
      const idx = inventory.findIndex((item) => item.id === itemId);
      if (idx < 0) return { ok: false, message: '商品不存在' };

      const item = inventory[idx];
      if (item.stock < safeQty) return { ok: false, message: '库存不足' };

      const totalCost = item.price * safeQty;
      if (Number(this.reincarnator?.godPoints ?? 0) < totalCost) {
        return { ok: false, message: '神点不足' };
      }

      const nextInventory = [...inventory];
      nextInventory[idx] = {
        ...item,
        stock: item.stock - safeQty,
      };
      this.hubState = {
        ...this.hubState,
        shopInventory: nextInventory,
      };

      this.reincarnator = {
        ...this.reincarnator,
        godPoints: Math.max(0, Number(this.reincarnator.godPoints) - totalCost),
      };
      if (this.inventory) {
        syncGodPointsBetweenProfileAndInventory(this.inventory as any, this.reincarnator.godPoints, true);

        // 神点消费后，兑换结果必须落入永久背包，形成经济闭环
        const inventory = JSON.parse(JSON.stringify(this.inventory)) as any;
        if (!inventory.物品 || typeof inventory.物品 !== 'object') inventory.物品 = {};
        const rewardId = `hub_${item.id}`;
        const existing = inventory.物品[rewardId];
        if (existing && typeof existing === 'object') {
          existing.数量 = Math.max(0, Number(existing.数量 ?? 0)) + safeQty;
          inventory.物品[rewardId] = existing;
        } else {
          inventory.物品[rewardId] = {
            物品ID: rewardId,
            名称: item.name,
            类型: '其他',
            数量: safeQty,
            品质: { quality: '普通', grade: 1 },
            描述: item.description || `在主神空间兑换获得：${item.name}`,
            可带入副本: item.category !== 'service' && item.category !== 'info',
            来源: 'hub',
          };
        }
        this.inventory = inventory as any;
      }

      const sharedResources = Array.isArray(this.teamState?.sharedResources) ? [...this.teamState.sharedResources] : [];
      sharedResources.push({
        id: `${item.id}_${Date.now()}`,
        name: item.name,
        quantity: safeQty,
        description: item.description,
      });
      this.teamState = {
        ...this.teamState,
        sharedResources,
      };

      return { ok: true, message: `已购买 ${item.name} x${safeQty}` };
    },

    addTeamMember(member: { id: string; name: string }) {
      const members = Array.isArray(this.teamState?.members) ? [...this.teamState.members] : [];
      if (members.some((m) => m.id === member.id || m.name === member.name)) return;
      members.push({
        id: member.id,
        name: member.name,
        trust: 50,
        status: 'active',
      });
      this.teamState = {
        ...this.teamState,
        members,
      };

      // 队友进入主流程时自动接入社交与关系网，便于后续协作/背叛联动
      const playerName = String(this.character?.名字 ?? '玩家').trim() || '玩家';
      const teammateName = String(member.name || '').trim();
      if (!teammateName) return;

      const relationships = this.relationships && typeof this.relationships === 'object' ? { ...this.relationships } : {};
      if (!relationships[teammateName]) {
        relationships[teammateName] = buildTeamMemberNpcProfile(teammateName, this.location);
      }
      this.relationships = relationships as any;
      this.relationshipMatrix = upsertRelationshipEdge(
        this.relationshipMatrix,
        playerName,
        teammateName,
        '队友',
        8,
        ['team', 'recruit'],
      );
    },

    updateTeamMemberTrust(memberId: string, trust: number) {
      const members = Array.isArray(this.teamState?.members) ? [...this.teamState.members] : [];
      this.teamState = {
        ...this.teamState,
        members: members.map((member) =>
          member.id === memberId ? { ...member, trust: Math.max(0, Math.min(100, Math.round(trust))) } : member,
        ),
      };
    },

    recordTeamEvent(event: {
      type: 'cooperate' | 'betray' | 'death' | 'rescue' | 'conflict';
      memberId?: string;
      description: string;
      weight?: number;
    }) {
      const now = new Date().toISOString();
      const missionId = this.currentMission?.id;

      const teamEvents = Array.isArray((this.teamState as any)?.teamEvents) ? [...((this.teamState as any).teamEvents as any[])] : [];
      teamEvents.unshift({
        id: `team_event_${Date.now()}`,
        missionId,
        memberId: event.memberId,
        type: event.type,
        description: event.description,
        weight: event.weight,
        time: now,
      });

      this.teamState = {
        ...this.teamState,
        teamEvents,
      } as any;

      // 将队伍事件联动到关系网（协作/背叛/死亡影响社交）
      const members = Array.isArray(this.teamState?.members) ? this.teamState.members : [];
      const memberName = members.find((m) => m.id === event.memberId)?.name;
      const playerName = String(this.character?.名字 ?? '玩家').trim() || '玩家';
      const npcName = String(memberName ?? '').trim();
      if (npcName) {
        const relationDeltaMap: Record<typeof event.type, number> = {
          cooperate: 8,
          rescue: 10,
          conflict: -10,
          betray: -35,
          death: -15,
        };
        const relationLabelMap: Record<typeof event.type, string> = {
          cooperate: '协作',
          rescue: '救援',
          conflict: '冲突',
          betray: '背叛',
          death: '阵亡',
        };
        const delta = relationDeltaMap[event.type] ?? 0;
        const relationships = this.relationships && typeof this.relationships === 'object' ? { ...this.relationships } : {};
        const existingProfile = (relationships[npcName] || buildTeamMemberNpcProfile(npcName, this.location)) as any;
        const prevFavor = Number(existingProfile?.好感度 ?? 0);
        relationships[npcName] = {
          ...existingProfile,
          好感度: Math.max(-100, Math.min(100, prevFavor + delta)),
          与玩家关系: event.type === 'betray'
            ? '敌对'
            : event.type === 'death'
              ? '牺牲队友'
              : (existingProfile?.与玩家关系 || '队友'),
          当前内心想法: event.description || existingProfile?.当前内心想法,
        };
        this.relationships = relationships as any;
        this.relationshipMatrix = upsertRelationshipEdge(
          this.relationshipMatrix,
          playerName,
          npcName,
          relationLabelMap[event.type] ?? '队伍事件',
          delta,
          ['team', event.type],
          now,
        );
      }

      if (this.currentMission) {
        const typeMap: Record<string, 'teammate_death' | 'betrayal' | 'cooperation' | 'critical_choice'> = {
          death: 'teammate_death',
          betray: 'betrayal',
          cooperate: 'cooperation',
          rescue: 'critical_choice',
          conflict: 'critical_choice',
        };

        const mission = this.currentMission as any;
        const specialEvents = Array.isArray(mission.specialEvents) ? [...mission.specialEvents] : [];
        specialEvents.push({
          type: typeMap[event.type] ?? 'critical_choice',
          description: event.description,
          weight: Math.max(0.8, Number(event.weight ?? 1)),
          timestamp: now,
        });
        this.currentMission = {
          ...mission,
          specialEvents,
        };
      }
    },

    markTeamMemberStatus(
      memberId: string,
      status: 'active' | 'injured' | 'dead' | 'missing' | 'betrayed',
      description?: string,
    ) {
      const members = Array.isArray(this.teamState?.members) ? [...this.teamState.members] : [];
      const member = members.find((m) => m.id === memberId);
      if (!member) return;

      const nextMembers = members.map((m) => (m.id === memberId ? { ...m, status } : m));
      // 队友死亡/背叛会拖累团队信任
      const impactedMembers = (status === 'dead' || status === 'betrayed')
        ? nextMembers.map((m) => (m.id === memberId ? m : { ...m, trust: Math.max(0, m.trust - 8) }))
        : nextMembers;

      this.teamState = {
        ...this.teamState,
        members: impactedMembers,
      };

      if (status === 'dead') {
        this.recordTeamEvent({
          type: 'death',
          memberId,
          description: description || `${member.name} 在副本中阵亡`,
          weight: 1.2,
        });
      } else if (status === 'betrayed') {
        this.recordTeamEvent({
          type: 'betray',
          memberId,
          description: description || `${member.name} 发生背叛行为`,
          weight: 1.25,
        });
      }
    },

    recordTeamCooperation(memberIds: string[], description: string, trustDelta = 5) {
      const members = Array.isArray(this.teamState?.members) ? [...this.teamState.members] : [];
      const involved = new Set(memberIds);
      const nextMembers = members.map((member) =>
        involved.has(member.id) ? { ...member, trust: Math.min(100, member.trust + trustDelta) } : member,
      );
      const collaborationLogs = Array.isArray((this.teamState as any)?.collaborationLogs)
        ? [...((this.teamState as any).collaborationLogs as any[])]
        : [];
      collaborationLogs.unshift({
        id: `team_log_${Date.now()}`,
        missionId: this.currentMission?.id,
        time: new Date().toISOString(),
        members: [...involved],
        action: description,
        result: 'success',
        trustDelta,
      });

      this.teamState = {
        ...this.teamState,
        members: nextMembers,
        collaborationLogs,
      } as any;

      // 协作成功会同步提升与玩家关系，并写入关系矩阵
      const playerName = String(this.character?.名字 ?? '玩家').trim() || '玩家';
      const relationships = this.relationships && typeof this.relationships === 'object' ? { ...this.relationships } : {};
      for (const memberId of involved) {
        const member = nextMembers.find((m) => m.id === memberId);
        const npcName = String(member?.name ?? '').trim();
        if (!npcName) continue;
        const profile = (relationships[npcName] || buildTeamMemberNpcProfile(npcName, this.location)) as any;
        const prevFavor = Number(profile?.好感度 ?? 0);
        relationships[npcName] = {
          ...profile,
          好感度: Math.max(-100, Math.min(100, prevFavor + Math.max(1, Math.floor(trustDelta / 2)))),
          与玩家关系: profile?.与玩家关系 || '队友',
          当前内心想法: description || profile?.当前内心想法,
        };
        this.relationshipMatrix = upsertRelationshipEdge(
          this.relationshipMatrix,
          playerName,
          npcName,
          '协作',
          Math.max(2, Math.floor(trustDelta / 2)),
          ['team', 'cooperate'],
        );
      }
      this.relationships = relationships as any;

      this.recordTeamEvent({
        type: 'cooperate',
        memberId: memberIds[0],
        description,
        weight: 1.08,
      });
    },

    unlockAbility(abilityId: string, cost: number): { ok: boolean; message: string } {
      const id = String(abilityId || '').trim();
      if (!id) return { ok: false, message: '能力ID无效' };
      if (this.reincarnator.abilities.includes(id)) return { ok: false, message: '能力已解锁' };

      const node = getInfiniteAbilityNodeById(id);
      if (node?.prerequisites?.length) {
        const unlocked = new Set<string>(this.reincarnator.abilities || []);
        const missing = node.prerequisites.filter((req) => !unlocked.has(req));
        if (missing.length > 0) {
          const names = missing.map((req) => getInfiniteAbilityNodeById(req)?.name || req);
          return { ok: false, message: `前置能力未满足：${names.join('、')}` };
        }
      }

      const price = Math.max(0, Math.floor(Number(node?.cost ?? cost) || 0));
      if (Number(this.reincarnator.godPoints) < price) return { ok: false, message: '神点不足' };

      this.reincarnator = {
        ...this.reincarnator,
        godPoints: Math.max(0, Number(this.reincarnator.godPoints) - price),
        abilities: [...this.reincarnator.abilities, id],
      };

      const nextDao = cloneOrCreateDaoSystem(this.thousandDao);
      unlockAbilityInDaoSystem(nextDao, id, {
        minStage: 1,
        minTotalExp: price,
      });
      this.thousandDao = nextDao;

      if (this.inventory) {
        syncGodPointsBetweenProfileAndInventory(this.inventory as any, this.reincarnator.godPoints, true);
      }

      return { ok: true, message: `能力解锁成功：${node?.name || id}` };
    },

    applyMissionSettlement(result: MissionResult) {
      const oldSoul = Number(this.reincarnator?.soulStrength ?? 0);
      const oldMissions = Number(this.reincarnator?.missionCount ?? 0);
      const oldGodPoints = Number(this.reincarnator?.godPoints ?? 0);
      const oldSurvivalRate = Number(this.reincarnator?.survivalRate ?? 1);
      const currentLevel = this.reincarnator?.level ?? getRankFromSoulStrength(oldSoul);
      const missionDifficulty = normalizeMissionDifficulty(result.difficulty ?? this.currentMission?.difficulty);
      const effectiveMissionCountByDifficulty = incrementDifficultyStats(
        normalizeDifficultyStats(this.reincarnator?.effectiveMissionCountByDifficulty),
        missionDifficulty,
        result.success === true,
      );
      const effectiveMissionCount = getEffectiveMissionCountForRank(effectiveMissionCountByDifficulty, currentLevel);
      const soulStrengthCapMultiplier = Math.max(
        0.1,
        Math.min(1, Number(this.reincarnator?.soulStrengthCapMultiplier ?? 1)),
      );

      const missionCount = oldMissions + 1;
      const survivalRate = result.success
        ? ((oldSurvivalRate * oldMissions) + 1) / missionCount
        : (oldSurvivalRate * oldMissions) / missionCount;

      const range = RANK_SOUL_RANGES[currentLevel];
      const rawSoulStrength = Math.max(0, oldSoul + Math.max(0, Number(result.soulGrowth || 0)));
      const cappedRangeMax = Math.max(range.min, Math.floor(range.max * soulStrengthCapMultiplier));
      // 等级提升不再由灵魂强度自动发生，需通过晋升试炼完成
      const soulStrength = Math.max(range.min, Math.min(cappedRangeMax, rawSoulStrength));
      const star = getStarFromSoulStrength(currentLevel, soulStrength);
      const promotionPoints = Math.max(
        0,
        Number(this.reincarnator?.promotionPoints ?? 0) + Math.max(0, Number(result.rating || 0)) * 10,
      );
      const missionRewardItems = Array.isArray(this.currentMission?.rewards?.items) ? this.currentMission!.rewards.items : [];
      const missionRewardAbilities = Array.isArray(this.currentMission?.rewards?.abilities) ? this.currentMission!.rewards.abilities : [];
      const unlockedAbilitySet = new Set<string>(this.reincarnator?.abilities ?? []);
      const gainedAbilityIds: string[] = [];
      if (result.success) {
        for (const reward of missionRewardAbilities) {
          const abilityId = String((reward as any)?.id ?? '').trim();
          if (!abilityId || unlockedAbilitySet.has(abilityId)) continue;
          unlockedAbilitySet.add(abilityId);
          gainedAbilityIds.push(abilityId);
        }
      }

      const trialState = canTriggerPromotionTrial({
        level: currentLevel,
        star,
        effectiveMissionCount,
        promotionPoints,
      });

      this.reincarnator = {
        ...this.reincarnator,
        missionCount,
        survivalRate: Number(survivalRate.toFixed(4)),
        soulStrength,
        level: currentLevel,
        star,
        godPoints: Math.max(0, oldGodPoints + Math.max(0, Number(result.pointsGained || 0))),
        soulStrengthCapMultiplier,
        effectiveMissionCountByDifficulty,
        promotionPoints,
        abilities: Array.from(unlockedAbilitySet),
        promotionTrialPending: this.reincarnator.promotionTrialPending || trialState.ok,
        pendingPromotionTarget: this.reincarnator.promotionTrialPending
          ? this.reincarnator.pendingPromotionTarget
          : (trialState.ok ? trialState.target : null),
      };

      if (gainedAbilityIds.length > 0) {
        const rewardByAbilityId = new Map(
          missionRewardAbilities.map((reward) => [String((reward as any)?.id ?? '').trim(), reward] as const),
        );
        const nextDao = cloneOrCreateDaoSystem(this.thousandDao);
        for (const abilityId of gainedAbilityIds) {
          const reward = rewardByAbilityId.get(abilityId);
          unlockAbilityInDaoSystem(nextDao, abilityId, {
            fallbackName: String((reward as any)?.name ?? ''),
            fallbackDescription: String((reward as any)?.description ?? ''),
            minStage: 1,
          });
        }
        this.thousandDao = nextDao;
      }

      if (result.success && this.inventory) {
        const inventory = JSON.parse(JSON.stringify(this.inventory)) as any;
        if (!inventory.物品 || typeof inventory.物品 !== 'object') inventory.物品 = {};

        for (const reward of missionRewardItems) {
          const baseId = String((reward as any)?.id ?? '').trim();
          const itemId = baseId || `mission_reward_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
          const quantity = Math.max(1, Number((reward as any)?.quantity ?? 1));
          const existing = inventory.物品[itemId];
          if (existing && typeof existing === 'object') {
            existing.数量 = Math.max(0, Number(existing.数量 ?? 0)) + quantity;
            inventory.物品[itemId] = existing;
            continue;
          }
          inventory.物品[itemId] = {
            物品ID: itemId,
            名称: String((reward as any)?.name ?? '副本奖励'),
            类型: '任务道具',
            品质: { quality: '精良', grade: 2 },
            数量: quantity,
            描述: String((reward as any)?.description ?? '副本结算奖励'),
            可带入副本: true,
            来源: 'mission',
          };
        }

        this.inventory = inventory as any;
      }

      if (this.inventory) {
        syncGodPointsBetweenProfileAndInventory(this.inventory as any, this.reincarnator.godPoints, true);
      }
      this.appendMissionHistory({
        ...result,
        difficulty: missionDifficulty,
        summary: result.summary ?? (
          gainedAbilityIds.length > 0
            ? `结算完成，新增能力：${gainedAbilityIds.join('、')}`
            : result.summary
        ),
      });
    },

    resolvePromotionTrial(success: boolean): { ok: boolean; message: string } {
      if (!this.reincarnator.promotionTrialPending || !this.reincarnator.pendingPromotionTarget) {
        return { ok: false, message: '当前无待处理的晋升试炼' };
      }

      const currentLevel = this.reincarnator.level;
      const targetLevel = this.reincarnator.pendingPromotionTarget;

      if (success) {
        const targetRange = RANK_SOUL_RANGES[targetLevel];
        this.reincarnator = {
          ...this.reincarnator,
          level: targetLevel,
          soulStrength: targetRange.min,
          star: 1,
          promotionTrialPending: false,
          pendingPromotionTarget: null,
          promotionFailureStreak: 0,
          promotionTrialFailures: 0,
        };
        return { ok: true, message: `晋升成功，已提升至 ${targetLevel}级` };
      }

      const currentRange = RANK_SOUL_RANGES[currentLevel];
      const failureStreak = Math.max(
        0,
        Number(this.reincarnator.promotionFailureStreak ?? this.reincarnator.promotionTrialFailures ?? 0),
      ) + 1;
      const prevCapMultiplier = Math.max(0.1, Math.min(1, Number(this.reincarnator.soulStrengthCapMultiplier ?? 1)));
      const soulStrengthCapMultiplier = failureStreak >= 3 ? Math.min(prevCapMultiplier, 0.9) : prevCapMultiplier;
      const cappedRangeMax = Math.max(currentRange.min, Math.floor(currentRange.max * soulStrengthCapMultiplier));
      const fallbackSoul = Math.max(
        currentRange.min,
        Math.min(cappedRangeMax, Math.floor(Number(this.reincarnator.soulStrength) * 0.7)),
      );
      this.reincarnator = {
        ...this.reincarnator,
        soulStrength: fallbackSoul,
        star: getStarFromSoulStrength(currentLevel, fallbackSoul),
        soulStrengthCapMultiplier,
        promotionFailureStreak: failureStreak,
        promotionTrialFailures: failureStreak,
        promotionTrialPending: false,
        pendingPromotionTarget: null,
      };
      if (failureStreak >= 3 && soulStrengthCapMultiplier < prevCapMultiplier) {
        return { ok: true, message: '晋升试炼失败，灵魂强度已回退；连续失败触发上限惩罚（永久-10%）' };
      }
      return { ok: true, message: '晋升试炼失败，灵魂强度已回退' };
    },

    /**
     * 推进游戏时间
     * @param minutes 要推进的分钟数
     */
    advanceGameTime(minutes: number) {
      if (this.gameTime) {
        // 实现时间推进逻辑，处理进位
        this.gameTime.分钟 += minutes;

        // 处理小时进位
        if (this.gameTime.分钟 >= 60) {
          const hours = Math.floor(this.gameTime.分钟 / 60);
          this.gameTime.分钟 = this.gameTime.分钟 % 60;
          this.gameTime.小时 += hours;
        }

        // 处理天进位（注意：GameTime 使用"日"而非"天"）
        if (this.gameTime.小时 >= 24) {
          const days = Math.floor(this.gameTime.小时 / 24);
          this.gameTime.小时 = this.gameTime.小时 % 24;
          this.gameTime.日 += days;
        }

        // 处理月进位（假设每月30天）
        if (this.gameTime.日 > 30) {
          const months = Math.floor((this.gameTime.日 - 1) / 30);
          this.gameTime.日 = ((this.gameTime.日 - 1) % 30) + 1;
          this.gameTime.月 += months;
        }

        // 处理年进位
        if (this.gameTime.月 > 12) {
          const years = Math.floor((this.gameTime.月 - 1) / 12);
          this.gameTime.月 = ((this.gameTime.月 - 1) % 12) + 1;
          this.gameTime.年 += years;
        }
      }
    },

    /**
     * 重置游戏状态
     */
    resetState() {
      this.saveMeta = null;
      this.onlineState = null;
      this.userSettings = null;
      this.character = null;
      this.attributes = null;
      this.location = null;
      this.inventory = null;
      this.equipment = null;
      this.relationships = null;
      this.worldInfo = null;
      this.realmMapCollection = null;
      this.sectSystem = null;
      this.sectMemberInfo = null;
      this.memory = null;
      this.gameTime = null;
      this.narrativeHistory = [];
      this.isGameLoaded = false;
      this.gamePhase = 'hub';
      this.hubState = createDefaultHubState();
      this.currentMission = null;
      this.missionHistory = [];
      this.teamState = createDefaultTeamState();
      this.reincarnator = createDefaultReincarnatorProfile();

      // 重置其他系统数据
      this.thousandDao = createDefaultInfiniteAbilityTree();
      this.eventSystem = {
        配置: {
          启用随机事件: true,
          最小间隔年: 1,
          最大间隔年: 10,
          事件提示词: '',
        },
        下次事件时间: null,
        事件记录: [],
      };
      this.cultivationTechnique = null;
      this.cultivation = null;
      this.techniqueSystem = null;
      this.skillState = null;
      this.effects = [];
      this.masteredSkills = null;
      this.systemConfig = null;
      this.body = null;
      this.bodyPartDevelopment = null;

      console.log('[GameState] State has been reset');
    },

    /**
     * 在对话后保存（保存到当前激活存档 + "上次对话"存档）
     * 这是主要的保存机制，每次AI对话后自动调用
     */
    async saveAfterConversation() {
      if (!this.isGameLoaded) {
        console.warn('[GameState] Game not loaded, skipping save');
        return;
      }

      console.log('[GameState] Saving after conversation...');

      const { useCharacterStore } = await import('./characterStore');
      const characterStore = useCharacterStore();

      // 新架构：委托给 characterStore 处理保存逻辑
      // 1. 保存到当前激活的存档
      await characterStore.saveCurrentGame();

      // 2. 注意："上次对话"备份已移至 MainGamePanel.sendMessage() 的开始处（发送消息前）
      // 这样回滚时才能恢复到对话前的状态

      // 3. 检查是否需要创建时间点存档
      await this.checkAndCreateTimeBasedSave();
    },

    /**
     * 检查并覆盖时间点存档（固定存档槽位，按间隔覆盖）
     */
    async checkAndCreateTimeBasedSave() {
      if (!this.timeBasedSaveEnabled) {
        return;
      }

      const now = Date.now();
      const intervalMs = this.timeBasedSaveInterval * 60 * 1000;

      // 如果距离上次时间点存档还没到间隔，跳过
      if (this.lastTimeBasedSave && (now - this.lastTimeBasedSave < intervalMs)) {
        return;
      }

      console.log('[GameState] Updating time-based save slot...');

      const { useCharacterStore } = await import('./characterStore');
      const characterStore = useCharacterStore();

      // 新架构：委托给 characterStore 处理
      await characterStore.saveToSlot('时间点存档');
      this.lastTimeBasedSave = now;
      console.log('[GameState] Time-based save slot updated: 时间点存档');
    },

    /**
     * 在返回道途前保存
     */
    async saveBeforeExit() {
      if (!this.isGameLoaded) {
        return;
      }

      console.log('[GameState] Saving before exit...');
      await this.saveGame();
    },

    /**
     * 设置时间点存档间隔
     * @param minutes 间隔分钟数
     */
    setTimeBasedSaveInterval(minutes: number) {
      if (minutes < 1) {
        console.warn('[GameState] Invalid interval, must be at least 1 minute');
        return;
      }
      this.timeBasedSaveInterval = minutes;
      console.log(`[GameState] Time-based save interval set to ${minutes} minutes`);
    },

    /**
     * 启用/禁用时间点存档
     * @param enabled 是否启用
     */
    setTimeBasedSaveEnabled(enabled: boolean) {
      this.timeBasedSaveEnabled = enabled;
      console.log(`[GameState] Time-based save ${enabled ? 'enabled' : 'disabled'}`);
    },

    /**
     * 启用/禁用对话后自动存档
     * @param enabled 是否启用
     */
    setConversationAutoSaveEnabled(enabled: boolean) {
      this.conversationAutoSaveEnabled = enabled;
      console.log(`[GameState] Conversation auto save ${enabled ? 'enabled' : 'disabled'}`);
    },

    /**
     * 获取当前存档数据
     * @returns 当前的 SaveData 或 null
     */
    getCurrentSaveData(): SaveData | null {
      return this.toSaveData();
    },

    /**
     * 通用状态更新方法
     * @param path 状态路径
     * @param value 要设置的值
     */
    updateState(path: string, value: any) {
      console.log(`[诊断-updateState] 开始更新路径: ${path}`)
      console.log(`[诊断-updateState] 要设置的值:`, value)

      // 🔥 核心修复：使用Vue 3的响应式更新方式
      const parts = path.split('.');
      const rootKey = parts[0];

      console.log(`[诊断-updateState] rootKey:`, rootKey)
      console.log(`[诊断-updateState] 路径部分:`, parts)

      // 对于顶层属性，直接设置(这会触发响应式)
      if (parts.length === 1) {
        (this as any)[rootKey] = value;
        console.log(`[诊断-updateState] 顶层属性直接设置完成`)
        return;
      }

      // 🔥 关键修复：对于嵌套属性，使用Pinia的$patch方法
      // 这确保了Vue 3能够正确追踪响应式变化
      const currentRoot = (this as any)[rootKey];
      console.log(`[诊断-updateState] 当前rootKey的值:`, currentRoot)

      if (currentRoot && typeof currentRoot === 'object') {
        // 🔥 使用cloneDeep创建深拷贝，保持对象结构
        const clonedRoot = cloneDeep(currentRoot);
        console.log(`[诊断-updateState] 深拷贝后的clonedRoot:`, clonedRoot)

        // 使用 lodash set 修改副本
        const nestedPath = parts.slice(1).join('.');
        console.log(`[诊断-updateState] 嵌套路径:`, nestedPath);
        console.log(`[诊断-updateState] set前的value类型:`, typeof value, 'value:', value);
        set(clonedRoot, nestedPath, value);
        console.log(`[诊断-updateState] lodash set后的clonedRoot:`, clonedRoot);
        console.log(`[诊断-updateState] set后检查实际值:`, get(clonedRoot, nestedPath));

        // 🔥 关键：使用$patch替换整个对象，确保响应式追踪
        this.$patch({
          [rootKey]: clonedRoot
        });
        console.log(`[诊断-updateState] 已通过$patch更新root对象`)
        console.log(`[gameStateStore] ✅ 已更新 ${path} = ${JSON.stringify(value).substring(0, 100)}`);
      } else {
        console.log(`[诊断-updateState] currentRoot不是对象，直接设置`)
        // 对于非对象类型，直接使用set
        set(this, path, value);
      }
    },

    /**
     * 添加内容到短期记忆
     */
    addToShortTermMemory(content: string) {
      if (!this.memory) {
        this.memory = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
      }
      if (!Array.isArray(this.memory.短期记忆)) {
        this.memory.短期记忆 = [];
      }
      if (!Array.isArray(this.memory.中期记忆)) {
        this.memory.中期记忆 = [];
      }
      if (!Array.isArray(this.memory.隐式中期记忆)) {
        this.memory.隐式中期记忆 = [];
      }

      // 添加时间前缀（使用"主神纪"与主界面保持一致）
      const gameTime = this.gameTime;
      const minutes = gameTime?.分钟 ?? 0;
      const timePrefix = gameTime
        ? `【主神纪${gameTime.年}轮${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(minutes).padStart(2, '0')}】`
        : '【未知时间】';

      const hasTimePrefix = content.startsWith('【主神纪') || content.startsWith('【未知时间】') || content.startsWith('【仙历');
      const finalContent = hasTimePrefix ? content : `${timePrefix}${content}`;

      // 与 AIBidirectionalSystem / 主面板显示保持一致：使用 push，最新的在末尾
      this.memory.短期记忆.push(finalContent);
      this.memory.隐式中期记忆.push(finalContent); // 同步添加到隐式中期记忆（用于“短期->中期”过渡）

      // 检查溢出，从localStorage读取配置
      const maxShortTerm = (() => {
        try {
          const settings = localStorage.getItem('memory-settings');
          if (!settings) return 5;
          const parsed = JSON.parse(settings);
          const limit = typeof parsed.shortTermLimit === 'number' && parsed.shortTermLimit > 0
            ? parsed.shortTermLimit
            : (typeof parsed.maxShortTerm === 'number' && parsed.maxShortTerm > 0 ? parsed.maxShortTerm : 5);
          return limit;
        } catch { return 5; }
      })();

      while (this.memory.短期记忆.length > maxShortTerm) {
        // 移除最旧的（第一个）
        this.memory.短期记忆.shift();
        const implicit = this.memory.隐式中期记忆.shift();
        if (implicit && !this.memory.中期记忆.includes(implicit)) {
          this.memory.中期记忆.push(implicit);
          console.log('[gameStateStore] ✅ 短期记忆溢出，已转移到中期记忆');
        }
      }

      console.log('[gameStateStore] ✅ 已添加到短期记忆', finalContent.substring(0, 50) + '...');
    },

    // ─── 区域地图操作 ───────────────────────────────────────────────────────────

    /**
     * 根据地点标识查询已生成的区域地图
     * @param locationId WorldLocation 的名称或 id
     */
    getRegionMap(locationId: string) {
      const key = String(locationId || '').trim();
      if (!key) return null;

      if (this.gamePhase === 'mission' && this.currentMission) {
        const missionMaps = ((this.currentMission as any)?.临时状态?.区域地图) as import('@/types/gameMap').RegionMap[] | undefined;
        const missionHit = missionMaps?.find((m) => m.linkedLocationId === key) ?? null;
        if (missionHit) return missionHit;
      }

      const maps = (this.worldInfo as any)?.区域地图 as import('@/types/gameMap').RegionMap[] | undefined;
      return maps?.find((m) => m.linkedLocationId === key) ?? null;
    },

    /**
     * 保存（新增或更新）一张区域地图到 worldInfo
     * @param map 完整的 RegionMap 对象
     */
    saveRegionMap(map: import('@/types/gameMap').RegionMap) {
      if (this.gamePhase === 'mission' && this.currentMission) {
        const mission = this.currentMission as any;
        const temporaryState = mission?.临时状态 && typeof mission.临时状态 === 'object' ? { ...mission.临时状态 } : {};
        const maps = Array.isArray(temporaryState.区域地图) ? [...temporaryState.区域地图] : [];
        const idx = maps.findIndex((m: any) => m?.linkedLocationId === map.linkedLocationId);
        if (idx >= 0) maps[idx] = map;
        else maps.push(map);
        this.currentMission = {
          ...mission,
          临时状态: {
            ...temporaryState,
            区域地图: maps,
          },
        };
        return;
      }

      if (!this.worldInfo) return;
      const worldInfo = this.worldInfo as any;
      if (!Array.isArray(worldInfo.区域地图)) {
        worldInfo.区域地图 = [];
      }
      const idx = (worldInfo.区域地图 as any[]).findIndex(
        (m: any) => m.linkedLocationId === map.linkedLocationId
      );
      if (idx >= 0) {
        worldInfo.区域地图[idx] = map;
      } else {
        worldInfo.区域地图.push(map);
      }
    },

    /**
     * 玩家进入区域：更新位置中的 regionId / buildingId
     * @param regionId  区域地图 ID
     * @param buildingId 初始落点建筑 ID（通常为入口建筑）
     */
    enterRegion(regionId: string, buildingId: string) {
      if (!this.location) return;
      this.location = { ...this.location, regionId, buildingId } as any;
      console.log(`[gameStateStore] ✅ 进入区域: ${regionId} / 建筑: ${buildingId}`);
    },

    /**
     * 玩家离开区域：清除位置中的 regionId / buildingId，恢复世界地图状态
     */
    leaveRegion() {
      if (!this.location) return;
      const loc = { ...this.location } as any;
      delete loc.regionId;
      delete loc.buildingId;
      this.location = loc;
      console.log('[gameStateStore] ✅ 已离开区域，返回世界地图');
    },

    /**
     * 将新地点添加到世界地图（未收录地点手动添加）
     */
    addWorldLocation(location: {
      名称: string;
      类型: string;
      描述: string;
      坐标: { x: number; y: number };
      所属大陆?: string;
    }) {
      if (!this.worldInfo) return;
      const worldInfo = this.worldInfo as any;
      if (!Array.isArray(worldInfo.地点信息)) {
        worldInfo.地点信息 = [];
      }
      // 避免重复添加同名地点
      const exists = (worldInfo.地点信息 as any[]).some(
        (loc: any) => loc.名称 === location.名称 || loc.name === location.名称
      );
      if (exists) {
        console.warn(`[gameStateStore] 地点 "${location.名称}" 已存在，跳过添加`);
        return;
      }
      worldInfo.地点信息.push(location);
      console.log(`[gameStateStore] ✅ 已添加新地点: ${location.名称} (${location.坐标.x}, ${location.坐标.y})`);
    },

    /**
     * 将新地点添加到境界地图集中指定境界的地图（境界分层地图模式专用）
     */
    addWorldLocationToRealm(
      realmKey: string,
      location: {
        名称: string;
        类型: string;
        描述: string;
        坐标: { x: number; y: number };
        所属大陆?: string;
      }
    ) {
      const col = this.realmMapCollection;
      if (!col || !col[realmKey]) {
        console.warn(`[gameStateStore] 境界 "${realmKey}" 不存在于地图集，回退到 addWorldLocation`);
        this.addWorldLocation(location);
        return;
      }
      const realmWorldInfo = col[realmKey] as any;
      if (!Array.isArray(realmWorldInfo.地点信息)) {
        realmWorldInfo.地点信息 = [];
      }
      const exists = (realmWorldInfo.地点信息 as any[]).some(
        (loc: any) => loc.名称 === location.名称 || loc.name === location.名称
      );
      if (exists) {
        console.warn(`[gameStateStore] 境界地图 "${realmKey}" 中地点 "${location.名称}" 已存在，跳过`);
        return;
      }
      realmWorldInfo.地点信息.push(location);
      // 触发 Vue 响应式更新（Pinia 自动处理，但显式赋值更可靠）
      this.realmMapCollection = { ...col, [realmKey]: realmWorldInfo };
      console.log(`[gameStateStore] ✅ 境界 "${realmKey}" 已添加地点: ${location.名称}`);
    },
  },
});
