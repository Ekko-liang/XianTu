import type {
  ActionQueue,
  BodyStats,
  CharacterBaseInfo,
  CultivationTechniqueReference,
  Equipment,
  EventSystem,
  GameMessage,
  GameTime,
  Inventory,
  MasteredSkill,
  Memory,
  NpcProfile,
  PlayerAttributes,
  PlayerLocation,
  ThousandDaoSystem,
  SectMemberInfo,
  SectSystemV2,
  StatusEffect,
  SystemConfig,
  WorldInfo,
} from '@/types/game';
import type { GamePhase, HubState, Mission, MissionResult, TeamState } from '@/types/mission';
import type { ReincarnatorProfile } from '@/types/reincarnator';

/**
 * 存档格式 V3（无限流主结构）
 * 顶层主字段：元数据 / 轮回者 / 主神空间 / 团队 / 副本记录 / 当前副本 / 社交 / 世界 / 系统
 * 兼容字段：角色（镜像）
 */

export interface SaveMetaV3 {
  版本号: 3;
  存档ID: string;
  存档名: string;
  游戏版本?: string;
  创建时间: string;
  更新时间: string;
  游戏时长秒: number;
  时间: GameTime;
  当前阶段: GamePhase;
}

export interface OnlineStateV3 {
  模式: '单机' | '联机';
  房间ID?: string | null;
  玩家ID?: string | null;
  服务器版本?: number;
  最后同步时间?: string | null;
  只读路径: string[];
  世界曝光?: boolean;
  冲突策略?: '服务器' | '客户端' | '合并' | string;
}

export interface RelationshipEdgeV3 {
  from: string;
  to: string;
  relation?: string;
  score?: number;
  tags?: string[];
  updatedAt?: string;
}

export interface RelationshipMatrixV3 {
  version?: number;
  nodes?: string[];
  edges?: RelationshipEdgeV3[];
}

export interface TechniqueProgressEntryV3 {
  熟练度: number;
  已解锁技能: string[];
}

export interface TechniqueSystemV3 {
  /** @deprecated 旧命名，建议改用 当前能力ID */
  当前功法ID: string | null;
  /** @deprecated 旧命名，建议改用 能力进度 */
  功法进度: Record<string, TechniqueProgressEntryV3>;
  /** @deprecated 旧命名，建议改用 能力配置 */
  功法套装: {
    主修: string | null;
    辅修: string[];
  };
  // 无限流主语义字段（与上方兼容字段等价）
  当前能力ID?: string | null;
  能力进度?: Record<string, TechniqueProgressEntryV3>;
  能力配置?: {
    主槽: string | null;
    副槽: string[];
  };
}

export interface CultivationStateV3 {
  /** @deprecated 旧命名，建议改用 当前能力 */
  修炼功法: CultivationTechniqueReference | null;
  /** @deprecated 旧命名，建议改用 能力状态 */
  修炼状态?: {
    模式: string;
    开始时间?: string;
    消耗?: Record<string, unknown>;
    [key: string]: unknown;
  };
  // 无限流主语义字段（与上方兼容字段等价）
  当前能力?: CultivationTechniqueReference | null;
  能力状态?: {
    模式: string;
    开始时间?: string;
    消耗?: Record<string, unknown>;
    [key: string]: unknown;
  };
  经脉?: unknown;
  丹田?: unknown;
  突破?: unknown;
  [key: string]: unknown;
}

export interface DaoSystemV3 {
  大道列表: ThousandDaoSystem['大道列表'];
  [key: string]: unknown;
}

export interface SkillStateV3 {
  掌握技能: MasteredSkill[];
  装备栏: string[];
  冷却: Record<string, unknown>;
}

export interface ReincarnatorStateV3 extends ReincarnatorProfile {
  身份: CharacterBaseInfo;
  属性: PlayerAttributes;
  位置: PlayerLocation;
  效果: StatusEffect[];
  身体?: BodyStats;
  背包: Inventory;
  装备: Equipment;
  /** @deprecated 旧命名，建议改用 能力 */
  功法: TechniqueSystemV3;
  /** @deprecated 旧命名，建议改用 能力状态 */
  修炼: CultivationStateV3;
  能力?: TechniqueSystemV3;
  能力状态?: CultivationStateV3;
  大道: DaoSystemV3;
  技能: SkillStateV3;
}

/**
 * 兼容镜像结构（旧模块仍大量读写 角色.*）
 */
export interface LegacyCharacterMirrorV3 {
  身份: CharacterBaseInfo;
  属性: PlayerAttributes;
  位置: PlayerLocation;
  效果: StatusEffect[];
  身体?: BodyStats;
  背包: Inventory;
  装备: Equipment;
  /** @deprecated 旧命名，建议改用 能力 */
  功法: TechniqueSystemV3;
  /** @deprecated 旧命名，建议改用 能力状态 */
  修炼: CultivationStateV3;
  能力?: TechniqueSystemV3;
  能力状态?: CultivationStateV3;
  大道: DaoSystemV3;
  技能: SkillStateV3;
}

export interface SaveDataV3 {
  元数据: SaveMetaV3;
  轮回者: ReincarnatorStateV3;
  主神空间: HubState;
  团队: TeamState;
  副本记录: MissionResult[];
  当前副本: Mission | null;
  社交: {
    关系: Record<string, NpcProfile>;
    关系矩阵?: RelationshipMatrixV3;
    宗门?: (SectSystemV2 & { 成员信息?: SectMemberInfo }) | null;
    事件: EventSystem;
    记忆: Memory;
  };
  世界: {
    信息: WorldInfo;
    状态?: unknown;
  };
  系统: {
    配置?: SystemConfig;
    设置?: Record<string, unknown>;
    缓存?: Record<string, unknown>;
    行动队列?: ActionQueue;
    历史?: { 叙事?: GameMessage[] };
    联机: OnlineStateV3;
    /** @deprecated 仅兼容旧版本读取，不再作为主结构 */
    扩展?: Record<string, unknown>;
  };

  /** @deprecated 兼容旧模块: 等同于“轮回者”的角色镜像 */
  角色?: LegacyCharacterMirrorV3;
}
