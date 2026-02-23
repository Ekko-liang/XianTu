/**
 * @fileoverview SaveData 数据结构定义（主神空间无限流）
 * 说明：保留旧导出函数签名，供 prompt 系统复用。
 */

const META_STRUCTURE = `
[元数据]
版本号:num=3;存档ID:str;存档名:str;创建时间:str(ISO8601);更新时间:str(ISO8601);游戏时长秒:num;时间:{年,月,日,小时,分钟};当前阶段:"hub"|"mission"|"settlement"
`.trim();

const REINCARNATOR_STRUCTURE = `
[轮回者]
身份:{名字,性别,种族?,背景,出生日期?,标签[]}
等级:{level:"D"|"C"|"B"|"A"|"S"|"SS"|"SSS",star:1-5,soulStrength:num}
attributes:{STR,PER,INT,LUK,CHA,WIL}
vitals:{HP:{current,max},EP:{current,max},MP:{current,max}}
成长:{missionCount:num;survivalRate:num[0-1];promotionPoints:num;godPoints:num}
晋升:{promotionTrialPending:bool;pendingPromotionTarget?:str|null;promotionTrialFailures:num;连续失败次数?:num;上限惩罚?:{启用:bool,惩罚倍率:num,说明?:str}}
能力:{已解锁能力:str[];能力树?:{分支ID:{节点ID:{等级:num,已解锁:bool}}};携带配置?:{主槽:str[],副槽:str[]}}
装备:{槽位:{slot1?:str|null,slot2?:str|null,slot3?:str|null,slot4?:str|null};护甲?:str|null;饰品?:str[]}
背包:{货币?:{币种ID:{币种,名称,数量,价值度,描述?,图标?}};货币设置?:{禁用币种:[],基准币种?:str};物品:{物品ID:Item}}
状态?:{永久buff?:[],负面状态?:[]}
`.trim();

const HUB_STRUCTURE = `
[主神空间]
当前位置:{区域:str;子区域?:str}
已解锁区域:str[]
商店库存:[{id,name,category,price,stock,description}]
可选副本:[Mission]
常驻NPC:[{id,name,role,favor,备注?}]
服务状态?:{治疗冷却?:num;重置次数?:num;上次结算时间?:str}
`.trim();

const TEAM_STRUCTURE = `
[团队]
成员:[{id,name,role?,trust[0-100],status:"active"|"injured"|"dead"|"missing"|"betrayed",能力标签?:str[],个人贡献?:num}]
共享资源:[{id,name,quantity,description?}]
teamLevel:num
collaborationLogs?:[{id,missionId?,time,members[],action,result,trustDelta?:num,note?:str}]
teamEvents?:[{id,missionId?,memberId?,type:"cooperate"|"betray"|"death"|"rescue"|"conflict",description,weight?:num,time}]
`.trim();

const MISSION_HISTORY_STRUCTURE = `
[副本记录]
[{missionId,name?,difficulty,worldType,success,pointsGained,soulGrowth,rating,finishedAt,teamImpact?:{deathCount?:num,betrayCount?:num,cooperateBonus?:num},summary?:str}]
`.trim();

const CURRENT_MISSION_STRUCTURE = `
[当前副本]
null | {
  id,name,worldType,difficulty,description,status:"briefing"|"active"|"completed"|"failed",day:num,
  worldRules:{powerSystem,techLevel,socialOrder,specialRules[]},
  mainQuest:{id,title,description,objectives:[{id,description,completed:bool,progress?:num,target?:num,note?:str}],reward:{points,num?},isHidden?:bool,completed:bool},
  sideQuests:[{id,title,description,objectives:[{id,description,completed:bool,progress?:num,target?:num}],reward,isHidden,completed}],
  survivalCondition:str,
  rewards:{basePoints,bonusPoints,items:[],abilities:[],evaluationBonus},
  penalties:{death,failure},
  participants:[{id,name,role,status}],
  specialEvents:[{type,description,weight,timestamp}],
  临时状态:{
    位置?:{区域,子区域?,x?,y?,风险等级?},
    临时能力?:str[],
    临时物品?:{id:{...}},
    临时货币?:Record<string,number>,
    statusEffects?:[{名称,类型,来源,剩余回合,描述}],
    objectiveLog?:[{objectiveId,progress,target,updatedAt,note?}],
    副本关系?:{NPC名:{关系,好感?,立场?,状态?}}
  },
  地图?:{nodes?:[],edges?:[],fog?:[],legend?:[]}
}
`.trim();

const SOCIAL_STRUCTURE = `
[社交]
关系:{NPC名:{名字,身份,立场,与玩家关系,好感度,记忆[],当前位置?,实时关注?,扩展?}}
关系矩阵?:{version?:num,nodes?:str[],edges?:[{from,to,relation?,score?,tags?,updatedAt?}]}
事件:{配置:{启用随机事件,最小间隔年,最大间隔年,事件提示词},下次事件时间,事件记录[]}
记忆:{短期记忆?:[],中期记忆:[],长期记忆:[],隐式中期记忆?:[]}
`.trim();

const WORLD_STRUCTURE = `
[世界]
信息:{世界名称,大陆信息[],势力信息[],地点信息[],经济?,生成时间?,世界背景?,世界纪元?,特殊设定?,版本?}
状态?:{全局事件?:[],动态规则?:[]}
`.trim();

const SYSTEM_STRUCTURE = `
[系统]
配置?:{nsfwMode?:bool,nsfwGenderFilter?:"all"|"male"|"female",isTavernEnv?:bool}
设置?:{timeBasedSaveEnabled?:bool,timeBasedSaveInterval?:num,conversationAutoSaveEnabled?:bool}
缓存?:{掌握技能?:[]}
历史?:{叙事?:[{type,content,time,actionOptions[],metadata?}]}
联机:{模式:"单机"|"联机",房间ID?:str|null,玩家ID?:str|null,只读路径:str[],世界曝光?:bool,冲突策略?:str}
`.trim();

const ITEM_STRUCTURE = `
[Item]
物品ID:str;名称:str;类型:"装备"|"能力芯片"|"消耗品"|"材料"|"任务道具"|"其他";品质:{quality:str,grade:num};数量:num;描述:str
可选字段:已装备?:bool;可带入副本?:bool;来源?:"hub"|"mission";效果?:str|obj;标签?:str[]
`.trim();

export const SAVE_DATA_STRUCTURE = `
[主神空间无限流 SaveData 结构]
只允许以上顶层:
元数据 / 轮回者 / 主神空间 / 团队 / 副本记录 / 当前副本 / 社交 / 世界 / 系统

禁止写入:系统.扩展.无限流.*

${META_STRUCTURE}
${REINCARNATOR_STRUCTURE}
${HUB_STRUCTURE}
${TEAM_STRUCTURE}
${MISSION_HISTORY_STRUCTURE}
${CURRENT_MISSION_STRUCTURE}
${SOCIAL_STRUCTURE}
${WORLD_STRUCTURE}
${SYSTEM_STRUCTURE}
${ITEM_STRUCTURE}
`.trim();

export const DATA_STRUCTURE_EXAMPLES = `
[示例:标记目标进度]
{"action":"set","key":"当前副本.mainQuest.objectives[0].progress","value":2}
{"action":"set","key":"当前副本.mainQuest.objectives[0].completed","value":true}

[示例:队友背叛]
{"action":"set","key":"团队.成员.tm_2.status","value":"betrayed"}
{"action":"add","key":"团队.成员.tm_2.trust","value":-25}
{"action":"push","key":"当前副本.specialEvents","value":{"type":"betrayal","description":"队友临阵倒戈","weight":1.25,"timestamp":"2026-01-01T00:00:00.000Z"}}

[示例:结算归档]
{"action":"push","key":"副本记录","value":{"missionId":"m_001","success":true,"pointsGained":320,"soulGrowth":68,"rating":87,"finishedAt":"2026-01-01T00:00:00.000Z"}}
{"action":"set","key":"当前副本","value":null}
{"action":"set","key":"元数据.当前阶段","value":"hub"}
`.trim();

export function stripNsfwContent(input: string): string {
  return input
    .split('\n')
    .filter((line) => !/nsfw|私密信息|身体部位开发|法身|privacy/i.test(line))
    .join('\n')
    .trim();
}

export function getSaveDataStructureForEnv(isTavern: boolean): string {
  if (isTavern) return SAVE_DATA_STRUCTURE;
  return stripNsfwContent(SAVE_DATA_STRUCTURE);
}
