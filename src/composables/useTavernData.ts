import { ref, computed } from 'vue'
import { getTavernHelper } from '@/utils/tavern'
import type { CharacterBaseInfo, WorldInfo, Memory, SaveData } from '@/types/game'

export interface TavernCharacterData extends Partial<CharacterBaseInfo> {
  name?: string
  id?: string
  created?: string
  updated?: string
  [key: string]: unknown
}

export interface TavernWorldInfo extends Partial<WorldInfo> {
  名称?: string
  [key: string]: unknown
}

type TavernVariableValue = string | number | boolean | object | null | undefined

export interface AllTavernData {
  chat: Record<string, TavernVariableValue>
  global: Record<string, TavernVariableValue>
  character: TavernCharacterData | null
  saveData: SaveData | Record<string, TavernVariableValue>
  worldInfo: TavernWorldInfo | null
  memory: Memory | null
}

export function useTavernData() {
  const chatVariables = ref<Record<string, TavernVariableValue>>({})
  const globalVariables = ref<Record<string, TavernVariableValue>>({})
  const characterData = ref<TavernCharacterData | null>(null)
  const saveData = ref<SaveData | Record<string, TavernVariableValue>>({})
  const worldInfo = ref<TavernWorldInfo | null>(null)
  const memoryData = ref<Memory | null>(null)
  
  const allTavernData = computed<AllTavernData>(() => ({
    chat: chatVariables.value,
    global: globalVariables.value,
    character: characterData.value,
    saveData: saveData.value,
    worldInfo: worldInfo.value,
    memory: memoryData.value
  }))

  const refreshTavernData = async () => {
    const helper = getTavernHelper()
    if (!helper) return

    console.log('[酒馆数据] 开始获取变量数据...')

    const [chatVars, globalVars] = await Promise.all([
      Promise.resolve(helper.getVariables({ type: 'chat' })).catch((error) => {
        console.error('[酒馆数据] 获取聊天变量失败:', error)
        return {}
      }),
      Promise.resolve(helper.getVariables({ type: 'global' })).catch((error) => {
        console.error('[酒馆数据] 获取全局变量失败:', error)
        return {}
      })
    ])

    chatVariables.value = (chatVars || {}) as Record<string, TavernVariableValue>
    globalVariables.value = (globalVars || {}) as Record<string, TavernVariableValue>

    if (chatVars) {
      const chat = (chatVars || {}) as Record<string, TavernVariableValue>
      // 读取角色数据（优先从显式的 character 键，随后从 saveData.角色基础信息 回退）
      const directCharacter = (chat['character'] ||
                               chat['character.profile'] ||
                               chat['character.baseInfo'] ||
                               null) as TavernCharacterData | null

      // 读取存档数据 - 支持新旧格式
      // 优先使用分片格式，回退到旧的 character.saveData
      let rawSaveData: SaveData | Record<string, TavernVariableValue>

      if (chat['基础信息'] || chat['境界'] || chat['属性']) {
        // 新格式：从分片变量组装
        console.log('[酒馆数据] 检测到分片格式存档，正在组装...')
        rawSaveData = {
          角色基础信息: chat['基础信息'],
          玩家角色状态: {
            境界: chat['境界'],
            声望: 0,
            位置: chat['位置'] || { 描述: '未知', x: 0, y: 0 },
            气血: chat['属性']?.气血,
            灵气: chat['属性']?.灵气,
            神识: chat['属性']?.神识,
            寿命: chat['属性']?.寿命,
            状态效果: chat['状态效果'] || []
          },
          修炼功法: chat['修炼功法'],
          掌握技能: chat['掌握技能'] || [],
          装备栏: chat['装备栏'],
          背包: {
            灵石: chat['背包_灵石'],
            物品: chat['背包_物品']
          },
          人物关系: chat['人物关系'] || {},
          三千大道: chat['三千大道'] || { 已解锁大道: [], 大道进度: {}, 大道路径定义: {} },
          世界信息: chat['世界信息'],
          记忆: {
            短期记忆: chat['记忆_短期'] || [],
            中期记忆: chat['记忆_中期'] || [],
            长期记忆: chat['记忆_长期'] || [],
            隐式中期记忆: chat['记忆_隐式中期'] || []
          },
          游戏时间: chat['游戏时间'],
          宗门系统: { availableSects: [], sectRelationships: {}, sectHistory: [] }
        } as SaveData
      } else {
        // 旧格式：直接读取 character.saveData
        rawSaveData = (chat['character.saveData'] || {}) as SaveData | Record<string, TavernVariableValue>
      }

      saveData.value = rawSaveData

      // 从存档解析世界与记忆
      if (rawSaveData && typeof rawSaveData === 'object') {
        const saveDataObj = rawSaveData as Record<string, TavernVariableValue>
        worldInfo.value = (saveDataObj['世界信息'] ||
                         saveDataObj['worldInfo'] ||
                         chat['worldInfo'] ||
                         chat['world.info'] ||
                         null) as TavernWorldInfo | null

        memoryData.value = (saveDataObj['记忆'] ||
                          saveDataObj['memory'] ||
                          chat['memory'] ||
                          chat['character.memory'] ||
                          null) as Memory | null
      } else {
        worldInfo.value = (chat['worldInfo'] || chat['world.info'] || null) as TavernWorldInfo | null
        memoryData.value = (chat['memory'] || chat['character.memory'] || null) as Memory | null
      }

      // 若没有显式的 character 数据，但存档里有 角色基础信息，则回退使用它
      if (!directCharacter && rawSaveData && typeof rawSaveData === 'object') {
        const baseInfo = (rawSaveData as any)['角色基础信息']
        if (baseInfo && typeof baseInfo === 'object') {
          // 兼容显示组件：补充一个 name 字段
          characterData.value = { ...baseInfo, name: (baseInfo.名字 ?? (baseInfo as any).name) }
        } else {
          characterData.value = null
        }
      } else {
        characterData.value = directCharacter
      }
    }
  }

  return {
    chatVariables,
    globalVariables,
    characterData,
    saveData,
    worldInfo,
    memoryData,
    allTavernData,
    refreshTavernData
  }
}
