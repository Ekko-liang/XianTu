/**
 * @fileoverview 能力树底层数据（兼容旧“三千大道”字段）
 */

import type { DaoData, ThousandDaoSystem } from '../types/game';

export interface InfiniteAbilityNode {
  id: string;
  name: string;
  description: string;
  cost: number;
  tag: string;
  prerequisites?: string[];
}

export interface InfiniteAbilityBranch {
  id: string;
  name: string;
  description: string;
  nodes: InfiniteAbilityNode[];
}

function createDefaultStages(branchName: string): DaoData['阶段列表'] {
  return [
    { 名称: '解锁', 描述: `完成 ${branchName} 的基础构建，可在副本中稳定触发。`, 突破经验: 100 },
    { 名称: '专精', 描述: `强化 ${branchName} 的命中率与收益曲线。`, 突破经验: 220 },
    { 名称: '联动', 描述: `与其他分支形成联动，降低冷却并提高容错。`, 突破经验: 420 },
    { 名称: '极限', 描述: `达到该分支上限，具备跨副本稳定性。`, 突破经验: 760 },
  ];
}

export function createNewDaoData(daoName: string, description = '未知能力路径'): DaoData {
  return {
    道名: daoName,
    描述: description,
    阶段列表: createDefaultStages(daoName),
    是否解锁: true,
    当前阶段: 0,
    当前经验: 0,
    总经验: 0,
  };
}

function createLockedDaoData(daoName: string, description: string): DaoData {
  return {
    ...createNewDaoData(daoName, description),
    是否解锁: false,
  };
}

export const INFINITE_ABILITY_TREE_BRANCHES: InfiniteAbilityBranch[] = [
  {
    id: 'combat',
    name: '战斗分支',
    description: '强化输出、先手压制与战术收割能力。',
    nodes: [
      {
        id: 'combat_close_quarters',
        name: '近战精通',
        description: '提升贴身压制、反制与破防稳定性。',
        cost: 180,
        tag: '爆发',
      },
      {
        id: 'combat_ranged_focus',
        name: '远程专注',
        description: '提升远程命中、持续射击与弱点打击效率。',
        cost: 180,
        tag: '持续',
      },
      {
        id: 'combat_overdrive',
        name: '战斗超载',
        description: '短时间提高攻防阈值，但会提高能量消耗。',
        cost: 320,
        tag: '强化',
        prerequisites: ['combat_close_quarters', 'combat_ranged_focus'],
      },
      {
        id: 'combat_execution_domain',
        name: '处决领域',
        description: '对残血目标触发额外压制判定，收尾能力显著提升。',
        cost: 460,
        tag: '终结',
        prerequisites: ['combat_overdrive'],
      },
    ],
  },
  {
    id: 'survival',
    name: '生存分支',
    description: '提升隐匿、续航、抗性与撤离能力。',
    nodes: [
      {
        id: 'survival_camouflage',
        name: '战场隐匿',
        description: '降低暴露概率，提高潜行与绕行成功率。',
        cost: 160,
        tag: '潜行',
      },
      {
        id: 'survival_field_medicine',
        name: '战地急救',
        description: '副本中快速稳定伤势，降低持续流血风险。',
        cost: 200,
        tag: '恢复',
      },
      {
        id: 'survival_adapt',
        name: '环境适应',
        description: '提升极端环境下的抗压与行动稳定性。',
        cost: 220,
        tag: '抗性',
      },
      {
        id: 'survival_emergency_escape',
        name: '紧急撤离',
        description: '触发危机撤离窗口，显著提高脱离致命区域概率。',
        cost: 360,
        tag: '撤离',
        prerequisites: ['survival_camouflage', 'survival_field_medicine'],
      },
    ],
  },
  {
    id: 'support',
    name: '辅助分支',
    description: '提供团队护持、能量循环与战术协同增益。',
    nodes: [
      {
        id: 'support_barrier_matrix',
        name: '屏障矩阵',
        description: '为自身或队友提供短时防护层。',
        cost: 190,
        tag: '防护',
      },
      {
        id: 'support_energy_loop',
        name: '能量回路',
        description: '提升 EP/MP 的战斗中恢复效率。',
        cost: 210,
        tag: '循环',
      },
      {
        id: 'support_tactical_link',
        name: '战术链路',
        description: '队伍协同动作时提供命中与反应加成。',
        cost: 260,
        tag: '协作',
      },
      {
        id: 'support_revive_protocol',
        name: '复苏协议',
        description: '允许在濒死阶段提供一次高代价救援。',
        cost: 420,
        tag: '救援',
        prerequisites: ['support_barrier_matrix', 'support_energy_loop'],
      },
    ],
  },
  {
    id: 'social',
    name: '社交分支',
    description: '强化谈判、威慑、情报操盘与关系博弈。',
    nodes: [
      {
        id: 'social_microexpression',
        name: '微表情解析',
        description: '识别谎言与意图，降低误判概率。',
        cost: 150,
        tag: '洞察',
      },
      {
        id: 'social_pressure_field',
        name: '威压场',
        description: '在关键谈判中施加心理压迫。',
        cost: 180,
        tag: '威慑',
      },
      {
        id: 'social_contract_hack',
        name: '契约博弈',
        description: '优化交易条款，提升谈判收益上限。',
        cost: 230,
        tag: '交易',
      },
      {
        id: 'social_faction_broker',
        name: '势力斡旋',
        description: '在多方阵营冲突中争取中立窗口与临时协助。',
        cost: 360,
        tag: '统筹',
        prerequisites: ['social_microexpression', 'social_contract_hack'],
      },
    ],
  },
  {
    id: 'special',
    name: '特殊分支',
    description: '时空、因果与规则干涉等高风险能力。',
    nodes: [
      {
        id: 'special_time_sense',
        name: '时间感知',
        description: '提升对危险前兆与节奏断点的预判能力。',
        cost: 260,
        tag: '预判',
      },
      {
        id: 'special_causality_anchor',
        name: '因果锚定',
        description: '降低关键行动失败后的连锁崩盘风险。',
        cost: 320,
        tag: '稳定',
      },
      {
        id: 'special_rule_interference',
        name: '规则扰动',
        description: '短时干扰局部规则判定，但会引发额外风险。',
        cost: 480,
        tag: '干涉',
        prerequisites: ['special_time_sense', 'special_causality_anchor'],
      },
      {
        id: 'special_zero_domain',
        name: '零域展开',
        description: '在极限场景中生成短时无效化窗口，代价极高。',
        cost: 720,
        tag: '终极',
        prerequisites: ['special_rule_interference'],
      },
    ],
  },
];

const ABILITY_NODE_INDEX = new Map<string, InfiniteAbilityNode>(
  INFINITE_ABILITY_TREE_BRANCHES.flatMap((branch) => branch.nodes.map((node) => [node.id, node] as const)),
);

export function getInfiniteAbilityBranches(): InfiniteAbilityBranch[] {
  return INFINITE_ABILITY_TREE_BRANCHES;
}

export function getInfiniteAbilityNodeById(id: string): InfiniteAbilityNode | null {
  return ABILITY_NODE_INDEX.get(String(id || '').trim()) || null;
}

export function createDefaultInfiniteAbilityTree(): ThousandDaoSystem {
  const daoList: Record<string, DaoData> = {};
  for (const branch of INFINITE_ABILITY_TREE_BRANCHES) {
    for (const node of branch.nodes) {
      daoList[node.id] = createLockedDaoData(node.name, node.description);
    }
  }

  return {
    大道列表: daoList,
  };
}

/**
 * 兼容旧初始化流程：返回空容器，但格式仍为能力树结构。
 */
export function createEmptyThousandDaoSystem(): ThousandDaoSystem {
  return {
    大道列表: {},
  };
}
