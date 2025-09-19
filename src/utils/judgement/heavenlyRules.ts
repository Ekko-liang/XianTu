/**
 * 天道演算 v4.2 — 判定预计算与规则核心
 * 目标：
 * - 提供高阶“检定/斗法”所需的派生属性与成功率曲线的预计算结果
 * - 将预计算结果写入 Tavern 聊天变量：`character.saveData.系统.天道演算`
 * - 供 AI 叙事在接到【判定请求】时直接引用，避免在模型侧重复推导
 */

import { get } from 'lodash';
import { getTavernHelper } from '@/utils/tavern';
import type { SaveData, CharacterBaseInfo, Item } from '@/types/game';

// 判定类型
export type HeavenlyCheckType = '法力' | '神海' | '道心' | '空速' | '气运';

// 预计算结构
export interface HeavenlyDerivedAttributes {
  版本: string;
  角色: {
    名字: string;
    世界?: string;
    境界: { 名称: string; 等级: number };
    年龄?: number;
  };
  派生属性: {
    法力: number; // 基于灵气与装备映射
    神海: number; // 基于神识与悟性映射
    道心: number; // 基于心性/悟性/状态
    空速: number; // 基于境界/装备“速度”
    气运: number; // 基于先天六司.气运与状态
  };
  加权因子: {
    境界倍率: number; // 用于将资源映射到“检定强度”尺度
    装备命中: number; // 装备带来的命中加值（0-100线性）
    装备闪避: number; // 装备带来的闪避加值（0-100线性）
    装备暴击: number; // 装备带来的暴击几率（0-1）
    装备速度: number; // 装备带来的移动/出手机动
  };
  特许: {
    天道之眷标签: string[]; // 与本局角色绑定的“绝对优势”标签（示例：神品灵根-火、仙品体质-剑修）
    触发提示: string; // 说明如何触发特许（供AI参考）
  };
  成功率曲线: Record<HeavenlyCheckType, Array<{ DC: number; 成功率: number; 临界区间: { 大成: number; 大败: number } }>>;
  斗法基线: {
    命中率基线: number; // 对等敌手下的命中率基线
    闪避率基线: number; // 对等敌手下的闪避率基线
    暴击率基线: number; // 对等敌手下的暴击率基线
    伤害系数: number;   // 用于将“法力/神海”映射到伤害的系数
    豁免强度: number;   // 防御方道心对伤害的减免曲线强度
  };
  文字增幅: {
    天眷: string[];
    完胜: string[];
    险胜: string[];
    失手: string[];
    反噬: string[];
  };
  输出模板: {
    通用判定: string; // 供AI套入占位符
    斗法判定: string;
  };
  更新时间: string;
}

// 安全提取数值
function n(val: any, def = 0): number { const v = Number(val); return Number.isFinite(v) ? v : def; }

// 平滑函数：受控幅度的双曲正切，用于边际递减
function smooth(x: number, k = 1.2, scale = 1): number {
  return Math.tanh(x * k) * scale;
}

// 计算成功率（0.02~0.98），attr 为派生属性，DC 按“难度门槛”的惯例
function successRate(attr: number, DC: number, luck: number, bonus = 0): number {
  // 基础：50%，属性对抗门槛(DC*10)比值进入平滑函数，luck 提供小幅正偏
  const ratio = (attr || 0) / Math.max(1, DC * 10);
  const attrAdj = smooth(ratio - 1, 1.25, 0.35); // [-0.35, +0.35]
  const luckAdj = Math.max(0, Math.min(10, luck || 0)) * 0.005; // [0, +0.05]
  const raw = 0.5 + attrAdj + luckAdj + bonus; // 中心 0.5，向两侧偏移
  return Math.min(0.98, Math.max(0.02, raw));
}

// 从装备/背包或装备栏中抽取“速度/命中/暴击/闪避”倾向（尽量宽容地读取结构）
function aggregateEquipAffix(saveData: SaveData | any) {
  let 命中 = 0, 闪避 = 0, 暴击 = 0, 速度 = 0;

  try {
    const equip = get(saveData, '装备栏', {} as Record<string, Item | string | null>);
    const bag = get(saveData, '背包.物品', {}) as Record<string, Item>;

    const collectFromItem = (it: any) => {
      if (!it || typeof it !== 'object') return;
      // 新物品系统 attributes[]
      const attrs = (it.attributes || it.属性 || []) as Array<{ type?: string; value?: number; percentage?: boolean; 描述?: string; }>;
      if (Array.isArray(attrs)) {
        for (const a of attrs) {
          const t = String((a.type || '')).trim();
          const v = n(a.value);
          if (/命中/.test(t)) 命中 += v;
          if (/闪避/.test(t)) 闪避 += v;
          if (/暴击/.test(t)) 暴击 += (a.percentage ? v : v / 100);
          if (/速度|移速|空速/.test(t)) 速度 += v;
        }
      }
      // 兼容旧字段
      if (it.装备增幅) {
        const m = it.装备增幅 as any;
        if (m.后天六司?.心性) 闪避 += n(m.后天六司.心性) * 0.5;
        if (m.后天六司?.灵性) 命中 += n(m.后天六司.灵性) * 0.5;
      }
    };

    // 装备栏
    if (equip && typeof equip === 'object') {
      for (const key of Object.keys(equip)) {
        const ref = (equip as any)[key];
        const item = (typeof ref === 'string') ? bag?.[ref] : ref;
        collectFromItem(item);
      }
    }

    // 背包中常驻增幅（被动饰品）
    if (bag && typeof bag === 'object') {
      for (const key of Object.keys(bag)) {
        const it = bag[key];
        if (it?.装备特效 && Array.isArray(it.装备特效)) {
          if (it.装备特效.some((s: string) => /身法|轻身|风行/.test(s))) 速度 += 2;
          if (it.装备特效.some((s: string) => /杀机|锐目/.test(s))) 命中 += 2;
        }
      }
    }

  } catch { /* 忽略解析失败 */ }

  return { 命中, 闪避, 暴击: Math.max(0, Math.min(0.6, 暴击)), 速度 };
}

// 提取先天与资源，映射到“检定强度”
function deriveCore(saveData: SaveData, baseInfo: CharacterBaseInfo) {
  const realmName = get(saveData, '玩家角色状态.境界.名称', get(saveData, '玩家角色状态.境界', '凡人')) as string;
  const realmLevel = n(get(saveData, '玩家角色状态.境界.等级', 0));

  const 气血 = get(saveData, '玩家角色状态.气血', { 当前: 0, 最大: 0 });
  const 灵气 = get(saveData, '玩家角色状态.灵气', { 当前: 0, 最大: 0 });
  const 神识 = get(saveData, '玩家角色状态.神识', { 当前: 0, 最大: 0 });
  const 年龄 = n(get(saveData, '玩家角色状态.寿命.当前', undefined), undefined);

  const 根骨 = n(get(baseInfo, '先天六司.根骨', 10), 10);
  const 灵性 = n(get(baseInfo, '先天六司.灵性', 10), 10);
  const 悟性 = n(get(baseInfo, '先天六司.悟性', 10), 10);
  const 心性 = n(get(baseInfo, '先天六司.心性', 10), 10);
  const 气运 = n(get(baseInfo, '先天六司.气运', 5), 5);

  // 境界倍率：贴近 GameStateManager 的加成曲线，但更温和
  const 境界倍率 = 1 + realmLevel * 0.08;

  // 派生属性映射：资源与先天混合映射为“检定强度”尺度（0-1000+）
  const 法力 = Math.round((n(灵气.当前) * 0.8 + n(灵气.最大) * 0.4 + 灵性 * 6) * 境界倍率);
  const 神海 = Math.round((n(神识.当前) * 0.9 + n(神识.最大) * 0.5 + 悟性 * 5) * 境界倍率);
  const 道心 = Math.round((心性 * 10 + 悟性 * 6 + 根骨 * 4) * (1 + Math.min(0.2, (年龄 || 0) / 500)));
  const 空速 = Math.round((20 + 灵性 * 2 + 根骨 * 1.5) * 境界倍率);
  const 先天气运 = Math.max(0, Math.min(10, 气运));

  return { realmName, realmLevel, 年龄, 法力, 神海, 道心, 空速, 气运: 先天气运, 境界倍率 };
}

// 识别“天道之眷”标签
function scanHeavenlyFavors(baseInfo: CharacterBaseInfo): string[] {
  const tags: string[] = [];
  const talents = (baseInfo?.天赋详情 || baseInfo?.天赋 || []) as any[];
  const spirit = baseInfo?.灵根详情 || baseInfo?.灵根;

  const pushIf = (cond: boolean, label: string) => { if (cond) tags.push(label); };

  try {
    // 灵根品质/名称
    const srName = typeof spirit === 'string' ? spirit : spirit?.名称 || spirit?.name || '';
    const srQuality = spirit?.品质?.quality || spirit?.品质 || spirit?.阶位;
    pushIf(/神|仙/.test(String(srQuality || '')), `灵根-${String(srQuality)}`);
    pushIf(/火|雷|剑|金|木|水|土|风|冰/.test(String(srName || '')), `灵根-偏向:${String(srName)}`);

    // 天赋条目
    for (const t of talents) {
      const name = (typeof t === 'string') ? t : (t?.名称 || t?.name || '');
      pushIf(/神|仙/.test(String(name)), `天赋-${String(name)}`);
    }
  } catch { /* 忽略 */ }

  return Array.from(new Set(tags));
}

// 生成成功率曲线（DC: 20,40,60,80,100）
function buildCurves(派生: { [k in HeavenlyCheckType]: number }, 境界倍率: number, luck: number) {
  const DCs = [20, 40, 60, 80, 100];
  const out: Record<HeavenlyCheckType, Array<{ DC: number; 成功率: number; 临界区间: { 大成: number; 大败: number } }>> = {
    法力: [], 神海: [], 道心: [], 空速: [], 气运: []
  };
  (Object.keys(out) as HeavenlyCheckType[]).forEach((k) => {
    const base = 派生[k];
    out[k] = DCs.map(DC => {
      const p = successRate(base * 境界倍率, DC, luck, 0);
      return { DC, 成功率: Math.round(p * 1000) / 10, 临界区间: { 大成: 3, 大败: 98 } };
    });
  });
  return out;
}

// 斗法基线
function buildCombatBaselines(派生: { 法力: number; 神海: number; 道心: number; 空速: number }, affix: { 命中: number; 闪避: number; 暴击: number; 速度: number }) {
  const 命中率基线 = Math.min(0.9, Math.max(0.2, 0.6 + smooth((派生.神海 - 300) / 300, 1.1, 0.2) + affix.命中 / 500));
  const 闪避率基线 = Math.min(0.7, Math.max(0.05, 0.2 + smooth((派生.空速 - 200) / 250, 1.1, 0.25) + affix.闪避 / 600));
  const 暴击率基线 = Math.min(0.5, Math.max(0.02, 0.05 + smooth((派生.神海 - 400) / 400, 1.0, 0.15) + affix.暴击));
  const 伤害系数 = Math.max(0.8, 1.0 + smooth((派生.法力 - 400) / 400, 1.0, 0.5));
  const 豁免强度 = Math.max(0.8, 1.0 + smooth((派生.道心 - 300) / 300, 1.0, 0.4));
  return { 命中率基线, 闪避率基线, 暴击率基线, 伤害系数, 豁免强度 };
}

// 文字增幅词库
function buildAmplifiers() {
  return {
    天眷: ['【天意归一】', '【大道垂怜】', '【气机圆满】', '【神运傍身】'],
    完胜: ['【水到渠成】', '【顺势而为】', '【稳中取胜】', '【神来之笔】'],
    险胜: ['【背水一战】', '【一线生机】', '【反手成势】', '【勉力而成】'],
    失手: ['【力有未逮】', '【气机不顺】', '【道行尚浅】', '【时也命也】'],
    反噬: ['【天机逆转】', '【灵机受挫】', '【心魔作祟】', '【天谴难逃】'],
  };
}

// 输出模板
function buildOutputTemplates() {
  return {
    通用判定: [
      '【判定：{类型}检定】',
      '角色: {{user}}',
      '属性: {属性名} ({属性值}) | 难度(DC): {DC}',
      '投骰: [{骰点}] / 成功率: [{成功率}%]',
      '结果: 【{等级}】{增幅词} {叙事}',
    ].join('\n'),
    斗法判定: [
      '【判定：斗法对抗】',
      '攻方: {{user}} | 守方: {敌人}',
      '[闪避] {闪避结果} | [命中] {命中结果} | [暴击] {暴击结果}',
      '最终伤害: {伤害}',
      '结果: 【{战况}】{增幅词} {叙事}',
    ].join('\n'),
  };
}

// 主入口：计算并返回完整的“天道演算”对象
export function computeHeavenlyPrecalc(saveData: SaveData, baseInfo: CharacterBaseInfo): HeavenlyDerivedAttributes {
  const 版本 = '4.2';

  const 派生核心 = deriveCore(saveData, baseInfo);
  const 装备汇总 = aggregateEquipAffix(saveData);

  const 派生属性 = {
    法力: 派生核心.法力,
    神海: 派生核心.神海,
    道心: 派生核心.道心,
    空速: Math.round(派生核心.空速 + 装备汇总.速度),
    气运: 派生核心.气运,
  } as Record<HeavenlyCheckType, number> & any;

  const 成功率曲线 = buildCurves(派生属性, 1, 派生核心.气运);
  const 斗法基线 = buildCombatBaselines(
    { 法力: 派生属性.法力, 神海: 派生属性.神海, 道心: 派生属性.道心, 空速: 派生属性.空速 },
    装备汇总
  );

  const 天眷标签 = scanHeavenlyFavors(baseInfo);

  const 数据: HeavenlyDerivedAttributes = {
    版本,
    角色: {
      名字: baseInfo.名字,
      世界: baseInfo.世界,
      境界: { 名称: 派生核心.realmName, 等级: 派生核心.realmLevel },
      年龄: 派生核心.年龄,
    },
    派生属性,
    加权因子: {
      境界倍率: 派生核心.境界倍率,
      装备命中: 装备汇总.命中,
      装备闪避: 装备汇总.闪避,
      装备暴击: 装备汇总.暴击,
      装备速度: 装备汇总.速度,
    },
    特许: {
      天道之眷标签: 天眷标签,
      触发提示: '若“灵根/天赋”与检定类型强相关（如火灵根→法力/攻击），视为【天眷】，可直接判定大成或给予+20%成功率上限内修正',
    },
    成功率曲线,
    斗法基线,
    文字增幅: buildAmplifiers(),
    输出模板: buildOutputTemplates(),
    更新时间: new Date().toISOString(),
  };

  return 数据;
}

// 写入到 Tavern 聊天变量
export async function syncHeavenlyPrecalcToTavern(saveData: SaveData, baseInfo: CharacterBaseInfo) {
  const helper = getTavernHelper();
  if (!helper) return;
  try {
    const precalc = computeHeavenlyPrecalc(saveData, baseInfo);
    await helper.insertOrAssignVariables({
      'character.saveData': {
        系统: {
          天道演算: precalc,
        }
      }
    }, { type: 'chat' });
  } catch (e) {
    console.error('[天道演算] 同步到酒馆失败:', e);
  }
}

