export const characterInitializationCotPrompt = `
# 角色初始化思维链 (Character Initialization COT)

## ⚠️ 输出格式要求（最高优先级）

**你必须严格按照以下顺序输出：**

1. **第一步：输出 <thinking> 标签和思维链分析**
2. **第二步：输出 </thinking> 结束标签**
3. **第三步：输出 JSON 响应（用 \`\`\`json 包裹）**

**示例格式：**
\`\`\`
<thinking>
[思维链分析内容...]
</thinking>

\`\`\`json
{
  "text": "...",
  "mid_term_memory": "...",
  "tavern_commands": [...]
}
\`\`\`
\`\`\`

**禁止：**
- 在 thinking 标签内使用尖角括号
- 在 JSON 外添加任何解释文字
- 颠倒输出顺序

---

## 思维链分析步骤

<thinking>

### 1) Player Choices Analysis (玩家选择分析)
a) Talent tier: XYZ (影响资源和起点)
b) Origin: XYZ (需要替换随机项吗？)
c) Spirit root: XYZ (需要替换随机项吗？)
d) Special talents: XYZ (如何体现在开局？)
e) World background: XYZ (决定世界观风格)

### 2) Opening Scene Design (开局场景设计)
a) Scene location: XYZ (基于出身和世界观)
b) Scene atmosphere: XYZ (符合角色背景)
c) Initial realm: XYZ (凡人 or 炼气？)
   - Does text mention cultivation/techniques/spiritual energy? YES/NO
   - Does text mention sect disciple/cultivation family? YES/NO
   - If YES to any → 炼气初期/中期/后期 or 筑基初期
   - If NO to all → 凡人
d) Map coordinates: x=XYZ, y=XYZ (经纬度坐标，必须在地图坐标范围内，参考提供的坐标系统)
   - 使用经纬度坐标系统（例如：x: 107.5, y: 30.0）
   - 前端会自动转换为显示坐标
e) NPCs needed: XYZ (只创建文本中明确提到的NPC)
f) Story hook: XYZ (吸引玩家的开局钩子)

### 3) Initial Resources Planning (初始资源规划)
a) Spirit stones amount: XYZ
   - Poor origin: 0-50
   - Common origin: 20-100
   - Sect disciple: 50-300
   - Rich family: 100-500+
b) Initial items (1-6): List each with ID, name, type, quality, description
   - Item 1: XYZ
   - Item 2: XYZ
   - ...
c) Initial techniques (0-3): List each with skills (2-5, first skill 熟练度要求=0)
   - Technique 1: XYZ
   - ...

### 4) Random Item Replacement (随机项替换)
a) Spirit root replacement needed? XYZ
   - If yes: New name, cultivation bonus, theme (Five Elements/Special)
b) Origin replacement needed? XYZ
   - If yes: New backstory, location, family background

### 5) NPC Creation Check (NPC创建检查)
a) NPCs explicitly mentioned in text: List names
   - NPC 1: Name, gender, realm (名称+阶段 only), relationship, 实时关注=false
   - NPC 2: ...
b) NSFW check: nsfwMode=XYZ, nsfwGenderFilter=XYZ
   - Generate 私密信息 for NPCs? YES/NO for each

### 6) Command Preparation (指令准备)
**按顺序列出所有 tavern_commands：**

a) Time initialization: set 游戏时间 = {年月日时分}
b) Location: set 位置 = {描述, x, y}
   - x/y 使用经纬度坐标（参考用户消息中的"地图坐标系统"章节）
c) Reputation: set 声望 = {value}
d) Random replacements:
   - set 灵根 (if random)
   - set 出身 (if random)
e) Initial resources:
   - set 储物袋.灵石.{品级} for each grade
   - set 储物袋.物品.{ID} for each item
f) NPCs:
   - set 人物关系.{NPC名} for each NPC (complete structure)
g) Daos (if any):
   - set 三千大道.{道名} (是否解锁:true, 阶段列表 has 2+ stages)
h) Total commands count: X

### 7) Final Validation (最终验证)
a) Text length: 1200-2500 characters? XYZ
b) Text quality: No forbidden words (绝望/机械/八股/过度修饰)? XYZ
c) Realm consistency: Text matches realm setting? XYZ
d) Coordinates valid: x and y within map range (check 地图坐标系统 section)? XYZ
e) JSON format: 3 required fields (text, mid_term_memory, tavern_commands)? XYZ
f) mid_term_memory: 50-100 characters summary? XYZ
g) Commands order: Time → Location → Reputation → Random → Resources → NPCs → Daos? XYZ
h) NPC realm: Only 名称+阶段? XYZ
i) NPC 实时关注: All set to false? XYZ
j) Numeric types: All numbers not strings? XYZ
k) Total commands match count in step 6h? XYZ

</thinking>

---

## 关键规则速查

### 初始境界判定
- **有修炼内容**（功法/灵气/术法/宗门弟子）→ 炼气初期/中期/后期 或 筑基初期
- **完全无修炼内容** → 凡人

### 初始资源范围
- **灵石**：贫穷 0-50，普通 20-100，宗门 50-300，富裕 100-500+
- **物品**：1-6 件（基于故事逻辑）
- **功法**：0-3 部（基于出身和故事）

### NPC 创建原则
- **只创建文本中明确提到的 NPC**（有名字、对话、互动）
- **NPC 境界对象**：只有 {名称, 阶段} 两个字段
- **实时关注**：初始化时全部设为 false
- **NSFW**：检查 nsfwMode 和 nsfwGenderFilter，符合条件才生成私密信息

### 随机项替换
- **随机灵根**：根据天资等级确定品质，根据世界观确定主题（五行/特殊）
- **随机出身**：根据世界观类型（仙侠/都市/玄幻）和天资等级设计背景故事

### 指令顺序
1. 时间初始化
2. 位置设置
3. 声望设置
4. 随机项替换（灵根/出身）
5. 初始资源（灵石/物品）
6. NPC 创建
7. 大道解锁（如有）

### 数据结构要点
- **功法技能**：数组长度 2-5，第一个技能熟练度要求=0
- **三千大道**：是否解锁=true，阶段列表至少2个阶段对象
- **物品对象**：{物品ID:"类型_数字", 名称, 类型, 品质:{quality,grade}, 数量, 描述}
- **NPC背包**：{灵石:{下品,中品,上品,极品}, 物品:{}}

### JSON 输出要求
- **必须包含 3 个字段**：text, mid_term_memory, tavern_commands
- **text**：1200-2500 个中文字符
- **mid_term_memory**：50-100 字符摘要
- **tavern_commands**：数组，包含所有初始化指令
- **格式**：用 \`\`\`json 包裹，纯 JSON，双引号，无尾随逗号

**严格遵循这些规则，确保角色初始化的完整性和一致性。**
`.trim();
