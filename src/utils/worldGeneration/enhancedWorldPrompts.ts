import { WorldMapConfig } from '@/types/worldMap';

/**
 * 无限流世界生成提示词构建器
 */
export interface WorldPromptConfig {
  factionCount: number;
  totalLocations: number;
  secretRealms: number;
  continentCount: number;
  characterBackground?: string;
  worldBackground?: string;
  worldEra?: string;
  worldName?: string;
  missionName?: string;
  missionWorldType?: string;
  missionDifficulty?: string;
  gamePhase?: 'hub' | 'mission' | 'settlement' | string;
  mapConfig?: WorldMapConfig;
}

function resolveWorldTypeLabel(worldType?: string): string {
  const key = String(worldType || '').trim().toLowerCase();
  const map: Record<string, string> = {
    xianxia: '修仙类',
    apocalypse: '末日类',
    horror: '恐怖类',
    sci_fi: '科幻类',
    fantasy: '奇幻类',
    martial_arts: '武侠类',
    modern: '现代类',
    history: '历史类',
  };
  return map[key] || (worldType ? `混合类型(${worldType})` : '未指定');
}

function getMapRange(mapConfig?: WorldMapConfig) {
  const minX = Number(mapConfig?.minLng ?? 0);
  const minY = Number(mapConfig?.minLat ?? 0);
  const width = Number(mapConfig?.width ?? 10000);
  const height = Number(mapConfig?.height ?? 10000);
  const maxX = Number(mapConfig?.maxLng ?? (minX + width));
  const maxY = Number(mapConfig?.maxLat ?? (minY + height));
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(1, Math.floor(maxX - minX)),
    height: Math.max(1, Math.floor(maxY - minY)),
  };
}

export class EnhancedWorldPromptBuilder {
  static buildPrompt(config: WorldPromptConfig): string {
    const continentsOnly = config.factionCount === 0 && config.totalLocations === 0;
    if (continentsOnly) return this.buildContinentsOnlyPrompt(config);
    return this.buildFullPrompt(config);
  }

  private static buildFullPrompt(config: WorldPromptConfig): string {
    const range = getMapRange(config.mapConfig);
    const secretCount = Math.min(config.secretRealms, config.totalLocations);

    return `你是“主神空间无限流”世界构建器。请生成可直接用于前端地图系统的 JSON 数据。

【世界上下文】
- 世界名称：${config.worldName || '未知副本世界'}
- 世界背景：${config.worldBackground || '主神空间任务副本'}
- 世界纪元：${config.worldEra || '轮回纪元'}
- 角色背景：${config.characterBackground || '未知'}
- 当前阶段：${config.gamePhase || 'mission'}
- 副本名称：${config.missionName || config.worldName || '未命名副本'}
- 副本类型：${resolveWorldTypeLabel(config.missionWorldType)}
- 副本难度：${config.missionDifficulty || 'D'}

【硬性数量】
- continents: ${Math.max(1, config.continentCount)}
- factions: ${Math.max(1, config.factionCount)}
- locations: ${Math.max(1, config.totalLocations)}
- locations 中至少 ${Math.max(0, secretCount)} 个条目标记为“隐藏区域/机密区域/危险区域”

【坐标规范】
- 使用游戏坐标，不是经纬度
- x 范围: ${range.minX} ~ ${range.maxX}
- y 范围: ${range.minY} ~ ${range.maxY}
- 坐标必须为整数，且尽量分散，避免全部堆在中心

【风格要求】
- 必须是“无限流可用场景”：可包含末日、恐怖、科幻、奇幻、现代、历史、修仙等混合模板
- 禁止出现固定修仙模板话术（如“闭关百年”“丹药量产”），除非副本类型明确是修仙类
- 势力应采用任务语义：轮回小队、本地组织、敌对集团、中立交易体等
- 地点应服务副本推进：补给点、情报点、危险区、任务目标区、撤离点

【输出格式（只输出 JSON，不要解释）】
{
  "continents": [{
    "name": "string",
    "description": "string",
    "climate": "string",
    "terrain_features": ["string"],
    "continent_bounds": [{"x": 0, "y": 0}],
    "main_factions": ["string"]
  }],
  "factions": [{
    "name": "string",
    "type": "轮回者团队|本地组织|敌对集团|中立商会|异常实体",
    "level": "D|C|B|A|S|SS|SSS",
    "description": "string",
    "specialties": ["string"],
    "location": {"x": 0, "y": 0},
    "territory": [{"x": 0, "y": 0}],
    "leadership": {
      "leader": "string",
      "leaderTitle": "队长|执政官|指挥官|首席研究员",
      "leaderRating": "D|C|B|A|S|SS|SSS",
      "strongestRating": "D|C|B|A|S|SS|SSS",
      "coreCount": 0,
      "fieldCount": 0,
      "supportCount": 0
    },
    "memberCount": {
      "total": 0,
      "byRealm": {"D": 0, "C": 0, "B": 0, "A": 0, "S": 0, "SS": 0, "SSS": 0},
      "byPosition": {"成员": 0, "骨干": 0, "指挥": 0}
    },
    "territoryInfo": {
      "controlledAreas": ["string"],
      "influenceRange": "string",
      "strategicValue": 1
    },
    "canJoin": true,
    "joinRequirements": ["string"],
    "benefits": ["string"]
  }],
  "locations": [{
    "name": "string",
    "type": "主城|据点|补给区|情报站|危险区|隐藏区域|撤离点",
    "position": "string",
    "coordinates": {"x": 0, "y": 0},
    "description": "string",
    "features": ["string"],
    "danger_level": "安全|较安全|危险|极危险",
    "status": "开放|限制|封锁",
    "related_factions": ["string"],
    "special_functions": ["string"]
  }]
}`;
  }

  private static buildContinentsOnlyPrompt(config: WorldPromptConfig): string {
    const range = getMapRange(config.mapConfig);
    const count = Math.max(1, config.continentCount);

    return `你是世界地图架构师。请只生成大洲轮廓 JSON，用于后续动态填充势力和地点。

【世界上下文】
- 世界名称：${config.worldName || '未知副本世界'}
- 世界背景：${config.worldBackground || '主神空间任务副本'}
- 世界纪元：${config.worldEra || '轮回纪元'}

【要求】
- 只输出 continents 数组，共 ${count} 个
- 大洲边界使用整数坐标，x 范围 ${range.minX}-${range.maxX}，y 范围 ${range.minY}-${range.maxY}
- 大洲边界尽量覆盖整个地图，彼此不完全重叠

【输出格式（只输出 JSON，不要解释）】
{
  "continents": [{
    "name": "string",
    "description": "string",
    "climate": "string",
    "terrain_features": ["string"],
    "continent_bounds": [{"x": 0, "y": 0}],
    "main_factions": []
  }],
  "factions": [],
  "locations": []
}`;
  }
}

export interface NpcLocationHint {
  名字: string;
  境界: string;
  当前位置: string;
}

export interface RealmKnownContinentHint {
  名称: string;
  描述?: string;
  来源境界?: string;
}

export interface RealmKnownLocationHint {
  名称: string;
  类型?: string;
  来源境界?: string;
  坐标?: { x: number; y: number };
}

export interface RealmMapPromptConfig {
  playerRealm: string;
  playerRealmContext: string;
  playerBackground?: string;
  playerFaction?: string;
  playerLocation?: string;
  worldName?: string;
  worldBackground?: string;
  worldEra?: string;
  npcHints?: NpcLocationHint[];
  historicalContinents?: RealmKnownContinentHint[];
  historicalLocations?: RealmKnownLocationHint[];
  mapConfig?: WorldMapConfig;
}

export class RealmMapPromptBuilder {
  static buildPrompt(config: RealmMapPromptConfig): string {
    const range = getMapRange(config.mapConfig);

    const npcHints = (config.npcHints || [])
      .map((npc) => `- ${npc.名字}（评级: ${npc.境界}）@ ${npc.当前位置}`)
      .join('\n');

    const knownContinents = (config.historicalContinents || [])
      .map((c) => `- ${c.名称}${c.来源境界 ? `（来源:${c.来源境界}）` : ''}${c.描述 ? `：${c.描述}` : ''}`)
      .join('\n');

    const knownLocations = (config.historicalLocations || [])
      .map((l) => {
        const coord = l.坐标 ? ` @(${Math.round(l.坐标.x)},${Math.round(l.坐标.y)})` : '';
        return `- ${l.名称}${l.类型 ? ` [${l.类型}]` : ''}${l.来源境界 ? `（来源:${l.来源境界}）` : ''}${coord}`;
      })
      .join('\n');

    return `你是“分阶段副本地图生成器”。请为当前评级生成可探索地图，不要复刻完整世界全图。

【当前阶段信息】
- 当前评级: ${config.playerRealm}
- 评级上下文: ${config.playerRealmContext}
- 角色背景: ${config.playerBackground || '未知'}
- 所属阵营: ${config.playerFaction || '无'}
- 当前位置: ${config.playerLocation || '未知'}
- 世界名称: ${config.worldName || '未知世界'}
- 世界背景: ${config.worldBackground || '主神空间副本'}
- 世界纪元: ${config.worldEra || '轮回纪元'}

【历史地图锚点】
- 已知大陆:
${knownContinents || '- 暂无'}
- 已知地点:
${knownLocations || '- 暂无'}

【同阶段NPC位置（优先覆盖）】
${npcHints || '- 暂无'}

【生成规则】
1. 输出范围应匹配当前评级可触达区域，不要一次性铺满全部终局内容。
2. 生成的新地点尽量避免与“已知地点”同名。
3. 坐标必须是整数，x 范围 ${range.minX}-${range.maxX}，y 范围 ${range.minY}-${range.maxY}。
4. 若有 NPC 位置提示，locations 中必须覆盖这些地点锚点（名称一致）。

【输出格式（只输出 JSON，不要解释）】
{
  "worldName": "string",
  "worldBackground": "string",
  "worldEra": "string",
  "specialSettings": ["string"],
  "continents": [{"name":"string","description":"string","climate":"string","terrain_features":["string"],"continent_bounds":[{"x":0,"y":0}],"main_factions":["string"]}],
  "factions": [{"name":"string","type":"string","level":"D|C|B|A|S|SS|SSS","description":"string","feature":"string","location":{"x":0,"y":0},"leader":"string","leaderRealm":"string","canJoin":true}],
  "locations": [{"name":"string","type":"string","position":"string","coordinates":{"x":0,"y":0},"description":"string","feature":"string","safetyLevel":"安全|较安全|危险|极危险","openStatus":"开放|限制|封锁","relatedFactions":["string"]}]
}`;
  }
}
