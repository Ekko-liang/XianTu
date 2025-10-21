/**
 * AIBidirectionalSystem (重构整合版)
 *
 * 核心功能：
 * 1. 接收用户输入
 * 2. 构建Prompt，调用AI生成响应
 * 3. 解析AI响应，执行AI返回的指令 (逻辑已从AIGameMaster.ts迁移至此)
 * 4. 返回结果
 */

// 🔥 [新架构] 移除对 AIGameMaster 的依赖，整合其核心功能
import { set, get, unset, cloneDeep } from 'lodash';
import { getTavernHelper } from '@/utils/tavern';
import type { TavernHelper } from '@/types';
import { toast } from './toast';
import { useGameStateStore } from '@/stores/gameStateStore';
import type { GM_Response } from '@/types/AIGameMaster';
import type { CharacterProfile, StateChangeLog, SaveData, GameTime } from '@/types/game';
import { applyEquipmentBonus, removeEquipmentBonus } from './equipmentBonusApplier';
import { updateMasteredSkills } from './masteredSkillsCalculator';

type PlainObject = Record<string, unknown>;

export interface ProcessOptions {
  onStreamChunk?: (chunk: string) => void;
  onProgressUpdate?: (progress: string) => void;
  onStateChange?: (newState: PlainObject) => void;
  useStreaming?: boolean;
}

class AIBidirectionalSystemClass {
  private static instance: AIBidirectionalSystemClass | null = null;
  private stateHistory: StateChangeLog[] = [];

  private constructor() {}

  public static getInstance(): AIBidirectionalSystemClass {
    if (!this.instance) this.instance = new AIBidirectionalSystemClass();
    return this.instance;
  }

  /**
   * 处理玩家行动 - 简化版流程
   * 1. 调用AI生成响应
   * 2. 执行指令
   * 3. 返回结果
   */
  public async processPlayerAction(
    userMessage: string,
    character: CharacterProfile,
    gameState: PlainObject,
    options?: ProcessOptions
  ): Promise<{
    finalContent: string;
    gmResponse?: GM_Response | null;
    stateChanges?: StateChangeLog | null;
  }> {
    // 1. 获取酒馆助手
    let tavernHelper: TavernHelper | null = null;
    try {
      tavernHelper = getTavernHelper();
    } catch {
      const fallback = '当下灵机未至（未连接酒馆环境），请稍后再试。';
      options?.onStreamChunk?.(fallback);
      return { finalContent: fallback };
    }

    // 2. 🔥 [新架构] 从 gameStateStore 获取当前存档数据
    options?.onProgressUpdate?.('从存档获取游戏状态…');
    const gameStateStore = useGameStateStore();
    const saveData = gameStateStore.getCurrentSaveData();

    if (!saveData) {
      throw new Error('无法获取存档数据，请确保角色已加载');
    }

    // 3. 🔥 [新架构] 直接构建 prompt 并调用 AI
    options?.onProgressUpdate?.('构建提示词并请求AI生成…');
    let gmResponse: GM_Response;

    try {
      // 1. 准备完整的游戏状态作为上下文，并移除短期记忆
      const stateForAI = cloneDeep(saveData);
      if (stateForAI.记忆) {
        // 移除短期记忆，因为它会通过另一种方式（最近发生的事件）提供
        if (stateForAI.记忆.短期记忆) {
          delete stateForAI.记忆.短期记忆;
        }
        // 移除隐式中期记忆，因为它仅供系统内部使用，不应干扰AI判断
        if (stateForAI.记忆.隐式中期记忆) {
          delete stateForAI.记忆.隐式中期记忆;
        }
      }
      // 🔥 优化：移除JSON格式化中的空格和换行，以节省大量Token
      const stateJsonString = JSON.stringify(stateForAI);

      // 🔥 [重构] 将数据结构和规则定义为独立的常量，避免模板字符串语法问题
      const DATA_STRUCTURE_AND_RULES = `
# 数据结构定义 (游戏循环简化版)

## 1. 玩家角色状态 (玩家角色状态)
{
  "姓名": "string",
  "年龄": "number",
  "寿命": "number",
  "境界": { "名称": "string", "阶段": "string" },
  "位置": { "描述": "string", "longitude": "number", "latitude": "number" },
  "状态效果": "object",
  "掌握的技能": "object"
}

## 2. 背包 (背包)
{
  "灵石": "object",
  "物品": {
    "[itemId]": {
      "名称": "string",
      "类型": "string",
      "数量": "number",
      "描述": "string",
      "装备状态": "string"
    }
  }
}

## 3. 装备栏 (装备栏)
{
  "武器": "item_id | null",
  "头部": "item_id | null"
}

## 4. 人物关系 (人物关系)
{
  "[npcName]": {
    "名字": "string",
    "性别": "string",
    "境界": { "名称": "string", "阶段": "string" },
    "与玩家关系": "string",
    "好感度": "number",
    "当前位置": "string",
    "记忆": ["string"],
    "私密信息"?: "object"
  }
}

## 5. 游戏时间 (游戏时间)
{ "年": "number", "月": "number", "日": "number", "时": "number", "分": "number" }

## 6. 任务系统 (任务系统)
{
  "当前任务列表": [
    {
      "任务ID": "string",
      "任务名称": "string",
      "任务目标": [ { "描述": "string", "当前进度": "number", "需求数量": "number" } ],
      "任务状态": "string"
    }
  ]
}

## 7. 三千大道 (三千大道)
{
  "大道列表": {
    "[daoName]": {
      "道名": "string",
      "描述": "string",
      "阶段列表": [{"名称":"string","描述":"string","突破经验":"number"}],
      "是否解锁": "boolean",
      "当前阶段": "number",
      "当前经验": "number",
      "总经验": "number"
    }
  }
}

---
# 新增对象完整结构 (创建新数据时必须参考)

## 新增大道 (set命令)
当AI需要让玩家领悟新大道时，必须提供完整结构：
\`\`\`json
{
  "action": "set",
  "key": "三千大道.大道列表.剑道",
  "value": {
    "道名": "剑道",
    "描述": "以剑入道，一剑破万法",
    "阶段列表": [
      {"名称":"剑意入门","描述":"初步领悟剑意","突破经验":1000},
      {"名称":"剑心通明","描述":"剑心与天地共鸣","突破经验":5000},
      {"名称":"剑道大成","描述":"剑道圆满，可开宗立派","突破经验":20000}
    ],
    "是否解锁": true,
    "当前阶段": 0,
    "当前经验": 0,
    "总经验": 0
  }
}
\`\`\`

## 新增NPC (set命令)
当AI需要创建新NPC时，必须提供完整结构（简化版）：
\`\`\`json
{
  "action": "set",
  "key": "人物关系.李青莲",
  "value": {
    "名字": "李青莲",
    "性别": "女",
    "出生日期": {"年":1000,"月":3,"日":15},
    "出生": "青云宗内门弟子",
    "外貌描述": "清丽脱俗，气质如兰",
    "性格特征": ["温柔","善良","聪慧"],
    "境界": {"名称":"筑基","阶段":"后期","当前进度":0,"下一级所需":10000,"突破描述":""},
    "灵根": {"名称":"木灵根","品级":"上品","描述":""},
    "天赋": [],
    "先天六司": {"根骨":7,"灵性":8,"悟性":8,"气运":6,"魅力":9,"心性":7},
    "与玩家关系": "师姐",
    "好感度": 60,
    "当前位置": {"描述":"青云宗·藏经阁"},
    "势力归属": "青云宗",
    "人格底线": ["背叛师门","伤害无辜","践踏正义"],
    "记忆": [],
    "当前外貌状态": "衣着整洁，神态自然",
    "当前内心想法": "正在思考突破之法",
    "背包": {
      "灵石": {"下品":100,"中品":10,"上品":1,"极品":0},
      "物品": {}
    },
    "实时关注": false
  }
}
\`\`\`
**注意**: 境界必须符合世界背景的灵气等级限制！

## 新增物品 (set命令)
当AI需要创建新物品时，必须提供完整结构：
\`\`\`json
{
  "action": "set",
  "key": "背包.物品.item_sword_001",
  "value": {
    "物品ID": "item_sword_001",
    "名称": "青锋剑",
    "类型": "装备",
    "品质": {"quality":"玄","grade":5},
    "数量": 1,
    "描述": "一把上好的法剑，剑身泛着青光",
    "已装备": false,
    "装备增幅": {
      "气血上限": 100,
      "后天六司": {"根骨":2}
    }
  }
}
\`\`\`
**品质规则**: quality必须是"凡/黄/玄/地/天/仙/神"之一，grade必须是0-10的整数。

## 新增任务 (push命令)
当AI需要创建新任务时，必须提供完整结构：
\`\`\`json
{
  "action": "push",
  "key": "任务系统.当前任务列表",
  "value": {
    "任务ID": "quest_001",
    "任务名称": "清除黑风狼",
    "任务描述": "附近的黑风狼威胁到了村民安全",
    "任务类型": "支线",
    "任务状态": "进行中",
    "目标列表": [
      {
        "描述": "击杀黑风狼",
        "类型": "击杀",
        "目标ID": "monster_黑风狼",
        "需求数量": 3,
        "当前进度": 0,
        "已完成": false
      }
    ],
    "奖励": {
      "修为": 500,
      "灵石": {"下品":50},
      "物品": [{"物品ID":"item_001","名称":"聚气丹","数量":2}]
    },
    "创建时间": {"年":1001,"月":5,"日":10,"小时":12,"分钟":0},
    "发布者": "村长",
    "AI生成": true
  }
}
\`\`\`

---
# 核心规则

## 数据同步铁律(最高优先级)
text字段中描述的数据变化，必须在tavern_commands字段中完全对应实现。

## 时间推进铁律
**核心法则**: 每次响应必须推进游戏时间。
**时间命令格式**: \`{"action":"add","key":"游戏时间.分钟","value":推进的分钟数}\`
**参考**: 简短对话(1-5分钟), 战斗(5-30分钟), 修炼(30分钟+), 赶路(数小时+)。

---
# tavern_commands生成规则(最高优先级)

## 核心原则
**铁律**: text字段中描述的数据变化，必须在tavern_commands字段中完全对应实现。
**格式**: \`{"action":"操作类型","key":"完整路径","value":值}\`
**操作类型**: set(替换/设置), add(数值增减), push(数组添加), delete(删除字段)

## 强制检查清单
- **时间推进**: 必须有时间推进命令。
- **获得/消耗物品**: 必须更新背包。
- **NPC互动**: 必须push记忆、更新好感度、当前内心想法。
- **任务进度**: 必须更新任务目标的当前进度。
- **关注的NPC**: 必须更新其当前记忆、当前内心想法。

## 常用命令示例

### 示例1: 纯对话场景
**叙事**: 你向李青莲询问了关于宗门大比的事情，她耐心地为你解答，并提醒你注意休息。
**对应指令**:
\`\`\`json
"tavern_commands": [
  { "action": "add", "key": "游戏时间.分钟", "value": 5 },
  { "action": "add", "key": "人物关系.李青莲.好感度", "value": 2 },
  { "action": "push", "key": "人物关系.李青莲.记忆", "value": "与主角交谈，解答了关于宗门大比的疑问。" }
]
\`\`\`

### 示例2: 推进任务
**叙事**: 你在森林中击杀了一只黑风狼。
**对应指令**:
\`\`\`json
"tavern_commands": [
  { "action": "add", "key": "游戏时间.分钟", "value": 15 },
  { "action": "add", "key": "任务系统.当前任务列表.0.任务目标.0.当前进度", "value": 1 },
  { "action": "add", "key": "玩家角色状态.后天属性.气血当前值", "value": -5 }
]
\`\`\`

### 示例3: 获得物品
**叙事**: 你在黑风狼的尸体上找到了一株百年灵草。
**对应指令**:
\`\`\`json
"tavern_commands": [
  { "action": "add", "key": "游戏时间.分钟", "value": 3 },
  { "action": "set", "key": "背包.物品.lingcao_001", "value": {
    "物品ID": "lingcao_001",
    "名称": "百年灵草",
    "类型": "材料",
    "品质": { "quality": "玄", "grade": 5 },
    "数量": 1,
    "描述": "一株生长百年的灵草，蕴含着精纯的灵气。",
    "装备状态": "未装备"
  }}
]
\`\`\`
---
# 世界法则与叙事风格

- **力量体系**: 境界压制是铁律，低境界无法战胜高境界。
- **死亡系统**: 这是一个高难度游戏，鲁莽和越阶挑战必然导致受伤或死亡。
- **叙事风格**: 保持修仙世界观，避免使用"玩家"、"NPC"、"游戏"等元词汇。使用"你"或角色姓名来称呼主角。
- **玩家权限**: 玩家只能描述自己的行动和意图，不能决定事件结果或NPC反应。

---
# 输出格式
\`\`\`json
{
  "text": "叙事文本...",
  "mid_term_memory": "本回合核心事件总结...",
  "tavern_commands": [{"action":"...","key":"...","value":"..."},...]
}
\`\`\`
`;

      const systemPrompt = `
# 游戏状态
你正在修仙世界《大道朝天》中扮演GM。以下是当前完整游戏存档(JSON格式):
${stateJsonString}
---
${DATA_STRUCTURE_AND_RULES}
`.trim();

      // 2. 准备用户输入 (已移除短期记忆注入)
      const userActionForAI = (userMessage && userMessage.toString().trim()) || '继续当前活动';

      console.log('[AI请求] 系统提示词长度:', systemPrompt.length);
      console.log('[AI请求] 用户输入长度:', userActionForAI.length);

      // 🔥 架构优化：切换到标准的 generate 方法，并使用 injects 注入动态系统提示
      const response = await tavernHelper!.generate({
        user_input: userActionForAI,
        should_stream: options?.useStreaming || false,
        injects: [
          {
            // 将完整的游戏存档作为高优先级的系统提示注入
            content: systemPrompt,
            role: 'system',
            // 确保它在上下文中处于一个较高的位置
            depth: 1,
            // 🔥 修复：使用 'before' 将其置于主系统提示之前
            position: 'before',
          }
        ],
        // 让酒馆正常使用世界书等功能
        // use_world_info: true, // generate 方法不直接接受此参数，但默认会使用
      });

      gmResponse = this.parseAIResponse(response);

      if (!gmResponse || !gmResponse.text) {
        throw new Error('AI生成器返回了无效的响应');
      }

    } catch (err) {
      console.error('[AI双向系统] AI生成失败:', err);
      toast.error('天机推演失败，请稍后重试。');
      throw (err instanceof Error ? err : new Error(String(err)));
    }

    // 4. 🔥 [新架构] 执行AI指令（如果有）
    let stateChanges: StateChangeLog | null = null;
    if (gmResponse.tavern_commands && gmResponse.tavern_commands.length > 0) {
      options?.onProgressUpdate?.('执行AI指令并更新游戏状态…');

      try {
        // 🔥 [新架构] processGmResponse 现在是本类的公共方法
        const processResult = await this.processGmResponse(gmResponse);
        const updatedSaveData = processResult.saveData;
        stateChanges = processResult.stateChanges;

        await gameStateStore.saveAfterConversation();
        console.log('[AI双向系统] ✅ 已将命令执行后的SaveData更新到Store并持久化（含上次对话备份）');

        if (options?.onStateChange && stateChanges.changes.length > 0) {
          options.onStateChange(updatedSaveData as unknown as PlainObject);
        }

      } catch (error) {
        console.error('[AI双向系统] 执行AI指令失败:', error);
        toast.warning(`部分指令执行失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 5. 返回结果
    const finalText = gmResponse.text;
    options?.onStreamChunk?.(finalText);

    if (stateChanges) {
      this.stateHistory.push(stateChanges);
      if (this.stateHistory.length > 50) {
        this.stateHistory = this.stateHistory.slice(-30);
      }
    }

    return {
      finalContent: finalText,
      gmResponse: gmResponse,
      stateChanges: stateChanges
    };
  }

  /**
   * 🔥 [新架构] 专用于角色初始化的AI消息生成
   * 封装了底层的 tavernHelper 调用，使 characterInitialization 服务解耦
   */
  public async generateInitialMessage(
    systemPrompt: string,
    userPrompt: string
  ): Promise<GM_Response> {
    const tavernHelper = getTavernHelper();
    if (!tavernHelper) {
      throw new Error('酒馆助手未初始化');
    }

    console.log('[AI系统:初始生成] 系统提示词长度:', systemPrompt.length);
    console.log('[AI系统:初始生成] 用户提示词长度:', userPrompt.length);

    const response = await tavernHelper.generateRaw({
      ordered_prompts: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      should_stream: false,
      use_world_info: false
    });

    const parsedResponse = this.parseAIResponse(response);

    if (!parsedResponse || !parsedResponse.text) {
      console.error('[AI系统:初始生成] AI返回了无效响应:', parsedResponse);
      throw new Error('AI生成器返回了无效的响应');
    }

    return parsedResponse;
  }

  /**
   * 🔥 [新架构] 解析AI响应
   */
  private parseAIResponse(response: unknown): GM_Response {
    const tryParse = (text: string): any | null => {
      try { return JSON.parse(text); } catch (e) { return null; }
    };

    const standardize = (obj: any): GM_Response => {
      if (!obj || typeof obj !== 'object') return { text: '', tavern_commands: [] };
      const text = typeof obj.text === 'string' ? obj.text : '';
      const mid_term_memory = typeof obj.mid_term_memory === 'string' ? obj.mid_term_memory : undefined;
      const tavern_commands = Array.isArray(obj.tavern_commands)
        ? obj.tavern_commands.filter((c: any) => c && typeof c.action === 'string' && typeof c.key === 'string')
        : [];
      return { text, mid_term_memory, tavern_commands };
    };

    if (typeof response === 'string') {
      const rawText = response.trim();
      let parsedObj: any = null;
      parsedObj = tryParse(rawText);
      if (parsedObj) return standardize(parsedObj);
      const codeBlockMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (codeBlockMatch && codeBlockMatch[1]) {
        parsedObj = tryParse(codeBlockMatch[1].trim());
        if (parsedObj) return standardize(parsedObj);
      }
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        const jsonCandidate = rawText.substring(firstBrace, lastBrace + 1);
        parsedObj = tryParse(jsonCandidate);
        if (parsedObj) {
          const standardizedObj = standardize(parsedObj);
          if (!standardizedObj.text) {
            standardizedObj.text = rawText.substring(0, firstBrace).trim();
          }
          return standardizedObj;
        }
      }
      return { text: rawText, tavern_commands: [] };
    }

    if (response && typeof response === 'object') {
      const obj = response as Record<string, any>;
      if (typeof obj.text === 'string' && (!obj.tavern_commands || obj.tavern_commands.length === 0)) {
        const nestedResponse = this.parseAIResponse(obj.text);
        if (nestedResponse.tavern_commands && nestedResponse.tavern_commands.length > 0) return nestedResponse;
      }
      return standardize(obj);
    }
    return { text: '', tavern_commands: [] };
  }

  /** @deprecated */
  private async captureCurrentState(): Promise<PlainObject> {
    console.warn('[AI双向系统] captureCurrentState 已废弃');
    return {};
  }
  /** @deprecated */
  private buildGameStateData(): PlainObject {
    console.warn('[AI双向系统] buildGameStateData 已废弃');
    return {};
  }
  /** @deprecated */
  private generateStateChangeLogFromCommands(): StateChangeLog {
    console.warn('[AI双向系统] generateStateChangeLogFromCommands 已废弃');
    return { changes: [] };
  }
  /** @deprecated */
  private getNestedValue(): unknown {
    console.warn('[AI双向系统] getNestedValue 已废弃');
    return undefined;
  }

  // =================================================================
  // 以下函数从 AIGameMaster.ts 迁移而来，作为内部实现，以消除对旧文件的依赖
  // =================================================================

  private _getMinutes(gameTime: GameTime): number {
    return gameTime.分钟 ?? 0;
  }

  private _formatGameTime(gameTime: GameTime | undefined): string {
    if (!gameTime) return '【仙历元年】';
    const minutes = this._getMinutes(gameTime);
    return `【仙道${gameTime.年}年${gameTime.月}月${gameTime.日}日 ${String(gameTime.小时).padStart(2, '0')}:${String(minutes).padStart(2, '0')}】`;
  }

  public async processGmResponse(
    response: GM_Response,
    currentSaveData?: SaveData,
    isInitialization: boolean = false
  ): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
    const emptyChanges: StateChangeLog = { changes: [] };
    if (!currentSaveData) {
      const gameStateStore = useGameStateStore();
      currentSaveData = gameStateStore.toSaveData() || undefined;
    }
    if (!currentSaveData) {
      console.error('[AI双向系统:_processGmResponse] 无法获取当前存档数据，操作中止。');
      return { saveData: {} as SaveData, stateChanges: emptyChanges };
    }
    const { repairSaveData } = await import('@/utils/dataRepair');
    if (!response) {
      console.warn('[AI双向系统:_processGmResponse] 响应为空，返回原始数据');
      const repairedData = repairSaveData(currentSaveData);
      useGameStateStore().loadFromSaveData(repairedData);
      return { saveData: repairedData, stateChanges: emptyChanges };
    }

    const repairedCurrent = repairSaveData(currentSaveData);
    let updatedSaveData = cloneDeep(repairedCurrent);
    let stateChanges: StateChangeLog = emptyChanges;

    if (Array.isArray(response.tavern_commands) && response.tavern_commands.length > 0) {
      const result = await this._executeCommands(response.tavern_commands, updatedSaveData);
      updatedSaveData = result.saveData;
      stateChanges = result.stateChanges;

      const hasTimeUpdate = response.tavern_commands.some(cmd => cmd.key?.includes('游戏时间'));
      if (hasTimeUpdate) {
        const { updateLifespanFromGameTime, updateNpcLifespanFromGameTime } = await import('@/utils/lifespanCalculator');
        updateLifespanFromGameTime(updatedSaveData);
        const relations = updatedSaveData.人物关系 || {};
        const gameTime = updatedSaveData.游戏时间;
        if (gameTime) {
          for (const [, npcData] of Object.entries(relations)) {
            if (npcData && typeof npcData === 'object') {
              updateNpcLifespanFromGameTime(npcData, gameTime);
            }
          }
        }
      }
    }

    // 🔥 移除自动添加短期记忆的逻辑 - 由调用方统一处理，避免重复添加
    // if (isInitialization && response.text) {
    //   if (!updatedSaveData.记忆) updatedSaveData.记忆 = { 短期记忆: [], 中期记忆: [], 长期记忆: [], 隐式中期记忆: [] };
    //   if (!Array.isArray(updatedSaveData.记忆.短期记忆)) updatedSaveData.记忆.短期记忆 = [];
    //   const timePrefix = this._formatGameTime(updatedSaveData.游戏时间);
    //   updatedSaveData.记忆.短期记忆.push(`${timePrefix}${response.text}`);
    // }

    updatedSaveData = repairSaveData(updatedSaveData);
    useGameStateStore().loadFromSaveData(updatedSaveData);
    return { saveData: updatedSaveData, stateChanges };
  }

  private async _executeCommands(
    commands: { action: string; key: string; value?: unknown }[],
    saveData: SaveData
  ): Promise<{ saveData: SaveData; stateChanges: StateChangeLog }> {
    let updatedSaveData = cloneDeep(saveData);
    const changes: StateChangeLog['changes'] = [];
    for (const command of commands) {
      if (!command || !command.action || !command.key) continue;
      const { action, key } = command;
      const mappedPath = this._mapShardPathToSaveDataPath(key);
      const oldValue = cloneDeep(get(updatedSaveData, mappedPath));
      updatedSaveData = await this._executeCommand(command, updatedSaveData);
      const newValue = cloneDeep(get(updatedSaveData, mappedPath));
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({ key: mappedPath, action, oldValue, newValue });
      }
    }
    return { saveData: updatedSaveData, stateChanges: { changes } };
  }

  // 🔥 [新架构] 移除路径映射，直接使用提示词中的完整路径
  // Pinia/gameStateStore 会自动处理路径解析
  private _mapShardPathToSaveDataPath(shardPath: string): string {
    // 直接返回原路径，不再进行映射
    return shardPath;
  }

  private async _executeCommand(command: { action: string; key: string; value?: unknown }, saveData: SaveData): Promise<SaveData> {
    const gameStateStore = useGameStateStore();
    if (!command || !command.action || !command.key) return saveData;
    const { action, key, value } = command;
    const path = this._mapShardPathToSaveDataPath(key);

    try {
      const { interceptRealmBreakthroughCommand } = await import('./judgement/heavenlyRules');
      if (!interceptRealmBreakthroughCommand(command, saveData).allowed) return saveData;

      // 🔥 [新架构] 不再需要路径映射，直接使用提示词中的路径
      // gameStateStore会自动处理路径解析

      let oldEquipmentItemId: string | null = null;
      if (action === 'set' && path.startsWith('装备栏.装备')) {
        oldEquipmentItemId = get(saveData, path) as string | null;
      }

      switch (action) {
        case 'set':
          set(saveData, path, value); // 更新 saveData 对象
          gameStateStore.updateState(path, value); // 同步更新 store

          // 🔥 [坐标同步] 当设置经纬度坐标时,自动计算并更新 x/y 虚拟坐标
          if (path === '玩家角色状态.位置.longitude' || path === '玩家角色状态.位置.latitude') {
            const location = get(saveData, '玩家角色状态.位置');
            if (location && typeof location === 'object') {
              const loc = location as any;
              if (loc.longitude !== undefined && loc.latitude !== undefined) {
                const worldInfo = get(saveData, '世界信息') as any;
                const mapConfig = worldInfo?.地图配置;

                // 坐标转换逻辑(复制自 WorldMapPanel.vue geoToVirtual 函数)
                let worldMinLng = 100.0, worldMaxLng = 130.0;
                let worldMinLat = 25.0, worldMaxLat = 45.0;
                const mapWidth = 3600, mapHeight = 2400;

                if (mapConfig) {
                  worldMinLng = mapConfig.minLng;
                  worldMaxLng = mapConfig.maxLng;
                  worldMinLat = mapConfig.minLat;
                  worldMaxLat = mapConfig.maxLat;
                }

                const clampedLng = Math.max(worldMinLng, Math.min(worldMaxLng, loc.longitude));
                const clampedLat = Math.max(worldMinLat, Math.min(worldMaxLat, loc.latitude));

                const x = ((clampedLng - worldMinLng) / (worldMaxLng - worldMinLng)) * (mapWidth * 0.85) + (mapWidth * 0.075);
                const y = ((worldMaxLat - clampedLat) / (worldMaxLat - worldMinLat)) * (mapHeight * 0.85) + (mapHeight * 0.075);

                loc.x = x;
                loc.y = y;
                set(saveData, '玩家角色状态.位置', loc);
                gameStateStore.updateState('玩家角色状态.位置', loc);

                console.log(`[坐标同步] 经纬度(${clampedLng.toFixed(2)}, ${clampedLat.toFixed(2)}) -> 虚拟坐标(${x.toFixed(1)}, ${y.toFixed(1)})`);
              }
            }
          }
          if (path.startsWith('三千大道.大道列表.')) {
            const daoName = path.split('.')[2];
            const daoData = get(saveData, `三千大道.大道列表.${daoName}`);
            if (daoData && typeof daoData === 'object') (daoData as any).是否解锁 = true;
          }
          if (String(path).includes('背包.物品.') && String(path).endsWith('.修炼进度')) {
            updateMasteredSkills(saveData);
          }
          if (path.startsWith('装备栏.装备')) {
            const newItemId = String(value || '');
            if (oldEquipmentItemId && oldEquipmentItemId !== newItemId) removeEquipmentBonus(saveData, oldEquipmentItemId);
            if (newItemId && newItemId !== oldEquipmentItemId) applyEquipmentBonus(saveData, newItemId);
          }
          break;
        case 'add':
          if (path.endsWith('游戏时间.分钟')) {
            const time = get(saveData, '游戏时间', { 年: 1, 月: 1, 日: 1, 小时: 0, 分钟: 0 }) as GameTime;
            const totalMinutes = time.分钟 + Number(value || 0);
            const totalHours = time.小时 + Math.floor(totalMinutes / 60);
            time.分钟 = totalMinutes % 60;
            const totalDays = time.日 + Math.floor(totalHours / 24);
            time.小时 = totalHours % 24;
            const totalMonths = time.月 + Math.floor((totalDays - 1) / 30);
            time.日 = ((totalDays - 1) % 30) + 1;
            time.年 += Math.floor((totalMonths - 1) / 12);
            time.月 = ((totalMonths - 1) % 12) + 1;
            set(saveData, '游戏时间', time); // 更新 saveData
            gameStateStore.updateState('游戏时间', time); // 同步更新 store
            const { updateStatusEffects } = await import('./statusEffectManager');
            updateStatusEffects(saveData);
          } else {
            const currentValue = get(saveData, path, 0);
            const newValue = Number(currentValue) + Number(value || 0);
            set(saveData, path, newValue); // 更新 saveData
            gameStateStore.updateState(path, newValue); // 同步更新 store
            if (String(path).includes('背包.物品.') && String(path).endsWith('.修炼进度')) {
              updateMasteredSkills(saveData);
            }
          }
          break;
        case 'push': {
          const array = get(saveData, path, []) as unknown[];
          let valueToPush = value ?? null;

          // 🔥 修复：当向任何记忆数组推送时，自动添加时间戳
          if (typeof valueToPush === 'string' && path.endsWith('.记忆')) {
            // 🔥 新增检查：只有在记忆内容非空时才添加
            if (!valueToPush.trim()) {
              console.warn(`[AI双向系统] 检测到空的记忆推送，已跳过。路径: ${path}`);
              break; // 跳出 switch case，不执行 push
            }
            const timePrefix = this._formatGameTime(saveData.游戏时间);
            valueToPush = `${timePrefix}${valueToPush}`;
          }

          array.push(valueToPush);
          if (!get(saveData, path)) {
            set(saveData, path, array);
          }
          break;
        }
        case 'delete':
          unset(saveData, path);
          break;
      }
    } catch (error) {
      console.error(`[AI双向系统:_executeCommand] 命令执行失败:`, error);
    }
    return saveData;
  }
}

export const AIBidirectionalSystem = AIBidirectionalSystemClass;
export { getTavernHelper };
