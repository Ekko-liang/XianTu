import type { RealmDefinition, RealmStageDefinition, RealmStage } from '../types/game';

const STAGE_ORDER: RealmStage[] = ['一星', '二星', '三星', '四星', '五星'];

const STAGE_META: Record<RealmStage, { title: string; breakthrough: RealmStageDefinition['breakthrough_difficulty']; progressRange: string }> = {
  一星: { title: '适应阶段', breakthrough: '普通', progressRange: '0%-20%' },
  二星: { title: '稳定阶段', breakthrough: '普通', progressRange: '20%-45%' },
  三星: { title: '成熟阶段', breakthrough: '困难', progressRange: '45%-70%' },
  四星: { title: '峰值阶段', breakthrough: '极难', progressRange: '70%-95%' },
  五星: { title: '超限阶段', breakthrough: '逆天', progressRange: '95%-100%' },

  // 兼容旧阶段词
  初期: { title: '适应阶段', breakthrough: '普通', progressRange: '0%-20%' },
  中期: { title: '稳定阶段', breakthrough: '普通', progressRange: '20%-45%' },
  后期: { title: '成熟阶段', breakthrough: '困难', progressRange: '45%-70%' },
  圆满: { title: '峰值阶段', breakthrough: '极难', progressRange: '70%-95%' },
  极境: { title: '超限阶段', breakthrough: '逆天', progressRange: '95%-100%' },
};

const RANK_LABELS = [
  '新人(D级)',
  '初级轮回者(C级)',
  '中级轮回者(B级)',
  '高级轮回者(A级)',
  '精英轮回者(S级)',
  '传说轮回者(SS级)',
  '超越者(SSS级)',
] as const;

const RANK_TO_LEVEL: Record<string, number> = {
  D: 0,
  C: 1,
  B: 2,
  A: 3,
  S: 4,
  SS: 5,
  SSS: 6,
};

const LEGACY_REALM_TO_LEVEL: Array<{ matcher: RegExp; level: number }> = [
  { matcher: /(凡人|新人|候选)/i, level: 0 },
  { matcher: /(练气|见习|初级轮回者)/i, level: 1 },
  { matcher: /(筑基|正式|中级轮回者)/i, level: 2 },
  { matcher: /(金丹|资深|高级轮回者)/i, level: 3 },
  { matcher: /(元婴|精英轮回者)/i, level: 4 },
  { matcher: /(化神|传说轮回者)/i, level: 5 },
  { matcher: /(炼虚|合体|渡劫|超越者|终局)/i, level: 6 },
];

const STAGE_ALIAS_TO_CANONICAL: Record<string, RealmStage> = {
  初期: '一星',
  中期: '二星',
  后期: '三星',
  圆满: '四星',
  极境: '五星',
  一星: '一星',
  二星: '二星',
  三星: '三星',
  四星: '四星',
  五星: '五星',
};

function normalizeRankLevel(input: unknown): number | null {
  if (typeof input === 'number' && Number.isFinite(input)) {
    const level = Math.floor(input);
    return level >= 0 && level < RANK_LABELS.length ? level : null;
  }

  if (typeof input === 'string') {
    const raw = input.trim();
    if (!raw) return null;

    const upper = raw.toUpperCase().replace('级', '');
    if (upper in RANK_TO_LEVEL) return RANK_TO_LEVEL[upper];

    for (const item of LEGACY_REALM_TO_LEVEL) {
      if (item.matcher.test(raw)) return item.level;
    }
    return null;
  }

  if (input && typeof input === 'object') {
    const anyInput = input as Record<string, unknown>;
    return (
      normalizeRankLevel(anyInput.level)
      ?? normalizeRankLevel(anyInput.rank)
      ?? normalizeRankLevel(anyInput.等级)
      ?? normalizeRankLevel(anyInput.名称)
      ?? normalizeRankLevel(anyInput.name)
      ?? normalizeRankLevel(anyInput.realm)
      ?? null
    );
  }

  return null;
}

function normalizeStage(stage: RealmStage): RealmStage {
  return STAGE_ALIAS_TO_CANONICAL[stage] || stage;
}

function createRankStages(rankName: string, rankLevel: number): RealmStageDefinition[] {
  const base = 1 + rankLevel * 0.2;

  return STAGE_ORDER.map((stage, idx) => {
    const meta = STAGE_META[stage];
    return {
      stage,
      title: `${meta.title}（灵魂进度 ${meta.progressRange}）`,
      breakthrough_difficulty: meta.breakthrough,
      resource_multiplier: Number((base + idx * 0.15).toFixed(2)),
      lifespan_bonus: Math.floor((rankLevel + 1) * (idx + 1) * 6),
      special_abilities: [
        `${rankName}阶段掌控`,
        idx >= 2 ? '副本内抗压增强' : '基础执行稳定',
        idx >= 3 ? '晋升试炼前置条件已满足' : '灵魂强度持续积累',
      ],
      can_cross_realm_battle: idx >= 4,
    };
  });
}

function buildRealmDefinitions(): RealmDefinition[] {
  const data: Array<Pick<RealmDefinition, 'title' | 'coreFeature' | 'lifespan' | 'activityScope' | 'gapDescription'>> = [
    {
      title: '任务新人',
      coreFeature: '刚被主神登记，依赖基础求生能力。',
      lifespan: '常规人类寿命',
      activityScope: 'D级副本',
      gapDescription: '缺乏副本经验，面对高压事件容错极低。',
    },
    {
      title: '稳定执行者',
      coreFeature: '已形成基础能力循环，可完成常规目标。',
      lifespan: '经结算强化略有提升',
      activityScope: 'C级副本',
      gapDescription: '能独立作战，但在复杂博弈中上限有限。',
    },
    {
      title: '战术骨干',
      coreFeature: '具备稳定能力体系，可承担小队核心职责。',
      lifespan: '显著延长',
      activityScope: 'B级副本',
      gapDescription: '能处理多线任务，但面对跨规则副本仍有风险。',
    },
    {
      title: '高压核心',
      coreFeature: '能在高威胁环境下完成主线并兼顾支线收益。',
      lifespan: '长期维持高活性',
      activityScope: 'A级副本',
      gapDescription: '具备强战术能力，但对真相类试炼抗性不足。',
    },
    {
      title: '副本王者',
      coreFeature: '拥有改写局势的能力，生还率和完成度都很高。',
      lifespan: '跨周期稳定',
      activityScope: 'S级副本',
      gapDescription: '可主导团队命运，但仍受主神规则强约束。',
    },
    {
      title: '真相追猎者',
      coreFeature: '接近主神秘密，具备高阶规则干预能力。',
      lifespan: '极长寿并高度稳定',
      activityScope: 'SS级副本',
      gapDescription: '拥有强干预能力，但终局试炼失败代价极高。',
    },
    {
      title: '终局挑战者',
      coreFeature: '可挑战主神终局规则，拥有超常跨域能力。',
      lifespan: '接近规则体',
      activityScope: 'SSS级与终局任务',
      gapDescription: '已是世界级变量，任何失误都可能导致彻底湮灭。',
    },
  ];

  return data.map((item, idx) => ({
    level: idx,
    name: RANK_LABELS[idx],
    ...item,
    stages: createRankStages(RANK_LABELS[idx], idx),
  }));
}

export function getRealmName(level: unknown): string {
  const normalized = normalizeRankLevel(level);
  return normalized == null ? '未知评级' : RANK_LABELS[normalized];
}

export const REALM_DEFINITIONS: RealmDefinition[] = buildRealmDefinitions();

export function getRealmDefinition(level: number): RealmDefinition | undefined {
  return REALM_DEFINITIONS.find((realm) => realm.level === level);
}

export function getRealmStageInfo(realmLevel: number, stage: RealmStage) {
  const realm = getRealmDefinition(realmLevel);
  const normalizedStage = normalizeStage(stage);
  const stageInfo = realm?.stages?.find((entry) => normalizeStage(entry.stage) === normalizedStage);

  return {
    realmName: realm?.name || '未知评级',
    stageInfo,
    fullTitle: stageInfo ? `${realm?.name}${normalizedStage}·${stageInfo.title}` : `${realm?.name || '未知'}${normalizedStage}`,
  };
}
