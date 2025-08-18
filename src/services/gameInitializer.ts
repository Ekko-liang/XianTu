/**
 * src/services/gameInitializer.ts
 * 创世引擎 - 负责处理角色创建完成后的所有初始化流程。
 */

import { getTavernHelper, renameCurrentCharacter, createWorldLorebookEntry } from '../utils/tavern';
import { generateMapFromWorld, generateInitialMessage } from '../utils/tavernAI';
import { processGmResponse } from '../utils/AIGameMaster';
import { toast } from '../utils/toast';
import { useCharacterCreationStore } from '../stores/characterCreationStore';
import type { World, Origin, SpiritRoot, Talent } from '../types';
import type { LocalCharacterWithGameData, WorldInstanceData } from '../data/localData';
import { saveLocalCharacter, saveWorldInstance, loadGameData, saveGameData } from '../data/localData';
import { calculateInitialCoreAttributes } from '../utils/characterCalculation';
import { request } from './request';

// 定义基础属性类型
interface CharacterAttributes {
  root_bone: number;
  spirituality: number;
  comprehension: number;
  fortune: number;
  charm: number;
  temperament: number;
}

// 从 Vue 组件传递过来的原始创角数据包
interface CreationFinalPayload {
  isLocalCreation: boolean;
  characterName: string;
  birthAge: number;
  baseAttributes: CharacterAttributes;
  world: World;
  talentTier: any; // 包含 total_points
  origin: Origin | null;
  spiritRoot: SpiritRoot | null;
  talents: Talent[];
  userId: number | undefined;
}


/**
 * 天条二：开辟洞天 (写入世界书)
 * @param world - 世界数据
 */
async function writeToLorebook(world: World, onProgress: (message: string) => void): Promise<void> {
  onProgress('天条二：开辟洞天...');
  
  const helper = getTavernHelper();
  if (!helper) {
    console.warn('TavernHelper不可用，跳过世界书写入步骤');
    toast.warning('未检测到酒馆环境，跳过世界书铭刻步骤');
    return;
  }

  const LOREBOOK_NAME = '大道朝天';
  const ENTRY_KEY = `【世界】${world.name}`;
  const content = world.description || '一片混沌，待修士开辟。';

  try {
    const lorebooks = await helper.getLorebooks();
    if (!lorebooks.includes(LOREBOOK_NAME)) {
      await helper.createLorebook(LOREBOOK_NAME);
      console.log(`已创建世界书：《${LOREBOOK_NAME}》`);
    }

    const entries = await helper.getLorebookEntries(LOREBOOK_NAME);
    const existingEntry = entries.find((entry: any) => entry.comment === ENTRY_KEY || (entry.keys && entry.keys.includes(ENTRY_KEY)));

    if (existingEntry) {
      console.log(`找到已存在条目，UID: ${existingEntry.uid}，进行更新。`);
      await helper.setLorebookEntries(LOREBOOK_NAME, [{
        uid: existingEntry.uid,
        content: content,
      }]);
    } else {
      console.log('未找到条目，进行创建。');
      await helper.createLorebookEntries(LOREBOOK_NAME, [{
        comment: ENTRY_KEY,
        keys: [ENTRY_KEY],
        content: content,
        enabled: true,
        type: 'constant',
        order: 10,
        position: 'before_character_definition',
      }]);
    }
    
    toast.success(`新的世界法则“${ENTRY_KEY}”已成功铭刻于《${LOREBOOK_NAME}》`);
  } catch (error) {
    console.error('写入世界书失败:', error);
    toast.error('世界书铭刻失败，请检查与酒馆的连接。');
    throw error;
  }
}

/**
 * 天条三：衍化山河 (生成地图)
 */
async function generateWorldMap(world: World, onProgress: (message: string) => void): Promise<any> {
    onProgress('天条三：衍化山河...');
  
    try {
        console.log('【神识印记】开始生成地图，世界:', world.name);
        
        // 先尝试AI生成
        const mapData = await generateMapFromWorld(world);
        
        if (mapData && mapData.features && mapData.features.length > 0) {
            console.log(`【神识印记】AI成功生成 ${world.name} 的地图，包含 ${mapData.features.length} 个地理要素。`);
            toast.success(`天机成功衍化${world.name}的山河地理！`);
            return mapData;
        } else {
            throw new Error('AI返回的地图数据格式不正确');
        }
    } catch (error) {
        console.warn('【神识印记】AI地图生成失败，使用默认地图模板:', error);
        toast.info('天机衍化受阻，启用经典山河布局。');
        
        const worldName = world.name || "朝天大陆";
        
        // 返回简单的测试地图数据
        return {
            type: "FeatureCollection",
            features: [
                { 
                    type: "Feature", 
                    properties: { name: `${worldName}`, description: "广袤的修仙大陆", type: "continent" }, 
                    geometry: { type: "Polygon", coordinates: [[[1000, 1000], [7000, 1200], [7500, 6500], [6800, 7200], [2000, 7000], [1000, 6000], [1000, 1000]]] } 
                },
                { 
                    type: "Feature", 
                    properties: { name: "太虚剑宗", description: "天下第一剑道圣地", type: "sect", power_level: "一流" }, 
                    geometry: { type: "Point", coordinates: [3500, 2800] } 
                },
                { 
                    type: "Feature", 
                    properties: { name: "长安仙都", description: "最繁华的城池", type: "city" }, 
                    geometry: { type: "Point", coordinates: [4100, 4200] } 
                },
                { 
                    type: "Feature", 
                    properties: { name: "蓬莱仙境", description: "传说中的仙人居所", type: "secret_realm", danger_level: "致命" }, 
                    geometry: { type: "Point", coordinates: [6000, 3000] } 
                }
            ]
        };
    }
}


/**
 * 天条四：天道初言 (生成首条消息并更新状态)
 */
async function generateFirstEncounter(character: LocalCharacterWithGameData, payload: CreationFinalPayload, onProgress: (message: string) => void): Promise<void> {
  onProgress('天条四：天道初言...');
  const creationStore = useCharacterCreationStore();
  
  const creationDetails = {
    age: character.current_age || 18,
    originName: payload.origin?.name || '未知出身',
    spiritRootName: payload.spiritRoot?.name || '凡人灵根',
  };

  const helper = getTavernHelper();
  if (!helper) {
    console.warn('TavernHelper不可用，跳过AI初始消息生成');
    const defaultMessage = `${character.character_name}，${creationDetails.originName}出身，拥有${creationDetails.spiritRootName}，怀着修仙的梦想踏入了${payload.world.name}这片广阔的天地。\n\n你的修行之路从此开始。`;
    creationStore.setInitialGameMessage(defaultMessage);
    toast.success('修行正式开始！');
    return;
  }
  
  try {
    // 确保地图数据不为null
    const mapDataForGeneration = character.worldData.mapInfo || {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        properties: { name: "默认大陆", description: "一片神秘的修仙大陆" },
        geometry: { type: "Point", coordinates: [0, 0] }
      }]
    };
    
    console.log('【神识印记-天道初言】开始生成，角色名:', character.character_name);
    console.log('【神识印记-天道初言】创建详情:', creationDetails);
    console.log('【神识印记-天道初言】地图数据存在:', !!character.worldData.mapInfo);
    
    const gmResponse = await generateInitialMessage(character, creationDetails, mapDataForGeneration);
    if (gmResponse && gmResponse.text) {
      await processGmResponse(gmResponse, character);
      creationStore.setInitialGameMessage(gmResponse.text);
      console.log('【神识印记-天道初言】成功生成消息:', gmResponse.text.substring(0, 100) + '...');
      toast.success('天道初言已降下，修行正式开始！');
    } else {
      console.error('【神识印记-天道初言】AI返回空响应:', gmResponse);
      throw new Error('AI生成的初始消息为空');
    }
  } catch (error) {
    console.error('【神识印记】天道初言生成失败:', error);
    const defaultMessage = `${character.character_name}，${creationDetails.originName}出身，拥有${creationDetails.spiritRootName}，怀着修仙的梦想踏入了${payload.world.name}这片广阔的天地。\n\n你的修行之路从此开始。`;
    creationStore.setInitialGameMessage(defaultMessage);
    toast.warning('天道初言受阻，使用默认开场白');
  }
}

/**
 * 创世引擎主函数
 */
export async function initializeGameSession(wrappedPayload: any, onProgress: (message: string) => void): Promise<number> {
  console.log('[gameInitializer.ts] 创世引擎启动，接收到的原始信物:', wrappedPayload);
  
  // 修正数据适配：直接使用传入的payload，不需要额外包装
  const payload: CreationFinalPayload = wrappedPayload;
  
  console.log('[gameInitializer.ts] 解读后的仙缘录:', payload);

  const creationStore = useCharacterCreationStore();
  let characterForSession: LocalCharacterWithGameData;
  
  try {
    // --- 步骤一：天机演算，补完随机选项 ---
    onProgress('天机演算：定格命数...');
    if (payload.origin === null) {
      const totalTalentPoints = payload.talentTier?.total_points || 0;
      const availableOrigins = creationStore.creationData.origins.filter((o: Origin) => o.talent_cost <= totalTalentPoints);
      payload.origin = availableOrigins.length > 0
        ? availableOrigins[Math.floor(Math.random() * availableOrigins.length)]
        : creationStore.creationData.origins[0];
      toast.success(`天意已决，你的出身为【${payload.origin!.name}】！`);
    }
    if (payload.spiritRoot === null) {
        const remainingPoints = (payload.talentTier?.total_points || 0) - (payload.origin?.talent_cost || 0) - payload.talents.reduce((sum: number, t: Talent) => sum + t.talent_cost, 0);
        const availableRoots = creationStore.creationData.spiritRoots.filter((r: SpiritRoot) => r.talent_cost <= remainingPoints);
        payload.spiritRoot = availableRoots.length > 0
            ? availableRoots[Math.floor(Math.random() * availableRoots.length)]
            : creationStore.creationData.spiritRoots[0];
        toast.success(`天意已决，你的灵根为【${payload.spiritRoot!.name}】！`);
    }

    // --- 步骤二：凝聚法身 (核心创建逻辑) ---
    onProgress('凝聚法身：构建角色...');
    const coreAttributes = calculateInitialCoreAttributes(payload.baseAttributes, payload.birthAge);
    const creationChoicesData = {
        origin: payload.origin ?? undefined,
        spiritRoot: payload.spiritRoot ?? undefined,
        talents: payload.talents,
        world: payload.world ? { id: payload.world.id, name: payload.world.name } : undefined,
    };

    if (payload.isLocalCreation) {
        characterForSession = {
            creationChoices: creationChoicesData,
            id: Date.now() + Math.floor(Math.random() * 1000),
            character_name: payload.characterName,
            world_id: payload.world.id,
            talent_tier_id: payload.talentTier.id,
            ...payload.baseAttributes,
            ...coreAttributes,
            // 为本地角色补完核心战斗属性
            realm: '凡人',
            reputation: 0,
            hp: 80, hp_max: 80,
            mana: 20, mana_max: 20,
            spirit: 10, spirit_max: 10,
            lifespan: payload.birthAge, lifespan_max: 80, // 当前寿命就是当前年龄
            cultivation_exp: 0, cultivation_exp_max: 100,
            play_time_minutes: 0,
            created_at: new Date().toISOString(),
            source: 'local',
            worldData: { id: payload.world.id, continentName: null, continentDescription: null, factions: [], mapInfo: null },
        };
        toast.success(`本地法身 "${payload.characterName}" 凝聚成功！`);
    } else { // 联机模式
        onProgress('联通云界：同步角色...');
        const apiPayload = {
            player_id: payload.userId,
            character_name: payload.characterName,
            world_id: payload.world.id,
            talent_tier_id: payload.talentTier.id,
            origin_id: payload.origin?.id,
            spirit_root_id: payload.spiritRoot?.id,
            selected_talent_ids: payload.talents.map((t) => t.id),
            // 改为显式赋值，增强代码的健壮性和可读性
            root_bone: payload.baseAttributes.root_bone,
            spirituality: payload.baseAttributes.spirituality,
            comprehension: payload.baseAttributes.comprehension,
            fortune: payload.baseAttributes.fortune,
            charm: payload.baseAttributes.charm,
            temperament: payload.baseAttributes.temperament,
        };
        const cloudCharacter = await request<any>('/api/v1/characters/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(apiPayload),
        });

        onProgress('获取命格：下载游戏状态...');
        const gameState = await request<any>(`/api/v1/characters/${cloudCharacter.id}/game_state`);
        if (!gameState) throw new Error('游戏状态数据为空');

        const safeGameState = {
            current_age: gameState.current_age ?? 18,
            qi_blood: gameState.qi_blood ?? 100, max_qi_blood: gameState.max_qi_blood ?? 100,
            spiritual_power: gameState.spiritual_power ?? 50, max_spiritual_power: gameState.max_spiritual_power ?? 50,
            spirit_sense: gameState.spirit_sense ?? 30, max_spirit_sense: gameState.max_spirit_sense ?? 30,
            max_lifespan: gameState.max_lifespan ?? 100,
            cultivation_experience: gameState.cultivation_experience ?? 0,
        };

        characterForSession = {
            creationChoices: creationChoicesData,
            id: cloudCharacter.id,
            character_name: cloudCharacter.character_name,
            current_age: safeGameState.current_age,
            world_id: cloudCharacter.world_id,
            talent_tier_id: cloudCharacter.talent_tier_id,
            ...payload.baseAttributes, // 确保基础属性来自前端选择
            realm: '凡人', reputation: 0,
            hp: safeGameState.qi_blood, hp_max: safeGameState.max_qi_blood,
            mana: safeGameState.spiritual_power, mana_max: safeGameState.max_spiritual_power,
            spirit: safeGameState.spirit_sense, spirit_max: safeGameState.max_spirit_sense,
            lifespan: safeGameState.current_age, lifespan_max: safeGameState.max_lifespan, // 当前寿命就是当前年龄
            cultivation_exp: safeGameState.cultivation_experience, cultivation_exp_max: 100,
            play_time_minutes: 0,
            created_at: cloudCharacter.created_at,
            source: 'cloud',
            worldData: { id: cloudCharacter.world_id, continentName: null, continentDescription: null, factions: [], mapInfo: null },
        };
        toast.success(`云端法身 "${payload.characterName}" 同步成功！`);
    }
    
    // --- 步骤三：开辟洞天，写入世界书 ---
    await writeToLorebook(payload.world, onProgress);

    // --- 步骤四：衍化山河，生成地图 ---
    const mapData = await generateWorldMap(payload.world, onProgress);
    characterForSession.worldData.mapInfo = mapData; // 将地图数据合入角色

    // --- 步骤五：开辟坤舆，独立存档世界数据 ---
    onProgress('开辟坤舆：固化世界法则...');
    const worldInstance: WorldInstanceData = {
      id: payload.world.id,
      continentName: null, factions: [],
      continentDescription: null,
      mapInfo: mapData,
    };
    await saveWorldInstance(worldInstance);
    toast.success('坤舆图志已开辟！');
    
    // --- 步骤六：铭刻法身，存档最终角色数据 ---
    onProgress('铭刻法身：天命入体...');
    await saveLocalCharacter(characterForSession);
    toast.success('法身已铭刻于酒馆洞天！');

    // --- 步骤七：昭告天地，同步状态至Chat ---
    const helper = getTavernHelper();
    if (helper) {
        onProgress('昭告天地：同步状态...');
        try {
            await helper.insertOrAssignVariables({
                character: {
                    name: characterForSession.character_name,
                    realm: characterForSession.realm,
                    age: characterForSession.current_age,
                    hp: characterForSession.hp, hp_max: characterForSession.hp_max,
                    mana: characterForSession.mana, mana_max: characterForSession.mana_max,
                    spirit: characterForSession.spirit, spirit_max: characterForSession.spirit_max,
                    lifespan: `${characterForSession.lifespan}/${characterForSession.lifespan_max}`, // 修正：传递完整寿元信息
                    origin: characterForSession.creationChoices.origin?.name,
                    spiritRoot: characterForSession.creationChoices.spiritRoot?.name,
                } as any
            }, { type: 'chat' } as any);
            toast.success('角色状态已昭告当前天地！');
        } catch(e) {
            console.error("昭告天地失败", e);
            toast.warning('昭告天地失败，但不影响游戏进行');
        }
    }

    // --- 步骤八：天道初言，生成初始消息 ---
    await generateFirstEncounter(characterForSession, payload, onProgress);

    // --- 最终环节：完成创世 ---
    onProgress('创世完成！欢迎来到修仙世界。');
    // 地图数据已保存在世界实例中，无需设置到全局store
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('创世大功告成！你的修仙之路正式开始！');
    
    // 返回角色ID给调用方
    return characterForSession.id;

  } catch (error) {
    console.error("【神识印记】创世流程发生严重错误:", error);
    toast.error(`创世失败：${error instanceof Error ? error.message : '未知严重错误'}`);
    throw error; // 抛出错误，让上层处理UI状态
  }
}