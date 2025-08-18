import { toast } from './toast';
import type { Talent, World, TalentTier, Origin, SpiritRoot, CharacterData } from '../types';
import type { GM_Request, GM_Response } from '../types/AIGameMaster';
import { buildGmRequest } from './AIGameMaster';

// =======================================================================
//                           核心：酒馆上下文获取
// =======================================================================

/**
 * 诊断AI响应问题的辅助函数
 */
function diagnoseAIResponse(rawResult: any, typeName: string): void {
  console.log(`【神识印记-诊断】开始诊断${typeName}的AI响应:`, {
    type: typeof rawResult,
    isNull: rawResult === null,
    isUndefined: rawResult === undefined,
    isString: typeof rawResult === 'string',
    isEmpty: typeof rawResult === 'string' && rawResult.trim() === '',
    length: typeof rawResult === 'string' ? rawResult.length : 'N/A',
    hasChoices: rawResult && rawResult.choices,
    choicesLength: rawResult && rawResult.choices ? rawResult.choices.length : 'N/A'
  });

  // 检查是否是OpenAI格式的响应
  if (rawResult && typeof rawResult === 'object' && rawResult.choices) {
    console.log(`【神识印记-诊断】检测到OpenAI格式响应，choices:`, rawResult.choices);
    if (rawResult.choices.length > 0 && rawResult.choices[0].message) {
      console.log(`【神识印记-诊断】第一个choice的消息内容:`, rawResult.choices[0].message.content);
      if (!rawResult.choices[0].message.content || rawResult.choices[0].message.content.trim() === '') {
        console.warn(`【神识印记-诊断】AI返回了空的content，这通常表示模型配置问题或提示词过于复杂`);
      }
    }
  }
}

/**
 * 获取SillyTavern助手API，适配iframe环境。
 * @returns {any} - 返回TavernHelper对象
 */
function getTavernHelper(): any {
  console.log('【神识印记】开始检查TavernHelper可用性...');
  console.log('【神识印记】window.parent存在:', !!window.parent);
  console.log('【神识印记】window.parent.TavernHelper存在:', !!window.parent?.TavernHelper);
  console.log('【神识印记】window.parent.TavernHelper.generateRaw存在:', !!window.parent?.TavernHelper?.generateRaw);

  if (window.parent?.TavernHelper?.generateRaw) {
    console.log('【神识印记】TavernHelper检查通过，返回对象');
    return window.parent.TavernHelper;
  }

  console.error('【神识印记】TavernHelper检查失败');
  toast.error('感应酒馆助手灵脉失败，请确认在SillyTavern环境中运行！');
  throw new Error('TavernHelper API not found in window.parent.');
}


// =======================================================================
//                                提示词定义
// =======================================================================

// 通用指令：扮演专家角色，并严格遵循JSON格式
const ROLE_PLAY_INSTRUCTION = `
# **一、 角色扮演**
你是一位精通东方玄幻设定的“天机阁”推演大师。你的任务是创造独特、有趣且符合逻辑的修仙世界元素。

# **二、 输出格式 (至关重要)**
**你必须严格按照任务指定的JSON格式输出，绝对不能包含任何JSON格式之外的解释、注释或任何额外文本。**
`;

// 1. 世界生成提示词
const WORLD_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：开辟鸿蒙**
请生成一个独特的修仙世界设定。

## **具体要求：**
1.  **世界命名:** 起一个富有修仙世界古典的名字 (例如: 玄黄大界, 沧澜古陆, 碎星天域)。
2.  **世界描述:** 用200-400字，描绘这个世界的宏观背景、独特的修炼体系、能量来源或重大历史事件。使其感觉独一无二。
3.  **时代背景:** 定义当前所处的时代特征 (例如: 上古遗迹频出，黄金大世 / 仙路断绝，末法时代 / 灵气复苏，都市修仙 / 魔族入侵，烽烟四起)。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "世界名称",
  "description": "详细的世界背景描述...",
  "era": "当前时代背景"
}
\`\`\`
`;

// 2. 天资等级生成提示词
const TALENT_TIER_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：天定仙缘**
请生成一个独特的天资等级。

## **具体要求：**
1.  **天资命名:** 起一个富有层次感的名字 (例如: 凡夫俗子, 中人之姿, 天生灵秀, 气运之子, 大道亲和)。
2.  **天资描述:** 简要描述该天资等级的特点。
3.  **总点数:** 设定一个介于10到50之间的整数，作为该天资等级可分配的天道点数。
4.  **稀有度:** 设定一个1到5的整数（1最常见，5最稀有）。
5.  **颜色:** 提供一个十六进制颜色代码，用于UI显示。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "天资名称",
  "description": "天资特点描述",
  "total_points": 25,
  "rarity": 3,
  "color": "#A020F0"
}
\`\`\`
`;

// 3. 出身背景生成提示词
const ORIGIN_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：轮回之始**
请生成一个独特的出身背景。

## **具体要求：**
1.  **出身命名:** 起一个能体现其阶级或特点的名字 (例如: 边陲猎户, 书香门第, 没落王孙, 宗门弃徒)。
2.  **背景故事:** 用100-200字，生动地描述这个出身的经历和故事。
3.  **天道点消耗:** 设定一个介于-10到10之间的整数。正面出身消耗点数，负面出身提供点数。
4.  **稀有度:** 设定一个1到5的整数（1最常见，5最稀有）。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "出身名称",
  "description": "生动的背景故事...",
  "talent_cost": 5,
  "rarity": 2
}
\`\`\`
`;

// 4. 灵根生成提示词
const SPIRIT_ROOT_ITEM_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：灵根天定**
请生成一种独特的灵根。

## **具体要求：**
1.  **灵根命名:** 起一个独特的名字，可以不是传统的五行灵根 (例如: 废灵根, 混沌灵根, 太阴灵根, 剑心通明)。
2.  **特点描述:** 描述该灵根的修炼特性、优缺点。
3.  **基础倍率:** 设定一个0.1到5.0之间的小数，代表基础修炼速度倍率。
4.  **天道点消耗:** 设定一个介于-10到20之间的整数。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "灵根名称",
  "description": "灵根的修炼特性、优缺点",
  "base_multiplier": 1.5,
  "talent_cost": 10
}
\`\`\`
`;

// 5. 天赋生成提示词
const TALENT_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：命格造化**
请生成一个独特的修仙天赋。

## **具体要求：**
1.  **天赋命名:** 起一个言简意赅且有趣的名字 (例如: 老而弥坚, 丹毒免疫, 话痨, 一诺千金)。
2.  **效果描述:** 清晰地描述天赋带来的正面或负面效果。
3.  **天道点消耗:** 设定一个介于-10到10之间的整数。正面天赋消耗点数，负面天赋提供点数。

## **四、 JSON输出格式**
\`\`\`json
{
  "name": "天赋名称",
  "description": "清晰的天赋效果描述",
  "talent_cost": 3
}
\`\`\`
`;


// 6. 地图生成提示词 (坤舆图志) v6 - 指令驱动
const MAP_GENERATION_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：衍化世界，记录法旨**
你是一位名为"天道书记官"的存在。你的任务是为一方新生的修仙世界衍化其山川地理，并将结果以“天道指令”的格式记录下来。

## **核心任务:**
1.  **衍化舆图:** 在你的“神识”中，构想并生成一份完整的 **GeoJSON** 格式的世界舆图。
    *   坐标系: 像素坐标, X/Y轴范围: 0-8192。
    *   必须包含 **1个主大陆 (Polygon)** 和 **8-15个**其他地理要素 (Point)，如宗门、城池、秘境等。
    *   地理要素的 \`properties\` 必须包含 \`type\`, \`name\`, \`description\` 字段。
    *   宗门必须有 \`power_level\` 属性。秘境必须有 \`danger_level\` 属性。
2.  **记录法旨:** 将你生成的完整GeoJSON对象，封装进一条 \`tavern_commands\` 指令中。

## **四、 输出格式 (必须严格遵守):**
你 **必须** 返回一个 **GM_Response** 格式的JSON对象。

\`\`\`json
{
  "text": "鸿蒙初判，清浊始分。吾以神念衍化，为这方名为'（请使用下方提供的世界名称）'的新生世界，定下山川脉络，划定万古基石。此间地理，尽在其中，待有缘人一探究竟。",
  "around": "虚空中，一幅巨大的光幕缓缓展开，其上星罗棋布，正是这方世界的完整舆图。光幕流转，似乎蕴含着无穷奥秘。",
  "tavern_commands": [
    {
      "action": "set",
      "scope": "global",
      "key": "world.mapData",
      "value": {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "geometry": {
              "type": "Polygon",
              "coordinates": [[[1000, 1000], [7000, 1200], [7500, 6500], [2000, 7000], [1000, 1000]]]
            },
            "properties": {
              "type": "continent",
              "name": "（请使用下方提供的世界名称）",
              "description": "（请使用下方提供的世界描述）"
            }
          },
          {
            "type": "Feature",
            "geometry": { "type": "Point", "coordinates": [3500, 2800] },
            "properties": {
              "type": "sect",
              "name": "太虚剑宗",
              "description": "天下第一剑道圣地",
              "power_level": "一流"
            }
          }
        ]
      }
    }
  ]
}
\`\`\`
**重要：只输出JSON，不要任何解释文字！**
`;



// =======================================================================
//                           通用AI生成器 (最终版)
// =======================================================================

/**
* 通用AI生成器 (使用 TavernHelper.generateRaw)
* @param prompt - 提示词
* @param typeName - 类型名称 (用于日志)
* @returns {Promise<any>} 解析后的JSON对象
*/
async function generateItemWithTavernAI<T>(prompt: string, typeName: string, showToast: boolean = true): Promise<Partial<T>> {
  try {
    const helper = getTavernHelper();
    if (showToast) {
      toast.info(`天机运转，推演${typeName}...`);
    }

    console.log(`【神识印记】开始调用TavernHelper.generateRaw，类型: ${typeName}`);

    // 使用 TavernHelper.generateRaw API，优化参数以提高生成质量
    const rawResult = await helper.generateRaw({
      ordered_prompts: [{ role: 'system', content: prompt }],
      generation_args: {
        temperature: 0.8, // 适度提高创造性
        max_new_tokens: 4096, // 大幅增加最大长度，支持小说级别的内容生成
        top_p: 0.95, // 提高多样性
        top_k: 50, // 增加词汇选择范围
        repetition_penalty: 1.05, // 减少重复惩罚避免过度限制
        do_sample: true, // 确保采样模式开启
        pad_token_id: 50256, // 设置padding token
        min_new_tokens: 200, // 设置最小输出长度
        length_penalty: 1.1, // 鼓励更长的输出
      }
    });

    console.log(`【神识印记】TavernHelper.generateRaw调用完成，返回类型:`, typeof rawResult);
    console.log(`【神识印记】返回值:`, rawResult);

    // 添加诊断信息
    diagnoseAIResponse(rawResult, typeName);

    if (!rawResult) {
      console.error(`【神识印记】AI返回null或undefined，返回值:`, rawResult);
      throw new Error(`AI未返回任何${typeName}内容。`);
    }

    if (typeof rawResult !== 'string') {
      console.error(`【神识印记】AI返回非字符串类型，返回类型:`, typeof rawResult, `，返回值:`, rawResult);
      throw new Error(`AI返回的${typeName}数据类型错误，期望字符串但得到${typeof rawResult}。`);
    }

    if (rawResult.trim() === '') {
      console.error(`【神识印记】AI返回空字符串内容`);
      throw new Error(`AI返回了空的${typeName}内容，可能是模型配置或提示词问题。`);
    }

    console.log(`【神识印记】AI返回的原始${typeName}数据:`, rawResult);

    // 清理可能的markdown标记和多余空白
    const cleanedResult = rawResult
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim();

    // 尝试从返回结果中提取JSON字符串
    const jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`【神识印记】原始AI输出 (${typeName}):`, rawResult);
      console.error(`【神识印记】清理后的输出 (${typeName}):`, cleanedResult);
      throw new Error(`AI返回内容中未找到有效的JSON结构。`);
    }
    const jsonString = jsonMatch[0];

    try {
      const parsedData = JSON.parse(jsonString);
      console.log(`【神识印记】成功解析${typeName}数据:`, parsedData);
      return parsedData as Partial<T>;
    } catch (parseError) {
      console.error(`【神识印记】无法解析的JSON (${typeName}):`, jsonString);
      console.error(`【神识印记】原始AI输出 (${typeName}):`, rawResult);
      console.error(`【神识印记】解析错误详情:`, parseError);
      throw new Error(`AI返回的${typeName}格式错乱，无法解析。`);
    }

  } catch (error: any) {
    console.error(`【神识印记】调用酒馆AI生成${typeName}失败:`, error);
    console.error(`【神识印记】错误类型:`, error.name);
    console.error(`【神识印记】错误消息:`, error.message);
    console.error(`【神识印记】错误堆栈:`, error.stack);

    // 根据错误类型提供更详细的错误信息，但不显示toast，由调用方决定是否显示
    let errorMessage = `${typeName}推演失败`;
    if (error.message?.includes('Bad Request')) {
      errorMessage += ': 请求参数不正确，请检查模型配置';
    } else if (error.message?.includes('timeout')) {
      errorMessage += ': 请求超时，请稍后重试';
    } else {
      errorMessage += `: ${error.message}`;
    }

    // 只在showToast为true时显示toast，避免双弹窗
    if (showToast) {
      toast.error(errorMessage);
    }
    throw error;
  }
}

// =======================================================================
//                            具体类型的AI生成函数
// =======================================================================

export async function generateWorldWithTavernAI(): Promise<World> {
  const parsed = await generateItemWithTavernAI<World>(WORLD_ITEM_GENERATION_PROMPT, '世界');
  return {
    id: Date.now(),
    name: parsed.name || '未知世界',
    description: parsed.description || '',
    era: parsed.era || '未知时代',
  };
}

export async function generateTalentTierWithTavernAI(): Promise<TalentTier> {
  const parsed = await generateItemWithTavernAI<TalentTier>(TALENT_TIER_ITEM_GENERATION_PROMPT, '天资');
  return {
    id: Date.now(),
    name: parsed.name || '凡俗之资',
    description: parsed.description || '',
    total_points: parsed.total_points || 10,
    rarity: parsed.rarity || 1,
    color: parsed.color || '#FFFFFF',
  };
}

export async function generateOriginWithTavernAI(): Promise<Origin> {
  const parsed = await generateItemWithTavernAI<Origin>(ORIGIN_ITEM_GENERATION_PROMPT, '出身');
  return {
    id: Date.now(),
    name: parsed.name || '平凡人家',
    description: parsed.description || '',
    talent_cost: parsed.talent_cost || 0,
    rarity: parsed.rarity || 1,
    attribute_modifiers: null, // AI不生成复杂属性
  };
}

export async function generateSpiritRootWithTavernAI(): Promise<SpiritRoot> {
  const parsed = await generateItemWithTavernAI<SpiritRoot>(SPIRIT_ROOT_ITEM_GENERATION_PROMPT, '灵根');
  return {
    id: Date.now(),
    name: parsed.name || '凡人灵根',
    description: parsed.description || '',
    base_multiplier: parsed.base_multiplier || 1.0,
    talent_cost: parsed.talent_cost || 0,
  };
}

export async function generateTalentWithTavernAI(): Promise<Talent> {
    const parsed = await generateItemWithTavernAI<Talent>(TALENT_GENERATION_PROMPT, '天赋');
    return {
        id: Date.now(),
        name: parsed.name || '平平无奇',
        description: parsed.description || '没有任何特殊之处。',
        talent_cost: parsed.talent_cost || 0,
        effects: null,
        rarity: 3,
    };
}


// =======================================================================
//                           世界书相关函数
// =======================================================================

/**
 * 根据世界背景，调用AI生成地图信息（创世流程专用）
 * 此版本直接使用专业的 MAP_GENERATION_PROMPT，并将世界描述注入其中。
 * @param world 包含世界描述的世界对象
 */
export async function generateMapFromWorld(world: World): Promise<any> {
    // 使用专业的MAP_GENERATION_PROMPT，并将世界信息注入其中
    const worldInfo = `\n\n## **当前世界信息**\n世界名称: ${world.name}\n时代背景: ${world.era}\n世界描述: ${world.description}\n\n请基于以上世界信息生成对应的地图。`;
    const prompt = MAP_GENERATION_PROMPT + worldInfo;

    try {
        const helper = getTavernHelper();

        console.log("【神识印记】准备向天机阁问询舆图...");
        console.log("【神识印记】世界信息:", { name: world.name, era: world.era });

        // 使用针对地图生成优化的 generateRaw API 参数
        const rawResult = await helper.generateRaw({
            ordered_prompts: [{ role: 'system', content: prompt }],
            generation_args: {
                temperature: 0.9, // 提高创造性，鼓励丰富内容
                max_new_tokens: 8192, // 超大输出长度限制，支持完整地图数据生成
                top_p: 0.98, // 提高多样性
                top_k: 100, // 增加词汇选择范围
                repetition_penalty: 1.02, // 降低重复惩罚，避免过早停止
                do_sample: true, // 确保采样模式开启
                pad_token_id: 50256, // 设置padding token
                eos_token_id: 50256, // 设置结束token，防止过早结束
                min_new_tokens: 1000, // 设置较高最小输出长度，确保生成足够内容
                length_penalty: 1.3, // 强烈鼓励更长的输出
            }
        });

        console.log("【神识印记】天机阁已回应舆图信息，开始解析...");

        if (!rawResult) {
            console.error('【神识印记】天机阁回应为null或undefined:', rawResult);
            throw new Error('天机阁未返回任何舆图数据。');
        }

        if (typeof rawResult !== 'string') {
            console.error('【神识印记】天机阁回应类型错误，期望字符串但得到:', typeof rawResult);
            throw new Error('天机阁返回的舆图数据类型错误。');
        }

        if (rawResult.trim() === '') {
            console.error('【神识印记】天机阁回应为空字符串');
            throw new Error('天机阁返回了空的舆图数据，可能是模型配置问题。');
        }

        console.log("【神识印记】原始舆图回应:", rawResult);

        // 尝试从返回结果中提取JSON
        let geoJsonData;
        try {
            // 清理可能的markdown标记
            const cleanedText = rawResult
                .replace(/```json\s*/g, '')
                .replace(/```\s*/g, '')
                .trim();

            // 尝试找到JSON对象，优先寻找mapData结构
            let jsonMatch = cleanedText.match(/\{\s*"mapData"\s*:\s*\{[\s\S]*?\}\s*\}/);
            if (jsonMatch) {
                const outerJson = JSON.parse(jsonMatch[0]);
                geoJsonData = outerJson.mapData;
                console.log("【神识印记】成功提取mapData结构:", geoJsonData);
            } else {
                // 如果没找到mapData结构，尝试直接查找GeoJSON
                jsonMatch = cleanedText.match(/\{\s*"type"\s*:\s*"FeatureCollection"[\s\S]*?\}/);
                if (!jsonMatch) {
                    // 最后尝试找任何JSON对象
                    jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
                }

                if (!jsonMatch) {
                    console.error('【神识印记】无法在回应中找到JSON:', rawResult);
                    throw new Error('天机阁回应中未包含有效的JSON数据。');
                }

                let jsonStringToParse = jsonMatch[0];
                try {
                    geoJsonData = JSON.parse(jsonStringToParse);
                } catch (e) {
                    console.warn('【神识印记】初次解析舆图失败，尝试自动修复...');
                    // 尝试修复因AI错误导致的多余的末尾引号
                    const sanitizedJsonString = jsonStringToParse.replace(/"\s*([,}])/g, '"$1');
                    try {
                        geoJsonData = JSON.parse(sanitizedJsonString);
                        console.log('【神识印记】舆图自动修复并解析成功！');
                    } catch (finalError) {
                        console.error('【神识印记-衍化山河失败根源】自动修复后解析依然失败:', finalError);
                        console.error('【神识印记】原始回应内容:', rawResult);
                        throw new Error('天机阁回应的舆图格式无法解析，且自动修复失败。');
                    }
                }
                console.log("【神识印记】成功解析舆图数据:", geoJsonData);
            }

        } catch (e) {
            console.error('【神识印记-衍化山河失败根源】解析失败:', e);
            console.error('【神识印记】原始回应内容:', rawResult);
            // 此处的错误现在由内部的try-catch处理，但保留以防万一
            if (e instanceof Error) {
              throw e;
            }
            throw new Error('解析舆图时发生未知错误。');
        }

        // 验证GeoJSON结构
        if (geoJsonData && geoJsonData.type === 'FeatureCollection' && Array.isArray(geoJsonData.features)) {
            console.log("【神识印记】舆图验证通过，包含", geoJsonData.features.length, "个地理要素");
            return geoJsonData;
        } else {
            console.error('【神识印记-衍化山河失败根源】舆图结构无效:', geoJsonData);
            throw new Error('天机阁生成的舆图不符合GeoJSON规范。');
        }

    } catch (error: any) {
        console.error('【神识印记-衍化山河失败根源】与天机阁沟通失败:', error);
        console.error('【神识印记】错误详情:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });

        // 生成一个默认的简单地图作为后备方案
        console.log("【神识印记】启用备用舆图方案...");
        return {
            type: "FeatureCollection",
            features: [
                {
                    type: "Feature",
                    geometry: {
                        type: "Polygon",
                        coordinates: [[[100, 20], [140, 20], [140, 50], [100, 50], [100, 20]]]
                    },
                    properties: {
                        featureType: "continent",
                        name: world.name || "神州大陆",
                        description: world.description || "一片广袤的修仙大陆"
                    }
                },
                {
                    type: "Feature",
                    geometry: {
                        type: "Point",
                        coordinates: [120, 35]
                    },
                    properties: {
                        featureType: "city",
                        continent: world.name || "神州大陆",
                        name: "凌云城",
                        description: "大陆中心的繁华修仙城市",
                        icon: "city-gate"
                    }
                }
            ]
        };
    }
}


/**
 * 调用酒馆AI生成世界地图信息 (完整版，可用于手动刷新或扩展)
 */
export async function generateMapData(): Promise<any> {
    const result = await generateItemWithTavernAI<any>(MAP_GENERATION_PROMPT, '舆图');
    // AI应返回 { mapData: GeoJSONObject } 结构
    if (result && result.mapData && result.mapData.type === 'FeatureCollection') {
        return result.mapData; // 直接返回GeoJSON对象
    } else {
        console.error('从AI返回的舆图数据结构无效:', result);
        toast.error('AI生成的舆图数据格式不符合GeoJSON规范。');
        return null;
    }
}


// =======================================================================
//                           初始消息生成 (GM v2)
// =======================================================================

const INITIAL_MESSAGE_PROMPT = `${ROLE_PLAY_INSTRUCTION}
# **三、 生成任务：道友降世 (GM)**
你现在是此方世界的“天道主宰”，一个智能游戏主控(GM)。你的任务是为一名新生的道友，生成其降世的完整初始状态。

## **输入信息 (Input):**
你将收到一个 **GM_Request** 格式的JSON对象，包含了角色和世界的全部初始信息。示例如下：
\`\`\`json
INPUT_PLACEHOLDER
\`\`\`

## **核心任务:**
1.  **推演过往 (Handle Age):** 如果角色年龄不为0，你必须根据其出身、天赋、灵根和气运，在返回的 \`text\` 字段中，简要叙述从其出生到当前年龄的关键经历。
2.  **选定或创造降生点 (Select Spawn Point):** 根据角色的气运，从地图中选择一个合理的初始位置。
3.  **赋予初始状态 (Grant Initial State):** 根据角色的出身和推演的过往经历，使用 \`tavern_commands\` 指令集，为其赋予合理的初始状态。例如：
    *   猎户出身，可使用 \`push\` 指令向 \`chat.inventory\` 数组添加一把“旧猎弓”。
    *   若经历过奇遇，可使用 \`set\` 指令为角色添加一个新状态，如 \`chat.character.skills.ancient_reading = true\`。
    *   必须在 \`text\` 字段中，将降生场景和获得的初始状态自然地描绘出来。

## **四、 输出格式 (Output - 必须严格遵守):**
你 **必须** 返回一个 **GM_Response** 格式的JSON对象，其中必须包含 \`tavern_commands\` 数组。

\`\`\`json
{
  "text": "你在一阵颠簸中醒来，发现自己正躺在一辆摇晃的马车上。空气中弥漫着草木与泥土的芬芳。你记起来，你是【书香门第】的次子，因不喜仕途，年仅十六便外出游学。昨日路遇山匪，幸被一位路过的修士所救，他见你颇有灵性，便赠予你一枚【纳戒】，并指点你前往【青云宗】尝试拜山门。\\n\\n你低头看去，一枚古朴的戒指正戴在你的手指上。",
  "around": "一辆简陋的马车，车外是崎岖的山路，远处可见连绵的山脉轮廓。",
  "tavern_commands": [
    {
      "action": "set",
      "scope": "chat",
      "key": "character.location",
      "value": "青云宗山下"
    },
    {
      "action": "push",
      "scope": "chat",
      "key": "inventory",
      "value": { "name": "纳戒", "type": "法宝", "description": "一枚最基础的储物戒指，内有三尺见方的空间。" }
    }
  ]
}
\`\`\`
`;

/**
 * 调用酒馆AI生成初始降世消息 (GM模式)
 * @param character 基础角色数据对象
 * @param creationDetails 包含年龄和描述来源的创建详情
 * @param mapData AI生成的GeoJSON地图数据
 */
export async function generateInitialMessage(
  character: CharacterData,
  creationDetails: { age: number; originName: string; spiritRootName: string; },
  mapData: any
): Promise<GM_Response> {
  try {
    // 1. 构造AI需要的、带有附加信息 CharacterData 对象
    const characterForAI = {
      ...character,
      age: creationDetails.age,
      description: `出身于${creationDetails.originName}，拥有${creationDetails.spiritRootName}。`,
    };

    // 2. 构建标准GM请求
    const request = buildGmRequest(character, creationDetails, mapData);

    // 3. 将请求对象注入到提示词模板中
    const prompt = INITIAL_MESSAGE_PROMPT
      .replace(
        'INPUT_PLACEHOLDER',
        JSON.stringify(request, null, 2) // 格式化JSON以便AI更好地阅读
      );

    console.log('【神识印记】准备生成天道初言，提示词长度:', prompt.length);

    // 4. 调用通用生成器，并期望返回GM_Response格式，不显示toast避免双弹窗
    const result = await generateItemWithTavernAI<GM_Response>(prompt, '天道初言', false);

    // 5. 验证结果结构
    if (!result || !result.text) {
      console.error('【神识印记】AI返回的初始消息结构无效:', result);
      throw new Error('AI返回的初始消息格式不正确');
    }

    // 6. 确保tavern_commands是数组
    if (!Array.isArray(result.tavern_commands)) {
      console.warn('【神识印记】AI未返回tavern_commands数组，设置为空数组');
      result.tavern_commands = [];
    }

    console.log('【神识印记】成功生成天道初言，命令数量:', result.tavern_commands?.length || 0);

    // 7. 返回结构化的响应
    return result as GM_Response;

  } catch (error: any) {
    console.error('【神识印记】生成天道初言失败:', error);
    console.error('【神识印记】错误详情:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });

    // 返回一个默认的GM响应作为后备，不抛出错误避免双重错误处理
    const fallbackResponse: GM_Response = {
      text: `${character.character_name}，${creationDetails.originName}出身，拥有${creationDetails.spiritRootName}，怀着修仙的梦想踏入了这片广阔的天地。\n\n你的修行之路从此开始，前方有无数的机遇与挑战等待着你。`,
      around: "一片陌生的土地，远山如黛，近水如镜。",
      tavern_commands: [
        {
          action: "set",
          scope: "chat",
          key: "character.location",
          value: "修仙世界边缘"
        }
      ]
    };

    console.log('【神识印记】使用默认天道初言:', fallbackResponse);
    return fallbackResponse;
  }
}
