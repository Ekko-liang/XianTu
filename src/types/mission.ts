/**
 * 主神空间无限流 - 副本与阶段核心类型
 */

export type GamePhase = 'hub' | 'mission' | 'settlement';

export type MissionWorldType =
  | 'xianxia'
  | 'apocalypse'
  | 'horror'
  | 'sci_fi'
  | 'fantasy'
  | 'martial_arts'
  | 'modern'
  | 'history';

export type MissionDifficulty = 'D' | 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';
export type MissionStatus = 'briefing' | 'active' | 'completed' | 'failed';

export interface MissionWorldRules {
  powerSystem: string;
  techLevel: string;
  socialOrder: string;
  specialRules: string[];
}

export interface MissionObjective {
  id: string;
  description: string;
  completed: boolean;
}

export interface QuestReward {
  points: number;
  items?: MissionItem[];
  abilityIds?: string[];
}

export interface MissionQuest {
  id: string;
  title: string;
  description: string;
  objectives: MissionObjective[];
  reward: QuestReward;
  isHidden: boolean;
  completed: boolean;
}

export interface MissionItem {
  id: string;
  name: string;
  quantity: number;
  description?: string;
}

export interface MissionAbilityReward {
  id: string;
  name: string;
  description: string;
}

export interface MissionRewards {
  basePoints: number;
  bonusPoints: number;
  items: MissionItem[];
  abilities: MissionAbilityReward[];
  evaluationBonus: number;
}

export interface MissionPenalties {
  death: string;
  failure: string;
}

export interface MissionParticipant {
  id: string;
  name: string;
  role: 'player' | 'teammate' | 'native' | 'enemy';
  status: 'alive' | 'dead' | 'missing';
}

export interface MissionSpecialEvent {
  type: 'near_death' | 'critical_choice' | 'teammate_death' | 'ability_breakthrough' | 'hidden_quest' | 'betrayal' | 'cooperation';
  description: string;
  weight: number;
  timestamp: string;
}

export interface MissionTemporaryState {
  副本地图?: Record<string, unknown>;
  区域地图?: Record<string, unknown>[];
  临时能力?: string[];
  objectiveLog?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface MissionResult {
  missionId: string;
  missionName?: string;
  difficulty?: MissionDifficulty;
  success: boolean;
  pointsGained: number;
  soulGrowth: number;
  rating: number;
  finishedAt: string;
  teamImpact?: {
    deathCount?: number;
    betrayCount?: number;
    cooperationBonus?: number;
  };
  summary?: string;
}

export interface Mission {
  id: string;
  name: string;
  worldType: MissionWorldType;
  difficulty: MissionDifficulty;
  description: string;
  worldRules: MissionWorldRules;
  mainQuest: MissionQuest;
  sideQuests: MissionQuest[];
  timeLimit?: number;
  survivalCondition: string;
  rewards: MissionRewards;
  penalties: MissionPenalties;
  participants: MissionParticipant[];
  status: MissionStatus;
  specialEvents: MissionSpecialEvent[];
  day: number;
  临时状态?: MissionTemporaryState;
}

export interface HubShopItem {
  id: string;
  name: string;
  category: 'ability' | 'item' | 'info' | 'service' | 'special';
  price: number;
  stock: number;
  description: string;
}

export interface HubNpc {
  id: string;
  name: string;
  role: string;
  favor: number;
}

export interface HubState {
  unlockedAreas: string[];
  shopInventory: HubShopItem[];
  availableMissions: Mission[];
  npcs: HubNpc[];
}

export interface TeamMember {
  id: string;
  name: string;
  role?: string;
  trust: number;
  status: 'active' | 'injured' | 'dead' | 'missing' | 'betrayed';
  contribution?: number;
}

export interface TeamCollaborationLog {
  id: string;
  missionId?: string;
  time: string;
  members: string[];
  action: string;
  result: 'success' | 'failed';
  trustDelta?: number;
  note?: string;
}

export interface TeamEventLog {
  id: string;
  missionId?: string;
  memberId?: string;
  type: 'cooperate' | 'betray' | 'death' | 'rescue' | 'conflict';
  description: string;
  weight?: number;
  time: string;
}

export interface TeamState {
  members: TeamMember[];
  sharedResources: MissionItem[];
  teamLevel: number;
  collaborationLogs?: TeamCollaborationLog[];
  teamEvents?: TeamEventLog[];
}
