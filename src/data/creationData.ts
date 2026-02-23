// 主神空间无限流 本地创角数据
import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';

// =======================================================================
//                           本地世界数据
// =======================================================================
export const LOCAL_WORLDS: Omit<World, 'source'>[] = [
  { id: 1, name: '主神空间', era: '轮回纪元', description: '轮回者集结与结算的中枢空间。所有任务传送、兑换、修整与评级都在此进行。' },
  { id: 2, name: '雾城封锁区', era: '灾变后第9年', description: '被长期封锁的都市隔离区，信息污染与物资短缺并存，适合潜入与撤离任务。' },
  { id: 3, name: '深海研究站', era: '深潜纪元', description: '建在海沟边缘的实验设施，通信不稳且结构脆弱，常出现异常信号与失联事件。' },
  { id: 4, name: '赛博夜港', era: '联邦历2156', description: '企业与帮派共治的港口都市，监控网络密集，黑市交易与情报战高频发生。' },
  { id: 5, name: '废土补给线', era: '核冬天第3阶段', description: '跨越灰烬地带的补给走廊，运输队与掠夺者长期对抗，生存压力极高。' },
  { id: 6, name: '永夜公寓', era: '未知', description: '时间流速异常的封闭建筑，住户记忆反复重置，任务常围绕真相回收与污染抑制。' },
  { id: 7, name: '边境要塞群', era: '战时临界', description: '多阵营交火的防线地带，协同作战与阵地推进是主旋律。' },
  { id: 8, name: '远星遗迹带', era: '深空拓荒后期', description: '漂浮于轨道带的大型遗迹群，伴随低重力、辐射与古代防御系统。' },
  { id: 9, name: '镜像历史城', era: '断层纪年', description: '被历史片段覆盖的城市副本，行为规则会随“时代层”切换而变化。' },
  { id: 10, name: '异构森林', era: '生态重编期', description: '地形与生物会在短周期内重组，导航和追踪难度极高。' },
];

// =======================================================================
//                           本地资质档位
// =======================================================================
export const LOCAL_TALENT_TIERS: Omit<TalentTier, 'source'>[] = [
  { id: 1, name: '普通候选者', description: '具备基础生存素质，可执行低强度副本。', total_points: 12, rarity: 1, color: '#8b98a7' },
  { id: 2, name: '训练生', description: '经过初步训练，具有较稳定的任务执行能力。', total_points: 20, rarity: 2, color: '#cbd5e1' },
  { id: 3, name: '资深执行者', description: '面对复杂局势能保持效率与冷静。', total_points: 30, rarity: 3, color: '#60a5fa' },
  { id: 4, name: '精英轮回者', description: '在高压副本中有明显优势。', total_points: 42, rarity: 4, color: '#a78bfa' },
  { id: 5, name: '传奇候选者', description: '兼具天赋与意志，上限极高。', total_points: 56, rarity: 5, color: '#f59e0b' },
  { id: 6, name: '异常载体', description: '能力波动大，但极端场景表现突出。', total_points: 68, rarity: 6, color: '#f43f5e' },
  { id: 7, name: '主神标记者', description: '被系统重点观测，成长潜力极高同时风险更大。', total_points: 80, rarity: 7, color: '#ef4444' },
];

// =======================================================================
//                           本地出身数据
// =======================================================================
export const LOCAL_ORIGINS: Omit<Origin, 'source'>[] = [
  { id: 1, name: '急诊医生', description: '高压救援经验丰富，决策速度快。', talent_cost: 2, attribute_modifiers: { comprehension: 1, temperament: 1 }, rarity: 3 },
  { id: 2, name: '退役侦察兵', description: '擅长潜行、侦查和战场生存。', talent_cost: 3, attribute_modifiers: { root_bone: 1, spirituality: 1 }, rarity: 3 },
  { id: 3, name: '消防救援员', description: '面对灾难环境时抗压能力强。', talent_cost: 2, attribute_modifiers: { root_bone: 2 }, rarity: 3 },
  { id: 4, name: '网络安全工程师', description: '信息检索与系统渗透能力出色。', talent_cost: 3, attribute_modifiers: { comprehension: 2 }, rarity: 4 },
  { id: 5, name: '刑侦心理顾问', description: '读人能力强，擅长识别动机。', talent_cost: 3, attribute_modifiers: { comprehension: 1, charm: 1 }, rarity: 4 },
  { id: 6, name: '地下拳馆选手', description: '近战经验丰富，抗击打能力优秀。', talent_cost: 2, attribute_modifiers: { root_bone: 2, temperament: 1 }, rarity: 3 },
  { id: 7, name: '无人区向导', description: '熟悉恶劣地形与路线规划。', talent_cost: 2, attribute_modifiers: { spirituality: 1, temperament: 1 }, rarity: 3 },
  { id: 8, name: '战地记者', description: '信息采集效率高，适应复杂局势。', talent_cost: 1, attribute_modifiers: { fortune: 1, charm: 1 }, rarity: 3 },
  { id: 9, name: '后勤调度员', description: '资源分配与团队协作能力突出。', talent_cost: 1, attribute_modifiers: { charm: 1, temperament: 1 }, rarity: 2 },
  { id: 10, name: '废土拾荒者', description: '在资源匮乏环境下生存能力强。', talent_cost: 0, attribute_modifiers: { fortune: 1, root_bone: 1 }, rarity: 2 },
  { id: 11, name: '历史研究生', description: '长于资料整理与线索归纳。', talent_cost: 1, attribute_modifiers: { comprehension: 2 }, rarity: 2 },
  { id: 12, name: '职业谈判员', description: '擅长危机沟通与冲突降温。', talent_cost: 2, attribute_modifiers: { charm: 2 }, rarity: 3 },
  { id: 13, name: '无人机操作员', description: '侦查与远程支援能力稳定。', talent_cost: 2, attribute_modifiers: { spirituality: 1, comprehension: 1 }, rarity: 3 },
  { id: 14, name: '极限运动员', description: '机动性与反应速度优于常人。', talent_cost: 2, attribute_modifiers: { root_bone: 1, spirituality: 1 }, rarity: 3 },
  { id: 15, name: '深海作业员', description: '在封闭高压空间中耐受力强。', talent_cost: 2, attribute_modifiers: { temperament: 2 }, rarity: 3 },
  { id: 16, name: '边境巡逻员', description: '长期执行高风险值守任务。', talent_cost: 2, attribute_modifiers: { root_bone: 1, fortune: 1 }, rarity: 3 },
  { id: 17, name: '事故幸存者', description: '经历极端事件后意志显著提升。', talent_cost: 0, attribute_modifiers: { temperament: 2 }, rarity: 2 },
  { id: 18, name: '黑市中间人', description: '渠道广、人脉复杂，消息灵通。', talent_cost: 3, attribute_modifiers: { charm: 1, fortune: 1 }, rarity: 4 },
  { id: 19, name: '反欺诈调查员', description: '更容易识别陷阱与伪装。', talent_cost: 2, attribute_modifiers: { comprehension: 1, spirituality: 1 }, rarity: 3 },
  { id: 20, name: '流动维修师', description: '设备修复与应急改装能力优秀。', talent_cost: 2, attribute_modifiers: { comprehension: 1, root_bone: 1 }, rarity: 3 },
  { id: 21, name: '封锁区学生', description: '在高压环境成长，适应力强。', talent_cost: 0, attribute_modifiers: { spirituality: 1 }, rarity: 2 },
  { id: 22, name: '秘密线人', description: '隐蔽行动经验丰富，但风险高。', talent_cost: 1, attribute_modifiers: { fortune: 1, temperament: 1 }, rarity: 3 },
  { id: 23, name: '安保指挥', description: '团队协调和战术部署能力强。', talent_cost: 3, attribute_modifiers: { charm: 1, comprehension: 1, temperament: 1 }, rarity: 4 },
  { id: 24, name: '失联归来者', description: '携带未知经历，潜力与不确定性并存。', talent_cost: 4, attribute_modifiers: { fortune: 2, comprehension: 1 }, rarity: 5 },
];

// =======================================================================
//                           本地潜能数据（兼容旧字段名）
// =======================================================================
export const LOCAL_SPIRIT_ROOTS: Omit<SpiritRoot, 'source'>[] = [
  { id: 1, name: '基础战斗适配', tier: '基础', description: '基础战斗能力稳定，适合新人开局。', cultivation_speed: '1.0x', special_effects: ['近战稳定'], base_multiplier: 1.0, talent_cost: 0, rarity: 1 },
  { id: 2, name: '基础侦查适配', tier: '基础', description: '感知与观察能力略优。', cultivation_speed: '1.0x', special_effects: ['环境感知'], base_multiplier: 1.0, talent_cost: 0, rarity: 1 },
  { id: 3, name: '机动适配', tier: '进阶', description: '移动与躲避能力增强。', cultivation_speed: '1.1x', special_effects: ['机动+'], base_multiplier: 1.1, talent_cost: 2, rarity: 2 },
  { id: 4, name: '后勤适配', tier: '进阶', description: '资源利用效率更高。', cultivation_speed: '1.1x', special_effects: ['物资利用+'], base_multiplier: 1.1, talent_cost: 2, rarity: 2 },
  { id: 5, name: '潜入适配', tier: '强化', description: '隐蔽行动成功率提升。', cultivation_speed: '1.25x', special_effects: ['潜行判定+'], base_multiplier: 1.25, talent_cost: 5, rarity: 3 },
  { id: 6, name: '远程适配', tier: '强化', description: '远距命中与稳定性更高。', cultivation_speed: '1.25x', special_effects: ['远程命中+'], base_multiplier: 1.25, talent_cost: 5, rarity: 3 },
  { id: 7, name: '指挥适配', tier: '精英', description: '队伍协同与节奏控制能力提升。', cultivation_speed: '1.45x', special_effects: ['协作效率+'], base_multiplier: 1.45, talent_cost: 9, rarity: 4 },
  { id: 8, name: '精神防护适配', tier: '精英', description: '对恐惧与污染的抵抗更强。', cultivation_speed: '1.45x', special_effects: ['精神抗性+'], base_multiplier: 1.45, talent_cost: 9, rarity: 4 },
  { id: 9, name: '异常共鸣适配', tier: '专家', description: '能与副本异常规则短暂共振并利用。', cultivation_speed: '1.75x', special_effects: ['规则共振'], base_multiplier: 1.75, talent_cost: 14, rarity: 5 },
  { id: 10, name: '战术预判适配', tier: '专家', description: '高压战斗中的预判能力显著增强。', cultivation_speed: '1.75x', special_effects: ['危机预判'], base_multiplier: 1.75, talent_cost: 14, rarity: 5 },
  { id: 11, name: '主神标记适配', tier: '传奇', description: '成长曲线极高，但失败代价也更重。', cultivation_speed: '2.1x', special_effects: ['成长倍率+'], base_multiplier: 2.1, talent_cost: 20, rarity: 6 },
  { id: 12, name: '逆境适配', tier: '特殊', description: '低资源、低血量时更容易触发反制。', cultivation_speed: '0.9x → 1.9x', special_effects: ['逆境强化'], base_multiplier: 1.9, talent_cost: 6, rarity: 4 },
];

// =======================================================================
//                           本地天赋数据
// =======================================================================
export const LOCAL_TALENTS: Omit<Talent, 'source'>[] = [
  { id: 1, name: '危机预判', description: '更早识别威胁与陷阱。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '灵性', 数值: 2 }] },
  { id: 2, name: '应急止血', description: '受伤后恢复效率提升。', talent_cost: 3, rarity: 2, effects: [{ 类型: '后天六司', 目标: '根骨', 数值: 2 }] },
  { id: 3, name: '战术记忆', description: '对战斗细节的记忆能力增强。', talent_cost: 3, rarity: 2, effects: [{ 类型: '后天六司', 目标: '悟性', 数值: 2 }] },
  { id: 4, name: '心理锚定', description: '降低恐惧与精神污染影响。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '心性', 数值: 2 }] },
  { id: 5, name: '弱点洞察', description: '更容易发现关键破绽。', talent_cost: 5, rarity: 3, effects: [{ 类型: '后天六司', 目标: '悟性', 数值: 3 }] },
  { id: 6, name: '资源统筹', description: '任务中物资使用更高效。', talent_cost: 3, rarity: 2, effects: [{ 类型: '后天六司', 目标: '气运', 数值: 2 }] },
  { id: 7, name: '协作强化', description: '提升与队友的配合稳定性。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '魅力', 数值: 2 }] },
  { id: 8, name: '静默行动', description: '潜入行动更难暴露。', talent_cost: 5, rarity: 3, effects: [{ 类型: '后天六司', 目标: '灵性', 数值: 3 }] },
  { id: 9, name: '反伏击本能', description: '被突袭时有更高概率保命。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '心性', 数值: 2 }] },
  { id: 10, name: '专注射击', description: '远程命中和稳定性提升。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '悟性', 数值: 2 }] },
  { id: 11, name: '高压耐受', description: '极端环境下行动惩罚降低。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '根骨', 数值: 2 }] },
  { id: 12, name: '社交渗透', description: '谈判与诱导更容易奏效。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '魅力', 数值: 3 }] },
  { id: 13, name: '快速部署', description: '战斗前准备效率更高。', talent_cost: 3, rarity: 2, effects: [{ 类型: '后天六司', 目标: '灵性', 数值: 1 }, { 类型: '后天六司', 目标: '悟性', 数值: 1 }] },
  { id: 14, name: '临场算计', description: '混战中更容易做出最优取舍。', talent_cost: 5, rarity: 4, effects: [{ 类型: '后天六司', 目标: '悟性', 数值: 3 }] },
  { id: 15, name: '命运偏转', description: '极端情况下小幅改变结果走向。', talent_cost: 6, rarity: 4, effects: [{ 类型: '后天六司', 目标: '气运', 数值: 3 }] },
  { id: 16, name: '生还专家', description: '撤离阶段容错更高。', talent_cost: 6, rarity: 4, effects: [{ 类型: '后天六司', 目标: '心性', 数值: 3 }] },
  { id: 17, name: '反制连携', description: '打断敌方节奏能力增强。', talent_cost: 5, rarity: 4, effects: [{ 类型: '后天六司', 目标: '根骨', 数值: 2 }, { 类型: '后天六司', 目标: '灵性', 数值: 1 }] },
  { id: 18, name: '伪装专家', description: '身份伪装与欺骗成功率提升。', talent_cost: 5, rarity: 4, effects: [{ 类型: '后天六司', 目标: '魅力', 数值: 2 }, { 类型: '后天六司', 目标: '气运', 数值: 1 }] },
  { id: 19, name: '战地修复', description: '应急维修能力提升。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '悟性', 数值: 2 }] },
  { id: 20, name: '追踪本能', description: '跟踪目标和反跟踪能力增强。', talent_cost: 4, rarity: 3, effects: [{ 类型: '后天六司', 目标: '灵性', 数值: 2 }] },
  { id: 21, name: '战斗狂热', description: '交战越久越容易进入高效状态。', talent_cost: 6, rarity: 4, effects: [{ 类型: '后天六司', 目标: '根骨', 数值: 3 }] },
  { id: 22, name: '沉稳决策', description: '高压条件下仍能稳定决策。', talent_cost: 5, rarity: 4, effects: [{ 类型: '后天六司', 目标: '心性', 数值: 3 }] },
  { id: 23, name: '冷读技巧', description: '快速判断陌生目标意图。', talent_cost: 5, rarity: 4, effects: [{ 类型: '后天六司', 目标: '悟性', 数值: 2 }, { 类型: '后天六司', 目标: '魅力', 数值: 1 }] },
  { id: 24, name: '脉冲反应', description: '瞬时反应速度大幅提升。', talent_cost: 6, rarity: 4, effects: [{ 类型: '后天六司', 目标: '灵性', 数值: 3 }] },
  { id: 25, name: '极限抗压', description: '临界状态下仍能维持执行力。', talent_cost: 7, rarity: 5, effects: [{ 类型: '后天六司', 目标: '心性', 数值: 4 }] },
  { id: 26, name: '主神回响', description: '结算评价越高，成长越稳定。', talent_cost: 7, rarity: 5, effects: [{ 类型: '后天六司', 目标: '气运', 数值: 4 }] },
  { id: 27, name: '统御气场', description: '小队协同与指挥效率显著提升。', talent_cost: 7, rarity: 5, effects: [{ 类型: '后天六司', 目标: '魅力', 数值: 4 }] },
  { id: 28, name: '战术直觉', description: '复杂局面下更容易找到突破口。', talent_cost: 7, rarity: 5, effects: [{ 类型: '后天六司', 目标: '悟性', 数值: 4 }] },
  { id: 29, name: '不屈意志', description: '濒危状态下维持行动能力。', talent_cost: 8, rarity: 5, effects: [{ 类型: '后天六司', 目标: '心性', 数值: 5 }] },
  { id: 30, name: '生还执念', description: '高风险任务中生还概率提升。', talent_cost: 8, rarity: 5, effects: [{ 类型: '后天六司', 目标: '气运', 数值: 5 }] },
];
