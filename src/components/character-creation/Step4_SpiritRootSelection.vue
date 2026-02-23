<template>
  <div class="spirit-root-selection-container">
    <div v-if="store.isLoading" class="loading-state">{{ $t('校验天赋潜能模型...') }}</div>
    <div v-else-if="store.error" class="error-state">{{ $t('天机混沌：') }}{{ store.error }}</div>

    <div v-else class="spirit-root-layout">
      <!-- 左侧面板：选择和操作 -->
      <div class="spirit-root-left-panel">
        <!-- 顶部功能按钮 -->
        <div class="top-actions-container">
          <button
            v-if="store.isLocalCreation"
            @click="isAdvancedCustomVisible = true"
            class="action-item shimmer-on-hover"
          >
            <span class="action-name">{{ $t('高级自定义') }}</span>
          </button>
          <button
            @click="handleAIGenerate"
            class="action-item shimmer-on-hover"
          >
            <span class="action-name">{{ $t('AI推演') }}</span>
          </button>
        </div>

        <!-- 选择模式切换 -->
        <div class="selection-mode-tabs">
          <button 
            :class="{ active: selectionMode === 'preset' }"
            @click="selectionMode = 'preset'"
            class="mode-tab"
          >
            {{ $t('预设潜能') }}
          </button>
          <button
            :class="{ active: selectionMode === 'custom' }"
            @click="selectionMode = 'custom'"
            class="mode-tab"
          >
            {{ $t('组合潜能') }}
          </button>
        </div>

        <!-- 预设灵根模式 -->
        <div v-if="selectionMode === 'preset'" class="preset-mode">
          <div class="spirit-root-list-container">
            <div
              class="spirit-root-item"
              :class="{ selected: isRandomSelected }"
              @click="handleSelectRandom"
              @mouseover="activeSpiritRoot = 'random'"
            >
              <span class="spirit-root-name">{{ $t('随机潜能') }}</span>
              <span class="spirit-root-cost">{{ $t('0 点') }}</span>
            </div>
            <div class="divider"></div>
            <div
              v-for="root in filteredSpiritRoots"
              :key="root.id"
              class="spirit-root-item"
              :class="{
                selected: store.characterPayload.spirit_root_id === root.id,
                disabled: !canSelect(root),
              }"
              @click="handleSelectSpiritRoot(root)"
              @mouseover="activeSpiritRoot = root"
            >
              <div class="item-content">
                <div class="spirit-root-name-container">
                  <span class="spirit-root-name">{{ getSpiritRootBaseName(root.name) }}</span>
                  <span v-if="getSpiritRootTier(root)" class="spirit-root-tier" :class="`tier-${getSpiritRootTier(root)}`">
                    {{ getSpiritRootTier(root) }}
                  </span>
                </div>
                <span class="spirit-root-cost">{{ root.talent_cost }} {{ $t('点') }}</span>
              </div>
              <div v-if="root.source === 'cloud' && store.isLocalCreation" class="action-buttons">
                <button @click.stop="openEditModal(root)" class="edit-btn" title="编辑此项">
                  <Edit :size="14" />
                </button>
                <button @click.stop="handleDeleteSpiritRoot(root.id)" class="delete-btn" title="删除此项">
                  <Trash2 :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 组合选择模式 -->
        <div v-if="selectionMode === 'custom'" class="custom-mode">
          <div class="custom-selection-container">
            <!-- 灵根类型选择 -->
            <div class="selection-group">
              <label class="selection-label">{{ $t('潜能类型') }}</label>
              <div class="spirit-type-grid">
                <button
                  v-for="type in spiritRootTypes"
                  :key="type.key"
                  :class="{ selected: customSpirit.type === type.key }"
                  @click="customSpirit.type = type.key"
                  class="type-button"
                  :style="{ '--element-color': type.color }"
                >
                  <span class="type-icon">{{ type.icon }}</span>
                  <span class="type-name">{{ type.name }}</span>
                </button>
              </div>
            </div>

            <!-- 品级选择 -->
            <div class="selection-group">
              <label class="selection-label">{{ $t('潜能评级') }}</label>
              <div class="tier-selection">
                <button
                  v-for="tier in spiritRootTiers"
                  :key="tier.key"
                  :class="[
                    'tier-button',
                    `tier-${tier.key}`,
                    { selected: customSpirit.tier === tier.key }
                  ]"
                  @click="customSpirit.tier = tier.key"
                >
                  <span class="tier-name">{{ tier.name }}</span>
                  <span class="tier-multiplier">{{ tier.multiplier }}x</span>
                  <span class="tier-cost">{{ tier.cost }}点</span>
                </button>
              </div>
            </div>

            <!-- 预览和确认 -->
            <div class="custom-preview">
              <div class="preview-title">{{ $t('预览') }}</div>
              <div class="preview-content">
                <div class="preview-name">
                  <span>{{ getCustomSpiritName() }}</span>
                  <span v-if="customSpirit.tier !== 'none'" class="preview-tier" :class="`tier-${customSpirit.tier}`">
                    {{ getSpiritTierName(customSpirit.tier) }}
                  </span>
                </div>
                <div class="preview-stats">
                  <div class="stat">{{ $t('修炼倍率:') }} {{ getCustomSpiritMultiplier() }}x</div>
                  <div class="stat">{{ $t('消耗点数:') }} {{ getCustomSpiritCost() }}{{ $t('点') }}</div>
                </div>
              </div>
              <button 
                @click="confirmCustomSpirit"
                :disabled="!isCustomSpiritValid()"
                class="confirm-custom-button"
              >
                {{ $t('确认选择') }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="spirit-root-details-container">
        <div v-if="activeSpiritRoot || (selectionMode === 'custom' && customSpirit.type !== 'none')" class="spirit-root-details">
          <h2>{{ getActiveDisplayName() }}</h2>
          <div class="description-scroll">
            <p>{{ getActiveDescription() }}</p>
          </div>
          <div class="stats-display">
            <div class="stat-item">
              <span class="stat-label">{{ $t('修炼倍率:') }}</span>
              <span class="stat-value">{{ getActiveMultiplier() }}x</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">{{ $t('消耗属性点:') }}</span>
              <span class="stat-value">{{ getActiveCost() }}{{ $t('点') }}</span>
            </div>
          </div>
        </div>
        <div v-else class="placeholder">{{ $t('请选择一种潜能，或交由随机生成。') }}</div>
      </div>
    </div>

    <!-- 高级自定义模态框 -->
    <CustomCreationModal
      :visible="isAdvancedCustomVisible"
      :title="$t('高级自定义潜能')"
      :fields="advancedCustomFields"
      :validationFn="validateAdvancedCustom"
      @close="isAdvancedCustomVisible = false"
      @submit="handleAdvancedCustomSubmit"
    />
    
    <!-- 编辑模态框 -->
    <CustomCreationModal
      :visible="isEditModalVisible"
      :title="$t('编辑潜能')"
      :fields="advancedCustomFields"
      :validationFn="validateAdvancedCustom"
      :initialData="editInitialData"
      @close="isEditModalVisible = false; editingSpiritRoot = null"
      @submit="handleEditSubmit"
    />

    <!-- AI推演输入弹窗 -->
    <AIPromptModal
      :visible="isAIPromptModalVisible"
      @close="isAIPromptModalVisible = false"
      @submit="handleAIPromptSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { Trash2, Edit } from 'lucide-vue-next'
import { useCharacterCreationStore } from '../../stores/characterCreationStore'
import type { SpiritRoot } from '../../types'
import CustomCreationModal, { type ModalField } from './CustomCreationModal.vue'
import AIPromptModal from './AIPromptModal.vue'
import { toast } from '../../utils/toast'
import { generateWithRawPrompt } from '../../utils/tavernCore'
import { SPIRIT_ROOT_ITEM_GENERATION_PROMPT } from '../../utils/prompts/tasks/gameElementPrompts'
import { parseJsonFromText } from '@/utils/jsonExtract'

const emit = defineEmits(['ai-generate'])
const store = useCharacterCreationStore()
// UI状态
const activeSpiritRoot = ref<SpiritRoot | 'random' | null>(null)
const selectionMode = ref<'preset' | 'custom'>('preset')
const isAdvancedCustomVisible = ref(false)
const isEditModalVisible = ref(false)
const isAIPromptModalVisible = ref(false)
const editingSpiritRoot = ref<SpiritRoot | null>(null)

// 自定义潜能状态
const customSpirit = reactive({
  type: 'none' as string,
  tier: 'none' as string
})

// 潜能类型配置
const spiritRootTypes = [
  { key: 'combat', name: '战斗型', icon: '⚔️', color: '#ef4444', desc: '近中距离冲突中更容易形成压制。' },
  { key: 'survival', name: '生存型', icon: '🛡️', color: '#3b82f6', desc: '极端环境下具备更高容错和恢复能力。' },
  { key: 'sensory', name: '感知型', icon: '🛰️', color: '#06b6d4', desc: '提升侦查、预警和信息捕捉能力。' },
  { key: 'strategy', name: '策略型', icon: '♟️', color: '#f59e0b', desc: '复杂局势中更容易找到高收益解法。' },
  { key: 'support', name: '辅助型', icon: '🧰', color: '#10b981', desc: '提升治疗、增益和资源调度效率。' },
  { key: 'social', name: '社交型', icon: '🗣️', color: '#8b5cf6', desc: '强化交涉、威慑和关系运营能力。' },
  { key: 'tech', name: '技术型', icon: '🧠', color: '#0ea5e9', desc: '强化学习、改造和系统理解能力。' },
  { key: 'anomaly', name: '异常型', icon: '🌀', color: '#7c3aed', desc: '具备高风险高上限的异常能力倾向。' }
]

// 潜能评级配置（兼容旧 key，避免样式回归）
const spiritRootTiers = [
  { key: 'common', name: '通用', multiplier: 1.0, cost: 0, desc: '基础潜能，无额外负担。' },
  { key: 'low', name: '强化', multiplier: 1.15, cost: 3, desc: '在关键场景提供稳定增益。' },
  { key: 'middle', name: '稀有', multiplier: 1.35, cost: 6, desc: '具备明确分支特性，收益更高。' },
  { key: 'high', name: '精英', multiplier: 1.65, cost: 10, desc: '在高压副本中具备明显优势。' },
  { key: 'supreme', name: '史诗', multiplier: 2.0, cost: 15, desc: '高上限潜能，能改写局部战局。' },
  { key: 'heaven', name: '传说', multiplier: 2.35, cost: 20, desc: '极少见，通常附带独特机制。' },
  { key: 'divine', name: '神话', multiplier: 2.7, cost: 25, desc: '顶级潜能，伴随高风险副作用。' },
  { key: 'special', name: '异常', multiplier: 0, cost: 0, desc: '未知潜能，不受常规评级约束。' }
]

const filteredSpiritRoots = computed(() => {
  if (store.isLocalCreation) {
    return store.creationData.spiritRoots.filter(root => 
      root.source === 'local' || root.source === 'cloud'
    );
  } else {
    return store.creationData.spiritRoots.filter(root => 
      root.source === 'cloud'
    );
  }
});

// 高级自定义字段 - 使用动态列表格式
// 根据 types/index.ts 中的 SpiritRoot 接口定义字段
const advancedCustomFields: readonly ModalField[] = [
  { key: 'name', label: '潜能名称', type: 'text', placeholder: '例如：异能潜能' },
  { key: 'tier', label: '评级', type: 'select', options: spiritRootTiers.map(t => ({ value: t.key, label: t.name })) },
  { key: 'description', label: '潜能描述', type: 'textarea', placeholder: '描述这个潜能的特性和适用场景...' },
  { key: 'cultivation_speed', label: '成长速度', type: 'text', placeholder: '例如：极快、快速、普通、缓慢' },
  { key: 'base_multiplier', label: '成长倍率', type: 'number', placeholder: '例如：1.5' },
  { key: 'talent_cost', label: '消耗属性点', type: 'number', placeholder: '例如：10' },
  { key: 'rarity', label: '稀有度', type: 'number', placeholder: '1-10，数值越高越稀有' },
  {
    key: 'special_effects',
    label: '特殊效果',
    type: 'dynamic-list',
    columns: [
      {
        key: 'effect',
        placeholder: '效果描述，如：雷系法术威力+80%'
      }
    ]
  }
]

// 为自定义灵根数据定义完整类型 - 与标准数据格式保持一致
type CustomSpiritRootData = {
  name: string;
  tier: string;
  description: string;
  cultivation_speed: string;
  base_multiplier: string | number;
  talent_cost: string | number;
  rarity: string | number;
  special_effects: { effect: string }[];
};

function validateCustomSpiritRoot(data: Partial<CustomSpiritRootData>) {
    const errors: Record<string, string> = {};

    // 必填字段验证
    if (!data.name?.trim()) errors.name = '潜能名称不可为空';
    if (!data.tier) errors.tier = '请选择评级';
    if (!data.description?.trim()) errors.description = '潜能描述不可为空';

    // 数值字段验证
    const baseMultiplier = Number(data.base_multiplier);
    if (data.base_multiplier !== undefined && data.base_multiplier !== '' && isNaN(baseMultiplier)) {
      errors.base_multiplier = '修炼倍率必须为数字';
    }

    const talentCost = Number(data.talent_cost);
    if (data.talent_cost !== undefined && data.talent_cost !== '' && isNaN(talentCost)) {
      errors.talent_cost = '消耗点数必须为数字';
    }

    const rarity = Number(data.rarity);
    if (data.rarity !== undefined && data.rarity !== '' && (isNaN(rarity) || rarity < 1 || rarity > 10)) {
      errors.rarity = '稀有度必须在1-10之间';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors: Object.values(errors),
    };
}

async function handleCustomSubmit(data: CustomSpiritRootData) {
  // 处理特殊效果数组 - 处理动态列表格式
  const specialEffects = data.special_effects?.length
    ? data.special_effects
        .filter(item => item.effect?.trim())
        .map(item => item.effect.trim())
    : [];

  // 创建完整的标准化灵根对象
  const newRoot: SpiritRoot = {
    id: Date.now(),
    name: data.name,
    tier: spiritRootTiers.find(t => t.key === data.tier)?.name || data.tier,
    description: data.description,
    cultivation_speed: data.cultivation_speed || '普通',
    special_effects: specialEffects,
    base_multiplier: Number(data.base_multiplier) || 1.0,
    talent_cost: Number(data.talent_cost) || 0,
    rarity: Number(data.rarity) || 1,
    source: 'cloud' as const // 自定义的都算作cloud
  }

  try {
    store.addSpiritRoot(newRoot);
    handleSelectSpiritRoot(newRoot);
    isAdvancedCustomVisible.value = false;
    toast.success(`自定义潜能 "${newRoot.name}" 已保存！`);
  } catch (e) {
    console.error('保存自定义潜能失败:', e);
    toast.error('保存自定义潜能失败！');
  }
}

const isRandomSelected = computed(() => store.characterPayload.spirit_root_id === null);

// New computed properties for hover display
const activeDisplayName = computed(() => {
 if (activeSpiritRoot.value === 'random') return '随机潜能'
 if (activeSpiritRoot.value && typeof activeSpiritRoot.value === 'object') return activeSpiritRoot.value.name
 return ''
});

const activeDescription = computed(() => {
 if (activeSpiritRoot.value === 'random')
   return '主神不会提前告知你的潜能走向。选择随机后，将在开局生成未知潜能，可能极强也可能平庸。'
 if (activeSpiritRoot.value && typeof activeSpiritRoot.value === 'object') return activeSpiritRoot.value.description || '潜能信息不明。'
 return '潜能信息不明。'
});

const activeCost = computed(() => {
 if (activeSpiritRoot.value === 'random') return 0
 if (activeSpiritRoot.value && typeof activeSpiritRoot.value === 'object') return activeSpiritRoot.value.talent_cost || 0
 return 0
});

const canSelect = (root: SpiritRoot): boolean => {
  if (store.characterPayload.spirit_root_id === root.id) {
    return true;
  }
  const currentCost = store.selectedSpiritRoot?.talent_cost ?? 0;
  const availablePoints = store.remainingTalentPoints + currentCost;
  return availablePoints >= root.talent_cost;
}

function handleSelectSpiritRoot(root: SpiritRoot) {
  if (!canSelect(root)) {
    toast.warning('天道点不足，无法选择该潜能。')
    return
  }
  const newRootId = store.characterPayload.spirit_root_id === root.id ? null : root.id;
  store.selectSpiritRoot(newRootId);
}

function handleSelectRandom() {
  store.selectSpiritRoot(null);
}

function handleAIGenerate() {
  if (store.isLocalCreation) {
    isAIPromptModalVisible.value = true;
  } else {
    emit('ai-generate')
  }
}

async function handleAIPromptSubmit(userPrompt: string) {
  const toastId = 'ai-generate-spirit-root';
  toast.loading('天机推演中，请稍候...', { id: toastId });

  try {
    const aiResponse = await generateWithRawPrompt(userPrompt, SPIRIT_ROOT_ITEM_GENERATION_PROMPT, false);

    if (!aiResponse) {
      toast.error('AI推演失败', { id: toastId });
      return;
    }

    console.log('【AI推演-灵根】完整响应:', aiResponse);

    // 解析AI返回的JSON
    let parsedRoot: Record<string, unknown>;
    try {
      parsedRoot = parseJsonFromText(aiResponse);
    } catch (parseError) {
      console.error('【AI推演-灵根】JSON解析失败:', parseError);
      toast.error('AI推演结果格式错误，无法解析', { id: toastId });
      return;
    }

    // 验证必需字段
    if (!parsedRoot.name && !parsedRoot.名称) {
      toast.error('AI推演结果缺少潜能名称', { id: toastId });
      return;
    }

    // 创建灵根对象
    const newRoot: SpiritRoot = {
      id: Date.now(),
      name: String(parsedRoot.name || parsedRoot['名称'] || '未命名潜能'),
      tier: String(parsedRoot.tier || parsedRoot['品级'] || parsedRoot['等级'] || ''),
      description: String(parsedRoot.description || parsedRoot['描述'] || parsedRoot['说明'] || ''),
      base_multiplier: Number(parsedRoot.base_multiplier || parsedRoot['修炼倍率']) || 1.0,
      talent_cost: Number(parsedRoot.talent_cost || parsedRoot['天道点消耗'] || parsedRoot['点数消耗']) || 5,
      rarity: Number(parsedRoot.rarity || parsedRoot['稀有度']) || 3,
      source: 'local'
    };

    // 保存并选择灵根
    store.addSpiritRoot(newRoot);
    handleSelectSpiritRoot(newRoot);
    isAIPromptModalVisible.value = false;

    toast.success(`AI推演完成！潜能 "${newRoot.name}" 已生成`, { id: toastId });

  } catch (e: unknown) {
    console.error('【AI推演-灵根】失败:', e);
    const errorMessage = e instanceof Error ? e.message : '未知错误';
    toast.error(`AI推演失败: ${errorMessage}`, { id: toastId });
  }
}

// 解析潜能名称和评级
function getSpiritRootBaseName(name: string): string {
  // 名称中不再包含评级前缀，直接返回名称
  return name;
}

function getSpiritRootTier(root: SpiritRoot): string {
  // 直接使用tier字段
  return root.tier || '';
}

// 自定义潜能相关函数
function getCustomSpiritName(): string {
  if (customSpirit.type === 'none') return '请选择潜能类型';
  const typeInfo = spiritRootTypes.find(t => t.key === customSpirit.type);
  return typeInfo ? `${typeInfo.name}潜能` : '未知潜能';
}

function getCustomSpiritMultiplier(): number {
  if (customSpirit.tier === 'none') return 1.0;
  const tierInfo = spiritRootTiers.find(t => t.key === customSpirit.tier);
  return tierInfo ? tierInfo.multiplier : 1.0;
}

function getCustomSpiritCost(): number {
  if (customSpirit.tier === 'none') return 0;
  const tierInfo = spiritRootTiers.find(t => t.key === customSpirit.tier);
  return tierInfo ? tierInfo.cost : 0;
}

function getSpiritTierName(tierKey: string): string {
  const tierInfo = spiritRootTiers.find(t => t.key === tierKey);
  return tierInfo ? tierInfo.name : '';
}

function isCustomSpiritValid(): boolean {
  return customSpirit.type !== 'none' && customSpirit.tier !== 'none';
}

function confirmCustomSpirit() {
  if (!isCustomSpiritValid()) {
    toast.warning('请完整选择潜能类型和评级');
    return;
  }
  
  const typeInfo = spiritRootTypes.find(t => t.key === customSpirit.type);
  const tierInfo = spiritRootTiers.find(t => t.key === customSpirit.tier);
  
  if (!typeInfo || !tierInfo) {
    toast.error('选择的潜能配置无效');
    return;
  }
  
  const newRoot: SpiritRoot = {
    id: Date.now(),
    name: `${typeInfo.name}潜能`,
    description: `${tierInfo.desc}的${typeInfo.desc}`,
    base_multiplier: tierInfo.multiplier,
    talent_cost: tierInfo.cost,
    tier: tierInfo.name,
    source: 'cloud' as const
  };
  
  store.addSpiritRoot(newRoot);
  handleSelectSpiritRoot(newRoot);
  toast.success(`自定义潜能 "${newRoot.name}" 已创建！`);
  
  // 重置选择
  customSpirit.type = 'none';
  customSpirit.tier = 'none';
}

// 活跃显示相关函数
function getActiveDisplayName(): string {
  if (selectionMode.value === 'custom' && customSpirit.type !== 'none') {
    return getCustomSpiritName();
  }
  return activeDisplayName.value;
}

function getActiveDescription(): string {
  if (selectionMode.value === 'custom' && customSpirit.type !== 'none') {
    const typeInfo = spiritRootTypes.find(t => t.key === customSpirit.type);
    const tierInfo = spiritRootTiers.find(t => t.key === customSpirit.tier);
    if (typeInfo && tierInfo && customSpirit.tier !== 'none') {
      return `${tierInfo.desc}的${typeInfo.desc}`;
    } else if (typeInfo) {
      return typeInfo.desc;
    }
    return '请选择潜能评级';
  }
  return activeDescription.value;
}

function getActiveMultiplier(): string {
  if (selectionMode.value === 'custom' && customSpirit.type !== 'none') {
    return getCustomSpiritMultiplier().toString();
  }
  if (activeSpiritRoot.value === 'random') return '随机'
  if (activeSpiritRoot.value && typeof activeSpiritRoot.value === 'object') return (activeSpiritRoot.value.base_multiplier || 1.0).toString()
  return '1.0'
}

function getActiveCost(): string {
  if (selectionMode.value === 'custom' && customSpirit.type !== 'none') {
    return getCustomSpiritCost().toString();
  }
  return activeCost.value.toString();
}

// 高级自定义相关
function validateAdvancedCustom(data: Partial<CustomSpiritRootData>) {
  return validateCustomSpiritRoot(data);
}

function handleAdvancedCustomSubmit(data: CustomSpiritRootData) {
  handleCustomSubmit(data);
}

// 编辑功能
function openEditModal(root: SpiritRoot) {
  editingSpiritRoot.value = root;
  isEditModalVisible.value = true;
}

// 删除功能
async function handleDeleteSpiritRoot(id: number) {
  try {
    await store.removeSpiritRoot(id);
    console.log(`【灵根选择】成功删除灵根 ID: ${id}`);
  } catch (error) {
    console.error(`【灵根选择】删除灵根失败 ID: ${id}`, error);
  }
}

async function handleEditSubmit(data: CustomSpiritRootData) {
  if (!editingSpiritRoot.value) return;
  
  // 处理特殊效果数组
  const specialEffects = data.special_effects?.length
    ? data.special_effects
        .filter(item => item.effect?.trim())
        .map(item => item.effect.trim())
    : [];

  // 创建更新数据对象
  const updateData: Partial<SpiritRoot> = {
    name: data.name,
    tier: spiritRootTiers.find(t => t.key === data.tier)?.name || data.tier,
    description: data.description,
    cultivation_speed: `${data.base_multiplier}x`,
    special_effects: specialEffects,
    base_multiplier: parseFloat(String(data.base_multiplier)) || 1.0,
    talent_cost: parseInt(String(data.talent_cost), 10) || 0
  };

  try {
    const success = store.updateSpiritRoot(editingSpiritRoot.value.id, updateData);
    if (success) {
      isEditModalVisible.value = false;
      editingSpiritRoot.value = null;
      toast.success(`潜能 "${updateData.name}" 已更新！`);
    } else {
      toast.error('更新潜能失败！');
    }
  } catch (e) {
    console.error('更新潜能失败:', e);
    toast.error('更新潜能失败！');
  }
}

// 编辑模态框的初始数据
const editInitialData = computed(() => {
  if (!editingSpiritRoot.value) return {};

  return {
    name: editingSpiritRoot.value.name,
    tier: spiritRootTiers.find(t => t.name === editingSpiritRoot.value!.tier)?.key || 'common',
    description: editingSpiritRoot.value.description,
    base_multiplier: editingSpiritRoot.value.base_multiplier?.toString() || '1.0',
    talent_cost: editingSpiritRoot.value.talent_cost.toString(),
    special_effects: editingSpiritRoot.value.special_effects?.map(effect => ({ effect })) || []
  };
});

// fetchData 和 defineExpose 不再需要
</script>

<style scoped>
.spirit-root-selection-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* ========== 深色玻璃拟态风格 ========== */
.loading-state, .error-state, .placeholder {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  font-size: 1.1rem;
  color: #94a3b8;
  font-style: italic;
}

.spirit-root-layout {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 1.5rem;
  height: 100%;
  overflow: hidden;
}

/* ========== 左侧面板 ========== */
.spirit-root-left-panel {
  display: flex;
  flex-direction: column;
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: hidden;
}

/* 预设模式样式 */
.preset-mode {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.spirit-root-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.spirit-root-list-container::-webkit-scrollbar { width: 6px; }
.spirit-root-list-container::-webkit-scrollbar-track { background: transparent; }
.spirit-root-list-container::-webkit-scrollbar-thumb { background: rgba(147, 197, 253, 0.3); border-radius: 3px; }
.spirit-root-list-container::-webkit-scrollbar-thumb:hover { background: rgba(147, 197, 253, 0.5); }

/* ========== 选项卡样式 ========== */
.spirit-root-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.1rem 1.2rem;
  margin-bottom: 0.6rem;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid transparent;
  background: rgba(30, 41, 59, 0.4);
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-grow: 1;
}

/* 按钮组容器 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  opacity: 0;
  transition: opacity 0.2s;
  margin-left: 0.5rem;
}

.spirit-root-item:hover .action-buttons {
  opacity: 1;
}

.edit-btn, .delete-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  cursor: pointer;
  padding: 0.35rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  color: #93c5fd;
  background: rgba(147, 197, 253, 0.1);
}

.delete-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

.spirit-root-name-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.spirit-root-tier {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  text-align: center;
  min-width: 28px;
  flex-shrink: 0;
}

.spirit-root-tier.tier-下品 {
  background: linear-gradient(135deg, #8B5CF6, #A78BFA);
  color: white;
}

.spirit-root-tier.tier-中品 {
  background: linear-gradient(135deg, #3B82F6, #60A5FA);
  color: white;
}

.spirit-root-tier.tier-上品 {
  background: linear-gradient(135deg, #10B981, #34D399);
  color: white;
}

.spirit-root-tier.tier-极品 {
  background: linear-gradient(135deg, #F59E0B, #FBBF24);
  color: white;
}

.spirit-root-tier.tier-天品 {
  background: linear-gradient(135deg, #EF4444, #F87171);
  color: white;
}

.spirit-root-tier.tier-神品 {
  background: linear-gradient(135deg, #DC2626, #F87171);
  color: white;
}

.spirit-root-tier.tier-特殊 {
  background: linear-gradient(135deg, #7C3AED, #A78BFA);
  color: white;
  border: 1px solid #A78BFA;
}

.spirit-root-tier.tier-凡品 {
  background: rgba(156, 163, 175, 0.2);
  color: #6B7280;
  border: 1px solid #9CA3AF;
}

.spirit-root-item:hover {
  background: rgba(51, 65, 85, 0.6);
  border-color: rgba(147, 197, 253, 0.2);
}

.spirit-root-item.selected {
  background: rgba(30, 58, 138, 0.4);
  border-color: rgba(147, 197, 253, 0.4);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.spirit-root-item.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spirit-root-item.disabled:hover {
  background: rgba(30, 41, 59, 0.4);
  border-color: transparent;
}

.spirit-root-name {
  font-weight: 500;
  color: #f1f5f9;
}

.spirit-root-item.selected .spirit-root-name {
  color: #bfdbfe;
}

.spirit-root-cost {
  color: #fbbf24;
  font-size: 0.85rem;
  font-weight: 500;
}

.divider {
  height: 1px;
  background: linear-gradient(to right, transparent, rgba(147, 197, 253, 0.2), transparent);
  margin: 0.5rem 0;
}

.single-actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

.action-item {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.8rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.action-item:hover {
  background: var(--color-surface-lighter);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-name {
  font-weight: 500;
}

/* ========== 右侧详情面板 ========== */
.spirit-root-details-container {
  background: rgba(30, 41, 59, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.spirit-root-details {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.spirit-root-details h2 {
  margin: 0 0 1rem 0;
  color: #93c5fd;
  flex-shrink: 0;
  font-size: 1.5rem;
  text-shadow: 0 0 20px rgba(147, 197, 253, 0.3);
}

.description-scroll {
  flex: 1;
  overflow-y: auto;
  line-height: 1.7;
  padding-right: 0.5rem;
  min-height: 0;
  scrollbar-width: thin;
  scrollbar-color: rgba(147, 197, 253, 0.3) transparent;
}

.description-scroll p {
  margin: 0;
  white-space: pre-wrap;
  color: #94a3b8;
}

.description-scroll::-webkit-scrollbar { width: 6px; }
.description-scroll::-webkit-scrollbar-track { background: transparent; }
.description-scroll::-webkit-scrollbar-thumb { background: rgba(147, 197, 253, 0.3); border-radius: 3px; }

.cost-display {
  text-align: right;
  font-weight: 600;
  color: #fbbf24;
  flex-shrink: 0;
  margin-top: 1rem;
}

/* 响应式适配 - 手机端优化 */
@media (max-width: 1200px) {
  .spirit-root-layout {
    grid-template-columns: 1fr 1.8fr;
    gap: 1.5rem;
  }
}

@media (max-width: 1024px) {
  .spirit-root-layout {
    grid-template-columns: 1fr 1.5fr;
    gap: 1.2rem;
  }
  
  .spirit-root-details h2 {
    font-size: 1.6rem;
  }
}

@media (max-width: 640px) {
  .top-actions-container {
    flex-wrap: wrap;
    justify-content: stretch;
  }
  .top-actions-container .action-item {
    flex-grow: 1;
    text-align: center;
  }
  .spirit-root-layout {
    /* 改为垂直堆叠布局 */
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    gap: 1rem;
    height: auto;
    overflow: visible;
    padding: 0.8rem;
  }
  
  .spirit-root-left-panel {
    order: 1;
    /* 移除max-height限制，让flex布局正常工作 */
  }
  
  .spirit-root-details-container {
    order: 2;
    min-height: 300px;
  }
  
  .spirit-root-list-container {
    /* 移除max-height限制，让flex布局正常工作 */
    /* 添加触摸滚动优化 */
    -webkit-overflow-scrolling: touch;
    scrollbar-width: thin;
  }
  
  /* 优化触摸体验 */
  .spirit-root-item,
  .action-item {
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
}

@media (max-width: 640px) {
  .spirit-root-layout {
    gap: 0.8rem;
    padding: 0.6rem;
  }
  
  
  .spirit-root-list-container {
    padding: 0.5rem;
  }
  
  .spirit-root-item {
    padding: 0.7rem;
    font-size: 0.95rem;
    margin-bottom: 0.4rem;
  }
  
  .single-actions-container {
    padding: 0.5rem;
    gap: 0.4rem;
  }
  
  .action-item {
    padding: 0.7rem 1rem;
    font-size: 0.9rem;
  }
  
  .spirit-root-details-container {
    padding: 1.2rem;
    min-height: 250px;
  }
  
  .spirit-root-details h2 {
    font-size: 1.4rem;
    margin-bottom: 0.8rem;
  }
}

@media (max-width: 480px) {
  .top-actions-container {
    flex-direction: column;
    align-items: stretch;
  }
  .spirit-root-selection-container {
    padding: 0.4rem;
    height: auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
  }

  .spirit-root-layout {
    gap: 0.6rem;
    padding: 0;
    height: auto;
    min-height: 0;
  }
  
  .spirit-root-left-panel {
    border-radius: 6px;
  }
  
  .spirit-root-list-container {
    padding: 0.4rem;
  }
  
  .spirit-root-item {
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.3rem;
    border-radius: 4px;
  }
  
  .spirit-root-name {
    font-size: 0.9rem;
  }
  
  .spirit-root-cost {
    font-size: 0.8rem;
  }
  
  .divider {
    margin: 0.3rem 0;
  }
  
  .single-actions-container {
    flex-direction: column;
    gap: 0.4rem;
    padding: 0.4rem;
  }
  
  .action-item {
    padding: 0.6rem;
    font-size: 0.85rem;
    border-radius: 4px;
  }
  
  .spirit-root-details-container {
    padding: 1rem;
    min-height: 200px;
    border-radius: 6px;
  }
  
  .spirit-root-details h2 {
    font-size: 1.3rem;
    margin-bottom: 0.6rem;
  }
  
  .description-scroll {
    font-size: 0.9rem;
    line-height: 1.5;
    padding-right: 0.3rem;
  }
  
  .cost-display {
    font-size: 1rem;
    text-align: center;
    margin-top: 0.8rem;
  }
  
  .placeholder {
    font-size: 1rem;
    padding: 1rem;
    text-align: center;
    min-height: 150px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .top-actions-container {
    flex-direction: column;
    align-items: stretch;
    padding: 0.5rem;
  }
  .top-actions-container .action-item {
    text-align: center;
  }
}

@media (max-width: 360px) {
  .spirit-root-selection-container {
    padding: 0.3rem;
  }
  
  .spirit-root-layout {
    gap: 0.4rem;
  }
  
  
  .spirit-root-list-container {
    padding: 0.3rem;
  }
  
  .spirit-root-item {
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
    margin-bottom: 0.2rem;
  }
  
  .spirit-root-name {
    font-size: 0.8rem;
  }
  
  .spirit-root-cost {
    font-size: 0.75rem;
  }
  
  .spirit-root-details-container {
    padding: 0.8rem;
    min-height: 180px;
  }
  
  .spirit-root-details h2 {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
  }
  
  .description-scroll {
    font-size: 0.85rem;
    line-height: 1.4;
  }
  
  .cost-display {
    font-size: 0.9rem;
    margin-top: 0.6rem;
  }
  
  .action-item {
    padding: 0.5rem;
    font-size: 0.8rem;
  }
  
  .placeholder {
    font-size: 0.9rem;
    padding: 0.8rem;
    min-height: 120px;
  }
}

/* 自定义模式样式 */
.stats-display {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  flex-shrink: 0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.stat-value {
  color: var(--color-accent);
  font-weight: 600;
}

/* 顶部功能按钮 - 深色玻璃拟态风格 */
.top-actions-container {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(30, 41, 59, 0.3);
  justify-content: center;
}

.top-actions-container .action-item {
  padding: 0.5rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  background: rgba(30, 41, 59, 0.6);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.25s ease;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  letter-spacing: 0.05em;
}

.top-actions-container .action-item:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(147, 197, 253, 0.3);
  color: #f1f5f9;
}

/* 亮色主题顶部按钮 */
[data-theme="light"] .top-actions-container {
  background: rgba(241, 245, 249, 0.6);
  border-bottom-color: rgba(59, 130, 246, 0.15);
}

[data-theme="light"] .top-actions-container .action-item {
  background: rgba(255, 255, 255, 0.8);
  border-color: rgba(59, 130, 246, 0.3);
  color: #2563eb;
}

[data-theme="light"] .top-actions-container .action-item:hover {
  background: rgba(59, 130, 246, 0.1);
  border-color: #3b82f6;
  color: #1e40af;
}

/* 选择模式标签页 */
.selection-mode-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface-light);
}

.mode-tab {
  flex: 1;
  padding: 0.8rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
}

.mode-tab.active {
  color: var(--color-primary);
  background: var(--color-surface);
  border-bottom: 2px solid var(--color-primary);
}

.mode-tab:hover:not(.active) {
  background: rgba(136, 192, 208, 0.1);
  color: var(--color-text);
}

/* 自定义模式样式 */
.custom-mode {
  flex: 1;
  padding: 1rem;
  overflow-y: auto;
}

.custom-selection-container {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.selection-group {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.selection-label {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.spirit-type-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.5rem;
}

.type-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  padding: 0.8rem 0.5rem;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
  min-height: 70px;
}

.type-button:hover {
  border-color: var(--element-color, var(--color-primary));
  background: rgba(136, 192, 208, 0.1);
}

.type-button.selected {
  border-color: var(--element-color, var(--color-primary));
  background: var(--element-color, var(--color-primary));
  color: white;
}

.type-icon {
  font-size: 1.2rem;
}

.type-name {
  font-size: 0.8rem;
  font-weight: 500;
}

.tier-selection {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tier-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.2s ease;
}

.tier-button:hover {
  border-color: var(--color-primary);
  background: rgba(136, 192, 208, 0.1);
}

.tier-button.selected {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: white;
}

.tier-button.tier-common {
  border-color: #9CA3AF;
}

.tier-button.tier-low {
  border-color: #8B5CF6;
}

.tier-button.tier-middle {
  border-color: #3B82F6;
}

.tier-button.tier-high {
  border-color: #10B981;
}

.tier-button.tier-supreme {
  border-color: #F59E0B;
}

.tier-button.tier-heaven {
  border-color: #FF6B35;
}

.tier-button.tier-divine {
  border-color: #DC2626;
}

.tier-button.tier-special {
  border-color: #7C3AED;
}

.tier-name {
  font-weight: 600;
}

.tier-multiplier {
  color: var(--color-accent);
  font-size: 0.9rem;
}

.tier-cost {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

.custom-preview {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface-light);
}

.preview-title {
  font-weight: 600;
  margin-bottom: 0.8rem;
  color: var(--color-text);
}

.preview-content {
  margin-bottom: 1rem;
}

.preview-name {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.8rem;
  font-weight: 600;
  color: var(--color-primary);
}

.preview-tier {
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  background: var(--color-accent);
  color: white;
}

.preview-stats {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.preview-stats .stat {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.confirm-custom-button {
  width: 100%;
  padding: 0.8rem;
  border: none;
  border-radius: 6px;
  background: var(--color-primary);
  color: white;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.confirm-custom-button:hover:not(:disabled) {
  background: var(--color-primary-dark);
}

.confirm-custom-button:disabled {
  background: var(--color-border);
  color: var(--color-text-disabled);
  cursor: not-allowed;
}

.actions-container {
  border-top: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.5rem;
  display: flex;
  gap: 0.5rem;
}

/* 兼容新等级名称"仙品" */
.spirit-root-tier.tier-仙品 { background: linear-gradient(135deg, #EF4444, #F87171); color: white; }

/* ========== 亮色主题适配 ========== */
[data-theme="light"] .spirit-root-left-panel,
[data-theme="light"] .spirit-root-details-container {
  background: rgba(248, 250, 252, 0.8);
  border-color: rgba(0, 0, 0, 0.08);
}

[data-theme="light"] .spirit-root-item {
  background: rgba(255, 255, 255, 0.6);
}

[data-theme="light"] .spirit-root-item:hover {
  background: rgba(241, 245, 249, 0.95);
  border-color: rgba(59, 130, 246, 0.2);
}

[data-theme="light"] .spirit-root-item.selected {
  background: rgba(219, 234, 254, 0.8);
  border-color: rgba(59, 130, 246, 0.4);
}

[data-theme="light"] .spirit-root-name {
  color: #1e293b;
}

[data-theme="light"] .spirit-root-item.selected .spirit-root-name {
  color: #1e40af;
}

[data-theme="light"] .spirit-root-details h2 {
  color: #2563eb;
}

[data-theme="light"] .description-scroll p {
  color: #475569;
}

/* 亮色主题下的编辑/删除按钮 */
[data-theme="light"] .edit-btn,
[data-theme="light"] .delete-btn {
  background: rgba(241, 245, 249, 0.8);
  border: 1px solid rgba(59, 130, 246, 0.15);
  color: #475569;
}

[data-theme="light"] .edit-btn:hover {
  color: #2563eb;
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
}

[data-theme="light"] .delete-btn:hover {
  color: #dc2626;
  background: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.3);
}
</style>
