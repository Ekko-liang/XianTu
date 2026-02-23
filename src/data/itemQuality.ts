/**
 * 物品品质系统定义
 * 品质等级（遗留键）：神、仙、天、地、玄、黄、凡
 * 品级：0 残缺；1-3 一阶；4-6 二阶；7-9 三阶；10 终阶
 */

export interface QualityInfo {
  color: string;
  rarity: string; // 文案描述
}

export interface GradeInfo {
  name: string; // 残缺/一阶/二阶/三阶/终阶
  description: string;
  effect: string; // 可用于UI特效描述
}

export interface ItemQualitySystem {
  // 品质等级（沿用历史键，语义按主神空间物资稀有度）
  qualities: {
    神: QualityInfo;
    仙: QualityInfo;
    天: QualityInfo;
    地: QualityInfo;
    玄: QualityInfo;
    黄: QualityInfo;
    凡: QualityInfo;
  };

  // 品级（0 残缺；1-3 一阶；4-6 二阶；7-9 三阶；10 终阶）
  grades: {
    0: GradeInfo;
    1: GradeInfo;
    2: GradeInfo;
    3: GradeInfo;
    4: GradeInfo;
    5: GradeInfo;
    6: GradeInfo;
    7: GradeInfo;
    8: GradeInfo;
    9: GradeInfo;
    10: GradeInfo;
  };
}

export const ITEM_QUALITY_SYSTEM: ItemQualitySystem = {
  qualities: {
    神: { color: '#9932CC', rarity: '极低概率出现的顶级造物，通常与高危副本或终局奖励绑定。' },
    仙: { color: '#FFD700', rarity: '极其稀有的高阶装备，具备显著机制优势。' },
    天: { color: '#FF69B4', rarity: '高价值产物，常见于高难任务线与核心据点。' },
    地: { color: '#00CED1', rarity: '中高阶稳定装备，适合长期成长构筑。' },
    玄: { color: '#9370DB', rarity: '较少见的强化物资，拥有明确场景优势。' },
    黄: { color: '#DAA520', rarity: '常规优质物资，性价比高，获取渠道较多。' },
    凡: { color: '#808080', rarity: '基础通用物资，满足日常任务需求。' },
  },

  grades: {
    0: { name: '残缺', description: '破损不堪', effect: '破损效果' },
    1: { name: '一阶', description: '基础可用', effect: '淡色光效' },
    2: { name: '一阶', description: '基础可用', effect: '淡色光效' },
    3: { name: '一阶', description: '基础可用', effect: '淡色光效' },
    4: { name: '二阶', description: '稳定强化', effect: '中等光效' },
    5: { name: '二阶', description: '稳定强化', effect: '中等光效' },
    6: { name: '二阶', description: '稳定强化', effect: '中等光效' },
    7: { name: '三阶', description: '高性能配置', effect: '强烈光效' },
    8: { name: '三阶', description: '高性能配置', effect: '强烈光效' },
    9: { name: '三阶', description: '高性能配置', effect: '强烈光效' },
    10: { name: '终阶', description: '极限调优', effect: '炫目特效' },
  },
};

export type QualityType = keyof typeof ITEM_QUALITY_SYSTEM.qualities;
export type GradeType = keyof typeof ITEM_QUALITY_SYSTEM.grades;

export function getQualityInfo(quality: QualityType): QualityInfo {
  return ITEM_QUALITY_SYSTEM.qualities[quality];
}

export function getGradeInfo(grade: GradeType): GradeInfo {
  return ITEM_QUALITY_SYSTEM.grades[grade];
}

export function getFullQualityDescription(quality: QualityType, grade: GradeType): string {
  const qualityInfo = getQualityInfo(quality);
  const gradeInfo = getGradeInfo(grade);
  return `${quality}·${gradeInfo.name} - ${qualityInfo.rarity}`;
}

export function getItemColor(quality: QualityType, grade: GradeType): string {
  if (grade === 0) return '#666666';
  return getQualityInfo(quality).color;
}

export function getGradeRange(grade: number): string {
  if (grade === 0) return '残缺';
  if (grade >= 1 && grade <= 3) return '一阶';
  if (grade >= 4 && grade <= 6) return '二阶';
  if (grade >= 7 && grade <= 9) return '三阶';
  if (grade === 10) return '终阶';
  return '未知';
}

export function generateQualitySystemPrompt(): string {
  return `
## 物品品质系统 (重要参考)
此世界的物品分为两个维度：品质等级 与 品级

### 品质等级 (从低到高):
- Q1(凡键): ${ITEM_QUALITY_SYSTEM.qualities.凡.rarity}
- Q2(黄键): ${ITEM_QUALITY_SYSTEM.qualities.黄.rarity}
- Q3(玄键): ${ITEM_QUALITY_SYSTEM.qualities.玄.rarity}
- Q4(地键): ${ITEM_QUALITY_SYSTEM.qualities.地.rarity}
- Q5(天键): ${ITEM_QUALITY_SYSTEM.qualities.天.rarity}
- Q6(仙键): ${ITEM_QUALITY_SYSTEM.qualities.仙.rarity}
- Q7(神键): ${ITEM_QUALITY_SYSTEM.qualities.神.rarity}

### 品级 (物品完美程度):
- 残缺 (0): 破损不堪，效果大减
- 一阶 (1-3): 基础可用，淡色光效
- 二阶 (4-6): 稳定强化，中等光效
- 三阶 (7-9): 高性能配置，强烈光效
- 终阶 (10): 极限调优，炫目特效

### 物品命名规则 (建议):
两种推荐的命名格式：

格式1 - 简洁版（推荐）: [物品名]
示例：
- "应急绷带" (凡品一阶的应急绷带)
- "净水滤芯" (凡品二阶的净水滤芯)
- "防爆护甲" (凡品一阶的防爆护甲)
- "战术终端" (玄品二阶的战术终端)

格式2 - 完整版（特殊情况）: [品质][品级][物品名]
示例：
- "凡品一阶应急绷带"
- "玄品二阶战术终端"
- "天品三阶战术外骨骼"
- "仙品终阶时空稳定器"

命名建议：
- 日常物品使用简洁版命名
- 高品质或特殊物品可使用完整版
- 避免使用 "凡下" 这种连写格式
- 如需标注品级，使用 "凡品一阶" 的分离格式

重要提示：初始角色通常只有凡品或黄品的一阶物品，高品质物品极其稀少。
`;
}
