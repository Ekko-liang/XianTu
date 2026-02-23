/**
 * 增强的世界生成器 - 集成数据校验和重试机制
 * 确保生成数据的质量和一致性
 */

import { getTavernHelper, isTavernEnv } from '../tavern';
import { EnhancedWorldPromptBuilder, type WorldPromptConfig, RealmMapPromptBuilder, type RealmMapPromptConfig } from './enhancedWorldPrompts';
import type { WorldInfo } from '@/types/game.d';
import { WorldMapConfig } from '@/types/worldMap';
import { promptStorage } from '@/services/promptStorage';
import { parseJsonSmart } from '@/utils/jsonExtract';
import { aiService } from '@/services/aiService';

// 重新定义 ValidationResult 接口，解除对外部文件的依赖
interface ValidationError {
  path: string;
  message: string;
  expected?: any;
  received?: any;
}
interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

const normalizeFactionLevel = (value: unknown): string => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (['D', 'C', 'B', 'A', 'S', 'SS', 'SSS'].includes(raw)) return raw;
  if (raw.includes('超')) return 'SS';
  if (raw.includes('一')) return 'A';
  if (raw.includes('二')) return 'B';
  if (raw.includes('三')) return 'C';
  return 'D';
};

const levelToPowerBase = (level: string): number => {
  const map: Record<string, number> = {
    D: 20,
    C: 32,
    B: 45,
    A: 60,
    S: 75,
    SS: 88,
    SSS: 96,
  };
  return map[level] ?? 20;
};

const calculateFactionPower = (faction: Record<string, any>): number => {
  const level = normalizeFactionLevel(faction.level || faction.等级);
  const base = levelToPowerBase(level);
  const memberTotal = Number(faction.memberCount?.total ?? faction.成员数量?.总数 ?? 0);
  const specialties = Array.isArray(faction.specialties || faction.features || faction.特色)
    ? (faction.specialties || faction.features || faction.特色).length
    : 0;
  const sizeBonus = Math.min(10, Math.floor(Math.max(0, memberTotal) / 120));
  const specialtyBonus = Math.min(8, specialties * 2);
  return Math.max(1, Math.min(100, base + sizeBonus + specialtyBonus));
};

const calculateFactionReputation = (faction: Record<string, any>): number => {
  const level = normalizeFactionLevel(faction.level || faction.等级);
  const base = Math.floor(levelToPowerBase(level) / 4);
  const type = String(faction.type || faction.类型 || '');
  const typeBonus = /(敌对|异常|boss|hostile)/i.test(type)
    ? 2
    : /(中立|商会|trade)/i.test(type)
      ? 1
      : 3;
  return Math.max(0, Math.min(30, base + typeBonus));
};

 interface RawWorldData {
   continents?: Record<string, any>[];
  factions?: Record<string, any>[];
  locations?: Record<string, any>[];
  [key: string]: any;
}

export interface EnhancedWorldGenConfig {
  worldName?: string;
  worldBackground?: string;
  worldEra?: string;
  missionName?: string;
  missionWorldType?: string;
  missionDifficulty?: string;
  gamePhase?: 'hub' | 'mission' | 'settlement' | string;
  factionCount: number;
  locationCount: number;
  secretRealmsCount: number;
  continentCount: number; // 新增大陆数量配置
  maxRetries: number;
  retryDelay: number;
  characterBackground?: string;
  mapConfig?: WorldMapConfig;
  onStreamChunk?: (chunk: string) => void; // 流式输出回调
  useStreaming?: boolean; // 是否使用流式传输（默认true）
  existingFactions?: Array<{ 名称: string; 位置?: any; 势力范围?: any[] }>; // 现有势力（防止重叠）
  existingLocations?: Array<{ 名称: string; coordinates?: any }>; // 现有地点（防止重叠）
}

export class EnhancedWorldGenerator {
  private config: EnhancedWorldGenConfig;
  private previousErrors: string[] = [];
  // 保存原始配置，用于重试时的数量计算
  private originalConfig: {
    factionCount: number;
    locationCount: number;
    secretRealmsCount: number;
    continentCount: number;
  };

  constructor(config: EnhancedWorldGenConfig) {
    this.config = config;
    // 保存原始数量配置
    this.originalConfig = {
      factionCount: config.factionCount,
      locationCount: config.locationCount,
      secretRealmsCount: config.secretRealmsCount,
      continentCount: config.continentCount
    };
  }

  /**
   * 生成验证过的世界数据 (重构后)
   */
  async generateValidatedWorld(): Promise<{ success: boolean; worldInfo?: WorldInfo; errors?: string[] }> {
    for (let i = 0; i <= this.config.maxRetries; i++) {
      try {
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * i));
          this.reduceCountsForRetry(i);
        }

        const worldData = await this.generateWorldData();
        const validationResult = this.validateWorldData(worldData);

        if (validationResult.isValid) {
          return { success: true, worldInfo: worldData };
        } else {
          this.previousErrors = validationResult.errors.map(e => e.message);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.previousErrors = [message];
      }
    }

    return { success: false, errors: this.previousErrors };
  }

  /**
   * 重试时减少数量参数，降低token消耗
   * 注意："仅生成大陆"模式下只减少大陆数量
   * @param retryCount 当前重试次数
   */
  private reduceCountsForRetry(retryCount: number): void {
    const reductionFactor = 0.8;
    const factor = Math.pow(reductionFactor, retryCount);

    // "仅生成大陆"模式：只减少大陆数量
    if (this.originalConfig.factionCount === 0) {
      this.config.continentCount = Math.max(2, Math.floor(this.originalConfig.continentCount * factor));
      return;
    }

    // 完整世界生成模式：减少所有数量
    this.config.factionCount = Math.max(3, Math.floor(this.originalConfig.factionCount * factor));
    this.config.locationCount = Math.max(5, Math.floor(this.originalConfig.locationCount * factor));
    this.config.secretRealmsCount = Math.max(2, Math.floor(this.originalConfig.secretRealmsCount * factor));
    this.config.continentCount = Math.max(2, Math.floor(this.originalConfig.continentCount * factor));
  }

  /**
   * 生成世界数据 (重构后)
   */
  private async generateWorldData(): Promise<WorldInfo> {
    const tavern = getTavernHelper();
    if (!tavern) {
      throw new Error('AI服务未初始化，请在设置中配置AI服务');
    }

    const prompt = await this.buildPromptWithErrors();

    // 🔥 检查是否启用了强JSON模式
    const forceJsonMode = aiService.isForceJsonEnabled('world_generation');
    console.log('[世界生成] 强JSON模式:', forceJsonMode);

    try {
      const orderedPrompts: Array<{ role: 'system' | 'user'; content: string }> = [
        {
          role: 'user',
          content: prompt
        },
        {
          role: 'user',
          content: '请根据上述要求生成完整的世界数据JSON。'
        }
      ];

      const response = await tavern.generateRaw({
        ordered_prompts: orderedPrompts,
        should_stream: this.config.useStreaming !== false,
        usageType: 'world_generation',
        overrides: {
          world_info_before: '',
          world_info_after: ''
        },
        onStreamChunk: (chunk: string) => {
          if (this.config.onStreamChunk) {
            this.config.onStreamChunk(chunk);
          }
        }
      });

      // 处理返回值：可能是字符串或对象
      let responseText: string;
      if (response && typeof response === 'object' && 'text' in response) {
        responseText = (response as { text: string }).text;
      } else if (typeof response === 'string') {
        responseText = response;
      } else {
        responseText = String(response);
      }

      console.log('[世界生成] 响应长度:', responseText?.length || 0);

      const worldData = this.parseAIResponse(responseText, forceJsonMode);
      return this.convertToWorldInfo(worldData);

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`AI生成失败: ${message}`);
    }
  }

  /**
   * 构建带有错误修正信息的提示词
   * 注意：重试时不添加错误信息，因为数量参数已调整
   */
  private async buildPromptWithErrors(): Promise<string> {
    return await this.buildPrompt();
  }

  /**
   * 构建基础提示词
   * 优先使用用户自定义的提示词，如果没有则使用默认生成的
   */
  private async buildPrompt(): Promise<string> {
    const customPrompt = await promptStorage.get('worldGeneration');

    // 使用 originalConfig 保证重试时约束不漂移
    const { factionCount, locationCount, secretRealmsCount, continentCount } = this.originalConfig;
    const promptConfig: WorldPromptConfig = {
      factionCount,
      totalLocations: locationCount,
      secretRealms: secretRealmsCount,
      continentCount,
      characterBackground: this.config.characterBackground,
      worldBackground: this.config.worldBackground,
      worldEra: this.config.worldEra,
      worldName: this.config.worldName,
      missionName: this.config.missionName,
      missionWorldType: this.config.missionWorldType,
      missionDifficulty: this.config.missionDifficulty,
      gamePhase: this.config.gamePhase,
      mapConfig: this.config.mapConfig,
    };

    let defaultPrompt = EnhancedWorldPromptBuilder.buildPrompt(promptConfig);

    // 注入现有地点和势力信息（防重叠）
    if (this.config.existingFactions?.length || this.config.existingLocations?.length) {
      defaultPrompt += `

【已有锚点（禁止重叠）】
新生成坐标必须避开以下已存在条目：`;
      if (this.config.existingFactions?.length) {
        const factionList = this.config.existingFactions
          .map((f) => `- ${f.名称}${f.位置 ? `(位置:${JSON.stringify(f.位置)})` : ''}`)
          .join('\n');
        defaultPrompt += `\n已有势力：\n${factionList}`;
      }
      if (this.config.existingLocations?.length) {
        const locationList = this.config.existingLocations
          .map((l) => `- ${l.名称}${l.coordinates ? `(坐标:x=${l.coordinates.x},y=${l.coordinates.y})` : ''}`)
          .join('\n');
        defaultPrompt += `\n已有地点：\n${locationList}`;
      }
    }

    // 用户修改过 worldGeneration prompt 时优先用用户版本
    if (customPrompt && customPrompt.trim()) {
      const allPrompts = await promptStorage.loadAll();
      if (allPrompts['worldGeneration']?.modified) {
        return customPrompt;
      }
    }

    return defaultPrompt;
  }

  /**
   * 解析AI响应 - 智能处理强JSON模式和普通模式
   * @param response AI返回的原始文本
   * @param forceJsonMode 是否启用强JSON模式（API返回纯JSON）
   */
  private parseAIResponse(response: string, forceJsonMode: boolean = false): RawWorldData {
    try {
      // 1. 移除 <thinking> 标签（reasoner模型可能包含）
      let text = response.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '');
      text = text.replace(/<thinking>[\s\S]*/gi, ''); // 处理未闭合的情况

      console.log('[世界生成] 清理thinking后长度:', text?.length || 0);

      // 2. 使用智能JSON解析（根据forceJsonMode自动选择策略）
      const worldDataRaw = parseJsonSmart<RawWorldData>(text.trim(), forceJsonMode);

      // 3. 处理嵌套的 world_data
      const data = worldDataRaw.world_data && typeof worldDataRaw.world_data === 'object'
        ? worldDataRaw.world_data
        : worldDataRaw;

      return {
        continents: Array.isArray(data.continents) ? data.continents : [],
        factions: Array.isArray(data.factions) ? data.factions : [],
        locations: Array.isArray(data.locations) ? data.locations : []
      };

    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[世界生成] JSON解析失败:', message);
      console.error('[世界生成] 原始响应前1000字符:', response?.substring(0, 1000));
      throw new Error(`JSON解析失败: ${message}`);
    }
  }

  /**
   * 转换为标准WorldInfo格式
   */
  private convertToWorldInfo(rawData: RawWorldData): WorldInfo {
    const continents = (rawData.continents || []).map((continent: Record<string, any>) => ({
      名称: continent.名称 || continent.name || '未命名区域',
      描述: continent.描述 || continent.description || '该区域由主神空间规则塑造，具备独立任务生态。',
      地理特征: continent.terrain_features || continent.地理特征 || [],
      修真环境: continent.cultivation_environment || continent.修真环境 || continent.environment || '多规则混合区域',
      气候: continent.climate || continent.气候 || '环境波动',
      天然屏障: continent.natural_barriers || continent.天然屏障 || [],
      大洲边界: continent.continent_bounds || continent.大洲边界 || [],
      主要势力: continent.main_factions || continent.主要势力 || [],
    }));

    const factions = (rawData.factions || []).map((faction: Record<string, any>) => {
      const level = normalizeFactionLevel(faction.level || faction.等级);
      const reputation = calculateFactionReputation(faction);
      const power = calculateFactionPower(faction);

      const leadership = faction.leadership
        ? {
            宗主: faction.leadership.宗主 || faction.leadership.leader || '未知指挥者',
            宗主修为: faction.leadership.宗主修为 || faction.leadership.leaderRealm || faction.leadership.leaderRating || `${level}级`,
            头衔: faction.leadership.头衔 || faction.leadership.leaderTitle || '指挥者',
            副宗主: faction.leadership.副宗主 ?? undefined,
            圣女: faction.leadership.圣女 ?? undefined,
            圣子: faction.leadership.圣子 ?? undefined,
            太上长老: faction.leadership.太上长老 ?? undefined,
            太上长老修为: faction.leadership.太上长老修为 ?? undefined,
            最强修为: faction.leadership.最强修为 || faction.leadership.strongestRating || faction.leadership.宗主修为 || `${level}级`,
            综合战力: power,
            核心弟子数: faction.leadership.核心弟子数 ?? faction.leadership.coreCount,
            内门弟子数: faction.leadership.内门弟子数 ?? faction.leadership.fieldCount,
            外门弟子数: faction.leadership.外门弟子数 ?? faction.leadership.supportCount,
          }
        : {
            宗主: '未知指挥者',
            宗主修为: `${level}级`,
            最强修为: `${level}级`,
            综合战力: power,
          };

      const memberCount = faction.memberCount
        ? {
            total: Number(faction.memberCount.total) || 0,
            byRealm: faction.memberCount.byRealm || {},
            byPosition: faction.memberCount.byPosition || {},
          }
        : {
            total: Math.max(0, Math.round(power * 8)),
            byRealm: { [level]: Math.max(0, Math.round(power * 8)) },
            byPosition: { 成员: Math.max(0, Math.round(power * 6)), 骨干: Math.max(0, Math.round(power * 2)), 指挥: 1 },
          };

      const territoryInfo = faction.territoryInfo
        ? {
            controlledAreas: faction.territoryInfo.controlledAreas || [],
            influenceRange: faction.territoryInfo.influenceRange || `${Math.max(1, Math.round(power / 8))} 个关键区域`,
            strategicValue: Number(faction.territoryInfo.strategicValue ?? Math.max(1, Math.round(power / 12))),
          }
        : {
            controlledAreas: [],
            influenceRange: `${Math.max(1, Math.round(power / 8))} 个关键区域`,
            strategicValue: Math.max(1, Math.round(power / 12)),
          };

      return {
        名称: faction.name || faction.名称 || '未命名势力',
        类型: faction.type || faction.类型 || '本地组织',
        等级: level,
        位置: faction.location || faction.headquarters || faction.位置 || { x: 0, y: 0 },
        势力范围: faction.territory || faction.territory_bounds || faction.势力范围 || [],
        描述: faction.description || faction.描述 || '该势力活跃于当前副本区域。',
        特色: faction.specialties || faction.features || faction.特色 || [],
        与玩家关系: faction.与玩家关系 || '中立',
        声望值: reputation,
        领导层: leadership,
        leadership,
        成员数量: {
          总数: memberCount.total,
          按境界: memberCount.byRealm,
          按职位: memberCount.byPosition,
          ...memberCount,
        },
        memberCount,
        势力范围详情: {
          控制区域: territoryInfo.controlledAreas,
          影响范围: territoryInfo.influenceRange,
          战略价值: territoryInfo.strategicValue,
        },
        territoryInfo,
        可否加入: faction.canJoin !== undefined ? !!faction.canJoin : true,
        canJoin: faction.canJoin !== undefined ? !!faction.canJoin : true,
        加入条件: faction.joinRequirements || [],
        joinRequirements: faction.joinRequirements || [],
        加入好处: faction.benefits || [],
        benefits: faction.benefits || [],
      };
    });

    const locations = (rawData.locations || []).map((location: Record<string, any>) => ({
      名称: location.name || location.名称 || '未命名地点',
      类型: location.type || location.类型 || '据点',
      位置: location.position || location.位置 || '',
      coordinates: location.coordinates || location.坐标 || undefined,
      描述: location.description || location.描述 || '',
      特色: location.features || location.特色 || [],
      安全等级: location.safety_level || location.danger_level || location.安全等级 || '较安全',
      开放状态: location.status || location.开放状态 || '开放',
      相关势力: location.related_factions || location.相关势力 || [],
      特殊功能: location.special_functions || location.特殊功能 || [],
    }));

    return {
      世界名称: this.config.worldName || rawData.world_name || rawData.worldName || '副本世界',
      世界背景: this.config.worldBackground || rawData.world_background || rawData.worldBackground || '由主神空间调度的任务世界',
      大陆信息: continents,
      势力信息: factions,
      地点信息: locations,
      地图配置: this.config.mapConfig || (rawData as any).地图配置 || (rawData as any).map_config || {
        width: 10000,
        height: 10000,
        minLng: 0,
        maxLng: 10000,
        minLat: 0,
        maxLat: 10000,
      },
      生成时间: new Date().toISOString(),
      世界纪元: this.config.worldEra || rawData.world_era || rawData.worldEra || '轮回纪元',
      特殊设定: rawData.special_settings || [],
      版本: '3.0-InfiniteFlow',
    };
  }

  /**
   * 校验世界数据 (重构后)
   */
  private validateWorldData(worldInfo: WorldInfo): ValidationResult {
    const result: ValidationResult = { isValid: true, errors: [] };
    this.performCustomValidation(worldInfo, result);

    if (!result.isValid) {
      this.previousErrors = result.errors.map(e => e.message);
    }

    return result;
  }

  /**
   * 执行自定义校验
   * 注意：不再检查数量，AI生成多少就是多少
   */
  private performCustomValidation(worldInfo: WorldInfo, result: ValidationResult): void {
    const factionNames = (worldInfo.势力信息 || []).map((f: any) => f.名称);
    const uniqueFactionNames = new Set(factionNames);
    if (factionNames.length !== uniqueFactionNames.size) {
      result.errors.push({
        path: '势力信息.名称',
        message: '势力名称存在重复',
        expected: '所有名称唯一',
        received: '存在重复名称'
      });
    }

    const locationNames = (worldInfo.地点信息 || []).map((l: any) => l.名称);
    const uniqueLocationNames = new Set(locationNames);
    if (locationNames.length !== uniqueLocationNames.size) {
      result.errors.push({
        path: '地点信息.名称',
        message: '地点名称存在重复',
        expected: '所有名称唯一',
        received: '存在重复名称'
      });
    }

    // 世界名称与用户选择一致性
    if (this.config.worldName && worldInfo.世界名称 !== this.config.worldName) {
      result.errors.push({
        path: '世界名称',
        message: '世界名称必须与玩家选择一致',
        expected: this.config.worldName,
        received: worldInfo.世界名称
      });
    }

    result.isValid = result.errors.length === 0;
  }
}

// ─── 境界地图集 - 独立生成入口（新模式）────────────────────────────────────────

/** 境界地图生成配置 */
export interface RealmMapGenConfig extends RealmMapPromptConfig {
  maxRetries?: number;
  onStreamChunk?: (chunk: string) => void;
}

/** 境界地图生成结果 */
export interface RealmMapGenResult {
  success: boolean;
  worldInfo?: WorldInfo;
  errors?: string[];
}

const parseLocationPath = (desc: string): string[] => String(desc || '')
  .split(/[·\-—→>＞/]/)
  .map((s) => s.trim())
  .filter(Boolean);

const extractNpcWorldLocationName = (locationDesc: string): string => {
  const parts = parseLocationPath(locationDesc);
  if (parts.length >= 2) return parts[1];
  if (parts.length === 1) return parts[0];
  return '';
};

/**
 * 生成一张境界专属世界地图（境界地图集模式专用）。
 * 复用现有 AI 调用和 JSON 解析逻辑，不依赖 EnhancedWorldGenerator 的数量配置。
 */
export async function generateRealmMap(config: RealmMapGenConfig): Promise<RealmMapGenResult> {
  const maxRetries = config.maxRetries ?? 2;
  const prompt = RealmMapPromptBuilder.buildPrompt(config);
  const helper = isTavernEnv() ? getTavernHelper() : null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let rawText = '';

      if (helper) {
        const response = await helper.generateRaw({
          ordered_prompts: [
            { role: 'user', content: prompt },
            { role: 'user', content: '请直接输出 JSON，不要任何解释文字。' },
          ],
          should_stream: !!config.onStreamChunk,
          usageType: 'world_generation',
          overrides: { world_info_before: '', world_info_after: '' },
          onStreamChunk: (chunk: string) => { if (config.onStreamChunk) config.onStreamChunk(chunk); },
        });
        rawText = typeof response === 'string' ? response : (response as any)?.text ?? '';
      } else {
        rawText = await aiService.generateRaw({
          ordered_prompts: [
            { role: 'user', content: prompt },
            { role: 'user', content: '请直接输出 JSON，不要任何解释文字。' },
          ],
          should_stream: !!config.onStreamChunk,
          usageType: 'world_generation',
          onStreamChunk: config.onStreamChunk,
        });
      }

      rawText = rawText.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();
      rawText = rawText.replace(/<thinking>[\s\S]*/gi, '').trim();

      const raw = parseJsonSmart<Record<string, any>>(rawText);
      if (!raw || typeof raw !== 'object') throw new Error('AI 返回的 JSON 格式无效');

      // 新境界地图应生成“新增地点”，不应与低境界已知地点重名
      const knownLocationNameSet = new Set(
        (config.historicalLocations ?? [])
          .map((l: any) => String(l?.名称 || l?.name || '').trim())
          .filter(Boolean)
      );
      const duplicatedKnownNames = ((raw.locations ?? []) as any[])
        .map((l: any) => String(l?.name ?? l?.名称 ?? '').trim())
        .filter((name: string) => !!name && knownLocationNameSet.has(name));
      if (duplicatedKnownNames.length > 0) {
        const uniq = Array.from(new Set(duplicatedKnownNames)).slice(0, 8);
        throw new Error(`生成结果包含低境界已知地点（需生成新增地点）：${uniq.join('、')}`);
      }

      // 同境界 NPC 世界地点（字段2）必须被本次 locations 覆盖，否则重试
      const requiredNpcLocationNames = Array.from(new Set(
        (config.npcHints ?? [])
          .map((n: any) => extractNpcWorldLocationName(String(n?.当前位置 || '')))
          .filter(Boolean)
      ));
      if (requiredNpcLocationNames.length > 0) {
        const generatedLocationNameSet = new Set(
          ((raw.locations ?? []) as any[])
            .map((l: any) => String(l?.name ?? l?.名称 ?? '').trim())
            .filter(Boolean)
        );
        const missingNpcLocationNames = requiredNpcLocationNames.filter(
          (name) => !generatedLocationNameSet.has(name)
        );
        if (missingNpcLocationNames.length > 0) {
          throw new Error(
            `生成结果未覆盖同境界 NPC 所在地点：${missingNpcLocationNames.slice(0, 12).join('、')}`
          );
        }
      }

      const continents = (raw.continents ?? []).map((c: any) => ({
        名称: c.name ?? c.名称 ?? '未命名大洲',
        描述: c.description ?? c.描述 ?? '',
        气候: c.climate ?? c.气候 ?? '',
        地理特征: c.terrain_features ?? c.地理特征 ?? [],
        大洲边界: c.continent_bounds ?? c.大洲边界 ?? [],
        主要势力: c.main_factions ?? c.主要势力 ?? [],
      }));

      const factions = (raw.factions ?? []).map((f: any) => ({
        名称: f.name ?? f.名称 ?? '未命名势力',
        类型: f.type ?? f.类型 ?? '本地组织',
        等级: normalizeFactionLevel(f.level ?? f.等级 ?? 'D'),
        描述: f.description ?? f.描述 ?? '',
        特色: f.feature ?? f.特色 ?? '',
        位置: f.location ?? f.位置 ?? '',
        与玩家关系: f.playerRelation ?? f.与玩家关系 ?? '中立',
        可否加入: f.canJoin ?? f.可否加入 ?? false,
        领导层: f.leaderRealm ? { 宗主: f.leader ?? '未知', 宗主修为: f.leaderRealm, 最强修为: f.leaderRealm } : undefined,
      }));

      const locations = (raw.locations ?? []).map((l: any) => ({
        名称: l.name ?? l.名称 ?? '未命名地点',
        类型: l.type ?? l.类型 ?? '地点',
        位置: l.position ?? l.位置 ?? '',
        coordinates: l.coordinates ?? undefined,
        描述: l.description ?? l.描述 ?? '',
        特色: l.feature ?? l.特色 ?? '',
        安全等级: l.safetyLevel ?? l.安全等级 ?? '较安全',
        开放状态: l.openStatus ?? l.开放状态 ?? '开放',
        相关势力: l.relatedFactions ?? l.相关势力 ?? [],
        targetRealm: config.playerRealm,
      }));

      const worldInfo: WorldInfo = {
        世界名称: raw.worldName ?? raw.世界名称 ?? config.worldName ?? '副本世界',
        大陆信息: continents,
        势力信息: factions,
        地点信息: locations,
        区域地图: [],
        生成时间: new Date().toISOString(),
        世界背景: raw.worldBackground ?? raw.世界背景 ?? config.worldBackground ?? '当前评级可感知的任务区域',
        世界纪元: raw.worldEra ?? raw.世界纪元 ?? config.worldEra ?? '轮回纪元',
        特殊设定: raw.specialSettings ?? raw.特殊设定 ?? [],
        版本: '3.0-realm',
        targetRealm: config.playerRealm,
      };

      return { success: true, worldInfo };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[generateRealmMap] 第 ${attempt + 1} 次尝试失败:`, msg);
      if (attempt === maxRetries) return { success: false, errors: [msg] };
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }

  return { success: false, errors: ['超出最大重试次数'] };
}
