import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  CharacterCreationData,
  World,
  TalentTier,
  Origin,
  SpiritRoot,
  Talent,
  CharacterCreationPayload,
  AttributeKey,
} from '../types';
import { loadCustomData, saveCustomData, type DADCustomData, cleanupDuplicateCustomData } from '../data/localData';
import { request } from '../services/request';
import {
  LOCAL_WORLDS,
  LOCAL_TALENT_TIERS,
  LOCAL_ORIGINS,
  LOCAL_SPIRIT_ROOTS,
  LOCAL_TALENTS,
} from '../data/creationData';

// 为基础类型增加'source'属性，用于内部数据管理
type DataSource = 'local' | 'cloud' | 'tavern';
type WorldWithSource = World & { source: DataSource };
type TalentTierWithSource = TalentTier & { source: DataSource };
type OriginWithSource = Origin & { source: DataSource };
type SpiritRootWithSource = SpiritRoot & { source: DataSource };
type TalentWithSource = Talent & { source: DataSource };

interface CharacterCreationDataWithSource {
  worlds: WorldWithSource[];
  talentTiers: TalentTierWithSource[];
  origins: OriginWithSource[];
  spiritRoots: SpiritRootWithSource[];
  talents: TalentWithSource[];
}

const TOTAL_STEPS = 7;

export const useCharacterCreationStore = defineStore('characterCreation', () => {
  // =======================================================================
  //                                 STATE
  // =======================================================================

  const mode = ref<'single' | 'cloud'>('single');
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  
  // 核心数据状态 (世界、天赋等可选列表)
  const creationData = ref<CharacterCreationDataWithSource>({
    worlds: [],
    talentTiers: [],
    origins: [],
    spiritRoots: [],
    talents: [],
  });

  // 玩家当前创建角色的数据载荷
  const characterPayload = ref<CharacterCreationPayload>(createEmptyPayload());

  // UI 状态
  const currentStep = ref(1);
  const isLocalCreation = ref(true); // 全局开关，决定创角行为是本地还是联机
  const initialGameMessage = ref<string | null>(null); // **【开辟消息中枢】**
  // mapData 已移除 - 现在由各个GameView实例本地管理

  // =======================================================================
  //                                GETTERS
  // =======================================================================

  const totalSteps = computed(() => TOTAL_STEPS);
  const attributes = computed(() => {
    return {
      root_bone: characterPayload.value.root_bone,
      spirituality: characterPayload.value.spirituality,
      comprehension: characterPayload.value.comprehension,
      fortune: characterPayload.value.fortune,
      charm: characterPayload.value.charm,
      temperament: characterPayload.value.temperament,
    };
  });

  const selectedWorld = computed(() => 
    creationData.value.worlds.find(w => w.id === characterPayload.value.world_id) || null
  );

  const selectedTalentTier = computed(() =>
    creationData.value.talentTiers.find(t => t.id === characterPayload.value.talent_tier_id) || null
  );

  const selectedOrigin = computed(() =>
    creationData.value.origins.find(o => o.id === characterPayload.value.origin_id) || null
  );

  const selectedSpiritRoot = computed(() =>
    creationData.value.spiritRoots.find(s => s.id === characterPayload.value.spirit_root_id) || null
  );

  const selectedTalents = computed(() =>
    creationData.value.talents.filter(t => characterPayload.value.selected_talent_ids.includes(t.id))
  );

  const remainingTalentPoints = computed(() => {
    if (!selectedTalentTier.value) return 0;
    
    let points = selectedTalentTier.value.total_points;
    if (selectedOrigin.value) {
      points -= selectedOrigin.value.talent_cost;
    }
    if (selectedSpiritRoot.value) {
      points -= selectedSpiritRoot.value.talent_cost;
    }
    points -= selectedTalents.value.reduce((total, talent) => total + talent.talent_cost, 0);
    
    const allocatedAttributePoints = Object.values(attributes.value).reduce((sum, val) => sum + val, 0);
    points -= allocatedAttributePoints;

    return points;
  });

  // =======================================================================
  //                                ACTIONS
  // =======================================================================

  // 辅助函数，用于将更新后的自定义数据保存到LocalStorage
  function persistCustomData() {
    const dataToSave: DADCustomData = {
      worlds: creationData.value.worlds.filter(item => item.source !== 'local'),
      talentTiers: creationData.value.talentTiers.filter(item => item.source !== 'local'),
      origins: creationData.value.origins.filter(item => item.source !== 'local'),
      spiritRoots: creationData.value.spiritRoots.filter(item => item.source !== 'local'),
      talents: creationData.value.talents.filter(item => item.source !== 'local'),
    };
    saveCustomData(dataToSave);
  }

  function createEmptyPayload(): CharacterCreationPayload {
    return {
      character_name: '',
      world_id: '',
      talent_tier_id: '',
      current_age: 18,
      root_bone: 0,
      spirituality: 0,
      comprehension: 0,
      fortune: 0,
      charm: 0,
      temperament: 0,
      origin_id: null,
      spirit_root_id: null,
      selected_talent_ids: [],
    };
  }

  async function initializeStore(mode: 'single' | 'cloud') {
    isLoading.value = true;
    error.value = null;
    
    creationData.value = {
      worlds: [],
      talentTiers: [],
      origins: [],
      spiritRoots: [],
      talents: [],
    };

    try {
      if (mode === 'single') {
        // 先清理可能存在的重复数据
        cleanupDuplicateCustomData();
        
        const savedData = loadCustomData();
        
        // 加载本地默认数据
        creationData.value.worlds = [...LOCAL_WORLDS.map(w => ({ ...w, source: 'local' as DataSource }))];
        creationData.value.talentTiers = [...LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' as DataSource }))];
        creationData.value.origins = [...LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' as DataSource }))];
        creationData.value.spiritRoots = [...LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' as DataSource }))];
        creationData.value.talents = [...LOCAL_TALENTS.map(t => ({ ...t, source: 'local' as DataSource }))];

        // 添加来自tavern的自定义数据，并去重（基于ID和名称）
        if (savedData.worlds) {
          const tavernWorlds = savedData.worlds
            .map(w => ({ ...w, source: 'tavern' as DataSource }))
            .filter(w => !creationData.value.worlds.some(existing => existing.id === w.id || existing.name === w.name));
          creationData.value.worlds.push(...tavernWorlds);
        }
        if (savedData.talentTiers) {
          const tavernTiers = savedData.talentTiers
            .map(t => ({ ...t, source: 'tavern' as DataSource }))
            .filter(t => !creationData.value.talentTiers.some(existing => existing.id === t.id || existing.name === t.name));
          creationData.value.talentTiers.push(...tavernTiers);
        }
        if (savedData.origins) {
          const tavernOrigins = savedData.origins
            .map(o => ({ ...o, source: 'tavern' as DataSource }))
            .filter(o => !creationData.value.origins.some(existing => existing.id === o.id || existing.name === o.name));
          creationData.value.origins.push(...tavernOrigins);
        }
        if (savedData.spiritRoots) {
          const tavernRoots = savedData.spiritRoots
            .map(s => ({ ...s, source: 'tavern' as DataSource }))
            .filter(s => !creationData.value.spiritRoots.some(existing => existing.id === s.id || existing.name === s.name));
          creationData.value.spiritRoots.push(...tavernRoots);
        }
        if (savedData.talents) {
          const tavernTalents = savedData.talents
            .map(t => ({ ...t, source: 'tavern' as DataSource }))
            .filter(t => !creationData.value.talents.some(existing => existing.id === t.id || existing.name === t.name));
          creationData.value.talents.push(...tavernTalents);
        }
      } else {
        const [
          publicWorlds,
          publicTalentTiers,
          publicOrigins,
          publicSpiritRoots,
          publicTalents,
        ] = await Promise.all([
          request<World[]>('/api/v1/worlds'),
          request<TalentTier[]>('/api/v1/talent_tiers'),
          request<Origin[]>('/api/v1/origins'),
          request<SpiritRoot[]>('/api/v1/spirit_roots'),
          request<Talent[]>('/api/v1/talents'),
        ]);

        creationData.value.worlds = publicWorlds.map(w => ({ ...w, source: 'cloud' as DataSource }));
        creationData.value.talentTiers = publicTalentTiers.map(t => ({ ...t, source: 'cloud' as DataSource }));
        creationData.value.origins = publicOrigins.map(o => ({ ...o, source: 'cloud' as DataSource }));
        creationData.value.spiritRoots = publicSpiritRoots.map(s => ({ ...s, source: 'cloud' as DataSource }));
        creationData.value.talents = publicTalents.map(t => ({ ...t, source: 'cloud' as DataSource }));
      }
    } catch (e) {
      console.error("加载数据失败:", e);
      error.value = "加载数据失败";
      creationData.value.worlds = LOCAL_WORLDS.map(w => ({ ...w, source: 'local' }));
      creationData.value.talentTiers = LOCAL_TALENT_TIERS.map(t => ({ ...t, source: 'local' }));
      creationData.value.origins = LOCAL_ORIGINS.map(o => ({ ...o, source: 'local' }));
      creationData.value.spiritRoots = LOCAL_SPIRIT_ROOTS.map(s => ({ ...s, source: 'local' }));
      creationData.value.talents = LOCAL_TALENTS.map(t => ({ ...t, source: 'local' }));
    } finally {
      isLoading.value = false;
    }
  }

  // --- Data Persistence Actions ---
  function addWorld(world: World) {
    creationData.value.worlds.unshift({ ...world, source: 'tavern' as DataSource });
    persistCustomData();
  }
  function addTalentTier(tier: TalentTier) {
    creationData.value.talentTiers.unshift({ ...tier, source: 'tavern' as DataSource });
    persistCustomData();
  }
  function addOrigin(origin: Origin) {
    creationData.value.origins.unshift({ ...origin, source: 'tavern' as DataSource });
    persistCustomData();
  }
  function addSpiritRoot(root: SpiritRoot) {
    creationData.value.spiritRoots.unshift({ ...root, source: 'tavern' as DataSource });
    persistCustomData();
  }
  function addTalent(talent: Talent) {
    creationData.value.talents.unshift({ ...talent, source: 'tavern' as DataSource });
    persistCustomData();
  }

  // --- Generic Action for AI-generated data ---
  function addGeneratedData(type: string, data: any) {
    switch (type) {
      case 'world': addWorld(data as World); break;
      case 'talent_tier': addTalentTier(data as TalentTier); break;
      case 'origin': addOrigin(data as Origin); break;
      case 'spirit_root': addSpiritRoot(data as SpiritRoot); break;
      case 'talent': addTalent(data as Talent); break;
      default: console.warn(`Unknown data type for addGeneratedData: ${type}`);
    }
  }
  
  // --- Character Payload Actions ---
  function selectWorld(worldId: number | '') {
    characterPayload.value.world_id = worldId;
  }
  
  function selectTalentTier(tierId: number | '') {
    characterPayload.value.talent_tier_id = tierId;
    // 重置依赖天资等级的选择
    characterPayload.value.origin_id = null;
    characterPayload.value.spirit_root_id = null;
    characterPayload.value.selected_talent_ids = [];
    characterPayload.value.root_bone = 0;
    characterPayload.value.spirituality = 0;
    characterPayload.value.comprehension = 0;
    characterPayload.value.fortune = 0;
    characterPayload.value.charm = 0;
    characterPayload.value.temperament = 0;
  }

  function selectOrigin(originId: number | null) {
    characterPayload.value.origin_id = originId;
  }

  function selectSpiritRoot(rootId: number | null) {
    characterPayload.value.spirit_root_id = rootId;
  }

  function toggleTalent(talentId: number) {
    const index = characterPayload.value.selected_talent_ids.indexOf(talentId);
    if (index > -1) {
      characterPayload.value.selected_talent_ids.splice(index, 1);
    } else {
      characterPayload.value.selected_talent_ids.push(talentId);
    }
  }
  
  function setAttribute(key: AttributeKey, value: number) {
    if (key in characterPayload.value) {
      characterPayload.value[key] = value;
    }
  }

  function resetCharacter() {
    characterPayload.value = createEmptyPayload();
    currentStep.value = 1;
  }

  // --- Navigation Actions ---
  function nextStep() {
    if (currentStep.value < TOTAL_STEPS) {
      currentStep.value++;
    }
  }

  function prevStep() {
    if (currentStep.value > 1) {
      currentStep.value--;
    }
  }

  function goToStep(step: number) {
    if (step >= 1 && step <= TOTAL_STEPS) {
      currentStep.value = step;
    }
  }

  function setMode(newMode: 'single' | 'cloud') {
    mode.value = newMode;
    // 同步设置 isLocalCreation 状态
    isLocalCreation.value = (newMode === 'single');
    console.log(`Mode set to: ${newMode}, isLocalCreation: ${isLocalCreation.value}`);
  }

  function toggleLocalCreation() {
    isLocalCreation.value = !isLocalCreation.value;
  }

  function setInitialGameMessage(message: string) {
    initialGameMessage.value = message;
  }

  // setMapData 已移除 - 地图数据现在由各个GameView实例本地管理

  // 当用户退出创角流程时调用，以防止状态污染
  function resetOnExit() {
    resetCharacter(); // 重置角色选择和步骤
    mode.value = 'single'; // 将模式重置回默认值
    isLocalCreation.value = true; // 将创角模式也重置回默认的本地模式
  }

  // --- 新的入口 Actions ---
  function startLocalCreation() {
    console.log('Starting LOCAL creation process...');
    resetCharacter(); // 确保从一个干净的状态开始
    isLocalCreation.value = true;
    mode.value = 'single'; // 保持同步
  }

  function startCloudCreation() {
    console.log('Starting CLOUD creation process...');
    resetCharacter(); // 确保从一个干净的状态开始
    isLocalCreation.value = false;
    mode.value = 'cloud'; // 保持同步
  }

  return {
    // State
    mode,
    isLoading,
    error,
    creationData,
    characterPayload,
    currentStep,
    isLocalCreation,
    initialGameMessage,
    // mapData 已移除
    // Getters
    totalSteps,
    attributes,
    selectedWorld,
    selectedTalentTier,
    selectedOrigin,
    selectedSpiritRoot,
    selectedTalents,
    remainingTalentPoints,
    // Actions
    initializeStore,
    addWorld,
    addTalentTier,
    addOrigin,
    addSpiritRoot,
    addTalent,
    addGeneratedData,
    selectWorld,
    selectTalentTier,
    selectOrigin,
    selectSpiritRoot,
    toggleTalent,
    setAttribute,
    resetCharacter,
    nextStep,
    prevStep,
    goToStep,
    setMode,
    toggleLocalCreation,
    setInitialGameMessage,
    // setMapData 已移除
    resetOnExit,
    startLocalCreation,
    startCloudCreation,
  };
});