/**
 * 数据验证和修复工具
 * 用于验证AI生成的数据结构，并在发现问题时进行修复或提供默认值
 */

import type { GM_Response } from '@/types/AIGameMaster';
import { toast } from './toast';

/**
 * 验证并修复GM响应数据
 */
export function validateAndFixGMResponse(data: unknown, context: string = '未知'): GM_Response | null {
  try {
    if (!data || typeof data !== 'object') {
      console.error(`[数据验证] ${context}: 数据不是对象`, data);
      return null;
    }

    const response = data as Partial<GM_Response>;

    // 必须有text字段
    if (!response.text || typeof response.text !== 'string') {
      console.error(`[数据验证] ${context}: 缺少text字段或格式错误`);
      return null;
    }

    // 修复tavern_commands
    if (!response.tavern_commands) {
      console.warn(`[数据验证] ${context}: 缺少tavern_commands，使用空数组`);
      response.tavern_commands = [];
    }

    if (!Array.isArray(response.tavern_commands)) {
      console.warn(`[数据验证] ${context}: tavern_commands不是数组，尝试修复`);
      response.tavern_commands = [];
    }

    // 验证每个命令
    const validCommands: any[] = [];
    const allowedActions = ['set', 'add', 'delete', 'push', 'pull'];
    const allowedScopes = ['global', 'chat', 'character', 'message'];

    for (let i = 0; i < response.tavern_commands.length; i++) {
      const cmd = response.tavern_commands[i];

      if (!cmd || typeof cmd !== 'object') {
        console.warn(`[数据验证] ${context}: 命令${i}不是对象，跳过`);
        continue;
      }

      // 验证action
      if (!cmd.action || typeof cmd.action !== 'string') {
        console.warn(`[数据验证] ${context}: 命令${i}缺少action，跳过`);
        continue;
      }

      if (!allowedActions.includes(cmd.action)) {
        console.warn(`[数据验证] ${context}: 命令${i}的action "${cmd.action}" 不合法，跳过`);
        continue;
      }

      // 验证scope，默认为chat
      if (!cmd.scope || typeof cmd.scope !== 'string') {
        console.warn(`[数据验证] ${context}: 命令${i}缺少scope，默认使用chat`);
        cmd.scope = 'chat';
      }

      if (!allowedScopes.includes(cmd.scope)) {
        console.warn(`[数据验证] ${context}: 命令${i}的scope "${cmd.scope}" 不合法，改为chat`);
        cmd.scope = 'chat';
      }

      // 验证key
      if (!cmd.key || typeof cmd.key !== 'string') {
        console.warn(`[数据验证] ${context}: 命令${i}缺少key，跳过`);
        continue;
      }

      // delete操作不需要value
      if (cmd.action !== 'delete' && cmd.value === undefined) {
        console.warn(`[数据验证] ${context}: 命令${i}缺少value，跳过`);
        continue;
      }

      validCommands.push(cmd);
    }

    response.tavern_commands = validCommands;

    // 可选字段：提供默认值
    if (!response.short_term_memory) {
      response.short_term_memory = '';
    }
    if (!response.mid_term_memory) {
      response.mid_term_memory = '';
    }

    console.log(`[数据验证] ${context}: 验证通过，有效命令数: ${validCommands.length}`);
    return response as GM_Response;

  } catch (error) {
    console.error(`[数据验证] ${context}: 验证过程出错`, error);
    return null;
  }
}

/**
 * 验证并修复角色状态数据
 */
export function validatePlayerState(state: any): any {
  if (!state || typeof state !== 'object') {
    console.warn('[数据验证] 角色状态数据无效，使用默认值');
    return getDefaultPlayerState();
  }

  const fixed: any = { ...state };

  // 验证数值类型的字段
  const numericFields = ['境界', '声望'];
  for (const field of numericFields) {
    if (fixed[field] !== undefined && typeof fixed[field] !== 'number') {
      console.warn(`[数据验证] ${field}不是数字，尝试转换`);
      const parsed = parseFloat(fixed[field]);
      fixed[field] = isNaN(parsed) ? 0 : parsed;
    }
  }

  // 验证资源对象（气血、灵气、神识等）
  const resourceFields = ['气血', '灵气', '神识', '寿命'];
  for (const field of resourceFields) {
    if (!fixed[field] || typeof fixed[field] !== 'object') {
      console.warn(`[数据验证] ${field}缺失或格式错误，使用默认值`);
      fixed[field] = { 当前: 100, 上限: 100 };
    } else {
      if (typeof fixed[field].当前 !== 'number') {
        fixed[field].当前 = 100;
      }
      if (typeof fixed[field].上限 !== 'number') {
        fixed[field].上限 = 100;
      }
    }
  }

  // 验证数组字段
  const arrayFields = ['物品栏', '技能', '功法'];
  for (const field of arrayFields) {
    if (!Array.isArray(fixed[field])) {
      console.warn(`[数据验证] ${field}不是数组，使用空数组`);
      fixed[field] = [];
    }
  }

  // 验证位置信息
  if (!fixed.位置 || typeof fixed.位置 !== 'object') {
    console.warn('[数据验证] 位置信息缺失，使用默认值');
    fixed.位置 = {
      描述: '未知位置',
      坐标: { 经度: 0, 纬度: 0 }
    };
  }

  return fixed;
}

/**
 * 获取默认角色状态
 */
function getDefaultPlayerState(): any {
  return {
    境界: 0,
    气血: { 当前: 100, 上限: 100 },
    灵气: { 当前: 100, 上限: 100 },
    神识: { 当前: 100, 上限: 100 },
    寿命: { 当前: 18, 上限: 100 },
    声望: 0,
    物品栏: [],
    技能: [],
    功法: [],
    位置: {
      描述: '未知位置',
      坐标: { 经度: 0, 纬度: 0 }
    }
  };
}

/**
 * 深度验证对象结构
 */
export function deepValidateObject(obj: unknown, schema: any, context: string = '根'): boolean {
  if (obj === null || obj === undefined) {
    console.error(`[深度验证] ${context}: 对象为null或undefined`);
    return false;
  }

  if (typeof obj !== 'object') {
    console.error(`[深度验证] ${context}: 不是对象类型`);
    return false;
  }

  for (const [key, validator] of Object.entries(schema)) {
    const value = (obj as any)[key];
    const fieldContext = `${context}.${key}`;

    if (typeof validator === 'function') {
      if (!validator(value)) {
        console.error(`[深度验证] ${fieldContext}: 验证失败`);
        return false;
      }
    } else if (typeof validator === 'object') {
      if (!deepValidateObject(value, validator, fieldContext)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * 安全获取嵌套属性
 */
export function safeGet(obj: any, path: string, defaultValue: any = null): any {
  try {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue;
      }
      current = current[key];
    }

    return current === undefined ? defaultValue : current;
  } catch (error) {
    console.warn(`[安全获取] 获取${path}失败:`, error);
    return defaultValue;
  }
}

/**
 * 安全设置嵌套属性
 */
export function safeSet(obj: any, path: string, value: any): boolean {
  try {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!current[key] || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return true;
  } catch (error) {
    console.error(`[安全设置] 设置${path}失败:`, error);
    return false;
  }
}

/**
 * 错误恢复包装器：执行函数，如果失败则使用默认值
 */
export function withFallback<T>(fn: () => T, fallback: T, context: string = '未知操作'): T {
  try {
    const result = fn();
    if (result === null || result === undefined) {
      console.warn(`[错误恢复] ${context}: 返回null/undefined，使用后备值`);
      return fallback;
    }
    return result;
  } catch (error) {
    console.error(`[错误恢复] ${context}: 执行失败，使用后备值`, error);
    toast.warning(`${context}失败，使用默认值`);
    return fallback;
  }
}

/**
 * 异步错误恢复包装器
 */
export async function withFallbackAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  context: string = '未知操作'
): Promise<T> {
  try {
    const result = await fn();
    if (result === null || result === undefined) {
      console.warn(`[错误恢复] ${context}: 返回null/undefined，使用后备值`);
      return fallback;
    }
    return result;
  } catch (error) {
    console.error(`[错误恢复] ${context}: 执行失败，使用后备值`, error);
    toast.warning(`${context}失败，使用默认值`);
    return fallback;
  }
}

/**
 * 验证JSON字符串并解析
 */
export function safeParseJSON<T = any>(jsonStr: string, defaultValue: T, context: string = '未知'): T {
  try {
    if (!jsonStr || typeof jsonStr !== 'string') {
      console.warn(`[JSON解析] ${context}: 输入不是字符串`);
      return defaultValue;
    }

    const parsed = JSON.parse(jsonStr);
    return parsed as T;
  } catch (error) {
    console.error(`[JSON解析] ${context}: 解析失败`, error);
    console.error(`[JSON解析] 原始字符串:`, jsonStr.substring(0, 200));
    return defaultValue;
  }
}

/**
 * 清理AI生成的文本中的特殊标记
 */
export function cleanAIText(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    // 移除markdown代码块标记
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    // 移除多余的引号
    .replace(/^["']|["']$/g, '')
    // 统一换行符
    .replace(/\r\n/g, '\n')
    // 移除多余的空白
    .trim();
}
