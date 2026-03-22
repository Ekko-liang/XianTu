import { generateWithRawPrompt } from '@/utils/tavernCore';
import { getPrompt } from '@/services/defaultPrompts';
import type { SaveData, GameTime, GameEvent, NpcProfile, WorldInfo } from '@/types/game';
import { parseJsonFromText } from '@/utils/jsonExtract';
import { SPECIAL_NPCS } from '@/data/specialNpcs';

type EventGenerationResult = {
  event: GameEvent;
  prompt_addition: string;
};

const buildEventId = () => `event_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

type SpecialNpcEventGenerationResult = EventGenerationResult & {
  npcProfile: NpcProfile;
  npcId: string;
};

type SpecialNpcEventAiResponse = {
  selected_id: string;
  event_story: string;
  event_name?: string;
  event_type?: string;
};

const REALM_RANKS: Array<{ token: string; rank: number }> = [
  { token: '凡人', rank: 0 },
  { token: '练气', rank: 1 },
  { token: '筑基', rank: 2 },
  { token: '金丹', rank: 3 },
  { token: '元婴', rank: 4 },
  { token: '化神', rank: 5 },
  { token: '炼虚', rank: 6 },
  { token: '合体', rank: 7 },
  { token: '渡劫', rank: 8 },
];

function getRealmRank(realmName: string): number {
  const text = String(realmName || '').trim();
  const matched = REALM_RANKS.find((item) => text.includes(item.token));
  return matched?.rank ?? 0;
}

function buildWorldEventBalanceGuide(args: { realmName: string; realmStage?: string; locationDesc?: string }): string {
  const fullRealm = `${args.realmName}${args.realmStage ? '-' + args.realmStage : ''}`;
  const rank = getRealmRank(args.realmName);
  const location = String(args.locationDesc || '未知');

  if (rank <= 1) {
    return [
      `- 玩家当前境界：${fullRealm}。事件落点必须是“身边局部危机”，规模控制在宗门一角、附近坊市、一段山路、一处洞府外围、一座小镇这一级别。`,
      '- 允许的直接目标：脱身、藏匿、报讯、护送、救下个别人、查到线索、捡到余波机缘。',
      '- 若世界背景里确有高阶大事，只能表现为余波/传闻/封锁/难民潮/物价波动/伤者逃回/外围征召，禁止让玩家正面迎战高阶主力。',
      '- 严禁生成“练气期被卷入金丹都只是炮灰、化神以上才是主力”的贴脸战场。',
      '- prompt_addition 必须写出一个具体可执行的破局点，例如可躲藏地点、可求援之人、可追查线索或可争取的小收益。',
      `- 当前位置参考：${location}。事件优先从当前位置附近自然爆发，不要无缘无故把玩家抛去远方主战场。`,
    ].join('\n');
  }

  if (rank <= 3) {
    return [
      `- 玩家当前境界：${fullRealm}。事件可扩展到一地一域的风波，但主冲突仍应是玩家“努力可参与”的层级。`,
      '- 允许的直接目标：清剿外围、侦查异动、护送关键人物、争夺外围资源、协助宗门长辈处理局部失控。',
      '- 更高阶灾厄可以存在，但只能让玩家处理外围节点、残局或关键支线，不能独自承担镇压全局的责任。',
      '- 必须保留至少一个操作空间：退路、援手、阵地、线索、临时盟友或延后处理窗口。',
      `- 当前位置参考：${location}。优先让事件和现有地点、势力、已知关系发生联系。`,
    ].join('\n');
  }

  return [
    `- 玩家当前境界：${fullRealm}。可以接触更高层级的公开大事件，但仍需遵守境界与因果，不可无端制造无解死局。`,
    '- 若事件定为重大/灾难，必须同时提供可行动的战术入口或可借力对象，不能只给压顶危机不给选择。',
    '- prompt_addition 依然要写出本回合玩家可立即采取的切入口，而不是空泛世界公告。',
    `- 当前位置参考：${location}。事件应与当前所处区域、势力格局或已有关系链相连。`,
  ].join('\n');
}

function buildWorldEventExampleGuide(args: { realmName: string; realmStage?: string }): string {
  const fullRealm = `${args.realmName}${args.realmStage ? '-' + args.realmStage : ''}`;
  const rank = getRealmRank(args.realmName);

  if (rank <= 1) {
    return [
      `以下是适合【${fullRealm}】的世界事件示例风格，优先参考：`,
      '- 例1：附近坊市因上游灵脉震荡，低阶丹药断供、散修抢购，玩家可选择代购、护送货队、调查源头。',
      '- 例2：宗门外山路出现一批受伤逃修，声称北面有魔修劫掠队出没，玩家可报讯、协助安置、追查遗落线索。',
      '- 例3：某位与玩家有过接触的外门弟子失踪，只在林间留下求救符灰与血迹，玩家可寻人、求援、沿痕迹侦查。',
      '- 例4：高阶大战的余波扫过附近小镇，屋舍受损、灵田枯败，玩家可救人、守夜、防小股趁火打劫者。',
      '- 例5：一处洞府外围禁制松动，引来大量练气散修徘徊，核心机缘拿不到，但外围残卷、碎丹、低阶符材可以争。',
      '- 反例：直接生成“魔道大军攻山，金丹皆死，玩家必须守住山门”这种当前境界无解主战场。',
    ].join('\n');
  }

  if (rank <= 3) {
    return [
      `以下是适合【${fullRealm}】的世界事件示例风格，优先参考：`,
      '- 例1：一处边境据点被邪修渗透，玩家可清理外围据点、截获密信、护送证人回宗。',
      '- 例2：秘境开启前夜，几方势力在外围布线争路，玩家可争夺入口资格、截胡外围资源、和同阶对手周旋。',
      '- 例3：宗门下辖城池爆发灵疫或异变，玩家可配合长老封锁街区、搜寻病源、护送关键药材。',
      '- 例4：高阶大战已在远处爆发，但玩家只负责侧翼侦查、断后、救援失散弟子、看守阵眼之一。',
      '- 例5：某位好友卷入势力追杀，敌方主使很强，但眼前可处理的是追兵、暗桩、接头点和撤离路线。',
      '- 反例：让筑基/金丹玩家单枪匹马平定横跨数洲的灭世灾厄。',
    ].join('\n');
  }

  return [
    `以下是适合【${fullRealm}】的世界事件示例风格，优先参考：`,
    '- 例1：一域灵潮倒灌，玩家可争夺节点、协商同盟、镇守关键阵位。',
    '- 例2：上层势力公开开战，玩家可选择参战方向、夺取重宝、处理战后秩序。',
    '- 例3：古老秘境现世引发多方博弈，玩家可直接进入核心层竞争，但仍需有盟友、退路或阵地。',
    '- 例4：天灾级异变波及大片区域，玩家可主导救援、封禁、反制，但不能只有绝望没有操作入口。',
  ].join('\n');
}

function inferSpecialNpcSceneTags(args: { worldInfo?: WorldInfo | null; locationDesc?: string; worldName?: string }): string[] {
  const worldBackground = String(args.worldInfo?.世界背景 ?? '');
  const worldEra = String(args.worldInfo?.世界纪元 ?? '');
  const worldName = String(args.worldName ?? args.worldInfo?.世界名称 ?? '');
  const loc = String(args.locationDesc ?? '');
  const text = `${worldBackground}\n${worldEra}\n${worldName}\n${loc}`;

  const tags = new Set<string>();

  const has = (...keys: string[]) => keys.some((k) => text.includes(k));
  if (has('地球', '现代', '都市', '学校', '大学', '高中')) {
    tags.add('earth');
    tags.add('modern');
  }
  if (has('学校', '大学', '高中', '校园')) tags.add('campus');
  if (has('城', '坊市', '市', '街', '商会')) tags.add('city');

  if (has('修仙', '灵气', '宗门', '秘境', '洞府', '坊市', '仙', '道')) tags.add('xianxia');
  if (has('宗门', '山门', '内门', '外门', '长老')) tags.add('sect');
  if (has('江湖', '游侠', '散修', '客栈')) tags.add('jianghu');

  return Array.from(tags);
}

function pickCandidates(args: { saveData: SaveData; now: GameTime }): typeof SPECIAL_NPCS {
  const saveData = args.saveData as any;
  const rel = (saveData?.社交?.关系 ?? {}) as Record<string, any>;
  const usedIds = new Set<string>();
  const usedNames = new Set<string>(Object.keys(rel || {}));
  for (const v of Object.values(rel || {})) {
    if (v && typeof v === 'object') {
      const id = (v as any).扩展?.specialNpcId;
      if (typeof id === 'string' && id.trim()) usedIds.add(id.trim());
    }
  }

  const worldInfo = (saveData?.世界?.信息 ?? null) as WorldInfo | null;
  const locationDesc = String(saveData?.角色?.位置?.描述 ?? '');
  const tags = inferSpecialNpcSceneTags({ worldInfo, locationDesc });

  const available = SPECIAL_NPCS.filter((d) => !usedIds.has(d.id) && !usedNames.has(d.displayName));
  if (available.length === 0) return [];

  const matches = available.filter((d) => d.sceneTags.some((t) => tags.includes(t)));
  const pool = matches.length ? matches : available;

  // 随机抽取少量候选，避免提示词过长
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
}

export async function generateSpecialNpcEvent(args: {
  saveData: SaveData;
  now: GameTime;
  customPrompt?: string;
}): Promise<SpecialNpcEventGenerationResult | null> {
  try {
    const { saveData, now, customPrompt } = args;
    const anySave = saveData as any;

    const candidates = pickCandidates({ saveData, now });
    // 如果没有可用的特殊NPC候选，返回null让调用方回退到普通世界事件
    if (!candidates.length) {
      console.log('[特殊NPC事件] 无可用候选NPC，将回退到普通世界事件');
      return null;
    }

    const playerName =
      anySave?.角色?.身份?.名字 ||
      anySave?.角色?.名字 ||
      '无名修士';

    const realmName = anySave?.角色?.属性?.境界?.名称 || '凡人';
    const realmStage = anySave?.角色?.属性?.境界?.阶段 || '';
    const locationDesc = String(anySave?.角色?.位置?.描述 || '未知');
    const worldInfo = (anySave?.世界?.信息 ?? null) as WorldInfo | null;

    const candidateText = candidates
      .map((c) => {
        const persona = String(c.personaPrompt || '').trim();
        const clippedPersona = persona.length > 260 ? persona.slice(0, 260) + '…' : persona;
        return `- id: ${c.id}\n  名称: ${c.displayName}\n  标签: ${c.sceneTags.join(',')}\n  人设: ${clippedPersona}`;
      })
      .join('\n\n');

    const extra = customPrompt && String(customPrompt).trim() ? `\n\n## 额外要求\n${String(customPrompt).trim()}` : '';

    const prompt = `
# 任务：生成“特殊NPC登场”世界事件（酒馆端专属）
你需要从候选列表中选择**最适合当前场景**的一位【特殊NPC/定制人物】，并写出一段“刚刚发生”的登场事件快照。
要求：
- 只允许从候选 id 中选择（输出 selected_id）
- 事件要有现场感，不要公告式总结
- 事件应让玩家在后续叙事中自然遇见/结识该NPC（但不要写成强制绑定/无条件跟随）
- 事件文本 80-180 字，简短但有信息密度

输出 JSON（不要代码块/解释/额外文本）：
{
  "selected_id": "string",
  "event_story": "string",
  "event_name": "string (可选)",
  "event_type": "人物风波|势力变动|世界变革|string (可选)"
}

---

# 当前状态
- 时间: ${now.年}年${now.月}月${now.日}日 ${String(now.小时).padStart(2, '0')}:${String(now.分钟).padStart(2, '0')}
- 玩家: ${playerName}
- 境界: ${realmName}${realmStage ? '-' + realmStage : ''}
- 位置: ${locationDesc}
- 世界: ${String(worldInfo?.世界名称 || '未知')}
- 世界背景: ${String(worldInfo?.世界背景 || '').slice(0, 200)}
- 世界纪元: ${String(worldInfo?.世界纪元 || '').slice(0, 200)}

# 候选特殊NPC
${candidateText}
${extra}
    `.trim();

    const raw = await generateWithRawPrompt('生成特殊NPC登场事件', prompt, false, 'event_generation');
    const parsed = parseJsonFromText(raw) as Partial<SpecialNpcEventAiResponse>;

    const selectedId = String((parsed as any)?.selected_id || '').trim();
    const eventStory = String((parsed as any)?.event_story || '').trim();
    if (!selectedId || !eventStory) return null;

    const selected = candidates.find((c) => c.id === selectedId);
    if (!selected) return null;

    const npcProfile = selected.createProfile({
      now,
      playerLocationDesc: locationDesc,
      worldInfo,
    });

    const eventName = String((parsed as any)?.event_name || `异人现世·${npcProfile.名字}`).trim();
    const eventType = String((parsed as any)?.event_type || '人物风波').trim();

    const event: GameEvent = {
      事件ID: buildEventId(),
      事件名称: eventName || `异人现世·${npcProfile.名字}`,
      事件类型: eventType || '人物风波',
      事件描述: eventStory,
      影响等级: '轻微',
      影响范围: '局部',
      相关人物: [npcProfile.名字],
      事件来源: '系统',
      发生时间: now,
    };

    return {
      npcProfile,
      npcId: selected.id,
      event,
      prompt_addition: eventStory,
    };
  } catch (error) {
    console.error('[特殊NPC事件生成] 生成失败:', error);
    return null;
  }
}

export async function generateWorldEvent(args: {
  saveData: SaveData;
  now: GameTime;
  customPrompt?: string;
}): Promise<EventGenerationResult | null> {
  try {
    const { saveData, now, customPrompt } = args;

    const playerName =
      (saveData as any)?.角色?.身份?.名字 ||
      (saveData as any)?.角色?.名字 ||
      '无名修士';

    const realmName = (saveData as any)?.角色?.属性?.境界?.名称 || '凡人';
    const realmStage = (saveData as any)?.角色?.属性?.境界?.阶段 || '';
    const locationDesc = (saveData as any)?.角色?.位置?.描述 || '未知';
    const reputation = Number((saveData as any)?.角色?.属性?.声望 ?? 0);
    const worldInfo = (saveData as any)?.世界?.信息 || null;

    const relations = (saveData as any)?.社交?.关系 || {};
    const relationList = Object.values(relations)
      .filter((n: any) => n && typeof n === 'object')
      .map((n: any) => ({
        名字: String(n.名字 || ''),
        与玩家关系: String(n.与玩家关系 || ''),
        好感度: Number(n.好感度 ?? 0),
        境界: n.境界 ? `${n.境界.名称 || ''}${n.境界.阶段 ? '-' + n.境界.阶段 : ''}` : '',
      }))
      .filter((n: any) => n.名字)
      .sort((a: any, b: any) => b.好感度 - a.好感度)
      .slice(0, 6);

    const promptTemplate = (await getPrompt('eventGeneration')).trim();
    const extra = customPrompt && String(customPrompt).trim() ? `\n\n## 额外要求\n${String(customPrompt).trim()}` : '';
    const balanceGuide = buildWorldEventBalanceGuide({ realmName, realmStage, locationDesc });
    const exampleGuide = buildWorldEventExampleGuide({ realmName, realmStage });

    const context = `
# 当前状态
- 时间: ${now.年}年${now.月}月${now.日}日 ${String(now.小时).padStart(2, '0')}:${String(now.分钟).padStart(2, '0')}
- 玩家: ${playerName}
- 境界: ${realmName}${realmStage ? '-' + realmStage : ''}
- 位置: ${locationDesc}
- 声望: ${reputation}

# 世界背景
- 世界: ${String(worldInfo?.世界名称 || '未知')}
- 背景: ${String(worldInfo?.世界背景 || '').slice(0, 180) || '（无）'}
- 纪元: ${String(worldInfo?.世界纪元 || '').slice(0, 120) || '（无）'}

# 本次世界事件硬约束（必须遵守）
${balanceGuide}

# 同境界示例池（参考其尺度与切口，不要照抄）
${exampleGuide}

# 玩家关系（好感度Top）
${relationList.length ? relationList.map(r => `- ${r.名字} | 关系:${r.与玩家关系 || '未知'} | 好感:${r.好感度} | 境界:${r.境界 || '未知'}`).join('\n') : '- （暂无）'}
`.trim();

    const finalPrompt = `${promptTemplate}\n\n---\n\n${context}${extra}`.trim();

    const raw = await generateWithRawPrompt('生成一个会影响玩家的世界事件', finalPrompt, false, 'event_generation');
    const parsed = parseJsonFromText(raw) as Partial<EventGenerationResult>;

    const event = (parsed as any)?.event;
    const prompt_addition = String((parsed as any)?.prompt_addition || '').trim();
    if (!event || typeof event !== 'object') return null;
    if (!prompt_addition) return null;

    const normalized: GameEvent = {
      事件ID: String((event as any).事件ID || buildEventId()),
      事件名称: String((event as any).事件名称 || '无名事件'),
      事件类型: String((event as any).事件类型 || '世界变革'),
      事件描述: String((event as any).事件描述 || prompt_addition),
      影响等级: (event as any).影响等级 ? String((event as any).影响等级) : undefined,
      影响范围: (event as any).影响范围 ? String((event as any).影响范围) : undefined,
      相关人物: Array.isArray((event as any).相关人物) ? (event as any).相关人物.map((x: any) => String(x)).filter(Boolean) : undefined,
      相关势力: Array.isArray((event as any).相关势力) ? (event as any).相关势力.map((x: any) => String(x)).filter(Boolean) : undefined,
      事件来源: String((event as any).事件来源 || '随机'),
      发生时间: now,
    };

    return { event: normalized, prompt_addition };
  } catch (error) {
    console.error('[事件生成] 生成失败:', error);
    return null;
  }
}
