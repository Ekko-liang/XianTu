import { generateItemWithTavernAI } from '../tavernCore';
import {
  WORLD_ITEM_GENERATION_PROMPT,
  TALENT_TIER_ITEM_GENERATION_PROMPT,
  ORIGIN_ITEM_GENERATION_PROMPT,
  SPIRIT_ROOT_ITEM_GENERATION_PROMPT,
  TALENT_ITEM_GENERATION_PROMPT,
  TECHNIQUE_ITEM_GENERATION_PROMPT, // 使用优化后的功法生成提示词
} from '../prompts/gameElementPrompts';
import type { GM_Response } from '../../types/AIGameMaster';
import type { World, TalentTier, Origin, SpiritRoot, Talent, TechniqueItem } from '../../types'; // 导入功法类型
import { withRetry, RetryConditions } from '../retryHelper';
import { toast } from '../toast';

/**
 * 验证生成的数据是否包含必需字段
 */
function validateGeneratedItem(item: any, requiredFields: string[], typeName: string): boolean {
  if (!item || typeof item !== 'object') {
    console.error(`[生成验证] ${typeName}: 不是有效对象`);
    return false;
  }

  for (const field of requiredFields) {
    if (!(field in item)) {
      console.error(`[生成验证] ${typeName}: 缺少必需字段 "${field}"`);
      return false;
    }
  }

  return true;
}

/**
 * AI生成世界设定（带重试）
 */
export async function generateWorld(): Promise<World | null> {
  try {
    return await withRetry(
      async () => {
        const result = await generateItemWithTavernAI<World>(WORLD_ITEM_GENERATION_PROMPT, '世界设定');

        if (!result) {
          throw new Error('生成结果为空');
        }

        // 验证必需字段
        if (!validateGeneratedItem(result, ['名称', '描述'], '世界设定')) {
          throw new Error('生成的世界设定缺少必需字段');
        }

        return result;
      },
      {
        maxRetries: 3,
        showToast: false,
        shouldRetry: RetryConditions.aiGenerationError,
      }
    );
  } catch (error) {
    console.error('[生成器] 生成世界设定最终失败:', error);
    toast.error('生成世界设定失败，请重试');
    return null;
  }
}

/**
 * AI生成天资等级（带重试）
 */
export async function generateTalentTier(): Promise<TalentTier | null> {
  try {
    return await withRetry(
      async () => {
        const result = await generateItemWithTavernAI<TalentTier>(TALENT_TIER_ITEM_GENERATION_PROMPT, '天资等级');

        if (!result) {
          throw new Error('生成结果为空');
        }

        if (!validateGeneratedItem(result, ['名称', '描述'], '天资等级')) {
          throw new Error('生成的天资等级缺少必需字段');
        }

        return result;
      },
      {
        maxRetries: 3,
        showToast: false,
        shouldRetry: RetryConditions.aiGenerationError,
      }
    );
  } catch (error) {
    console.error('[生成器] 生成天资等级最终失败:', error);
    toast.error('生成天资等级失败，请重试');
    return null;
  }
}

/**
 * AI生成出身背景（带重试）
 */
export async function generateOrigin(): Promise<Origin | null> {
  try {
    return await withRetry(
      async () => {
        const result = await generateItemWithTavernAI<Origin>(ORIGIN_ITEM_GENERATION_PROMPT, '出身背景');

        if (!result) {
          throw new Error('生成结果为空');
        }

        if (!validateGeneratedItem(result, ['名称', '描述'], '出身背景')) {
          throw new Error('生成的出身背景缺少必需字段');
        }

        return result;
      },
      {
        maxRetries: 3,
        showToast: false,
        shouldRetry: RetryConditions.aiGenerationError,
      }
    );
  } catch (error) {
    console.error('[生成器] 生成出身背景最终失败:', error);
    toast.error('生成出身背景失败，请重试');
    return null;
  }
}

/**
 * AI生成灵根类型（带重试）
 */
export async function generateSpiritRoot(): Promise<SpiritRoot | null> {
  try {
    return await withRetry(
      async () => {
        const result = await generateItemWithTavernAI<SpiritRoot>(SPIRIT_ROOT_ITEM_GENERATION_PROMPT, '灵根类型');

        if (!result) {
          throw new Error('生成结果为空');
        }

        if (!validateGeneratedItem(result, ['名称', '描述'], '灵根类型')) {
          throw new Error('生成的灵根类型缺少必需字段');
        }

        return result;
      },
      {
        maxRetries: 3,
        showToast: false,
        shouldRetry: RetryConditions.aiGenerationError,
      }
    );
  } catch (error) {
    console.error('[生成器] 生成灵根类型最终失败:', error);
    toast.error('生成灵根类型失败，请重试');
    return null;
  }
}

/**
 * AI生成天赋技能（带重试）
 */
export async function generateTalent(): Promise<Talent | null> {
  try {
    return await withRetry(
      async () => {
        const result = await generateItemWithTavernAI<Talent>(TALENT_ITEM_GENERATION_PROMPT, '天赋技能');

        if (!result) {
          throw new Error('生成结果为空');
        }

        if (!validateGeneratedItem(result, ['名称', '描述'], '天赋技能')) {
          throw new Error('生成的天赋技能缺少必需字段');
        }

        return result;
      },
      {
        maxRetries: 3,
        showToast: false,
        shouldRetry: RetryConditions.aiGenerationError,
      }
    );
  } catch (error) {
    console.error('[生成器] 生成天赋技能最终失败:', error);
    toast.error('生成天赋技能失败，请重试');
    return null;
  }
}

/**
 * AI生成功法（带重试）
 */
export async function generateTechnique(): Promise<TechniqueItem | null> {
  try {
    return await withRetry(
      async () => {
        const result = await generateItemWithTavernAI<TechniqueItem>(TECHNIQUE_ITEM_GENERATION_PROMPT, '功法');

        if (!result) {
          throw new Error('生成结果为空');
        }

        if (!validateGeneratedItem(result, ['名称', '描述'], '功法')) {
          throw new Error('生成的功法缺少必需字段');
        }

        return result;
      },
      {
        maxRetries: 3,
        showToast: false,
        shouldRetry: RetryConditions.aiGenerationError,
      }
    );
  } catch (error) {
    console.error('[生成器] 生成功法最终失败:', error);
    toast.error('生成功法失败，请重试');
    return null;
  }
}



/**
 * 生成角色位置标点，用于在地图上标记角色位置
 */
export async function generatePlayerLocation(
    baseInfo: any, 
    characterInfo: any, 
    enhancedWorldConfig: any,
    mapBounds?: { minLng: number, maxLng: number, minLat: number, maxLat: number }
): Promise<GM_Response> {
    console.log('【角色位置生成】开始生成角色位置标点...');
    console.log('【角色位置生成】角色基础信息:', baseInfo);
    console.log('【角色位置生成】角色详细信息:', characterInfo);
    console.log('【角色位置生成】世界配置:', enhancedWorldConfig);
    console.log('【角色位置生成】地图边界:', mapBounds);

    // 使用地图边界或默认坐标范围
    const bounds = mapBounds || { minLng: 115.0, maxLng: 120.0, minLat: 35.0, maxLat: 42.0 };

    // 构建角色位置生成提示词
    const locationPrompt = `# 角色位置标点生成任务

你需要为刚刚踏入修仙世界的角色生成一个精确的位置标点，用于在世界地图上显示角色的当前位置。

## 角色信息
- 姓名: ${baseInfo.名字}
- 年龄: ${characterInfo.age}岁
- 出身: ${characterInfo.origin}
- 出生地: ${characterInfo.birthplace || characterInfo.origin}
- 世界背景: ${characterInfo.worldBackground}
- 世界时代: ${characterInfo.worldEra}
- 世界名称: ${characterInfo.worldName}

## 地图信息
- 经度范围: ${bounds.minLng} - ${bounds.maxLng}
- 纬度范围: ${bounds.minLat} - ${bounds.maxLat}
- 重要: 角色位置必须在已生成的世界地图的大洲范围内，不能在海洋中或边界外

## 要求

1. **根据角色出身确定合适的起始位置**
   - 如果是门派弟子：应该在对应宗门附近的大洲内
   - 如果是世家子弟：应该在家族势力范围内的大洲内
   - 如果是散修：应该在某个大洲的安全区域内
   - 如果是皇室：应该在皇城所在大洲内

2. **生成位置坐标**
   - 经度范围：${bounds.minLng} - ${bounds.maxLng}
   - 纬度范围：${bounds.minLat} - ${bounds.maxLat}
   - 确保坐标在大洲陆地范围内，不要在海洋或空白区域
   - 坐标应位于某个大洲的中心区域，避免边界位置

3. **输出格式要求**

必须严格按照以下JSON格式输出，作为酒馆命令：

\`\`\`json
{
  "text": "天机定位完成，${baseInfo.名字}的位置已锁定。你发现自己正身处[具体位置描述，位置名称必须按照'大洲名·后缀'格式，如'中土大陆·青石镇']，周围[环境描述]。**重要：必须按照'你发现自己正身处...'的完整格式描述，且位置名称必须是'大洲名·后缀'格式**",
  "mid_term_memory": "【初始定位】角色位置已确定，开始修仙之旅",
  "tavern_commands": [
    {
      "action": "set",
      "scope": "chat", 
      "key": "player_location_marker",
      "value": {
        "id": "player_start_position",
        "name": "${baseInfo.名字}的位置",
        "type": "player_location",
        "coordinates": {
          "longitude": [具体经度数值],
          "latitude": [具体纬度数值]
        },
        "description": "角色${baseInfo.名字}的当前位置",
        "marker_style": {
          "color": "#DC2626",
          "icon": "player",
          "size": "medium"
        }
      }
    }
  ]
}
\`\`\`

**位置描述格式要求**：
- ✅ 正确格式："你发现自己正身处中土大陆·赤泥镇的陶工坊外，周围是熟悉的窑烟和泥土香味。"
- ❌ 错误格式："赤泥镇" 或 "陶工坊" 或 "某某地点"
- 必须包含完整的场景描述，不能只写一个地名

请根据角色的出身背景和世界地图生成合适的位置标点。`;

    try {
        // 调用AI生成位置标点
        const result = await generateItemWithTavernAI<GM_Response>(
            locationPrompt, 
            '角色位置标点', 
            true, 
            2
        );

        if (!result) {
            console.warn('【角色位置生成】AI生成失败，使用默认位置');
            // 生成默认位置，使用地图边界的中心区域
            const centerLng = (bounds.minLng + bounds.maxLng) / 2;
            const centerLat = (bounds.minLat + bounds.maxLat) / 2;
            const defaultResponse: GM_Response = {
                text: `天机定位完成，${baseInfo.名字}的位置已锁定。你发现自己正身处中土大陆·${characterInfo.origin === '散修' ? '幽静山谷' : '安全区域'}，周围灵气淡薄但环境宜人。`,
                mid_term_memory: "【初始定位】角色位置已确定，开始修仙之旅",
                tavern_commands: [
                    {
                        action: "set",
                        scope: "chat",
                        key: "player_location_marker", 
                        value: {
                            id: "player_start_position",
                            name: `${baseInfo.名字}的位置`,
                            type: "player_location",
                            coordinates: {
                                longitude: centerLng + (Math.random() - 0.5) * 1, // 中心位置附近1度范围内随机
                                latitude: centerLat + (Math.random() - 0.5) * 1   // 中心位置附近1度范围内随机
                            },
                            description: `角色${baseInfo.名字}的当前位置`,
                            marker_style: {
                                color: "#DC2626",
                                icon: "player", 
                                size: "medium"
                            }
                        }
                    }
                ]
            };
            
            console.log('【角色位置生成】使用默认位置标点:', defaultResponse);
            return defaultResponse;
        }

        console.log('【角色位置生成】成功生成位置标点:', result);
        return result;
        
    } catch (error) {
        console.error('【角色位置生成】生成过程中出错:', error);
        
        // 错误时返回基础位置
        const fallbackResponse: GM_Response = {
            text: `虽遇天机扰动，但${baseInfo.名字}的大致位置已确定。你发现自己身处中土大陆·安全避难所，这是一个陌生但相对安全的地方。`,
            mid_term_memory: "【位置确定】虽遇干扰，但已安全定位",
            tavern_commands: [
                {
                    action: "set",
                    scope: "chat",
                    key: "player_location_marker",
                    value: {
                        id: "player_start_position",
                        name: `${baseInfo.名字}的位置`,
                        type: "player_location", 
                        coordinates: {
                            longitude: 117.0,
                            latitude: 38.0
                        },
                        description: `角色${baseInfo.名字}的当前位置`,
                        marker_style: {
                            color: "#DC2626",
                            icon: "player",
                            size: "medium"
                        }
                    }
                }
            ]
        };
        
        return fallbackResponse;
    }
}