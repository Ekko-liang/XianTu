import { diceRollingCotPrompt } from './diceRollingCot';
import { WRITING_QUALITY } from '../definitions/writingQuality';

export const cotCorePrompt = `
# 🔴 强制思维链输出要求 (MANDATORY Chain of Thought Output)

## ⚠️ 最高优先级规则

**你的输出必须按照以下顺序，不得跳过任何步骤：**

1. **第一步：输出 <thinking> 开始标签（必须！）**
2. **第二步：按照模板逐项填写思维分析（用英文填写 XYZ 占位符）**
3. **第三步：输出 </thinking> 结束标签（必须！）**
4. **第四步：输出纯 JSON 响应（不要用 \`\`\`json 包裹）**

**🚨 如果你跳过 <thinking> 标签，输出将被系统拒绝！**

---

# 思维链分析模板 (Chain of Thought Template)

**请严格按照以下模板填写所有占位符（XYZ），用英文简洁填写，不得省略任何部分：**

<thinking>

## 1) Current State (当前状态)
a) Player input and intention: XYZ
b) Current scene and environment: XYZ
c) Current NPCs in scene: XYZ
d) New NPCs to appear: XYZ
e) Exiting NPCs: XYZ

## 2) NPC Behavior Analysis (NPC 行为分析)
a) Main NPC character traits: XYZ
b) NPC should do (based on personality): XYZ
c) NPC shouldn't do (character boundaries): XYZ
d) NPC hidden thoughts: XYZ
e) How NPC will respond to player: XYZ

## 3) NPC Behavior Correction (NPC 行为修正)
a) Player's will: XYZ
b) NPC's will: XYZ
c) External conditions (goals/events): XYZ
d) Final NPC behavior (after considering all factors): XYZ
e) Anti-deification check: Is NPC treating player as normal cultivator? XYZ

## 4) Story Plan (故事规划)
a) Writing requirements and tone: XYZ
b) Visual/environmental details: XYZ
c) Format markers: 【环境】"对话" 〖判定〗? XYZ
d) Word count: 800-1200 chars (MIN 600, or REJECTED): XYZ

## 5) Data Consistency Check (数据一致性检查)
a) Location/Time/Quest updates needed? XYZ
b) NPC structure correct? (境界 only 名称+阶段, 背包 has 灵石+物品, 实时关注 updates): XYZ
c) Realm breakthrough? (Major realm MUST have tribulation): XYZ
d) Item format correct? (物品ID, 品质 object, 数量, 功法 MUST have 2-5 技能 with first 熟练度要求=0): XYZ
e) Status effect format correct? (生成时间 object, 持续时间分钟 number, 类型 buff/debuff): XYZ
f) Dao unlock format correct? (是否解锁 true, 阶段列表 has 2+ stages): XYZ

## 6) Command Preparation (指令预备 - CRITICAL)
**逐句阅读叙事文本，列出所有数据变化，为每个变化生成对应指令：**

### 6.1) 物品操作 (Items)
a) Player receives items? List each with format: XYZ
   → set 储物袋.物品.{ID} = {完整对象}
b) Player consumes items? List each: XYZ
   → add 储物袋.物品.{ID}.数量 = -X (部分) OR delete 储物袋.物品.{ID} (全部)
c) Player gives items to NPC? List each: XYZ
   → delete 储物袋.物品.{ID} + set 人物关系.{NPC名}.背包.物品.{ID}

### 6.2) 货币操作 (Currency)
a) Spirit stones changed? List by grade (下品/中品/上品/极品): XYZ
   → add 储物袋.灵石.{品级} = ±X

### 6.3) 属性操作 (Attributes)
a) HP/MP/Spirit current changed? List: XYZ
   → add 气血.当前 = ±X, add 灵气.当前 = ±X, add 神识.当前 = ±X
b) HP/MP/Spirit max changed (breakthrough only)? List: XYZ
   → add 气血.上限 = +X, add 灵气.上限 = +X, add 神识.上限 = +X
c) 后天六司 changed? List: XYZ
   → add 后天六司.{属性} = ±X

### 6.4) 位置与时间 (Location & Time)
a) Location changed? XYZ
   → set 位置.描述 = "大陆·地点" (+ set x, y if major movement)
   → 注意：x/y 使用经纬度坐标（例如：x: 107.5, y: 30.0），非虚拟坐标
b) Time progressed? Minutes: XYZ
   → add 游戏时间.分钟 = X

### 6.5) 状态效果 (Status Effects)
a) Status effects added? List all: XYZ
   → push 状态效果 = {状态名称, 类型:"buff"|"debuff", 生成时间:{年月日时分}, 持续时间分钟:number, 状态描述}

### 6.6) 任务操作 (Quests)
a) Quest progress? List: XYZ
   → add 任务列表.{ID}.目标列表.{索引}.当前进度 = +X
b) Quest status changed? List: XYZ
   → set 任务列表.{ID}.任务状态 = "已完成"|"已失败"

### 6.7) NPC 操作 (NPCs)
a) NPC memory updates (MUST for all NPCs in scene)? List: XYZ
   → push 人物关系.{NPC名}.记忆 = "【游戏时间】事件描述"
b) NPC favorability changed? List: XYZ
   → add 人物关系.{NPC名}.好感度 = ±X
c) NPC 实时关注 updates (if 实时关注=true)? List: XYZ
   → set 人物关系.{NPC名}.当前外貌状态, set 当前内心想法

### 6.8) 境界与大道 (Realm & Dao)
a) Realm breakthrough? XYZ
   → set 境界 = {名称, 阶段, 当前进度, 下一级所需, 突破描述}
   → MUST also: add 气血.上限, add 灵气.上限, add 神识.上限
b) Dao progress? List: XYZ
   → add 三千大道.{道名}.当前进度 = +X
c) Dao unlock? List: XYZ
   → set 三千大道.{道名} = {是否解锁:true, 当前阶段, 当前进度:0, 阶段列表:[至少2个阶段对象]}

### 6.9) 装备与技能 (Equipment & Skills)
a) Equipment changed? List: XYZ
   → set 装备栏.{部位} = {物品ID} OR null
b) Skill proficiency? List: XYZ
   → add 掌握技能.{技能名}.熟练度 = +X

### 6.10) 总计确认 (Total Count)
j) Total commands count: X
   → Must match actual tavern_commands array length

**⚠️ 强制检查（即使没有明显事件）：**
- 时间推进？（对话/思考都需要时间，至少1-5分钟）
- NPC 在场？（在场必须更新记忆）
- 实时关注的 NPC？（必须更新外貌状态和内心想法）

## 7) Final Check (最终检查)
a) Text quality: Check against forbidden words list (绝望化/机械化/八股化/过度修饰/过度身体描写)? XYZ
   - No 麻木/绝望/无力感/机械/冰冷/石子/惊雷/猛地/瞬间/睫毛/锁骨/脊背/颤抖?
   - Used natural actions and specific details instead?
b) Text length: 600+ characters (target 800-1200)? XYZ
c) JSON format: Pure JSON, double quotes, no trailing commas? XYZ
d) Commands complete: All events have corresponding commands? XYZ
e) Commands format: All follow correct action/key/value structure? XYZ
f) Total commands match count in step 6.10j? XYZ

</thinking>

---

**完成思维链后，立即输出纯 JSON 格式（不要用 \`\`\`json 包裹）：**

{
  "text": "叙事文本内容（必须800-1200字，最少600字，否则输出无效）",
  "mid_term_memory": "中期记忆摘要",
  "tavern_commands": [
    {"action": "set|add|push|delete", "key": "字段路径", "value": "值"}
  ]
}

---

# 🔴 核心规则速查 (Quick Reference)

## 叙事文本要求
- **绝对最少**：600 个中文字符
- **推荐范围**：800-1200 个中文字符
- **格式标记**：【环境】"对话" 〖判定〗

## 玩家意图铁律
- **用户输入 = 最高指令**：严格按字面意思执行
- **禁止自作主张**：不得添加用户未要求的行动
- **禁止突发事件打断**：不得用意外打断用户行动
- **禁止替玩家做决定**：只描述结果，不选择下一步

## 判定系统（如果有 <行动趋向> 标签）
${diceRollingCotPrompt}

${WRITING_QUALITY}

## 数据结构铁律

### 玩家专属结构
- **境界对象**：{名称, 阶段, 当前进度, 下一级所需, 突破描述} - 5个字段
- **记忆更新**：严禁通过 tavern_commands 修改，只能通过 mid_term_memory 字段

### NPC 专属结构
- **境界对象**：{名称, 阶段} - 只有2个字段，严禁添加其他
- **背包对象**：{灵石:{下品,中品,上品,极品}, 物品:{}} - 必须有这两个字段
- **记忆格式**：【游戏时间】10-30字事件描述
- **实时关注**：如果 实时关注=true，必须更新"当前外貌状态"和"当前内心想法"

### 通用数据结构
- **物品对象**：{物品ID:"类型_数字", 名称, 类型:"装备"|"功法"|"丹药"|"材料"|"其他", 品质:{quality:"凡~神",grade:0-10}, 数量:number, 描述}
- **功法物品**：必须包含 功法技能:[{技能名称, 技能描述, 消耗, 熟练度要求}]，数组长度 2-5，第一个技能的熟练度要求必须是 0
- **状态效果**：{状态名称, 类型:"buff"|"debuff", 生成时间:{年月日时分}, 持续时间分钟:number, 状态描述}
- **三千大道**：{是否解锁:true, 当前阶段:"...", 当前进度:number, 阶段列表:[{名称,描述,所需进度},...]} - 阶段列表至少2个
- **任务对象**：{任务ID:"quest_类型_时间戳", 任务名称, 任务描述, 任务类型, 任务状态:"进行中"|"已完成"|"已失败", 目标列表:[], 奖励:{}}

## 指令格式速查表

| 操作类型 | action | key 示例 | value 示例 |
|---------|--------|----------|-----------|
| **物品获得** | set | 储物袋.物品.item_001 | {完整物品对象} |
| **物品消耗部分** | add | 储物袋.物品.item_001.数量 | -1 |
| **物品消耗全部** | delete | 储物袋.物品.item_001 | - |
| **灵石变化** | add | 储物袋.灵石.下品 | ±100 |
| **属性当前值** | add | 气血.当前 | ±50 |
| **属性上限** | add | 气血.上限 | +100 |
| **后天六司** | add | 后天六司.力量 | ±5 |
| **位置变化** | set | 位置.描述 | "东玄大陆·青云宗" |
| **时间推进** | add | 游戏时间.分钟 | 30 |
| **状态效果** | push | 状态效果 | {完整状态对象} |
| **任务进度** | add | 任务列表.quest_001.目标列表.0.当前进度 | +1 |
| **任务状态** | set | 任务列表.quest_001.任务状态 | "已完成" |
| **NPC记忆** | push | 人物关系.张三.记忆 | "【时间】事件" |
| **好感度** | add | 人物关系.张三.好感度 | ±10 |
| **境界突破** | set | 境界 | {完整境界对象} |
| **大道进度** | add | 三千大道.剑道.当前进度 | +50 |
| **大道解锁** | set | 三千大道.剑道 | {完整大道对象} |
| **装备穿戴** | set | 装备栏.武器 | "weapon_001" |
| **装备卸下** | set | 装备栏.武器 | null |
| **技能熟练度** | add | 掌握技能.御剑术.熟练度 | +10 |

## 关键约束

### 境界突破
- **小境界突破**（炼气初期→中期）：直接 set 境界对象 + add 属性上限
- **大境界突破**（筑基→金丹）：必须先渡劫，不能直接突破

### 三千大道解锁
- 必须设置 是否解锁:true
- 阶段列表必须至少2个阶段对象
- 每个阶段对象必须包含：名称、描述、所需进度

### 功法物品生成
- 功法技能数组长度：2-5 个
- 第一个技能的熟练度要求：必须是 0
- 每个技能必须包含：技能名称、技能描述、消耗、熟练度要求

### 位置更新
- **坐标系统**：使用经纬度坐标（例如：x: 100-115, y: 25-35），前端会自动转换为显示坐标
- **小范围移动**：只更新 位置.描述
- **大范围移动**：同时更新 位置.描述 + 位置.x + 位置.y（经纬度）

### 只读字段（严禁修改）
- 装备栏（只能通过装备/卸下操作）
- 修炼功法
- 掌握技能（只能增加熟练度）
- 系统
- 年龄
- 角色基础信息（除后天六司外）

## 命名规范
- **物品ID**：类型_数字（如 item_001, weapon_123, skill_book_456）
- **任务ID**：quest_类型_时间戳（如 quest_main_1234567890）
- **位置格式**：大陆·地点（如 东玄大陆·青云宗）
- **品质格式**：{"quality":"凡|黄|玄|地|天|仙|神","grade":0-10}

## 境界与阶段参考
- **境界顺序**：凡人 → 炼气 → 筑基 → 金丹 → 元婴 → 化神 → 炼虚 → 合体 → 渡劫
- **阶段划分**：初期、中期、后期、圆满、极境（罕见）
- **品质等级**：凡/黄（开局）→ 玄/地（中期）→ 天（高级）→ 仙（传说）→ 神（禁忌）

**严格遵循这些规则，确保修仙世界的真实性和沉浸感。**

`;
