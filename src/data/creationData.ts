import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';

// =======================================================================
//                           本地世界数据
// =======================================================================
export const LOCAL_WORLDS: Omit<World, 'source'>[] = [
  {
    id: 1,
    name: '朝天大陆',
    era: '朝天历元年',
    description: '此方世界名为"朝天大陆"，乃是一处天道完整、灵气充沛的上善之地。其核心法则是"万灵竞渡，一步登天"，无论是人、妖、精、怪，皆有缘法踏上修行之路，叩问长生。\n仙凡之别在此界泾渭分明，宛若天渊。凡人寿不过百载，受生老病死之苦，终归一抔黄土；而修士一旦踏入道途，便能吞吐天地灵气，淬炼己身，寿元动辄千载，更有大能者与天地同寿。凡俗王朝更迭，于修士而言不过是弹指一瞬间。在凡人眼中，修士是高悬于九天的仙神，一言可定一国兴衰，一念可引风雨雷霆。然而，这种力量并非毫无代价。\n此界奉行"大道争锋"的铁则，天道予万物机缘，却也降下无尽凶险。灵脉宝地、神功秘法、天材地宝，皆是有缘者居之，而"缘"字背后，往往是血与火的洗礼。修士之间，为求道途精进，争斗乃是常态。同门可能反目，挚友亦会背叛，杀人夺宝、斩草除根之事屡见不鲜。这是一个极度自由的世界，你可以选择成为守护一方的善仙，亦可成为肆虐八荒的魔头，只要你有足够的实力。但自由的背后，是无处不在的危险，一步踏错，便是万劫不复，身死道消。\n然天道亦有制衡，修士若无故以大法力干涉凡俗王朝更迭、屠戮凡人，便会与此方天地结下因果。虽无业报加身，却会在日后冲击更高境界、渡劫飞升之时，引来更强大的天劫，平添无数变数。故而多数修士选择在山门清修，或于红尘历练，以求勘破心障，证得大道。修仙百艺——炼丹、炼器、符箓、阵法，在此界发展到了极致，共同构筑了一个无比兴盛、却也无比残酷的修仙文明。',
  },
  {
    id: 2,
    name: '地球',
    era: '灵气复苏元年',
    description: '2077年，地球经历了一场前所未有的灵气复苏。曾经只存在于神话传说中的"灵气"，如潮水般涌入现代世界。科学无法解释的异象频频发生：城市上空出现极光般的能量波动，深山老林涌现出神秘的灵脉，普通动植物开始变异进化。\n在这个巨变的时代，你是极少数能感知并吸收灵气的"觉醒者"。当全世界还在用科学仪器研究这股神秘能量时，你已经能够将其炼化入体，走上了修真之路。现代化的都市、便捷的网络、发达的科技，与古老的修炼体系碰撞，产生了奇妙的化学反应。\n政府成立了"超自然事务管理局"，各国争相研究灵气应用技术，跨国企业试图将灵气商业化，而古老宗门的后裔们也纷纷出世。在这个灵气与科技并存的时代，你将在钢铁森林中独自修行，探索"科学修真"的奥秘。人类的寿命依然有限，普通人对觉醒者既敬畏又恐惧，而你，必须在两个世界之间找到自己的道路。',
  },
  {
    id: 3,
    name: '赛博修真',
    era: '新纪元2156',
    description: '2156年，人类文明已经踏入星际时代。在赛博朋克的霓虹都市中，义体改造、神经接驳、意识上传已成为常态。然而，一次深空探索意外发现了"灵能水晶"——一种能够增强人类精神力的神秘矿石，彻底改变了世界。\n你是一名边缘跑者，在接触灵能水晶后觉醒了修炼天赋。与传统修真不同，这个时代的修行依托于"义体灵修"体系：将灵能与赛博义体结合，数据流就是灵气，神经网络就是经脉，意识核心就是丹田。你可以通过黑客手段"盗取"企业的修炼数据，可以在虚拟现实中进行"数据闭关"，也可以用纳米机器人构建"机械金丹"。\n巨型企业垄断了灵能资源，赛博修士们为了突破境界不得不接受危险任务。城市下层贫民窟中有人在破旧的胶囊旅馆里修炼，上层则是企业供养的"数据仙人"享受着无尽资源。这是一个孤独修士的时代，在霓虹闪烁、义体横行的世界里，你将用代码和灵能书写属于自己的飞升传说。',
  },
  {
    id: 4,
    name: '魔法纪元',
    era: '第七魔法时代',
    description: '这是一个魔法与灵气融合的奇幻世界。千年前，东方的"修真体系"与西方的"魔法体系"发生了史诗级的碰撞，最终两大文明达成了微妙的平衡。在这个世界，古老的修真宗门与魔法学院并存，道家的符箓与炼金术的魔法阵有着惊人的相似之处。\n你生于边境之地，这里是两大文明的交汇点。你可以选择传统的修真之路，炼气筑基金丹元婴；也可以学习西方的魔法体系，成为元素法师或是死灵术士。更有野心者，试图融合两种体系，创造前所未有的"魔修"之道。\n这个世界充满了机遇与危险。古老的龙族盘踞在灵脉之上，精灵王国守护着世界树的秘密，矮人在地底挖掘着魔晶矿脉，而人类帝国则在两大体系的碰撞中寻找平衡。魔法学院的学生可能会与修真宗门的弟子发生冲突，古老的修士可能需要面对掌握禁咒的大魔法师。在这个融合与冲突并存的时代，你将独自探索两种力量的奥秘，寻找超越极限的可能。',
  },
];

// =======================================================================
//                           本地天资数据
// =======================================================================
export const LOCAL_TALENT_TIERS: Omit<TalentTier, 'source'>[] = [
  { id: 1, name: '废柴', description: '资质平平，毫无出奇之处。', total_points: 10, rarity: 1, color: '#808080' },
  { id: 2, name: '凡人', description: '芸芸众生中的一员，不好不坏。', total_points: 20, rarity: 2, color: '#FFFFFF' },
  { id: 3, name: '俊杰', description: '百里挑一的人才，略有不凡。', total_points: 30, rarity: 3, color: '#4169E1' },
  { id: 4, name: '天骄', description: '千年难遇的奇才，注定耀眼。', total_points: 40, rarity: 4, color: '#9932CC' },
  { id: 5, name: '妖孽', description: '万古无一的怪物，逆天而行。', total_points: 50, rarity: 5, color: '#FFD700' },
];

// =======================================================================
//                           本地出身数据
// =======================================================================
export const LOCAL_ORIGINS: Omit<Origin, 'source'>[] = [
  { id: 1, name: '山野遗孤', description: '自幼在山野中长大，与猛兽为伴，磨练出坚韧的意志和过人的体魄。', talent_cost: 0, attribute_modifiers: { root_bone: 1 }, rarity: 3 },
  { id: 2, name: '书香门第', description: '出身于官宦世家，饱读诗书，对天地至理有超乎常人的理解力。', talent_cost: 2, attribute_modifiers: { comprehension: 2 }, rarity: 3 },
  { id: 3, name: '商贾之子', description: '生于富贵之家，精通人情世故，处事圆滑，魅力非凡。', talent_cost: 2, attribute_modifiers: { charm: 2 }, rarity: 3 },
  { id: 4, name: '将门之后', description: '名将的后代，血脉中流淌着勇武与煞气，心性坚定。', talent_cost: 3, attribute_modifiers: { temperament: 2, root_bone: 1 }, rarity: 3 },
  { id: 5, name: '散修传人', description: '你的师父是一位游戏风尘的强大散修，你继承了他的部分衣钵和见识。', talent_cost: 4, attribute_modifiers: { comprehension: 1, temperament: 1 }, rarity: 4 },
  { id: 6, name: '魔道卧底', description: '你出身名门正派，却被派往魔道执行卧底任务，心性远超常人。', talent_cost: 1, attribute_modifiers: { temperament: 3 }, rarity: 4 },
  { id: 7, name: '重生者', description: '你保留着前世的记忆，虽然修为尽失，但对功法和未来的大事了如指掌。', talent_cost: 5, attribute_modifiers: { comprehension: 2, luck: 1 }, rarity: 5 },
  { id: 8, name: '仙人后裔', description: '你的血脉中流淌着稀薄的仙人之血，天生灵性十足，修炼速度略快于常人。', talent_cost: 6, attribute_modifiers: { spirit: 2, root_bone: 1 }, rarity: 5 },
  { id: 9, name: '夺舍老怪', description: '你是一名夺舍重生的老怪物，虽然占据了年轻的肉体，但灵魂中蕴含着庞大的神识力量。', talent_cost: 7, attribute_modifiers: { comprehension: 3, temperament: -1 }, rarity: 5 },
  { id: 10, name: '山神庙祝', description: '你从小在山神庙长大，日夜与香火为伴，神魂受到滋养，对鬼神之事有特殊感应。', talent_cost: 2, attribute_modifiers: { spirit: 2 }, rarity: 3 },
  { id: 11, name: '渔家少年', description: '常年在江河湖海中讨生活，水性极佳，体魄强健。', talent_cost: 1, attribute_modifiers: { root_bone: 2 }, rarity: 2 },
  { id: 12, name: '王朝皇子', description: '生于凡人王朝的权力之巅，自幼享受锦衣玉食和最好的教育，但与修仙界的接触较少。', talent_cost: 3, attribute_modifiers: { charm: 2, temperament: 1 }, rarity: 4 }
];

// =======================================================================
//                           本地灵根数据 (品级优化版本)
// =======================================================================
export const LOCAL_SPIRIT_ROOTS: Omit<SpiritRoot, 'source'>[] = [
  // 上品灵根 - 基础五行
  {
    id: 1,
    name: '金灵根',
    tier: '上品',
    description: '金曰从革，操控金铁，锋锐无匹。修行金系功法事半功倍，是天生的剑修或刀客胚子，攻击性极强。',
    cultivation_speed: '1.6x',
    special_effects: ['金系法术威力+50%', '器物亲和+30%', '金属感知'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  {
    id: 2,
    name: '木灵根',
    tier: '上品',
    description: '木曰曲直，亲和草木，生机盎然。修行木系功法极快，擅长治疗、控制，且对灵植有天生的亲和力。',
    cultivation_speed: '1.6x',
    special_effects: ['木系法术威力+50%', '生命力恢复+40%', '植物沟通'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  {
    id: 3,
    name: '水灵根',
    tier: '上品',
    description: '水曰润下，御水之脉，绵延不绝。修行水系功法，法力悠长，变化多端，适应性极强。',
    cultivation_speed: '1.6x',
    special_effects: ['水系法术威力+50%', '灵气恢复+40%', '水体感知'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  {
    id: 4,
    name: '火灵根',
    tier: '上品',
    description: '火曰炎上，天生火脉，焚尽八荒。修行火系功法，威力绝伦，爆发力强，是炼丹师的绝佳天赋。',
    cultivation_speed: '1.6x',
    special_effects: ['火系法术威力+50%', '爆发伤害+60%', '火焰免疫'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  {
    id: 5,
    name: '土灵根',
    tier: '上品',
    description: '土爰稼穑，大地之子，厚德载物。修行土系功法，防御惊人，稳如泰山，是天生的阵法师材料。',
    cultivation_speed: '1.6x',
    special_effects: ['土系法术威力+50%', '防御力+40%', '大地感知'],
    base_multiplier: 1.6,
    talent_cost: 10,
    rarity: 3
  },
  
  // 中品灵根 - 常见选择
  {
    id: 9,
    name: '金灵根',
    tier: '中品',
    description: '金行资质尚可，修行金系功法有一定天赋，虽不及上品，但也远超常人。',
    cultivation_speed: '1.3x',
    special_effects: ['金系法术威力+25%', '器物亲和+15%'],
    base_multiplier: 1.3,
    talent_cost: 6,
    rarity: 2
  },
  {
    id: 10,
    name: '火灵根',
    tier: '中品',
    description: '火行资质良好，对火系功法有不错的亲和力，能够顺利地踏上修行之路。',
    cultivation_speed: '1.3x',
    special_effects: ['火系法术威力+25%', '爆发伤害+30%'],
    base_multiplier: 1.3,
    talent_cost: 6,
    rarity: 2
  },
  
  // 极品灵根 - 稀有变异
  {
    id: 11,
    name: '雷灵根',
    tier: '极品',
    description: '万中无一的变异灵根，天生雷体，雷霆万钧。修行雷系功法速度极快，威力绝伦，是天劫的宠儿。',
    cultivation_speed: '2.0x',
    special_effects: ['雷系法术威力+80%', '雷霆免疫', '速度+50%', '穿透攻击'],
    base_multiplier: 2.0,
    talent_cost: 15,
    rarity: 4
  },
  {
    id: 12,
    name: '冰灵根',
    tier: '极品',
    description: '极为罕见的变异灵根，冰霜之躯，万物凋零。修行冰系功法，控制力超凡，能冰封千里。',
    cultivation_speed: '2.0x',
    special_effects: ['冰系法术威力+80%', '减速效果+100%', '冰霜免疫', '空间冻结'],
    base_multiplier: 2.0,
    talent_cost: 15,
    rarity: 4
  },
  
  // 神品灵根 - 传说级别
  {
    id: 6,
    name: '混沌灵根',
    tier: '神品',
    description: '传说中的至高灵根，万法归一，包容万象。可修行所有属性功法，无瓶颈，但初期进展缓慢，后期一日千里。',
    cultivation_speed: '0.8x(前期) → 2.8x(后期)',
    special_effects: ['全系法术亲和', '无属性限制', '越阶战斗+50%', '突破概率+30%'],
    base_multiplier: 2.8,
    talent_cost: 25,
    rarity: 5
  },
  
  // 特殊灵根
  {
    id: 7,
    name: '天妒之体',
    tier: '特殊',
    description: '天道所妒，灵气不亲。修行速度极为缓慢，常人难以忍受。但一旦突破，根基无比扎实，战力远超同阶。',
    cultivation_speed: '0.5x',
    special_effects: ['根基极其稳固', '突破后实力暴增+100%', '天劫抗性+80%', '逆天改命'],
    base_multiplier: 0.5,
    talent_cost: -5,
    rarity: 4
  },
  
  // 凡品和下品灵根
  {
    id: 8,
    name: '五行杂灵根',
    tier: '凡品',
    description: '凡人中最常见的灵根，五行皆有，却驳杂不堪，修炼速度慢如龟爬，仙路渺茫。',
    cultivation_speed: '1.0x',
    special_effects: ['平凡之道', '大器晚成'],
    base_multiplier: 1.0,
    talent_cost: 0,
    rarity: 1
  },
  {
    id: 13,
    name: '风灵根',
    tier: '下品',
    description: '较为常见的异种灵根，微风轻抚，虽然资质一般，但胜在灵活多变，身法迅捷。',
    cultivation_speed: '1.1x',
    special_effects: ['风系法术威力+15%', '移动速度+20%'],
    base_multiplier: 1.1,
    talent_cost: 3,
    rarity: 1
  },
];


// =======================================================================
//                           本地天赋数据 (预留)
// =======================================================================
export const LOCAL_TALENTS: Omit<Talent, 'source'>[] = [
  { 
    id: 1, 
    name: '天命主角', 
    description: '气运惊人，总是能在绝境中逢生，获得意想不到的机缘。', 
    talent_cost: 15, 
    rarity: 5, 
    effects: [
      { 类型: '后天六司', 目标: '气运', 数值: 8 },
      { 类型: '特殊能力', 名称: '逢凶化吉', 数值: 0.1 }
    ]
  },
  {
    id: 2, 
    name: '剑道独尊', 
    description: '天生剑心通明，任何剑法一看便会，且威力倍增。', 
    talent_cost: 12, 
    rarity: 5, 
    effects: [
      { 类型: '技能加成', 技能: '剑法', 数值: 0.2 },
      { 类型: '后天六司', 目标: '根骨', 数值: 3 }
    ]
  },
  {
    id: 3,
    name: '丹道圣手',
    description: '对药理有超凡的领悟力，炼丹成功率与品质大幅提升。',
    talent_cost: 12,
    rarity: 5,
    effects: [
      { 类型: '技能加成', 技能: '炼丹', 数值: 0.15 },
      { 类型: '后天六司', 目标: '悟性', 数值: 2 }
    ]
  },
  {
    id: 4,
    name: '阵法大师',
    description: '对阵法有极高的天赋，学习和布置阵法的效率大大提高。',
    talent_cost: 8,
    rarity: 4,
    effects: [
      { 类型: '技能加成', 技能: '阵法', 数值: 0.12 },
      { 类型: '后天六司', 目标: '悟性', 数值: 2 }
    ]
  },
  {
    id: 5,
    name: '炼器鬼才',
    description: '天生对各种材料有敏锐的感知，炼器时更容易出现极品。',
    talent_cost: 8,
    rarity: 4,
    effects: [
      { 类型: '技能加成', 技能: '炼器', 数值: 0.1 },
      { 类型: '特殊能力', 名称: '材料感知', 数值: 1 }
    ]
  },
  {
    id: 6,
    name: '多宝童子',
    description: '出门历练时，更容易发现天材地宝。',
    talent_cost: 7,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '气运', 数值: 3 },
      { 类型: '特殊能力', 名称: '寻宝天赋', 数值: 0.15 }
    ]
  },
  {
    id: 7,
    name: '体修奇才',
    description: '肉身天生强横，气血旺盛，适合修炼体修功法。',
    talent_cost: 5,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '根骨', 数值: 3 },
      { 类型: '特殊能力', 名称: '体修天赋', 数值: 0.1 }
    ]
  },
  {
    id: 8,
    name: '神识过人',
    description: '天生神识强大，不易被心魔入侵，施展神识秘术效果更佳。',
    talent_cost: 5,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '悟性', 数值: 3 },
      { 类型: '特殊能力', 名称: '心魔抗性', 数值: 0.1 }
    ]
  },
  {
    id: 9,
    name: '身法鬼魅',
    description: '身法飘逸，战斗中闪避能力更强。',
    talent_cost: 4,
    rarity: 3,
    effects: [
      { 类型: '后天六司', 目标: '灵性', 数值: 2 },
      { 类型: '特殊能力', 名称: '闪避天赋', 数值: 0.08 }
    ]
  },
  {
    id: 10,
    name: '农夫之子',
    description: '出身凡人，心性坚韧，对灵植有额外的亲和力。',
    talent_cost: 2,
    rarity: 2,
    effects: [
      { 类型: '后天六司', 目标: '心性', 数值: 1 },
      { 类型: '特殊能力', 名称: '灵植亲和', 数值: 0.1 }
    ]
  },
  {
    id: 11,
    name: '过目不忘',
    description: '记忆力超群，学习功法秘籍速度加快。',
    talent_cost: 2,
    rarity: 2,
    effects: [
      { 类型: '后天六司', 目标: '悟性', 数值: 2 }
    ]
  },
  {
    id: 12,
    name: '老实人',
    description: '与人交易时，不容易被欺骗。',
    talent_cost: 1,
    rarity: 1,
    effects: [
      { 类型: '特殊能力', 名称: '防欺诈', 数值: 1 }
    ]
  },
  {
    id: 13,
    name: '一诺千金',
    description: '你的承诺极具分量，更容易获得他人的信任与好感。',
    talent_cost: 3,
    rarity: 2,
    effects: [
      { 类型: '后天六司', 目标: '魅力', 数值: 2 }
    ]
  },
  {
    id: 14,
    name: '天生毒体',
    description: '百毒不侵，且能更好地驾驭毒功，但常人不敢轻易接近。',
    talent_cost: 6,
    rarity: 4,
    effects: [
      { 类型: '特殊能力', 名称: '毒素免疫', 数值: 1 },
      { 类型: '技能加成', 技能: '毒术', 数值: 0.15 },
      { 类型: '后天六司', 目标: '魅力', 数值: -2 }
    ]
  },
  {
    id: 15,
    name: '画龙点睛',
    description: '在制作符箓时，有一定几率产生意想不到的强大效果。',
    talent_cost: 4,
    rarity: 3,
    effects: [
      { 类型: '技能加成', 技能: '符箓', 数值: 0.1 },
      { 类型: '特殊能力', 名称: '符箓变异', 数值: 0.05 }
    ]
  },
  {
    id: 16,
    name: '顶级魅力',
    description: '天生丽质，气质非凡，魅力超群。无论走到哪里都是众人瞩目的焦点，极容易获得他人的好感与信任。在社交场合如鱼得水，能够以言语和魅力化解大部分冲突。',
    talent_cost: 8,
    rarity: 4,
    effects: [
      { 类型: '后天六司', 目标: '魅力', 数值: 5 },
      { 类型: '特殊能力', 名称: '魅力光环', 数值: 0.2 },
      { 类型: '特殊能力', 名称: '社交天赋', 数值: 0.15 }
    ]
  }
];
