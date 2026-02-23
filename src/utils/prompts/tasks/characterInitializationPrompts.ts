/**
 * @fileoverview 角色初始化AI提示词
 *
 * 开局流程：世界生成 → 角色初始化（本文件）
 */

import type { World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';
import type { WorldInfo, WorldMapConfig, SystemConfig } from '@/types/game';
import { SAVE_DATA_STRUCTURE, stripNsfwContent } from '../definitions/dataDefinitions';
import { assembleSystemPrompt } from '../promptAssembler';
import { isTavernEnv } from '@/utils/tavern';

// =====================================================================
// 响应格式定义
// =====================================================================

const RESPONSE_FORMAT = `
## 输出格式（最高优先级）

**只输出一个 JSON 对象，不要任何解释性文字、思维链、标签！**

可以用 \`\`\`json 代码围栏包裹，也可以直接输出JSON。

### JSON结构示例：
 \`\`\`json
 {
   "text": "这里是600-1000字的开局叙事正文...",
   "mid_term_memory": "这里是50-100字的摘要",
   "tavern_commands": [
     {"action":"set","key":"元数据.时间","value":{"年":"<自定>","月":"<1-12>","日":"<1-30>","小时":8,"分钟":0}},
     {"action":"set","key":"角色.身份.出生日期","value":{"年":"<时间.年-玩家年龄>","月":"<同上>","日":"<同上>"}},
     {"action":"set","key":"角色.位置","value":{"描述":"<从可用地点选择>","x":"<0-10000>","y":"<0-10000>","风险指数":"<1-100>"}},
     {"action":"set","key":"角色.身体","value":{"身高":"<根据性别年龄>","体重":"<合理值>","体脂率":"<合理值>","三围":{"胸围":"<>","腰围":"<>","臀围":"<>"},"肤色":"<>","发色":"<>","瞳色":"<>","纹身与印记":[],"穿刺":[],"敏感点":[],"开发度":{},"其它":{}}},
     {"action":"set","key":"角色.属性.声望","value":"<根据出身0-100>"},
     {"action":"set","key":"角色.背包.货币.神点","value":{"数量":"<根据出身>","名称":"神点","价值度":1}}
   ],
   "action_options": ["<符合场景的选项1>","<选项2>","<选项3>","<选项4>","<选项5>"]
 }
\`\`\`

⚠️ **年龄计算公式（必须遵守）**：
- **公式**: 出生日期.年 = 元数据.时间.年 - 玩家年龄
- **示例**: 玩家18岁，时间1050年 → 出生日期 = 1050-18 = 1032年
- ❌ 漏设任一项会导致年龄显示为0岁或异常值！

⚠️ **身体数据必须根据角色实际情况生成**：
- 根据性别、年龄、种族合理设定身高/体重/三围等
- 男性与女性数值差异明显，儿童与成人不同
- ❌ 严禁照抄示例数值！

### 关键要求：
1. **text字段**:
   - 600-1000字的开局叙事
   - 只写故事正文，不要夹带任何游戏数据、JSON、变量名
   - 沉浸式无限流文风，不要出现"玩家"、"获得"等游戏术语

2. **mid_term_memory字段**:
   - 50-100字摘要
   - 必填，不能为空
   - 概括开局的核心信息

3. **tavern_commands字段**:
   - 必须是数组
   - 每个命令格式：{"action":"set","key":"路径","value":值}
   - 所有key必须以 \`元数据.\`/\`角色.\`/\`社交.\`/\`世界.\`/\`系统.\` 开头（V3短路径）
   - ⚠️ **酒馆端必须包含 \`角色.身体\` 命令**（见下方示例）

4. **action_options字段**:
   - 必须输出5个选项
   - 不能为空
   - 要符合当前场景

### 禁止事项：
- ❌ 不要输出 \`<thinking>\` 或任何思维链标签
- ❌ 不要输出解释性文字
- ❌ 不要在text中夹带游戏数据
`.trim();

// =====================================================================
// 初始化命令规则
// =====================================================================

const COMMANDS_RULES = `
## 初始化命令（tavern_commands）

### ⚠️ 必须执行的命令（缺一不可）：

1. **时间+出生日期（必须成对设置！）**
   - \`元数据.时间\`: {"年":1050,"月":3,"日":15,"小时":8,"分钟":0}
   - \`角色.身份.出生日期\`: {"年":1032,"月":3,"日":15}
   - **公式**: 出生日期.年 = 时间.年 - 玩家年龄
   - ❌ 漏设任一项会导致年龄显示为0岁或异常值！

2. **位置** - 设置 \`角色.位置\`
   - 必须在 tavern_commands 的前4条内出现
   - value **必须包含** \`{描述, x, y, 风险指数}\`（兼容可含灵气浓度）
   - \`描述\` 必须是"2-3层级"的地名，用 \`·\` 分隔，例如："雾城封锁区·外环据点·临时补给站"
   - \`风险指数\` 范围1-100（安全区20-40，战斗区50-70，极限区80+）
   - **优先从可用地点列表中选择**
   - **禁止** 使用占位文本："位置生成失败"/"无名之地"/"待生成"/"暂无"/"unknown"/"undefined"/"null"
   - 坐标范围: x:0-10000, y:0-10000

3. **⚠️ 玩家法身（酒馆端必须执行！）**
   - **检测条件**：若用户摘要中显示"运行环境: 酒馆端"，则**必须**执行
   - **命令**：\`{"action":"set","key":"角色.身体","value":{...}}\`
   - **必填字段**（根据角色性别/年龄/种族合理生成）：
     - 身高: number (cm) - 男性165-185，女性155-170，儿童按年龄
     - 体重: number (kg) - 与身高匹配
     - 体脂率: number (%) - 男性10-25，女性18-30
     - 三围: {胸围, 腰围, 臀围} (cm) - 根据性别体型
     - 肤色/发色/瞳色: string
     - 纹身与印记/穿刺: [] (空数组)
     - 敏感点: [] (空数组)
     - 开发度/其它: {} (空对象)
   - **nsfwMode=true时额外生成**：胸部描述/私处描述/生殖器描述
   - ❌ **严禁**：使用"待AI生成"/"暂无"/"空"等占位文本
   - ❌ **严禁**：照抄示例数值，必须根据实际角色生成

4. **声望** - 设置 \`角色.属性.声望\`
   - 普通出身: 0-10 | 阵营/组织出身: 10-50 | 核心背景出身: 50-100

5. **随机项** - 若潜能/出身为"随机"
   - 用 \`set\` 写入 \`角色.身份.灵根\`（兼容字段）或 \`角色.身份.出生\` 的具体内容

6. **资源** - 设置初始资源
   - \`角色.背包.货币.神点.数量\`（或直接 set \`角色.背包.货币\`）

7. **NPC** - 仅创建文本中明确提到的重要人物（0-3个）
   - 写入 \`社交.关系.{NPC中文名}\`
   - **必填字段**：出生(出身背景,如"散修"/"世家子弟",⚠️非年龄!)/出生日期({年,月,日})/先天六司/外貌描述(50字+)/性格特征(3个+)/天赋/记忆(2条+)/属性
   - ⚠️ **禁止生成"年龄"字段**，年龄由系统根据出生日期自动计算

8. **能力树** - 若天赋/能力影响分支
   - 写入 \`角色.大道.大道列表.{分支名}\`（兼容字段）

### 约束：
- 所有 key 必须以 \`元数据.\`/\`角色.\`/\`社交.\`/\`世界.\`/\`系统.\` 开头
- 每个命令格式：{"action":"set","key":"路径","value":值}
- 不要使用 add/push/delete 等其他操作，开局只用 set
`.trim();

// =====================================================================
// 叙事规则
// =====================================================================

const NARRATIVE_RULES = `
## 叙事要求与文风设定

### 文风基调
- **无限流生存风**: 语言保持克制、紧张、有画面感，突出规则压力与生存抉择。
- **沉浸式体验**: 侧重环境威胁、角色判断与代价，而非单纯罗列数据。
- **禁止游戏术语**: 文本中严禁出现"玩家"、"获得"、"装备了"、"等级提升"等出戏词汇。

### 无限流逻辑与难度
- **规则压迫感**: 必须体现主神规则与副本风险，避免“轻松白给”开局。
- **时间感知**: 体现阶段性时间推进（报到、整备、首次任务前夜等）。
- **评级严谨**: 新人默认 D 级一星，不允许开局直接越级到高评级。

### 角色塑造
- **年龄**: 严格从玩家选择的年龄开始，行为举止要符合该年龄段的认知（不要让几岁的孩童说话像老怪）。
- **一致性**: 出身决定了角色的眼界和起点，必须与玩家选择完全匹配。
`.trim();

// =====================================================================
// 资源范围参考
// =====================================================================

const RESOURCE_RANGES = `
## 初始资源控制（严格执行）

### 初始资金（按“神点”计）
- **贫困/流浪**: 0-10
- **凡人/普通**: 10-50
- **组织核心/精英背景**: 100-300
- **富裕/商贾**: 300-800

### 物品与装备
- **数量限制**: 1-5件，宁缺毋滥。
- **品质限制**: 初始物品以基础品质为主，严禁开局直接给予顶级传奇装备（除非出身明确且有剧情代价）。
- **能力模块**: 0-2个。大多数新人开局不应自带高阶能力。

### NPC与关系
- **数量**: 0-3个（必须是剧情中产生深刻羁绊的重要人物，路人甲不要生成关系）。
- **关系**: 初始好感度不宜过高（除非是血亲），体现人情冷暖。

### 评级判定
- **默认评级**: 绝大多数开局应为 D 级一星（评级进度0）。
- **特殊提升**: 仅当出身与天赋显著匹配时，才允许给出 D 级二星或 C 级一星。
`.trim();

// =====================================================================
// 导出的提示词常量（用于提示词管理UI显示）
// =====================================================================

export const CHARACTER_INITIALIZATION_PROMPT = `
# 角色初始化任务

${RESPONSE_FORMAT}

---

${COMMANDS_RULES}

---

${NARRATIVE_RULES}

---

${RESOURCE_RANGES}

---

# 数据结构
${SAVE_DATA_STRUCTURE}
`.trim();

export function getCharacterInitializationPromptForEnv(isTavern: boolean): string {
  if (isTavern) return CHARACTER_INITIALIZATION_PROMPT;
  return stripNsfwContent(CHARACTER_INITIALIZATION_PROMPT);
}

// =====================================================================
// 构建函数
// =====================================================================

interface ContextItem {
  name?: string;
  名称?: string;
  description?: string;
  描述?: string;
  type?: string;
  类型?: string;
}

/**
 * 构建玩家选择摘要
 */
export function buildCharacterSelectionsSummary(
  userSelections: {
    name: string;
    gender: string;
    race: string;
    age: number;
    world: World;
    talentTier: TalentTier;
    origin: Origin | string;
    spiritRoot: SpiritRoot | string;
    talents: Talent[];
    attributes: Record<string, number>;
    difficultyPrompt?: string; // 难度提示词
  },
  worldContext?: {
    worldInfo?: WorldInfo;
    availableContinents?: ContextItem[];
    availableLocations?: ContextItem[];
    mapConfig?: WorldMapConfig;
    systemSettings?: SystemConfig;
  }
): string {
  // 提取数据
  const { name, gender, race, age, world, talentTier, origin, spiritRoot, talents, attributes, difficultyPrompt } = userSelections;

  const originIsObj = typeof origin === 'object' && origin !== null;
  const spiritRootIsObj = typeof spiritRoot === 'object' && spiritRoot !== null;

  // 格式化天赋列表
  const talentsList = talents.length > 0
    ? talents.map(t => `- ${t.name}: ${t.description}`).join('\n')
    : '无';

  // 格式化属性
  const attrList = Object.entries(attributes).map(([k, v]) => `${k}:${v}`).join(', ');

  // 格式化地点
  const continents = worldContext?.availableContinents
    ?.map(c => `- ${c.name || c.名称}`)
    .join('\n') || '(未生成)';

  const locations = worldContext?.availableLocations
    ?.slice(0, 8)
    .map(l => `- ${l.name || l.名称} (${l.type || l.类型})`)
    .join('\n') || '(未生成)';

  return `
# 玩家角色数据

## 基础信息
姓名: ${name} | 性别: ${gender} | 种族: ${race} | 年龄: ${age}岁

## 世界
${world.name} (${world.era})
${world.description}

## 天资
${talentTier.name}: ${talentTier.description}

## 出身
${originIsObj ? (origin as Origin).name : origin}: ${originIsObj ? (origin as Origin).description : '(随机，需AI生成)'}

## 潜能
${spiritRootIsObj ? `${(spiritRoot as SpiritRoot).name} (${(spiritRoot as SpiritRoot).tier})` : spiritRoot}: ${spiritRootIsObj ? (spiritRoot as SpiritRoot).description : '(随机，需AI生成)'}

## 天赋
${talentsList}

## 基础六维（兼容字段）
${attrList}

---

## 可用地点
**大陆**:
${continents}

**地点**:
${locations}

⚠️ 位置必须从上述地点选择，坐标范围: x:0-10000, y:0-10000

---

## 难度设置
${difficultyPrompt || '【难度模式：普通】\n- 世界遵循主神副本规则，风险与收益并存'}

---

## 系统设置
${worldContext?.systemSettings?.isTavernEnv ? `- **运行环境**: 酒馆端 ✅

### ⚠️⚠️⚠️ 酒馆端必须执行以下命令 ⚠️⚠️⚠️
\`\`\`
{"action":"set","key":"角色.身体","value":{身高,体重,体脂率,三围:{胸围,腰围,臀围},肤色,发色,瞳色,纹身与印记:[],穿刺:[],敏感点:[],开发度:{},其它:{}}}
\`\`\`
- ⚠️ 必须根据角色性别/年龄/种族填写合理的具体数值
- ❌ 严禁使用"待AI生成"/"暂无"/"空"等占位文本
- ❌ 严禁照抄示例，每个角色数据都不同` : '- **运行环境**: 单机端（不需要生成法身数据）'}
${worldContext?.systemSettings?.nsfwMode ? `- **NSFW模式**: 已开启
- **私密信息生成范围**: ${worldContext?.systemSettings?.nsfwGenderFilter === 'all' ? '所有NPC' : worldContext?.systemSettings?.nsfwGenderFilter === 'female' ? '仅女性NPC' : '仅男性NPC'}
  ⚠️ 创建NPC时，若NPC性别符合上述范围，必须生成完整的"私密信息(PrivacyProfile)"字段
  ⚠️ 私密信息需补全：性经验等级/亲密节奏/亲密需求/安全偏好/避孕措施/生育状态/亲密偏好/禁忌清单/身体部位反应-偏好-禁忌
  ⚠️ 玩家法身：除基础体格外，还需生成敏感字段（胸部描述/私处描述/生殖器描述/敏感点/开发度）` : '- **NSFW模式**: 已关闭（不生成私密信息/敏感字段）'}

---

## 输出要求
严格遵循系统的JSON输出规则：
- 不要输出 \`<thinking>\` / 思维链 / 任何推理过程标签
- 正文写入 JSON 的 "text" 字段（不要再输出 "<narrative>" 等标签）
- 行动选项写入 JSON 的 "action_options" 字段（5个）
`.trim();
}

/**
 * 构建角色初始化系统提示词
 */
export async function buildCharacterInitializationPrompt(): Promise<string> {
  const basePrompt = await assembleSystemPrompt([]);

  const prompt = `${basePrompt}

---

# 当前任务：角色初始化

你现在需要执行角色初始化任务。用户将提供角色的基础信息（姓名、性别、年龄、天赋、潜能、出身等），你需要：
1. 根据用户选择生成1000-1500字的开局叙事
2. 通过tavern_commands设置初始数据（时间、位置、资源、NPC等）
3. 输出5个行动选项

**立即执行任务，输出JSON格式的角色初始化数据。**

---

${RESPONSE_FORMAT}

---

${COMMANDS_RULES}

---

${NARRATIVE_RULES}

---

${RESOURCE_RANGES}
`.trim();

  return isTavernEnv() ? prompt : stripNsfwContent(prompt);
}

/**
 * 地点名称生成提示词
 */
export const LOCATION_NAME_GENERATION_PROMPT = `
# 任务：生成层级地点名

输入: INPUT_PLACEHOLDER
输出: {"location_name": "区域·建筑·场所"}

要求:
1. 2-3层级，用"·"分隔
2. 体现世界特点
3. 只返回JSON
`.trim();

export const GAME_START_INITIALIZATION_PROMPT = '';
