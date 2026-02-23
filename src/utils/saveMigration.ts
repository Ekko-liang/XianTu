import type { EventSystem, GameTime, SaveData } from '@/types/game';
import type { GamePhase, HubState, Mission, MissionResult, TeamState } from '@/types/mission';
import type { ReincarnatorProfile } from '@/types/reincarnator';
import type { SaveDataV3 } from '@/types/saveSchemaV3';
import { normalizeBackpackCurrencies, syncGodPointsBetweenProfileAndInventory } from '@/utils/currencySystem';
import { getRankFromSoulStrength, getStarFromSoulStrength, normalizeDifficultyStats } from '@/utils/reincarnatorProgress';

export type SaveMigrationIssue =
  | 'legacy-root-keys'
  | 'missing-required-keys'
  | 'invalid-structure';

export interface SaveMigrationDetection {
  needsMigration: boolean;
  issues: SaveMigrationIssue[];
  legacyKeysFound: string[];
}

export interface SaveMigrationReport {
  legacyKeysFound: string[];
  removedLegacyKeys: string[];
  warnings: string[];
}

export interface SaveDisplayInfo {
  角色名字: string;
  境界: string;
  位置: string;
  游戏时间: GameTime | null;
}

const LEGACY_ROOT_KEYS = [
  '状态',
  '玩家角色状态',
  '玩家角色状态信息',
  '玩家角色信息',
  '角色基础信息',
  '玩家角色基础信息',
  '修行状态',
  '状态效果',
  '叙事历史',
  '对话历史',
  '任务系统',
  '事件系统',
  '宗门系统',
  '世界信息',
  '人物关系',
  '装备栏',
  '游戏时间',
  '三千大道',
  '修炼功法',
  '掌握技能',
  '身体部位开发',
] as const;

const REQUIRED_V3_KEYS = ['元数据', '轮回者', '主神空间', '团队', '副本记录', '当前副本', '社交', '世界', '系统'] as const;

const deepClone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);

const stripAIFieldsDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stripAIFieldsDeep);
  if (!isPlainObject(value)) return value;

  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (key === '_AI说明' || key === '_AI修改规则' || key === '_AI重要提醒') continue;
    output[key] = stripAIFieldsDeep(val);
  }
  return output;
};

const coerceTime = (value: any): GameTime => {
  const base: GameTime = { 年: 1000, 月: 1, 日: 1, 小时: 8, 分钟: 0 };
  if (!isPlainObject(value)) return base;
  return {
    年: Number(value.年 ?? value.年数 ?? base.年),
    月: Number(value.月 ?? base.月),
    日: Number(value.日 ?? base.日),
    小时: Number(value.小时 ?? base.小时),
    分钟: Number(value.分钟 ?? base.分钟),
  } as GameTime;
};

const coerceStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value.trim()];
  return [];
};

const normalizeRankLabel = (value: unknown): ReincarnatorProfile['level'] | null => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return null;
  if (['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].includes(raw)) {
    return raw as ReincarnatorProfile['level'];
  }

  if (/^D级/.test(raw) || /(凡人|新人|候选)/i.test(raw)) return 'D';
  if (/^C级/.test(raw) || /(练气|初级轮回者|见习)/i.test(raw)) return 'C';
  if (/^B级/.test(raw) || /(筑基|中级轮回者|正式)/i.test(raw)) return 'B';
  if (/^A级/.test(raw) || /(金丹|高级轮回者|资深)/i.test(raw)) return 'A';
  if (/^S级/.test(raw) || /(元婴|精英轮回者)/i.test(raw)) return 'S';
  if (/^SS级/.test(raw) || /(化神|传说轮回者)/i.test(raw)) return 'SS';
  if (/^SSS级/.test(raw) || /(炼虚|合体|渡劫|超越者)/i.test(raw)) return 'SSS';
  return null;
};

const normalizeStarLabel = (value: unknown): ReincarnatorProfile['star'] | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(1, Math.min(5, Math.floor(value))) as ReincarnatorProfile['star'];
  }

  const raw = String(value ?? '').trim();
  if (!raw) return null;
  if (/初期|一星|1星/.test(raw)) return 1;
  if (/中期|二星|2星/.test(raw)) return 2;
  if (/后期|三星|3星/.test(raw)) return 3;
  if (/圆满|四星|4星/.test(raw)) return 4;
  if (/极境|五星|5星/.test(raw)) return 5;
  const starGlyphCount = (raw.match(/★/g) || []).length;
  if (starGlyphCount > 0) {
    return Math.max(1, Math.min(5, starGlyphCount)) as ReincarnatorProfile['star'];
  }
  return null;
};

const buildDefaultEventSystem = (): EventSystem => ({
  配置: {
    启用随机事件: true,
    最小间隔年: 1,
    最大间隔年: 10,
    事件提示词: '',
  },
  下次事件时间: null,
  事件记录: [],
});

const buildDefaultMemory = (): SaveDataV3['社交']['记忆'] => ({
  短期记忆: [],
  中期记忆: [],
  长期记忆: [],
  隐式中期记忆: [],
});

const normalizeMemory = (value: unknown): SaveDataV3['社交']['记忆'] => {
  const base = buildDefaultMemory();
  if (!isPlainObject(value)) return base;

  const anyValue = value as any;
  return {
    短期记忆: coerceStringArray(anyValue.短期记忆 ?? anyValue.short_term ?? anyValue.shortTerm),
    中期记忆: coerceStringArray(anyValue.中期记忆 ?? anyValue.mid_term ?? anyValue.midTerm),
    长期记忆: coerceStringArray(anyValue.长期记忆 ?? anyValue.long_term ?? anyValue.longTerm),
    隐式中期记忆: coerceStringArray(anyValue.隐式中期记忆 ?? anyValue.implicit_mid_term ?? anyValue.implicitMidTerm),
  };
};

const buildDefaultOnline = (): SaveDataV3['系统']['联机'] => ({
  模式: '单机',
  房间ID: null,
  玩家ID: null,
  只读路径: ['世界'],
  世界曝光: false,
  冲突策略: '服务器',
});

const buildDefaultWorldInfo = (nowIso: string) => ({
  世界名称: '主神空间',
  大陆信息: [],
  势力信息: [],
  地点信息: [],
  生成时间: nowIso,
  世界背景: '主神空间与多副本宇宙',
  世界纪元: '轮回纪元',
  特殊设定: [],
  版本: 'v3-infinite-flow',
});

const buildDefaultIdentity = () => ({
  名字: '无名轮回者',
  性别: '男',
  出生日期: { 年: 982, 月: 1, 日: 1 },
  种族: '人类',
  世界: { id: 0, name: '主神空间', description: '轮回中枢' },
  天资: { id: 0, name: '普通', total_points: 30, rarity: 1, color: '#9aa0a6' },
  出生: '未知背景',
  灵根: '未觉醒潜能',
  天赋: [],
  先天六司: { 根骨: 5, 灵性: 5, 悟性: 5, 气运: 5, 魅力: 5, 心性: 5 },
  后天六司: { 根骨: 0, 灵性: 0, 悟性: 0, 气运: 0, 魅力: 0, 心性: 0 },
});

const buildDefaultAttributes = () => ({
  境界: { 名称: 'D', 阶段: '一星', 当前进度: 0, 下一级所需: 100, 突破描述: '完成首个副本并满足四星条件后可晋阶' },
  声望: 0,
  气血: { 当前: 100, 上限: 100 },
  灵气: { 当前: 80, 上限: 80 },
  神识: { 当前: 80, 上限: 80 },
  寿命: { 当前: 18, 上限: 120 },
});

const buildDefaultLocation = () => ({
  描述: '主神空间·休息区',
  x: 5000,
  y: 5000,
  灵气浓度: 50,
  风险指数: 15,
});

const buildDefaultInventory = () => {
  const inventory = {
    灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
    货币: {
      神点: { 币种: '神点', 名称: '神点', 数量: 0, 价值度: 1, 描述: '主神空间通用货币', 图标: 'Coins' },
    },
    货币设置: { 禁用币种: [], 基准币种: '神点' },
    物品: {},
  } as any;
  normalizeBackpackCurrencies(inventory);
  return inventory;
};

const buildDefaultEquipment = () => ({ 装备1: null, 装备2: null, 装备3: null, 装备4: null, 装备5: null, 装备6: null });

const buildDefaultTechniqueSystem = () => ({ 当前功法ID: null, 功法进度: {}, 功法套装: { 主修: null, 辅修: [] } });

const buildDefaultCultivation = () => ({ 修炼功法: null, 修炼能力: null, 修炼状态: { 模式: '待机' } });

const buildDefaultSkillState = () => ({ 掌握技能: [], 装备栏: [], 冷却: {} });

const buildDefaultReincarnatorProfile = (): ReincarnatorProfile => ({
  level: 'D',
  soulStrength: 0,
  soulStrengthCapMultiplier: 1,
  star: 1,
  missionCount: 0,
  effectiveMissionCountByDifficulty: { D: 0, C: 0, B: 0, A: 0, S: 0, SS: 0, SSS: 0 },
  survivalRate: 1,
  promotionPoints: 0,
  promotionFailureStreak: 0,
  promotionTrialFailures: 0,
  promotionTrialPending: false,
  pendingPromotionTarget: null,
  godPoints: 0,
  abilities: [],
  attributes: { STR: 5, PER: 5, INT: 5, LUK: 5, CHA: 5, WIL: 5 },
  vitals: {
    HP: { current: 100, max: 100 },
    EP: { current: 80, max: 80 },
    MP: { current: 80, max: 80 },
  },
});

const buildDefaultHubState = (): HubState => ({
  unlockedAreas: ['exchange', 'training', 'social', 'terminal', 'portal'],
  shopInventory: [
    { id: 'shop_basic_medkit', name: '应急治疗包', category: 'item', price: 120, stock: 10, description: '副本内快速恢复生命值。' },
    { id: 'shop_info_scan', name: '副本信息扫描', category: 'info', price: 200, stock: 99, description: '显示副本基础规则与初始威胁。' },
  ],
  availableMissions: [],
  npcs: [
    { id: 'hub_guide', name: '引导者', role: '空间接待员', favor: 0 },
    { id: 'hub_merchant', name: '灰市商人', role: '商店管理员', favor: 0 },
  ],
});

const buildDefaultTeamState = (): TeamState => ({
  members: [],
  sharedResources: [],
  teamLevel: 1,
  collaborationLogs: [],
  teamEvents: [],
});

const buildReincarnatorFromLegacy = (input: {
  character?: any;
  attributes?: any;
  missionCount?: number;
  profile?: Partial<ReincarnatorProfile>;
}): ReincarnatorProfile => {
  const fallback = buildDefaultReincarnatorProfile();
  const innate = input.character?.先天六司 ?? {};
  const profile = input.profile ?? {};
  const missionCount = Number(profile.missionCount ?? input.missionCount ?? 0);
  const difficultyStats = normalizeDifficultyStats(
    (profile as any).effectiveMissionCountByDifficulty ?? { D: missionCount },
  );
  const inferredSoulStrength = Math.max(0, Number(profile.soulStrength ?? missionCount * 8));
  const realmLike = input.attributes?.境界 ?? {};
  const rankFromRealm = normalizeRankLabel(realmLike?.名称 ?? realmLike?.阶段);
  const starFromRealm = normalizeStarLabel(realmLike?.阶段);
  const resolvedLevel =
    normalizeRankLabel(profile.level)
    ?? rankFromRealm
    ?? getRankFromSoulStrength(inferredSoulStrength);
  const resolvedStar = (
    normalizeStarLabel((profile as any).star)
    ?? starFromRealm
    ?? getStarFromSoulStrength(resolvedLevel, inferredSoulStrength)
  ) as ReincarnatorProfile['star'];
  const promotionFailureStreak = Math.max(
    0,
    Math.floor(Number((profile as any).promotionFailureStreak ?? profile.promotionTrialFailures ?? 0)),
  );

  return {
    ...fallback,
    ...profile,
    level: resolvedLevel,
    soulStrength: inferredSoulStrength,
    star: resolvedStar,
    missionCount,
    effectiveMissionCountByDifficulty: difficultyStats,
    soulStrengthCapMultiplier: Math.max(0.1, Math.min(1, Number((profile as any).soulStrengthCapMultiplier ?? 1))),
    promotionFailureStreak,
    promotionTrialFailures: Math.max(
      0,
      Math.floor(Number(profile.promotionTrialFailures ?? promotionFailureStreak)),
    ),
    attributes: {
      STR: Number((profile.attributes as any)?.STR ?? innate.根骨 ?? fallback.attributes.STR),
      PER: Number((profile.attributes as any)?.PER ?? innate.灵性 ?? fallback.attributes.PER),
      INT: Number((profile.attributes as any)?.INT ?? innate.悟性 ?? fallback.attributes.INT),
      LUK: Number((profile.attributes as any)?.LUK ?? innate.气运 ?? fallback.attributes.LUK),
      CHA: Number((profile.attributes as any)?.CHA ?? innate.魅力 ?? fallback.attributes.CHA),
      WIL: Number((profile.attributes as any)?.WIL ?? innate.心性 ?? fallback.attributes.WIL),
    },
    vitals: {
      HP: {
        current: Number((profile.vitals as any)?.HP?.current ?? input.attributes?.气血?.当前 ?? fallback.vitals.HP.current),
        max: Number((profile.vitals as any)?.HP?.max ?? input.attributes?.气血?.上限 ?? fallback.vitals.HP.max),
      },
      EP: {
        current: Number((profile.vitals as any)?.EP?.current ?? input.attributes?.灵气?.当前 ?? fallback.vitals.EP.current),
        max: Number((profile.vitals as any)?.EP?.max ?? input.attributes?.灵气?.上限 ?? fallback.vitals.EP.max),
      },
      MP: {
        current: Number((profile.vitals as any)?.MP?.current ?? input.attributes?.神识?.当前 ?? fallback.vitals.MP.current),
        max: Number((profile.vitals as any)?.MP?.max ?? input.attributes?.神识?.上限 ?? fallback.vitals.MP.max),
      },
    },
  };
};

function ensureReincarnatorMirror(migrated: SaveDataV3): SaveDataV3 {
  const output = deepClone(migrated) as any;

  const identity = output?.轮回者?.身份 ?? buildDefaultIdentity();
  const attributes = output?.轮回者?.属性 ?? buildDefaultAttributes();
  const location = output?.轮回者?.位置 ?? buildDefaultLocation();
  const effects = Array.isArray(output?.轮回者?.效果) ? output.轮回者.效果 : [];
  const inventory = isPlainObject(output?.轮回者?.背包) ? output.轮回者.背包 : buildDefaultInventory();
  const equipment = isPlainObject(output?.轮回者?.装备) ? output.轮回者.装备 : buildDefaultEquipment();
  const normalizedTechnique = output?.轮回者?.功法 ?? output?.轮回者?.能力 ?? buildDefaultTechniqueSystem();
  const normalizedAbilityState = output?.轮回者?.修炼 ?? output?.轮回者?.能力状态 ?? buildDefaultCultivation();

  normalizeBackpackCurrencies(inventory);

  output.轮回者 = {
    ...buildDefaultReincarnatorProfile(),
    ...output.轮回者,
    身份: identity,
    属性: attributes,
    位置: location,
    效果: effects,
    背包: inventory,
    装备: equipment,
    功法: normalizedTechnique,
    修炼: normalizedAbilityState,
    能力: output?.轮回者?.能力 ?? normalizedTechnique,
    能力状态: output?.轮回者?.能力状态 ?? normalizedAbilityState,
    大道: output?.轮回者?.大道 ?? { 大道列表: {} },
    技能: output?.轮回者?.技能 ?? buildDefaultSkillState(),
  };
  output.轮回者.godPoints = syncGodPointsBetweenProfileAndInventory(
    output.轮回者.背包 as any,
    Number(output.轮回者?.godPoints ?? 0),
    true,
  );

  output.角色 = {
    身份: output.轮回者.身份,
    属性: output.轮回者.属性,
    位置: output.轮回者.位置,
    效果: output.轮回者.效果,
    身体: output.轮回者.身体,
    背包: output.轮回者.背包,
    装备: output.轮回者.装备,
    功法: output.轮回者.功法,
    修炼: output.轮回者.修炼,
    能力: output.轮回者.能力 ?? output.轮回者.功法,
    能力状态: output.轮回者.能力状态 ?? output.轮回者.修炼,
    大道: output.轮回者.大道,
    技能: output.轮回者.技能,
  };

  output.元数据 = {
    ...output.元数据,
    当前阶段: output?.元数据?.当前阶段 ?? 'hub',
  };

  output.主神空间 = isPlainObject(output.主神空间) ? output.主神空间 : buildDefaultHubState();
  output.团队 = isPlainObject(output.团队) ? output.团队 : buildDefaultTeamState();
  output.副本记录 = Array.isArray(output.副本记录) ? output.副本记录 : [];
  output.当前副本 = output.当前副本 ?? null;

  if (!isPlainObject(output.社交)) output.社交 = {};
  output.社交.记忆 = normalizeMemory(output.社交.记忆);
  if (!isPlainObject(output.社交.关系)) output.社交.关系 = {};
  if (!isPlainObject(output.社交.事件)) output.社交.事件 = buildDefaultEventSystem();

  if (!isPlainObject(output.世界)) output.世界 = { 信息: buildDefaultWorldInfo(new Date().toISOString()) };
  if (!isPlainObject(output.世界.信息)) output.世界.信息 = buildDefaultWorldInfo(new Date().toISOString());

  if (!isPlainObject(output.系统)) output.系统 = { 联机: buildDefaultOnline() };
  if (!isPlainObject(output.系统.联机)) output.系统.联机 = buildDefaultOnline();

  return output as SaveDataV3;
}

export function extractSaveDisplayInfo(saveData: SaveData | null | undefined): SaveDisplayInfo {
  const defaultInfo: SaveDisplayInfo = {
    角色名字: '未知',
    境界: 'D级一星',
    位置: '主神空间',
    游戏时间: null,
  };

  if (!saveData || typeof saveData !== 'object') return defaultInfo;

  const anySave = saveData as any;

  const 角色名字 =
    anySave?.轮回者?.身份?.名字
    ?? anySave?.角色?.身份?.名字
    ?? anySave?.角色基础信息?.名字
    ?? defaultInfo.角色名字;

  const level = String(anySave?.轮回者?.level ?? '').trim();
  const star = Number(anySave?.轮回者?.star ?? 0);
  const 境界 = level
    ? `${level}级${star > 0 ? `${star}星` : ''}`
    : (anySave?.角色?.属性?.境界?.名称 ?? anySave?.属性?.境界?.名称 ?? defaultInfo.境界);

  const 位置 =
    anySave?.当前副本?.临时状态?.位置?.区域
    ?? anySave?.主神空间?.当前位置?.区域
    ?? anySave?.角色?.位置?.描述
    ?? anySave?.位置?.描述
    ?? defaultInfo.位置;

  const 游戏时间 = anySave?.元数据?.时间 ? coerceTime(anySave.元数据.时间) : null;

  return { 角色名字: String(角色名字), 境界: String(境界), 位置: String(位置), 游戏时间 };
}

export function isSaveDataV3(saveData: SaveData | null | undefined): saveData is SaveDataV3 {
  if (!saveData || typeof saveData !== 'object') return false;
  const anySave = saveData as any;
  return REQUIRED_V3_KEYS.every((key) => isPlainObject(anySave[key]) || key === '副本记录' || key === '当前副本')
    && Array.isArray(anySave.副本记录)
    && '当前副本' in anySave;
}

export function detectLegacySaveData(saveData: SaveData | null | undefined): SaveMigrationDetection {
  if (!saveData || typeof saveData !== 'object') {
    return { needsMigration: true, issues: ['invalid-structure'], legacyKeysFound: [] };
  }

  const anySave = saveData as any;
  if (isSaveDataV3(saveData)) {
    return { needsMigration: false, issues: [], legacyKeysFound: [] };
  }

  const legacyKeysFound = [
    ...LEGACY_ROOT_KEYS.filter((k) => k in anySave),
    ...(anySave.系统?.扩展?.无限流 ? ['系统.扩展.无限流'] : []),
    ...(anySave.角色 && !anySave.轮回者 ? ['五域角色结构'] : []),
  ] as string[];

  const missingRequired = REQUIRED_V3_KEYS.filter((k) => !(k in anySave));
  const issues: SaveMigrationIssue[] = [];
  if (legacyKeysFound.length > 0) issues.push('legacy-root-keys');
  if (missingRequired.length > 0) issues.push('missing-required-keys');

  return { needsMigration: issues.length > 0, issues, legacyKeysFound };
}

export function migrateSaveDataToLatest(raw: SaveData): { migrated: SaveDataV3; report: SaveMigrationReport } {
  const sourceRaw = deepClone(raw ?? ({} as any)) as any;
  const source = stripAIFieldsDeep(sourceRaw) as any;

  const report: SaveMigrationReport = {
    legacyKeysFound: [],
    removedLegacyKeys: [],
    warnings: [],
  };

  if (isSaveDataV3(source)) {
    const normalized = ensureReincarnatorMirror(source as SaveDataV3);
    if (source?.系统?.扩展?.无限流) {
      report.legacyKeysFound.push('系统.扩展.无限流');
      report.removedLegacyKeys.push('系统.扩展.无限流');
      if (isPlainObject((normalized as any).系统?.扩展)) {
        delete (normalized as any).系统.扩展.无限流;
        if (Object.keys((normalized as any).系统.扩展).length === 0) {
          delete (normalized as any).系统.扩展;
        }
      }
    }
    return { migrated: normalized, report };
  }

  report.legacyKeysFound = LEGACY_ROOT_KEYS.filter((k) => k in source) as string[];
  if (source?.系统?.扩展?.无限流) report.legacyKeysFound.push('系统.扩展.无限流');

  const nowIso = new Date().toISOString();
  const infiniteState = (source?.系统?.扩展?.无限流 ?? source?.扩展?.无限流 ?? {}) as any;

  const flatCharacter =
    source.角色
    ?? source.角色基础信息
    ?? source.玩家角色基础信息
    ?? source.玩家角色信息
    ?? source.玩家角色状态信息?.角色
    ?? {};

  const legacyStatusLike = source.属性 ?? source.状态 ?? source.玩家角色状态 ?? source.玩家角色状态信息 ?? {};
  const legacyStatusObj = isPlainObject(legacyStatusLike) ? legacyStatusLike : ({} as any);

  const flatAttributes = (source?.角色?.属性 as any) ?? {
    ...buildDefaultAttributes(),
    ...(isPlainObject(legacyStatusObj) ? {
      境界: (legacyStatusObj as any).境界 ?? buildDefaultAttributes().境界,
      声望: (legacyStatusObj as any).声望 ?? 0,
      气血: (legacyStatusObj as any).气血 ?? buildDefaultAttributes().气血,
      灵气: (legacyStatusObj as any).灵气 ?? buildDefaultAttributes().灵气,
      神识: (legacyStatusObj as any).神识 ?? buildDefaultAttributes().神识,
      寿命: (legacyStatusObj as any).寿命 ?? buildDefaultAttributes().寿命,
    } : {}),
  };
  if (isPlainObject(flatAttributes?.境界)) {
    const realm = flatAttributes.境界 as any;
    const normalizedRank = normalizeRankLabel(realm?.名称 ?? realm?.name ?? realm?.rank) ?? 'D';
    const normalizedStar = normalizeStarLabel(realm?.阶段 ?? realm?.stage) ?? 1;
    flatAttributes.境界 = {
      ...realm,
      名称: normalizedRank,
      阶段: ['一星', '二星', '三星', '四星', '五星'][normalizedStar - 1] || '一星',
      当前进度: Number(realm?.当前进度 ?? 0),
      下一级所需: Number(realm?.下一级所需 ?? 100),
      突破描述: realm?.突破描述 || `完成副本并积累灵魂强度，向更高评级晋升。`,
    };
  }

  const flatEffects = Array.isArray(source?.角色?.效果)
    ? source.角色.效果
    : Array.isArray(source?.效果)
      ? source.效果
      : Array.isArray(source?.状态效果)
        ? source.状态效果
        : [];

  const flatLocation =
    source?.角色?.位置
    ?? source?.位置
    ?? (legacyStatusObj as any).位置
    ?? buildDefaultLocation();

  const flatInventory =
    source?.角色?.背包
    ?? source?.背包
    ?? buildDefaultInventory();
  normalizeBackpackCurrencies(flatInventory as any);

  const flatEquipment =
    source?.角色?.装备
    ?? source?.装备
    ?? source?.装备栏
    ?? buildDefaultEquipment();

  const flatTechniqueSystem =
    source?.轮回者?.能力
    ?? source?.角色?.能力
    ?? source?.角色?.功法
    ?? source?.功法
    ?? buildDefaultTechniqueSystem();

  const flatCultivation =
    source?.轮回者?.能力状态
    ?? source?.角色?.能力状态
    ?? source?.角色?.修炼
    ?? source?.修炼
    ?? (source?.修炼功法 !== undefined ? { 修炼功法: source.修炼功法 } : buildDefaultCultivation());

  const flatDao =
    source?.角色?.大道
    ?? source?.大道
    ?? source?.三千大道
    ?? { 大道列表: {} };

  const flatSkills =
    source?.角色?.技能
    ?? source?.技能
    ?? (source?.掌握技能
      ? { 掌握技能: source.掌握技能, 装备栏: [], 冷却: {} }
      : buildDefaultSkillState());

  const characterIdentity = isPlainObject(flatCharacter?.身份)
    ? (flatCharacter.身份 as any)
    : isPlainObject(flatCharacter)
      ? (flatCharacter as any)
      : buildDefaultIdentity();

  const flatSect = source?.社交?.宗门 ?? source?.宗门 ?? source?.宗门系统 ?? null;
  const flatRelationships = source?.社交?.关系 ?? source?.关系 ?? source?.人物关系 ?? {};
  const flatMemory = normalizeMemory(source?.社交?.记忆 ?? source?.记忆);
  const flatEventRaw = source?.社交?.事件 ?? source?.事件 ?? source?.事件系统 ?? buildDefaultEventSystem();
  const flatEvent = isPlainObject(flatEventRaw) ? deepClone(flatEventRaw) : buildDefaultEventSystem();

  const worldInfoCandidate = source?.世界?.信息 ?? source?.世界 ?? source?.世界信息 ?? source?.worldInfo ?? undefined;
  const worldInfo = isPlainObject(worldInfoCandidate) ? worldInfoCandidate : buildDefaultWorldInfo(nowIso);

  const narrative =
    source?.系统?.历史?.叙事
    ?? source?.历史?.叙事
    ?? source?.叙事历史
    ?? source?.对话历史
    ?? [];

  const online = source?.系统?.联机 ?? source?.联机 ?? buildDefaultOnline();
  const normalizedSystemExtension = (() => {
    const rawExt = source?.系统?.扩展 ?? source?.扩展;
    if (!isPlainObject(rawExt)) return undefined;
    const copied = deepClone(rawExt as any);
    if (isPlainObject(copied) && '无限流' in copied) delete copied.无限流;
    return Object.keys(copied).length > 0 ? copied : undefined;
  })();

  const profileSource = (source?.轮回者 ?? infiniteState?.轮回者 ?? {}) as Partial<ReincarnatorProfile>;
  const hubSource = (source?.主神空间 ?? infiniteState?.主神空间 ?? {}) as HubState;
  const teamSource = (source?.团队 ?? infiniteState?.团队 ?? {}) as TeamState;
  const missionHistorySource =
    (Array.isArray(source?.副本记录) ? source.副本记录 : Array.isArray(infiniteState?.副本记录) ? infiniteState.副本记录 : []) as MissionResult[];
  const currentMissionSource =
    ((source?.当前副本 ?? infiniteState?.当前副本 ?? null) as Mission | null);

  const phase = String(source?.元数据?.当前阶段 ?? source?.当前阶段 ?? infiniteState?.当前阶段 ?? 'hub').toLowerCase();
  const currentPhase: GamePhase = phase === 'mission' || phase === 'settlement' ? phase : 'hub';

  const reincarnator = buildReincarnatorFromLegacy({
    character: characterIdentity,
    attributes: flatAttributes,
    missionCount: missionHistorySource.length,
    profile: profileSource,
  });

  const migrated: SaveDataV3 = {
    元数据: {
      版本号: 3,
      存档ID: String(source?.元数据?.存档ID ?? source?.存档ID ?? `save_${Date.now()}`),
      存档名: String(source?.元数据?.存档名 ?? source?.存档名 ?? '迁移存档'),
      游戏版本: source?.元数据?.游戏版本 ?? source?.游戏版本,
      创建时间: String(source?.元数据?.创建时间 ?? source?.创建时间 ?? nowIso),
      更新时间: nowIso,
      游戏时长秒: Number(source?.元数据?.游戏时长秒 ?? source?.游戏时长秒 ?? source?.元数据?.游戏时长 ?? source?.游戏时长 ?? 0),
      时间: coerceTime(source?.元数据?.时间 ?? source?.时间 ?? source?.游戏时间),
      当前阶段: currentPhase,
    },
    轮回者: {
      ...reincarnator,
      身份: characterIdentity,
      属性: flatAttributes,
      位置: flatLocation,
      效果: flatEffects,
      身体: source?.角色?.身体 ?? source?.身体 ?? (source?.身体部位开发 ? { 部位开发: source.身体部位开发 } : undefined),
      背包: flatInventory,
      装备: flatEquipment,
      功法: flatTechniqueSystem,
      修炼: flatCultivation,
      能力: flatTechniqueSystem,
      能力状态: flatCultivation,
      大道: flatDao,
      技能: flatSkills,
    },
    主神空间: isPlainObject(hubSource) ? ({ ...buildDefaultHubState(), ...hubSource } as HubState) : buildDefaultHubState(),
    团队: isPlainObject(teamSource) ? ({ ...buildDefaultTeamState(), ...teamSource } as TeamState) : buildDefaultTeamState(),
    副本记录: Array.isArray(missionHistorySource) ? missionHistorySource : [],
    当前副本: currentMissionSource,
    社交: {
      关系: isPlainObject(flatRelationships) ? (flatRelationships as any) : {},
      宗门: flatSect,
      事件: isPlainObject(flatEvent) ? (flatEvent as any) : buildDefaultEventSystem(),
      记忆: flatMemory,
      关系矩阵: source?.社交?.关系矩阵,
    },
    世界: {
      信息: worldInfo as any,
      状态: source?.世界?.状态 ?? source?.世界状态 ?? undefined,
    },
    系统: {
      配置: source?.系统?.配置 ?? source?.系统 ?? source?.系统配置 ?? undefined,
      设置: source?.系统?.设置 ?? source?.设置 ?? undefined,
      缓存: source?.系统?.缓存 ?? source?.缓存 ?? undefined,
      行动队列: source?.系统?.行动队列 ?? source?.行动队列 ?? undefined,
      历史: { 叙事: Array.isArray(narrative) ? narrative : [] },
      联机: isPlainObject(online) ? { ...buildDefaultOnline(), ...(online as any) } : buildDefaultOnline(),
      扩展: normalizedSystemExtension,
    },
  };

  const normalized = ensureReincarnatorMirror(migrated);

  if (isPlainObject((normalized as any).系统?.扩展)) {
    if ('无限流' in ((normalized as any).系统.扩展 || {})) {
      report.removedLegacyKeys.push('系统.扩展.无限流');
      delete (normalized as any).系统.扩展.无限流;
    }
    if (Object.keys((normalized as any).系统.扩展).length === 0) {
      delete (normalized as any).系统.扩展;
    }
  }

  for (const key of LEGACY_ROOT_KEYS) {
    if (key in source) report.removedLegacyKeys.push(String(key));
  }

  for (const key of REQUIRED_V3_KEYS) {
    if (!(key in (normalized as any))) report.warnings.push(`迁移后缺少必填字段：${String(key)}`);
  }

  if (!normalized?.轮回者?.身份) report.warnings.push('迁移后仍缺少 轮回者.身份（将导致部分界面无法展示）');

  return { migrated: normalized, report };
}
