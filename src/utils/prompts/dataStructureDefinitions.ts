/**
 * 数据结构定义（仅结构，不含操作说明）
 */

export const DATA_STRUCTURE_DEFINITIONS = `
# 数据结构定义

⚠️ **JSON格式严格要求（最重要）**：
- **禁止使用任何注释**：JSON 不支持 // 或 /* */ 注释，添加注释会导致解析失败！
- **禁止使用尾随逗号**：数组或对象最后一个元素后不能有逗号
- **字符串必须用双引号**：所有字符串必须使用 "双引号"，不能使用 '单引号'
- **严格遵守JSON语法**：确保所有括号、引号、逗号正确配对

⚠️ **地图坐标系统**：
- **X轴范围**：0 - 3600（左→右）
- **Y轴范围**：0 - 2400（上→下）
- **坐标原点**：(0, 0) 在左上角
- **位置更新**：移动位置时必须同时更新"描述"和"x"、"y"坐标

## 基础类型

### 品质 (ItemQuality)
{
  "quality": "凡"|"黄"|"玄"|"地"|"天"|"仙"|"神",
  "grade": 0-10
}

⚠️ **品质稀有度规则（必须遵守）**：
- **凡/黄**: 普通物品，随处可见（90%的物品）
- **玄**: 稀有物品，需要机缘获得（8%）
- **地**: 珍稀物品，门派镇派之宝级别（1.5%）
- **天**: 极其罕见，大陆级稀有（0.4%）
- **仙**: 传说级别，世间难寻（0.09%）
- **神**: 神话级别，万年难遇（0.01%）

**初始化阶段限制**：
- ⚠️ 开局物品/功法品质**不得超过"玄"品**
- 普通出身：最多"黄"品，以"凡"品为主
- 特殊出身：可以有1-2件"玄"品物品
- **严禁在开局给予"地"品及以上物品**

### 先天六司 (InnateAttributes)
{
  "根骨": 0-10,
  "灵性": 0-10,
  "悟性": 0-10,
  "气运": 0-10,
  "魅力": 0-10,
  "心性": 0-10
}
说明: 2=普通凡人, 10=通神, 0=废弃

## 核心数据结构 (基于 SaveData)

### 玩家角色状态 (PlayerStatus)
\`\`\`json
{
  "境界": {
    "名称": "凡人"|"练气"|"筑基"|"金丹"|"元婴"|"化神"|"炼虚"|"合体"|"渡劫",
    "阶段": "初期"|"中期"|"后期"|"圆满"|"极境",
    "当前进度": number,
    "下一级所需": number,
    "突破描述": string
  },
  "声望": number,
  "位置": {
    "描述": string,
    "x": number,
    "y": number
  },
  "气血": { "当前": number, "最大": number },
  "灵气": { "当前": number, "最大": number },
  "神识": { "当前": number, "最大": number },
  "寿命": { "当前": number, "最大": number },
  "状态效果": [
    {
      "状态名称": string,
      "类型": "buff"|"debuff",
      "生成时间": { "年": number, "月": number, "日": number, "小时": number, "分钟": number },
      "持续时间分钟": number,
      "状态描述": string,
      "强度": number,
      "来源": string
    }
  ],
  "宗门信息": {
    "sectName": string,
    "sectType": "正道宗门"|"魔道宗门"|"中立宗门"|"商会"|"世家"|"散修联盟",
    "position": "散修"|"外门弟子"|"内门弟子"|"核心弟子"|"传承弟子"|"执事"|"长老"|"太上长老"|"副掌门"|"掌门",
    "contribution": number,
    "relationship": "仇敌"|"敌对"|"冷淡"|"中立"|"友好"|"盟友"|"附庸",
    "reputation": number,
    "joinDate": string
  }
}
\`\`\`

### 背包 (Inventory)
\`\`\`json
{
  "灵石": { "下品": number, "中品": number, "上品": number, "极品": number },
  "物品": {
    "物品ID_1": { ...Item... },
    "物品ID_2": { ...Item... }
  }
}
\`\`\`

### 物品 (Item)
\`\`\`json
{
  "物品ID": string,
  "名称": string,
  "类型": "装备"|"功法"|"其他",
  "品质": { "quality": string, "grade": number },
  "数量": number,
  "描述": string,
  "已装备": boolean,
  "可叠加": boolean,

  // 装备特有 (EquipmentItem)
  "装备增幅": {
    "气血上限": number,
    "灵气上限": number,
    "神识上限": number,
    "后天六司": { "根骨": number, ... }
  },

  // 功法特有 (TechniqueItem)
  "功法效果": {
    "修炼速度加成": number,
    "属性加成": { "根骨": number, ... },
    "特殊能力": [string]
  },
  "功法技能": {
    "技能名_1": { "技能名称": string, "技能描述": string },
    ...
  },
  "修炼进度": number,
  "修炼中": boolean,

  // 其他物品 (ConsumableItem)
  "使用效果": string
}
\`\`\`

### 装备栏 (Equipment)
\`\`\`json
{
  "装备1": "物品ID_string" | null,
  "装备2": "物品ID_string" | null,
  "装备3": "物品ID_string" | null,
  "装备4": "物品ID_string" | null,
  "装备5": "物品ID_string" | null,
  "装备6": "物品ID_string" | null
}
\`\`\`

### 修炼功法 (CultivationTechniqueData)
\`\`\`json
{
  "功法": { "物品ID": string, "名称": string } | null,
  "熟练度": number,
  "已解锁技能": [string],
  "修炼时间": number,
  "突破次数": number,
  "正在修炼": boolean,
  "修炼进度": number
}
\`\`\`

### 掌握技能 (MasteredSkill)
\`\`\`json
[
  {
    "技能名称": string,
    "技能描述": string,
    "来源": string
  }
]
\`\`\`

### 角色基础信息 (CharacterBaseInfo)
\`\`\`json
{
  "名字": string,
  "性别": string,
  "年龄": number,
  "种族": string,
  "世界": string,
  "天资": string,
  "出生": { "名称": string, "描述": string },
  "灵根": { "名称": string, "品级": string, "描述": string },
  "天赋": [
    { "名称": string, "描述": string }
  ],
  "先天六司": {
    "根骨": number, "灵性": number, "悟性": number,
    "气运": number, "魅力": number, "心性": number
  }
}
\`\`\`

### 人物关系 (NpcProfile)
\`\`\`json
{
  "NPC名称_1": {
    "角色基础信息": { ...CharacterBaseInfo... },
    "外貌描述": string,
    "人物关系": string,
    "人物好感度": number,
    "人物记忆": [
      { "时间": string, "事件": string, "重要度": "普通"|"重要"|"关键" }
    ],
    "最后出现位置": { "描述": string },
    "背包": { ...Inventory... },
    "性格特征": [string],
    "知名技能": [string],
    "势力归属": string
  },
  "NPC名称_2": { ... }
}
\`\`\`

### 游戏时间 (GameTime)
\`\`\`json
{
  "年": number,
  "月": number,
  "日": number,
  "小时": number,
  "分钟": number
}
\`\`\`

### 三千大道系统 (ThousandDaoSystem)
\`\`\`json
{
  "已解锁大道": [string],
  "大道进度": {
    "剑道": {
      "当前等级": number,
      "当前经验": number,
      "下一级所需经验": number,
      "大道描述": string,
      "特殊能力": [string]
    }
  },
  "大道路径定义": {
    "剑道": [
      { "名称": "剑意入门", "描述": string, "突破经验": number },
      { "名称": "剑意小成", "描述": string, "突破经验": number }
    ]
  }
}
\`\`\`

### 世界信息 (WorldInfo)
\`\`\`json
{
  "世界名称": string,
  "世界背景": string,
  "世界纪元": string,
  "特殊设定": [string],
  "版本": string,
  "生成时间": string,
  "大陆信息": [
    {
      "名称": string,
      "描述": string,
      "范围": string,
      "特色": string
    }
  ],
  "势力信息": [
    {
      "名称": string,
      "类型": "修仙宗门"|"魔道宗门"|"中立宗门"|"修仙世家"|"魔道势力"|"商会组织"|"散修联盟",
      "等级": "超级"|"一流"|"二流"|"三流",
      "所在大洲": string,
      "位置": string,
      "势力范围": [string],
      "描述": string,
      "特色": string,
      "与玩家关系": "敌对"|"中立"|"友好"|"盟友",
      "leadership": {
        "宗主": string,
        "宗主修为": string,
        "副宗主": string,
        "太上长老": string,
        "太上长老修为": string,
        "长老数量": number,
        "最强修为": string,
        "综合战力": number,
        "核心弟子数": number,
        "内门弟子数": number,
        "外门弟子数": number
      }
    }
  ],
  "地点信息": [
    {
      "名称": string,
      "类型": "城池"|"宗门"|"秘境"|"险地"|"商会"|"坊市"|"洞府",
      "位置": string,
      "coordinates": { "longitude": number, "latitude": number },
      "描述": string,
      "特色": string,
      "安全等级": "安全"|"较安全"|"危险"|"极危险",
      "开放状态": "开放"|"限制"|"封闭"|"未发现",
      "相关势力": [string]
    }
  ]
}
\`\`\`

### 天赋 (Talent)
\`\`\`json
{
  "名称": string,
  "描述": string,
  "效果": string,
  "稀有度": "普通"|"稀有"|"史诗"|"传说"
}
\`\`\`

### 灵根 (SpiritRoot)
\`\`\`json
{
  "名称": string,
  "品级": "下品"|"中品"|"上品"|"极品"|"天品"|"神品",
  "描述": string,
  "属性": [string],
  "修炼加成": number
}
\`\`\`

### 出生背景 (Origin)
\`\`\`json
{
  "名称": string,
  "描述": string,
  "初始资源": {
    "灵石": { "下品": number, "中品": number, "上品": number, "极品": number },
    "物品": [string],
    "关系": [string]
  }
}
\`\`\`
`.trim();