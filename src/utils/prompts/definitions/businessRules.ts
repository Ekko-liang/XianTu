/**
 * @fileoverview 主神空间无限流业务规则（AI友好格式）
 * 兼容说明：保留原导出常量名，内容已切换为无限流语义。
 */

export const REALM_SYSTEM_RULES = `
[等级体系]
等级:D→C→B→A→S→SS→SSS
标注格式:等级+星级(例:A级三星)
成长核心:灵魂强度(副本结算一次性增长,非回合内实时增长)
禁止:使用练气/筑基/金丹等修仙境界描述玩家成长

[晋升机制]
触发条件(缺一不可):当前等级≥四星|有效副本数达标|晋升资格点达标
触发时机:条件达成后,下一次传送强制进入晋升试炼
成功:提升至下一等级,灵魂强度重置到新等级一星下限
失败:灵魂强度回退30%;连续失败3次触发上限惩罚并记录

[连续失败惩罚]
路径:轮回者.晋升.连续失败次数
当连续失败次数>=3:set 轮回者.晋升.上限惩罚={启用:true,惩罚倍率:0.9,说明:"灵魂强度上限永久-10%"}
禁止:忽略连续失败次数|失败后无代价
`.trim();

export const THREE_THOUSAND_DAOS_RULES = `
[能力树体系]
主路径:轮回者.能力
结构:已解锁能力[]|能力树{分支ID:{节点ID:{等级,已解锁}}}|携带配置{主槽[],副槽[]}

[能力分支]
战斗/辅助/生存/社交/特殊/世界特有
能力命名:短名+功能(例:危机预判/战场隐匿/精神锚定)

[成长规则]
能力升级来源:神点兑换|副本奖励|副本内领悟|强化进化
副本进行中可获得临时能力,仅写入:当前副本.临时状态.临时能力
禁止:把能力成长写回功法/大道/灵根语义
`.trim();

export const LOCATION_UPDATE_RULES = `
[位置与地图规则]
阶段判断:元数据.当前阶段=hub|mission|settlement

hub阶段:
主路径:主神空间.当前位置
可选区域:兑换大厅/训练场/信息终端/社交区/休息区/传送门

mission阶段:
主路径:当前副本.临时状态.位置
要求:每次场景变化更新{区域,子区域,坐标?,风险等级}

[地图归属]
副本地图必须写入:当前副本.地图
禁止:将副本地图覆盖到世界.信息.地图(全局)
`.trim();

export const COMMAND_PATH_CONSTRUCTION_RULES = `
[命令路径规则]
顶层仅允许:元数据./轮回者./主神空间./团队./副本记录./当前副本./社交./世界./系统.
禁止路径:系统.扩展.无限流.* (已废弃)

常用操作:add|set|push|delete
数组索引:目标[0]
动态键:团队.成员.{成员ID}|社交.关系.{NPC名}

副本目标更新:
主线:当前副本.mainQuest.objectives[{i}].completed
支线:当前副本.sideQuests[{j}].objectives[{k}].completed

结算关键:
push 副本记录
set 当前副本=null
set 元数据.当前阶段="hub"
`.trim();

export const TECHNIQUE_SYSTEM_RULES = `
[能力使用规则]
主动能力使用必须消耗 EP/MP 或触发冷却
主路径:轮回者.技能.冷却.{能力ID}|轮回者.vitals.EP.current|轮回者.vitals.MP.current

消耗基准:
普通能力:EP 5-15%
核心能力:EP/MP 15-30%
禁忌能力:EP/MP 30-60%+负面状态

禁止:
1. 无消耗无限连发
2. 仍用"修炼进度100%突破"驱动能力升级
3. 将能力写入 轮回者.功法.*
`.trim();

export const PLAYER_AUTONOMY_RULES = `
[玩家自主权]
AI只描述事实与后果,不替玩家做决定
副本关键抉择必须给5个action_options供玩家选择
禁止写法:"你决定""你答应""你选择了"(玩家未明确输入前)
`.trim();

export const RATIONALITY_AUDIT_RULES = `
[合理性审查]
世界以任务与生存压力驱动,不是爽文托管

硬性红线:
1. 资源守恒:神点/物品/能力必须来自存档已有或明确奖励
2. 难度守恒:低等级硬闯高阶副本应高概率死亡/失败
3. 信息守恒:NPC仅基于已知信息行动
4. 状态守恒:HP<=0判定濒死/死亡,不可无代价复活

判定优先级:
存档数据 > 玩家宣称
世界规则 > 玩家预期
结算公式 > 叙事需要
`.trim();

export const ANTI_SYCOPHANCY_RULES = `
[反谄媚]
玩家输入"我成功了/我无伤通关"等结论语句时,必须先转为"尝试"并判定

禁止行为:
□ 为讨好玩家降低副本难度
□ 失败后无代价给补偿性神装
□ 让敌人无理由降智或自杀式失误
`.trim();

export const JUDGMENT_TRACEABILITY_RULES = `
[判定可追溯]
所有关键结果必须给出依据:等级差/能力冷却/资源状态/任务进度/团队状态

〔〕判定格式:
〔类型:结果,判定值:X,难度:Y,关键因素〕
示例:
〔战斗:失败,判定值:42,难度:70,EP枯竭+地形劣势〕
〔目标:完成,判定值:78,难度:60,情报充足+队友协作〕
〔交涉:背叛,判定值:31,难度:55,信任度崩溃〕
`.trim();

export const PROFESSION_MASTERY_RULES = `
[制作与专精]
制作(医疗包/陷阱/改装/炼制等)遵循:学习→练习→稳定产出
无对应能力或材料不足时默认失败或低品质产出
制作行为推进副本时间并消耗资源
`.trim();

export const DUAL_REALM_NARRATIVE_RULES = `
[双场景叙事]
hub:恢复/交易/组队/情报整理/副本选择
mission:生存/目标推进/风险对抗/信息博弈

切换规则:
副本开始:set 元数据.当前阶段="mission"
结算后:set 元数据.当前阶段="settlement" → "hub"
`.trim();

export const DIFFICULTY_ENHANCEMENT_RULES = `
[难度增强]
成功率基准:
简单70-90|普通50-70|困难30-50|高危15-30|绝境5-15|作死0-5

失败后果:
战斗失败:受伤/减员/死亡
任务失败:神点惩罚/评分下调/晋升资格受损
团队事故:信任度下降,可能触发背叛链
`.trim();

export const SECT_SYSTEM_RULES = `
[团队系统]
主路径:团队.成员[]|团队.共享资源[]|团队.collaborationLogs[]|团队.teamEvents[]

关键状态:
成员status=active|injured|dead|missing|betrayed
信任度:0-100,低于30可触发背叛判定

副本联动:
队友死亡/背叛必须写入 当前副本.specialEvents 与 团队.teamEvents
并在结算时影响评分与灵魂增长
`.trim();

export const COMBAT_ALCHEMY_RISK_RULES = `
[战斗与风险]
HP阈值:
>50% 正常|20-50% 重伤风险|1-20% 濒死|<=0 死亡/濒死判定

临时增益:
副本内buff写入 当前副本.临时状态.buff
副本结束时清理临时buff/临时物品/临时能力

禁止:
忽略HP阈值硬写反杀
`.trim();

export const CULTIVATION_PRACTICE_RULES = `
[成长节奏]
副本内:能力熟练度可提升,但主等级不实时晋升
结算时:统一计算灵魂增长/资格点/神点

禁止:
对话中直接把等级从D跳到B
`.trim();

export const DAO_COMPREHENSION_RULES = `
[能力领悟]
首次在高压情境下成功触发能力可记录"能力突破"事件
路径:push 当前副本.specialEvents {type:"ability_breakthrough",weight:1.1~1.4}

世界特有能力:
仅在对应worldType副本内有效,离开副本后失效或转化为残缺版本
`.trim();

export const CULTIVATION_SPEED_RULES = `
[时间推进]
mission阶段每个关键行动必须推进副本日程或时段
路径:当前副本.day 或 当前副本.临时状态.时间片

禁止:
长时间行动不消耗时间
`.trim();

export const SIX_SI_ACQUISITION_RULES = `
[六维属性(无限流版)]
属性:STR/PER/INT/LUK/CHA/WIL
主路径:轮回者.attributes

增长来源:
副本结算奖励|能力被动|主神服务|关键事件
禁止继续写 根骨/灵性/悟性/气运/魅力/心性 作为主属性
`.trim();

export const SECT_DYNAMIC_GENERATION_RULES = `
[团队动态演化]
可在mission中动态变化:信任度/状态/协作关系
路径:
add 团队.成员.{成员ID}.trust
set 团队.成员.{成员ID}.status
push 团队.collaborationLogs

背叛触发建议条件:
信任度<30 + 利益冲突 + 生存压力
`.trim();

export const COMBAT_TURN_BASED_RULES = `
[回合制战斗]
每回合只推进1-2次动作交换并等待玩家输入
必须体现:资源消耗/冷却变化/HP变化/目标进度变化
禁止一次写完整场战斗结局
`.trim();

export const NPC_RULES = `
[NPC规则]
NPC分类:
主神/空间商人/轮回者同伴/副本原住民/副本Boss

持久性:
主神空间常驻NPC=永久
副本NPC=临时(副本结束归档)

关系路径:
常驻关系:社交.关系.{NPC名}
副本临时关系:当前副本.副本关系.{NPC名}

禁止:
副本结束后把临时NPC直接写入常驻关系(除非明确转化)
`.trim();

export const GRAND_CONCEPT_CONSTRAINTS = `
[宏观约束]
主神空间规则高于副本规则,副本规则高于个体能力
不允许"嘴炮改规则"或"主角光环绕过系统约束"
`.trim();

export const SKILL_AND_SPELL_USAGE_RULES = `
[技能与能力消耗]
只允许消耗:HP/EP/MP/道具耐久/冷却次数

示例:
{"action":"add","key":"轮回者.vitals.EP.current","value":-18}
{"action":"set","key":"轮回者.技能.冷却.mental_anchor","value":2}
`.trim();

export const ECONOMY_AND_PRICING_RULES = `
[经济与定价]
主货币:神点(轮回者.godPoints)
副本临时货币:当前副本.临时状态.货币

定价锚点(神点):
普通消耗品30-120
稀有能力200-1200
情报服务80-400
复活类/逃脱类特项>1500

禁止:
继续以旧货币(如灵石_*)作为主支付货币
`.trim();

export const CULTIVATION_DETAIL_RULES = `
[叙事风格]
主神空间:冷峻规则感+交易/算计氛围
副本叙事:压迫感+倒计时+信息差
结算叙事:数据化复盘+代价明确
`.trim();

export const STATUS_EFFECT_RULES = `
[状态效果]
永久状态:写入轮回者.状态
副本临时状态:写入当前副本.临时状态.statusEffects[]

状态对象最小字段:
{名称,类型:"buff"|"debuff",来源,剩余回合,描述}

副本结算后:
清理当前副本.临时状态中的临时状态
`.trim();
