import { aiService } from '@/services/aiService';
import type { TavernHelper } from '@/types';

/**
 * 获取酒馆助手（兼容包装器）
 * 现在返回一个兼容的包装器，支持酒馆和自定义API两种模式
 */
export function getTavernHelper(): TavernHelper | null {
  // 返回一个兼容的包装器，内部调用 aiService
  return {
    generate: async (options: any) => {
      return await aiService.generate(options);
    },
    generateRaw: async (options: any) => {
      return await aiService.generateRaw(options);
    },
    getVariables: async (options: any) => {
      // 如果是酒馆模式，调用真实的 TavernHelper
      if (typeof window !== 'undefined' && (window as any).TavernHelper) {
        return await (window as any).TavernHelper.getVariables(options);
      }
      // 自定义API模式不支持变量系统
      return {};
    },
    insertOrAssignVariables: async (variables: any, options: any) => {
      // 如果是酒馆模式，调用真实的 TavernHelper
      if (typeof window !== 'undefined' && (window as any).TavernHelper) {
        return await (window as any).TavernHelper.insertOrAssignVariables(variables, options);
      }
      // 自定义API模式不支持变量系统
      return;
    }
  } as TavernHelper;
}

export async function getCurrentCharacterName(): Promise<string | null> {
  const helper = getTavernHelper();
  if (!helper) {
    return null;
  }

  try {
    const vars = await helper.getVariables({ type: 'global' });
    return (vars['persona.name'] as string) || (vars['name'] as string) || null;
  } catch (error) {
    console.warn('[Tavern] 无法获取角色名:', error);
    return null;
  }
}

export async function clearAllCharacterData(): Promise<void> {
  const helper = getTavernHelper();
  if (!helper) {
    console.warn('[Tavern] 酒馆助手不可用，跳过清理');
    return;
  }

  try {
    await helper.insertOrAssignVariables({}, { type: 'global' });
  } catch (error) {
    console.error('[Tavern] 清除酒馆变量失败:', error);
    throw error;
  }
}