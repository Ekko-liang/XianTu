import type { LocalCharacter, World, TalentTier, Origin, SpiritRoot, Talent } from '@/types';
import { toast } from '@/utils/toast';
import * as storage from '../utils/localStorageManager';

// =======================================================================
//                           核心数据结构定义
// =======================================================================

// =======================================================================

// 单个势力的结构
export interface Faction {
  name: string;
  type: string;
  alignment: string;
  location: string;
  powerLevel: string;
  description: string;
}


// GeoJSON 的基础类型定义，用于替代 any
export interface GeoJSONFeature {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: unknown[];
  };
}

export interface GeoJSONFeatureCollection {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
}
// 扩展后的本地角色，不再直接包含世界数据
export interface LocalCharacterWithGameData extends LocalCharacter {
  current_age: number; // 新增：当前年龄
  creationChoices: {
    origin?: Origin;
    spiritRoot?: SpiritRoot;
    talents?: Talent[];
    world?: { id: number; name: string; };
  };
  worldData: WorldInstanceData; // 新增：坤舆图志数据
}

// 单个世界实例的演化数据 (坤舆图志)
export interface WorldInstanceData {
  id: number; // 对应 World.id
  continentName: string | null;
  continentDescription: string | null;
  factions: Faction[];
  mapInfo: GeoJSONFeatureCollection | null; // 用于存储未来的Leaflet地图数据 (例如 GeoJSON)
}

// 自定义的创世设定数据结构 (存储于LocalStorage)
export type DADCustomData = {
  worlds: World[];
  talentTiers: TalentTier[];
  origins: Origin[];
  spiritRoots: SpiritRoot[];
  talents: Talent[];
};

// 酒馆变量中存储的完整游戏数据结构
export interface DADGameData {
  characters: Record<number, LocalCharacterWithGameData>;
  worldInstances: Record<number, WorldInstanceData>; // 新增：世界实例数据
  version: string;
  lastUpdated: string;
}

const GAME_DATA_KEY = 'DAD_gamedata';
const CURRENT_VERSION = '1.0.0';

// =======================================================================
//                           核心数据操作函数
// =======================================================================

/**
 * 获取一个默认的、空的本地游戏数据结构
 */
function getEmptyGameData(): DADGameData {
  return {
    characters: {},
    worldInstances: {},
    version: CURRENT_VERSION,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 从酒馆变量中加载完整的本地游戏数据
 * @returns {DADGameData}
 */
export function loadGameData(): DADGameData {
  try {
    let gameDataString: string | undefined;
    
    // 优先使用TavernHelper API
    if ((window.parent as any)?.TavernHelper?.getVariables) {
      console.log('【玄光镜】使用TavernHelper API加载数据...');
      const allGlobalVars = (window.parent as any).TavernHelper.getVariables({ type: 'global' });
      gameDataString = allGlobalVars?.[GAME_DATA_KEY];
    } else if (window.SillyTavern?.getContext) {
      // 备用方案
      console.log('【玄光镜】使用备用方案加载数据...');
      const context = window.SillyTavern.getContext();
      gameDataString = context.vars[GAME_DATA_KEY];
    } else {
      console.warn('非酒馆环境，无法加载本地数据。');
      return getEmptyGameData();
    }
    
    if (gameDataString) {
      try {
        const gameData = JSON.parse(gameDataString);
        console.log('【玄光镜】成功加载游戏数据:', gameData);
        
        // 验证数据结构，确保必要字段存在
        const validatedGameData: DADGameData = {
          characters: gameData.characters || {},
          worldInstances: gameData.worldInstances || {},
          version: gameData.version || CURRENT_VERSION,
          lastUpdated: gameData.lastUpdated || new Date().toISOString(),
        };
        
        console.log('【玄光镜】验证后的游戏数据:', validatedGameData);
        return validatedGameData;
      } catch (parseError) {
        console.error('【玄光镜】解析游戏数据失败:', parseError);
        console.error('【玄光镜】原始数据字符串:', gameDataString);
        toast.error('存档数据损坏，已重置为空存档。');
        return getEmptyGameData();
      }
    }
    
    console.log('【玄光镜】未找到已保存的游戏数据，返回空数据。');
    return getEmptyGameData();
  } catch (error) {
    console.error('加载本地游戏数据失败:', error);
    toast.error('读取本地洞天存档失败，可能已损坏。');
    return getEmptyGameData();
  }
}

/**
 * 将完整的本地游戏数据保存到酒馆变量
 * @param {DADGameData} gameData
 */
export async function saveGameData(gameData: DADGameData): Promise<void> {
  try {
    gameData.lastUpdated = new Date().toISOString();
    
    console.log('【玄光镜】准备铭刻入酒馆洞天的数据:', JSON.parse(JSON.stringify(gameData))); // 使用深拷贝打印，避免循环引用问题干扰日志本身
    
    const gameDataString = JSON.stringify(gameData);
    
    // 使用正确的TavernHelper API来保存数据
    if ((window.parent as any)?.TavernHelper?.insertOrAssignVariables) {
      console.log('【玄光镜】使用TavernHelper API保存数据...');
      await (window.parent as any).TavernHelper.insertOrAssignVariables({ [GAME_DATA_KEY]: gameDataString }, { type: 'global' });
      console.log('【玄光镜】成功将数据铭刻于酒馆洞天（通过TavernHelper）。');
    } else if (window.SillyTavern?.getContext) {
      // 备用方案：如果TavernHelper不可用，尝试直接设置
      console.log('【玄光镜】使用备用方案保存数据...');
      const context = window.SillyTavern.getContext();
      context.vars[GAME_DATA_KEY] = gameDataString;
      // 尝试触发保存
      if (context.saveGlobalVariable) {
        await context.saveGlobalVariable(GAME_DATA_KEY, gameDataString);
      }
      console.log('【玄光镜】成功将数据铭刻于酒馆洞天（备用方案）。');
    } else {
      console.warn('非酒馆环境，无法保存本地数据。');
      return;
    }
    
  } catch (error) {
    console.error('【玄光镜】保存本地游戏数据失败! 具体错误:', error);
    console.error('【玄光镜】导致失败的数据结构:', gameData);
    toast.error('本地洞天存档失败！请检查控制台获取详细错误。');
    throw error;
  }
}

/**
 * 获取所有本地角色列表
 * @returns {Promise<LocalCharacterWithGameData[]>}
 */
export async function loadLocalCharacters(): Promise<LocalCharacterWithGameData[]> {
    const gameData = loadGameData();
    return Object.values(gameData.characters);
}

/**
 * 添加或更新一个本地角色
 * @param {LocalCharacterWithGameData} character
 */
export async function saveLocalCharacter(character: LocalCharacterWithGameData): Promise<void> {
    try {
        const gameData = loadGameData();
        
        // 确保characters对象存在
        if (!gameData.characters) {
            gameData.characters = {};
        }
        
        gameData.characters[character.id] = character;
        await saveGameData(gameData);
        console.log('【玄光镜】角色数据已成功保存，ID:', character.id);
    } catch (error) {
        console.error('【玄光镜】保存角色数据失败:', error);
        console.error('【玄光镜】角色数据:', character);
        throw error; // 重新抛出错误，让调用者处理
    }
}

/**
 * 删除一个本地角色
 * @param {number} characterId
 */
export async function deleteLocalCharacter(characterId: number): Promise<void> {
    const gameData = loadGameData();
    if (gameData.characters[characterId]) {
        delete gameData.characters[characterId];
        await saveGameData(gameData);
    }
}

/**
 * 清理localStorage中可能存在的重复数据
 * 这个函数用于修复历史数据问题
 */
export function cleanupDuplicateCustomData(): void {
    console.log('【玄光镜】开始清理重复的自定义数据...');
    
    // 先获取当前数据
    const currentData = loadCustomData();
    
    // 去重处理
    const cleanedData: DADCustomData = {
        worlds: removeDuplicates(currentData.worlds, 'id', 'name'),
        talentTiers: removeDuplicates(currentData.talentTiers, 'id', 'name'),
        origins: removeDuplicates(currentData.origins, 'id', 'name'),
        spiritRoots: removeDuplicates(currentData.spiritRoots, 'id', 'name'),
        talents: removeDuplicates(currentData.talents, 'id', 'name'),
    };
    
    // 检查是否有重复数据
    const hasDuplicates = Object.keys(currentData).some(key => {
        const originalCount = currentData[key as keyof DADCustomData].length;
        const cleanedCount = cleanedData[key as keyof DADCustomData].length;
        return originalCount !== cleanedCount;
    });
    
    if (hasDuplicates) {
        console.log('【玄光镜】发现重复数据，正在清理...');
        console.log('清理前:', currentData);
        console.log('清理后:', cleanedData);
        
        // 保存清理后的数据
        storage.setItem(storage.DAD_CUSTOM_DATA_KEY, cleanedData);
        console.log('【玄光镜】重复数据已清理完成。');
    } else {
        console.log('【玄光镜】未发现重复数据。');
    }
}

/**
 * 通用去重函数
 */
function removeDuplicates<T extends { id?: number; name?: string }>(
    items: T[], 
    ...keys: (keyof T)[]
): T[] {
    const seen = new Set<string>();
    return items.filter(item => {
        const key = keys.map(k => item[k]).join('|');
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });
}

/**
 * 加载所有自定义数据 (从LocalStorage)
 */
export function loadCustomData(): DADCustomData {
    const data = storage.getItem<DADCustomData>(storage.DAD_CUSTOM_DATA_KEY);
    // 如果没有数据，返回一个空的默认结构
    return data || {
        worlds: [],
        talentTiers: [],
        origins: [],
        spiritRoots: [],
        talents: [],
    };
}

/**
 * 保存所有自定义数据 (到LocalStorage)
 * @param {Partial<DADCustomData>} customDataUpdate
 */
export function saveCustomData(customDataUpdate: Partial<DADCustomData>): void {
    const currentData = loadCustomData();
    const newData = { ...currentData, ...customDataUpdate };
    storage.setItem(storage.DAD_CUSTOM_DATA_KEY, newData);
    toast.success('创世设定已保存至本地。');
}

/**
 * 加载指定ID的世界实例数据
 * @param {number} worldId
 * @returns {WorldInstanceData | null}
 */
export function loadWorldInstance(worldId: number): WorldInstanceData | null {
    const gameData = loadGameData();
    return gameData.worldInstances[worldId] || null;
}

/**
 * 保存一个世界实例数据
 * @param {WorldInstanceData} worldInstance
 */
export async function saveWorldInstance(worldInstance: WorldInstanceData): Promise<void> {
    const gameData = loadGameData();
    gameData.worldInstances[worldInstance.id] = worldInstance;
    await saveGameData(gameData);
}