# 两步生成系统设计文档

## 📋 概述

将原有的"一次性生成"改为"两步生成"，提升叙事质量和数据准确性。

### 核心思想

```
旧方案：AI同时生成 text + mid_term_memory + tavern_commands
问题：AI负担过重，格式错误率高，文本质量受数据约束影响

新方案：
步骤1 (叙事生成): AI专注生成高质量文本
步骤2 (数据转换): 程序化解析文本 + 生成精确的数据指令
```

## 🎯 架构设计

### 整体流程

```
用户输入
    ↓
【步骤1：叙事生成】
├─ 输入：用户指令 + 当前状态(简化) + 叙事提示词
├─ AI任务：生成沉浸式文本
├─ 输出：{ text: string, mid_term_memory: string }
└─ 不需要考虑数据格式
    ↓
【步骤2：数据转换】
├─ 输入：步骤1的文本 + 当前完整saveData + 数据结构规范
├─ AI任务：分析文本变化 + 生成严格符合规范的指令
├─ 输出：{ tavern_commands: TavernCommand[] }
└─ 100%符合数据结构定义
    ↓
【步骤3：前端应用】
└─ 批量执行tavern_commands，更新界面
```

### 目录结构

```
src/utils/
├── generators/
│   ├── gameMasterGenerators.ts      # 原有生成器（保留兼容）
│   └── twoStepGenerator.ts          # 新：两步生成核心逻辑
│
├── prompts/
│   ├── narrative/                   # 新：叙事专用提示词
│   │   ├── narrativeCore.ts        # 核心叙事规则
│   │   ├── narrativeStyle.ts       # 叙事风格指南
│   │   └── worldContext.ts         # 世界背景（从酒馆助手提取）
│   │
│   ├── dataConversion/              # 新：数据转换专用提示词
│   │   ├── conversionCore.ts       # 核心转换规则
│   │   ├── dataStructureRules.ts   # 从dataStructureDefinitions提取
│   │   └── operationRules.ts       # 从酒馆指令提示提取
│   │
│   ├── legacy/                      # 旧提示词（保留备份）
│   │   ├── 酒馆助手.txr
│   │   ├── 酒馆指令提示_优化.txr
│   │   └── 判定系统.txr
│   │
│   └── shared/
│       └── judgmentSystem.ts       # 判定系统（两步共用）
│
└── validators/
    └── dataStructureValidator.ts   # 数据结构验证器
```

## 📝 步骤1：叙事生成

### 提示词组成

```typescript
// 叙事生成提示词 = 核心身份 + 叙事风格 + 世界背景 + 判定系统
const narrativePrompt = `
${NARRATIVE_CORE}        // 你是谁，做什么
${NARRATIVE_STYLE}       // 如何叙事（格式、风格）
${WORLD_CONTEXT}         // 世界观设定
${JUDGMENT_SYSTEM}       // 判定规则（用于生成判定描述）

# 当前状态（简化版）
- 角色：${character.name}, ${character.realm}
- 位置：${character.location}
- 时间：${gameTime}
- 关键NPC：${keyNPCs}

# 用户指令
${userInput}

# 输出格式
\`\`\`json
{
  "text": "1500-3000字的沉浸式叙事，使用格式标记【】\`\`\"\"〖〗",
  "mid_term_memory": "100-200字第三人称客观总结"
}
\`\`\`

注意：
1. 专注于讲好故事，不需要考虑数据更新
2. 清楚描述发生的变化（时间、物品、状态、位置等）
3. 使用判定系统生成判定描述〖...〗
4. 文本中的变化会在下一步自动转换为数据指令
`;
```

### 核心文件内容

#### `prompts/narrative/narrativeCore.ts`

```typescript
export const NARRATIVE_CORE = `
# 核心身份与职责

**你是谁**：修仙世界《大道朝天》的叙事者 (Storyteller)

**职责**：
- 根据用户指令生成沉浸式的游戏叙事
- 清晰描述世界演化、角色行动、环境变化
- 通过文字构建修仙体验

**核心原则**：
- **沉浸感优先**：用生动的描写代替干巴巴的数据
- **变化可追踪**：文本中明确体现所有重要变化
- **主动性**：基于当前状态主动响应，不索要信息
`;
```

#### `prompts/narrative/narrativeStyle.ts`

```typescript
export const NARRATIVE_STYLE = `
# 叙事风格

## 格式标记
- 环境/氛围：【...】
- 心理/思考：\`...\`
- 对话："..."
- 判定结果：〖...〗

## 叙事要求
1. **字数**：1500-3000字
2. **视角**：第三人称，以玩家为中心
3. **节奏**：张弛有度，重要情节详写
4. **细节**：环境、动作、情绪、对话
5. **变化明示**：明确描述时间流逝、物品获得/消耗、状态改变

## 修仙世界特色
- **人物命名**：古韵叠字(楚清璃)、兵器借势(剑无尘)、天地意象(风袭月)
- **服饰**：云纱/冰蚕丝、月白/霜雪、广袖流仙
- **术语**：元炁/真元(非能量)、元神/真灵(非灵魂)、神通/术法(非魔法)
`;
```

#### `prompts/narrative/worldContext.ts`

```typescript
export const WORLD_CONTEXT = `
# 世界背景

## 朝天大陆
此方世界名为"朝天大陆"，天道完整、灵气充沛。核心法则："万灵竞渡，一步登天"。

## 仙凡之别
- 凡人：寿不过百载，生老病死
- 修士：吞吐灵气、淬炼己身，寿元千载，与天地同寿

## 修仙体系
境界：凡人 → 炼气 → 筑基 → 金丹 → 元婴 → 化神 → 炼虚 → 合体 → 渡劫
阶段：初期 / 中期 / 后期 / 圆满 / 极境

## 大道争锋
修士间为求道途精进，争斗乃是常态。杀人夺宝、斩草除根屡见不鲜。
天道有制衡：无故屠戮凡人，日后渡劫会引来更强天劫。
`;
```

## 📊 步骤2：数据转换

### 提示词组成

```typescript
// 数据转换提示词 = 核心任务 + 数据结构规范 + 操作规则 + 示例
const conversionPrompt = `
${CONVERSION_CORE}           // 核心任务说明
${DATA_STRUCTURE_RULES}      // 完整数据结构定义
${OPERATION_RULES}           // 操作类型和规则
${CONVERSION_EXAMPLES}       // 转换示例

# 当前存档（完整）
${JSON.stringify(saveData, null, 2)}

# 叙事文本
${narrativeText}

# 任务
分析叙事文本中的所有变化，生成精确的 tavern_commands。

# 输出格式
\`\`\`json
{
  "tavern_commands": [
    {"action": "add", "key": "游戏时间.分钟", "value": 4320},
    {"action": "set", "key": "境界.阶段", "value": "中期"}
  ]
}
\`\`\`

# 严格要求
1. 文本提到的每个变化都必须有对应指令
2. 必须100%符合数据结构规范
3. NPC境界只能是{名称, 阶段}
4. 寿命上限必须用add，不能用set
`;
```

### 核心文件内容

#### `prompts/dataConversion/conversionCore.ts`

```typescript
export const CONVERSION_CORE = `
# 数据转换任务

**你是谁**：数据结构专家

**任务**：
- 分析叙事文本中的所有变化
- 生成精确符合规范的 tavern_commands
- 确保数据结构100%正确

**核心原则**：
- **完整性**：文本提到的每个变化都必须有对应指令
- **准确性**：严格遵守数据结构定义，不添加、不遗漏字段
- **一致性**：操作类型(set/add/push/delete/pull)必须正确
`;
```

#### `prompts/dataConversion/dataStructureRules.ts`

```typescript
// 从 dataStructureDefinitions.ts 提取并精简
export const DATA_STRUCTURE_RULES = `
# 数据结构规范

## NPC境界结构（最高优先级）
NPC的境界对象只有2个字段：
\`\`\`json
{"名称": "金丹", "阶段": "中期"}
\`\`\`

严禁添加：当前进度、下一级所需、突破描述

## 私密信息结构（NSFW模式）
必须包含完整的14个字段...
[此处包含完整的字段列表]

## 完整数据结构树
[此处包含完整的结构树]

## 只读字段
装备栏.*、修炼功法.*、掌握技能.*、系统.*、先天六司.*

## 必须用add的字段
- 寿命.上限
- 气血/灵气/神识.上限
- 背包.灵石.*
- 好感度

## 必须同时更新的字段
- 位置：描述 + longitude + latitude
- 境界突破：境界对象 + 寿命上限 + 属性上限
`;
```

#### `prompts/dataConversion/operationRules.ts`

```typescript
// 从 酒馆指令提示_优化.txr 提取并精简
export const OPERATION_RULES = `
# 操作类型

| Action | 用途 | 示例 |
|--------|------|------|
| set | 替换 | 境界、物品、NPC |
| add | 增减 | 灵石±、时间+ |
| push | 数组添加 | 记忆、状态 |
| delete | 删除字段 | 物品(最后1个) |
| pull | 数组删除 | 任务(匹配对象) |

# 常见操作

## 时间推进
{"action": "add", "key": "游戏时间.分钟", "value": 1440}

## 境界突破
[
  {"action": "set", "key": "境界.名称", "value": "筑基"},
  {"action": "set", "key": "境界.阶段", "value": "初期"},
  {"action": "set", "key": "境界.当前进度", "value": 0},
  {"action": "add", "key": "属性.寿命.上限", "value": 130}
]

## 物品消耗
{"action": "add", "key": "背包_物品.pill_001.数量", "value": -1}

## 创建NPC
{"action": "set", "key": "人物关系.张三", "value": {完整NPC对象}}

## NPC互动
[
  {"action": "push", "key": "人物关系.张三.记忆", "value": {"时间": "...", "事件": "..."}},
  {"action": "add", "key": "人物关系.张三.好感度", "value": 5}
]
`;
```

#### `prompts/dataConversion/conversionExamples.ts`

```typescript
export const CONVERSION_EXAMPLES = `
# 转换示例

## 示例1：修炼3天
**文本**："你盘坐在洞府中，运转引气诀，三日不眠，境界进度略有提升。"

**分析**：
- 时间：3天 = 4320分钟
- 灵气消耗：假设消耗50点
- 境界进度：提升5点
- 功法进度：提升3点

**输出**：
\`\`\`json
{
  "tavern_commands": [
    {"action": "add", "key": "游戏时间.分钟", "value": 4320},
    {"action": "add", "key": "属性.灵气.当前", "value": -50},
    {"action": "add", "key": "境界.当前进度", "value": 5},
    {"action": "add", "key": "背包_物品.gongfa_001.修炼进度", "value": 3}
  ]
}
\`\`\`

## 示例2：NPC互动
**文本**："林清璃微笑着递给你一瓶回春丹，'师弟，这是我炼制的丹药，拿去吧。'你接过丹药，心中感激。"

**分析**：
- 时间：对话约30分钟
- 获得物品：回春丹
- NPC好感度：+5
- NPC记忆：送丹药事件

**输出**：
\`\`\`json
{
  "tavern_commands": [
    {"action": "add", "key": "游戏时间.分钟", "value": 30},
    {"action": "set", "key": "背包_物品.pill_huichun", "value": {
      "物品ID": "pill_huichun",
      "名称": "回春丹",
      "类型": "丹药",
      "品质": {"quality": "黄", "grade": 5},
      "数量": 1,
      "描述": "恢复气血的丹药"
    }},
    {"action": "add", "key": "人物关系.林清璃.好感度", "value": 5},
    {"action": "push", "key": "人物关系.林清璃.记忆", "value": {
      "时间": "仙历1年3月15日",
      "事件": "赠送回春丹给玩家"
    }}
  ]
}
\`\`\`

## 示例3：境界突破
**文本**："〖修炼判定:大成功,骰点:18,属性:26,加成:15,最终:59,难度:35〗你感到体内灵气暴涨，金丹破碎，元婴凝聚！你成功突破到元婴境界！"

**分析**：
- 境界：金丹圆满 → 元婴初期
- 进度：重置为0
- 寿命上限：+500年（用add）
- 气血/灵气/神识上限：大幅提升

**输出**：
\`\`\`json
{
  "tavern_commands": [
    {"action": "set", "key": "境界.名称", "value": "元婴"},
    {"action": "set", "key": "境界.阶段", "value": "初期"},
    {"action": "set", "key": "境界.当前进度", "value": 0},
    {"action": "set", "key": "境界.下一级所需", "value": 500},
    {"action": "add", "key": "属性.寿命.上限", "value": 500},
    {"action": "add", "key": "属性.气血.上限", "value": 42000},
    {"action": "add", "key": "属性.灵气.上限", "value": 60000},
    {"action": "add", "key": "属性.神识.上限", "value": 44000}
  ]
}
\`\`\`
`;
```

## 💻 实现代码

### `utils/generators/twoStepGenerator.ts`

```typescript
import { generateItemWithTavernAI } from '../tavernCore';
import type { GM_Response, TavernCommand } from '../../types/AIGameMaster';
import type { SaveData } from '../../types/game';

// 导入提示词模块
import { NARRATIVE_CORE, NARRATIVE_STYLE, WORLD_CONTEXT } from '../prompts/narrative';
import { CONVERSION_CORE, DATA_STRUCTURE_RULES, OPERATION_RULES, CONVERSION_EXAMPLES } from '../prompts/dataConversion';
import { JUDGMENT_SYSTEM } from '../prompts/shared/judgmentSystem';

interface NarrativeResponse {
  text: string;
  mid_term_memory: string;
}

interface ConversionResponse {
  tavern_commands: TavernCommand[];
}

/**
 * 两步生成：步骤1 - 生成叙事文本
 */
async function generateNarrative(
  userInput: string,
  saveData: SaveData
): Promise<NarrativeResponse> {
  console.log('[两步生成-步骤1] 开始生成叙事文本');

  // 提取简化的状态信息
  const simplifiedState = {
    角色: `${saveData.角色基础信息.名字}, ${saveData.境界?.名称}${saveData.境界?.阶段}`,
    位置: saveData.位置?.描述 || '未知',
    时间: `${saveData.游戏时间?.年}年${saveData.游戏时间?.月}月${saveData.游戏时间?.日}日`,
    关键NPC: Object.keys(saveData.人物关系 || {}).slice(0, 5).join('、')
  };

  const narrativePrompt = `
${NARRATIVE_CORE}
${NARRATIVE_STYLE}
${WORLD_CONTEXT}
${JUDGMENT_SYSTEM}

# 当前状态（简化版）
${JSON.stringify(simplifiedState, null, 2)}

# 用户指令
${userInput}

# 输出格式
\`\`\`json
{
  "text": "1500-3000字的沉浸式叙事，使用格式标记【】\`\`\\"\\"〖〗",
  "mid_term_memory": "100-200字第三人称客观总结"
}
\`\`\`

注意：
1. 专注于讲好故事，不需要考虑数据更新
2. 清楚描述发生的变化（时间、物品、状态、位置等）
3. 使用判定系统生成判定描述〖...〗
4. 文本中的变化会在下一步自动转换为数据指令
`.trim();

  const response = await generateItemWithTavernAI<NarrativeResponse>(
    narrativePrompt,
    '叙事生成',
    false,
    3,
    false
  );

  console.log('[两步生成-步骤1] 叙事文本生成完成，字数:', response.text.length);
  return response;
}

/**
 * 两步生成：步骤2 - 生成数据转换指令
 */
async function generateDataCommands(
  narrativeText: string,
  midTermMemory: string,
  saveData: SaveData
): Promise<ConversionResponse> {
  console.log('[两步生成-步骤2] 开始生成数据转换指令');

  const conversionPrompt = `
${CONVERSION_CORE}
${DATA_STRUCTURE_RULES}
${OPERATION_RULES}
${CONVERSION_EXAMPLES}

# 当前存档（完整）
${JSON.stringify(saveData, null, 2)}

# 叙事文本
${narrativeText}

# 中期记忆
${midTermMemory}

# 任务
分析叙事文本中的所有变化，生成精确的 tavern_commands。

# 输出格式
\`\`\`json
{
  "tavern_commands": [
    {"action": "add", "key": "游戏时间.分钟", "value": 4320}
  ]
}
\`\`\`

# 严格要求
1. 文本提到的每个变化都必须有对应指令
2. 必须100%符合数据结构规范
3. NPC境界只能是{名称, 阶段}
4. 寿命上限必须用add，不能用set
5. 位置更新必须同时更新描述+经纬度
`.trim();

  const response = await generateItemWithTavernAI<ConversionResponse>(
    conversionPrompt,
    '数据转换',
    false,
    3,
    false
  );

  console.log('[两步生成-步骤2] 数据指令生成完成，指令数:', response.tavern_commands.length);
  return response;
}

/**
 * 两步生成主函数
 */
export async function generateResponseTwoStep(
  userInput: string,
  saveData: SaveData
): Promise<GM_Response> {
  console.log('[两步生成] 开始执行两步生成流程');

  try {
    // 步骤1：生成叙事文本
    const narrative = await generateNarrative(userInput, saveData);

    // 步骤2：生成数据转换指令
    const commands = await generateDataCommands(
      narrative.text,
      narrative.mid_term_memory,
      saveData
    );

    // 合并结果
    const result: GM_Response = {
      text: narrative.text,
      mid_term_memory: narrative.mid_term_memory,
      tavern_commands: commands.tavern_commands
    };

    console.log('[两步生成] 流程执行完成');
    return result;

  } catch (error) {
    console.error('[两步生成] 流程执行失败:', error);
    throw error;
  }
}
```

## 🔄 迁移计划

### 阶段1：准备工作（第1天）
1. ✅ 创建新目录结构
2. ✅ 提取并重组提示词
3. ✅ 编写 twoStepGenerator.ts
4. ✅ 编写测试用例

### 阶段2：并行运行（第2-3天）
1. 添加配置开关：`enableTwoStepGeneration`
2. 在 MainGamePanel.vue 中添加选择逻辑
3. 收集两种模式的成功率数据
4. 对比质量差异

### 阶段3：全面切换（第4-5天）
1. 根据数据分析调整提示词
2. 逐步提高两步生成的使用比例
3. 完全切换到两步生成
4. 移除旧代码（可选）

## 📈 预期效果

### 优势
1. **叙事质量提升 30-50%** - AI专注讲故事
2. **数据准确性提升 60-80%** - 专门处理数据结构
3. **维护性提升** - 职责分离，易于调试
4. **灵活性提升** - 可独立优化每个步骤

### 代价
1. **延迟增加 40-60%** - 两次AI调用
2. **成本增加 30-40%** - token消耗增加
3. **复杂度增加** - 需要管理两个步骤

### 优化方向
1. 步骤1使用更快的模型（如GPT-3.5）
2. 步骤2缓存常见模式
3. 考虑规则引擎替代部分AI调用

## 🎯 未来扩展

### 三步生成
```
步骤1：生成叙事文本
步骤2：提取变更点（结构化数据）
步骤3：变更点转指令（规则引擎）
```

### 智能混合模式
```
简单操作：单步生成（快速）
复杂剧情：两步生成（质量）
关键选择：三步生成（精确）
```
