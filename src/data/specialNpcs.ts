import type { GameTime, NpcProfile, WorldInfo } from '@/types/game';

export type SpecialNpcSceneTag =
  | 'hub'
  | 'earth'
  | 'modern'
  | 'campus'
  | 'city'
  | 'station'
  | 'wasteland'
  | 'horror'
  | 'sci_fi'
  | 'fantasy';

export type SpecialNpcDefinition = {
  id: string;
  displayName: string;
  sceneTags: SpecialNpcSceneTag[];
  personaPrompt: string;
  createProfile: (ctx: { now: GameTime; playerLocationDesc?: string; worldInfo?: WorldInfo | null }) => NpcProfile;
};

function mapModernToLegacyAttributes(input: { STR: number; PER: number; INT: number; LUK: number; CHA: number; WIL: number }) {
  return {
    根骨: input.STR,
    灵性: input.PER,
    悟性: input.INT,
    气运: input.LUK,
    魅力: input.CHA,
    心性: input.WIL,
  };
}

function createCurrency(godPoints: number) {
  return {
    灵石: { 下品: 0, 中品: 0, 上品: 0, 极品: 0 },
    货币: {
      神点: {
        币种: '神点',
        名称: '神点',
        数量: godPoints,
        价值度: 1,
        描述: '主神空间通用货币',
        图标: 'Coins',
      },
    },
    货币设置: {
      禁用币种: [],
      基准币种: '神点',
    },
    物品: {},
  };
}

function createReincarnatorNpcProfile(input: {
  name: string;
  gender: '男' | '女' | '其他';
  age: number;
  birth: string;
  appearance: string;
  personality: string[];
  rank: 'D' | 'C' | 'B' | 'A' | 'S';
  star: 1 | 2 | 3 | 4 | 5;
  attributes: { STR: number; PER: number; INT: number; LUK: number; CHA: number; WIL: number };
  hp: number;
  ep: number;
  mp: number;
  location: string;
  bottomLine: string[];
  thought: string;
  status: string;
  talents: Array<{ name: string; description: string }>;
  godPoints: number;
  tags: SpecialNpcSceneTag[];
}): NpcProfile {
  const legacy = mapModernToLegacyAttributes(input.attributes);

  return {
    名字: input.name,
    性别: input.gender,
    出生日期: { 年: 1000 - input.age, 月: 1, 日: 1 },
    种族: '人类',
    出生: input.birth,
    外貌描述: input.appearance,
    性格特征: input.personality,
    境界: {
      名称: '轮回评级',
      阶段: `${input.rank}级${input.star}星`,
      当前进度: input.star * 20,
      下一级所需: 100,
      突破描述: '完成高难副本并通过晋升试炼',
    } as any,
    灵根: '兼容字段（无）',
    天赋: input.talents as any,
    先天六司: legacy,
    属性: {
      气血: { 当前: input.hp, 上限: input.hp },
      灵气: { 当前: input.ep, 上限: input.ep },
      神识: { 当前: input.mp, 上限: input.mp },
      寿元上限: 150,
    },
    与玩家关系: '陌生人',
    好感度: 5,
    当前位置: { 描述: input.location },
    人格底线: input.bottomLine,
    记忆: [],
    当前外貌状态: input.status,
    当前内心想法: input.thought,
    背包: createCurrency(input.godPoints),
    实时关注: false,
    扩展: {
      specialNpc: true,
      specialNpcTags: input.tags,
    },
  };
}

export const SPECIAL_NPCS: SpecialNpcDefinition[] = [
  {
    id: 'hub_medic_lan',
    displayName: '林岚',
    sceneTags: ['hub', 'earth', 'modern', 'city', 'station'],
    personaPrompt: `【人设】林岚：前急救医生，现主神空间医疗顾问。
【行为】先保命、后谈收益；愿意救人但不纵容无脑冒险。
【叙事】更适合“应急处置 + 风险评估”场景，不要写成无条件跟随。`,
    createProfile: ({ playerLocationDesc }) => {
      const profile = createReincarnatorNpcProfile({
        name: '林岚',
        gender: '女',
        age: 29,
        birth: '联邦医疗体系',
        appearance: '短发，深色战术夹克，袖口有医疗标识，动作干练。',
        personality: ['冷静', '务实', '守约'],
        rank: 'C',
        star: 3,
        attributes: { STR: 6, PER: 8, INT: 8, LUK: 5, CHA: 6, WIL: 8 },
        hp: 220,
        ep: 200,
        mp: 210,
        location: playerLocationDesc || '主神空间·医疗区',
        bottomLine: ['抛弃重伤者', '故意误导队友'],
        thought: '先确认伤员优先级，再决定资源投放。',
        status: '袖口沾有少量血迹，但状态稳定。',
        talents: [
          { name: '战地救护', description: '高压环境中快速稳定伤势。' },
          { name: '应激镇定', description: '群体恐慌场景下维持理性判断。' },
        ],
        godPoints: 320,
        tags: ['hub', 'earth', 'modern', 'city', 'station'],
      });
      profile.扩展 = { ...(profile.扩展 || {}), specialNpcId: 'hub_medic_lan' };
      return profile;
    },
  },
  {
    id: 'wasteland_scout_han',
    displayName: '韩叙',
    sceneTags: ['wasteland', 'horror', 'sci_fi', 'city'],
    personaPrompt: `【人设】韩叙：长期在高污染区执行回收任务的独立侦察员。
【行为】先侦查后行动，擅长规划撤离，不轻易暴露底牌。
【叙事】适合“先给线索再建立合作”的推进，不要直接绑定玩家。`,
    createProfile: ({ playerLocationDesc }) => {
      const profile = createReincarnatorNpcProfile({
        name: '韩叙',
        gender: '男',
        age: 33,
        birth: '边境巡逻队',
        appearance: '护目镜有划痕，面罩挂在颈侧，携带折叠侦察终端。',
        personality: ['谨慎', '寡言', '可靠'],
        rank: 'B',
        star: 2,
        attributes: { STR: 7, PER: 9, INT: 7, LUK: 6, CHA: 5, WIL: 8 },
        hp: 260,
        ep: 210,
        mp: 180,
        location: playerLocationDesc || '副本边缘警戒区',
        bottomLine: ['出卖队友坐标', '故意拖延撤离'],
        thought: '确认出口前，不做任何高噪声动作。',
        status: '神经紧绷，始终在扫描周边动静。',
        talents: [
          { name: '静默侦察', description: '降低暴露并提高情报完整度。' },
          { name: '撤离规划', description: '复杂地形下快速规划安全撤退路线。' },
        ],
        godPoints: 480,
        tags: ['wasteland', 'horror', 'sci_fi', 'city'],
      });
      profile.扩展 = { ...(profile.扩展 || {}), specialNpcId: 'wasteland_scout_han' };
      return profile;
    },
  },
  {
    id: 'hub_trader_qi',
    displayName: '祁商',
    sceneTags: ['hub', 'station', 'city', 'fantasy'],
    personaPrompt: `【人设】祁商：主神空间灰市商人，消息灵通但只认等价交换。
【行为】不站队，偏向交易和情报博弈，擅长压价。
【叙事】适合“交换资源/情报”的桥段，不要直接赠送关键道具。`,
    createProfile: ({ worldInfo }) => {
      const location = worldInfo?.世界名称 ? `主神空间·交易环（关注：${worldInfo.世界名称}情报）` : '主神空间·交易环';
      const profile = createReincarnatorNpcProfile({
        name: '祁商',
        gender: '其他',
        age: 41,
        birth: '未知档案',
        appearance: '长外套内侧挂满数据卡和旧式徽章，笑意总是半真半假。',
        personality: ['圆滑', '精明', '守约但不慈善'],
        rank: 'A',
        star: 1,
        attributes: { STR: 5, PER: 8, INT: 9, LUK: 7, CHA: 9, WIL: 7 },
        hp: 240,
        ep: 260,
        mp: 260,
        location,
        bottomLine: ['无担保赊账', '泄露长期客户身份'],
        thought: '情报总能卖两次，前提是你活得够久。',
        status: '神色从容，正在核对一批副本残骸清单。',
        talents: [
          { name: '情报索引', description: '快速定位目标副本的关键情报入口。' },
          { name: '交易压制', description: '谈判中更容易获得价格优势。' },
        ],
        godPoints: 1200,
        tags: ['hub', 'station', 'city', 'fantasy'],
      });
      profile.扩展 = { ...(profile.扩展 || {}), specialNpcId: 'hub_trader_qi' };
      return profile;
    },
  },
  {
    id: 'hub_dispatcher_yao',
    displayName: '姚槿',
    sceneTags: ['hub', 'station', 'modern', 'sci_fi'],
    personaPrompt: `【人设】姚槿：主神空间任务调度员，负责副本分配与风险提示。
【行为】信息准确、节奏紧凑，不会替玩家做决定，只给可执行方案。
【叙事】适合“任务简报/撤离窗口/规则解释”场景，不要写成情绪化导师。`,
    createProfile: ({ worldInfo }) => {
      const watchedWorld = worldInfo?.世界名称 ? `（当前监控：${worldInfo.世界名称}）` : '';
      const profile = createReincarnatorNpcProfile({
        name: '姚槿',
        gender: '女',
        age: 35,
        birth: '主神空间调度中枢',
        appearance: '银灰制服配战术披肩，左眼佩戴半透明数据镜片。',
        personality: ['严谨', '高效', '克制'],
        rank: 'A',
        star: 2,
        attributes: { STR: 5, PER: 9, INT: 10, LUK: 5, CHA: 7, WIL: 9 },
        hp: 230,
        ep: 280,
        mp: 260,
        location: `主神空间·任务终端${watchedWorld}`,
        bottomLine: ['泄露未授权任务信息', '伪造风险等级'],
        thought: '风险窗口不会等人，准备不足就是失败。',
        status: '正在校对多条副本投放路线。',
        talents: [
          { name: '风险建模', description: '快速评估副本失败链路并给出规避建议。' },
          { name: '窗口调度', description: '把握传送与撤离时机，减少队伍损耗。' },
        ],
        godPoints: 900,
        tags: ['hub', 'station', 'modern', 'sci_fi'],
      });
      profile.扩展 = { ...(profile.扩展 || {}), specialNpcId: 'hub_dispatcher_yao' };
      return profile;
    },
  },
  {
    id: 'hub_engineer_mo',
    displayName: '墨铸',
    sceneTags: ['hub', 'station', 'sci_fi', 'fantasy'],
    personaPrompt: `【人设】墨铸：空间后勤工程师，负责装备修复与异常道具隔离。
【行为】重视流程与安全边界，先检查污染再处理装备。
【叙事】适合“装备维护/异常物品排查/副本残骸分析”桥段。`,
    createProfile: ({ playerLocationDesc }) => {
      const profile = createReincarnatorNpcProfile({
        name: '墨铸',
        gender: '男',
        age: 44,
        birth: '失落舰队维修组',
        appearance: '右臂是可拆卸多功能机械义体，工作服常带焊点痕迹。',
        personality: ['专注', '直接', '守规矩'],
        rank: 'B',
        star: 4,
        attributes: { STR: 8, PER: 8, INT: 9, LUK: 5, CHA: 4, WIL: 8 },
        hp: 280,
        ep: 240,
        mp: 190,
        location: playerLocationDesc || '主神空间·后勤工坊',
        bottomLine: ['跳过污染检测直接装配', '出售未封存异常道具'],
        thought: '每件从副本带回来的东西都可能带着规则裂缝。',
        status: '正在拆解一枚高危副本遗留核心。',
        talents: [
          { name: '结构重铸', description: '修复受损装备并优化耐久。' },
          { name: '异常隔离', description: '识别并封存不稳定副本道具。' },
        ],
        godPoints: 760,
        tags: ['hub', 'station', 'sci_fi', 'fantasy'],
      });
      profile.扩展 = { ...(profile.扩展 || {}), specialNpcId: 'hub_engineer_mo' };
      return profile;
    },
  },
];
