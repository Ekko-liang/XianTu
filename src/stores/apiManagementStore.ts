/**
 * API管理Store - 支持多个API配置
 */
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { APIProvider } from '@/services/aiService';

export interface APIConfig {
  id: string;
  name: string;
  provider: APIProvider;
  url: string;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enabled: boolean;
}

export type APIUsageType =
  | 'main'  // 主游戏流程
  | 'memory_summary'  // 记忆总结
  | 'text_optimization'  // 文本优化
  | 'cot'  // 思维链
  | 'world_generation'  // 世界生成
  | 'quest_generation'  // 任务生成
  | 'npc_generation';  // NPC生成

export interface APIAssignment {
  type: APIUsageType;
  apiId: string;  // 对应API配置的ID
}

export const useAPIManagementStore = defineStore('apiManagement', () => {
  // API配置列表
  const apiConfigs = ref<APIConfig[]>([]);

  // API分配：不同功能使用哪个API
  const apiAssignments = ref<APIAssignment[]>([
    { type: 'main', apiId: 'default' },
    { type: 'memory_summary', apiId: 'default' },
    { type: 'text_optimization', apiId: 'default' },
    { type: 'cot', apiId: 'default' },
    { type: 'world_generation', apiId: 'default' },
    { type: 'quest_generation', apiId: 'default' },
    { type: 'npc_generation', apiId: 'default' }
  ]);

  // 计算属性：获取所有已启用的API
  const enabledAPIs = computed(() => {
    return apiConfigs.value.filter(api => api.enabled);
  });

  // 初始化：从localStorage加载
  const loadFromStorage = () => {
    try {
      const saved = localStorage.getItem('api_management_config');
      if (saved) {
        const data = JSON.parse(saved);
        apiConfigs.value = data.apiConfigs || [];
        apiAssignments.value = data.apiAssignments || apiAssignments.value;
      }

      // 如果没有配置，添加默认配置
      if (apiConfigs.value.length === 0) {
        apiConfigs.value.push({
          id: 'default',
          name: '默认API',
          provider: 'openai',
          url: 'https://api.openai.com',
          apiKey: '',
          model: 'gpt-4o',
          temperature: 0.7,
          maxTokens: 16000,
          enabled: true
        });
      }
    } catch (error) {
      console.error('[API管理] 加载配置失败:', error);
    }
  };

  // 保存到localStorage
  const saveToStorage = () => {
    try {
      const data = {
        apiConfigs: apiConfigs.value,
        apiAssignments: apiAssignments.value
      };
      localStorage.setItem('api_management_config', JSON.stringify(data));
    } catch (error) {
      console.error('[API管理] 保存配置失败:', error);
    }
  };

  // 添加API配置
  const addAPI = (config: Omit<APIConfig, 'id'>) => {
    const newAPI: APIConfig = {
      ...config,
      id: `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    apiConfigs.value.push(newAPI);
    saveToStorage();
    return newAPI.id;
  };

  // 更新API配置
  const updateAPI = (id: string, updates: Partial<APIConfig>) => {
    const index = apiConfigs.value.findIndex(api => api.id === id);
    if (index !== -1) {
      apiConfigs.value[index] = { ...apiConfigs.value[index], ...updates };
      saveToStorage();
    }
  };

  // 删除API配置
  const deleteAPI = (id: string) => {
    // 不能删除默认API
    if (id === 'default') {
      throw new Error('不能删除默认API配置');
    }

    // 如果有功能使用了这个API，将它们改回默认API
    apiAssignments.value.forEach(assignment => {
      if (assignment.apiId === id) {
        assignment.apiId = 'default';
      }
    });

    apiConfigs.value = apiConfigs.value.filter(api => api.id !== id);
    saveToStorage();
  };

  // 设置功能使用的API
  const assignAPI = (type: APIUsageType, apiId: string) => {
    const assignment = apiAssignments.value.find(a => a.type === type);
    if (assignment) {
      assignment.apiId = apiId;
    } else {
      apiAssignments.value.push({ type, apiId });
    }
    saveToStorage();
  };

  // 获取功能使用的API配置
  const getAPIForType = (type: APIUsageType): APIConfig | null => {
    const assignment = apiAssignments.value.find(a => a.type === type);
    if (!assignment) return null;

    const api = apiConfigs.value.find(a => a.id === assignment.apiId && a.enabled);
    if (!api) {
      // 如果找不到或未启用，返回默认API
      return apiConfigs.value.find(a => a.id === 'default') || null;
    }

    return api;
  };

  // 切换API启用状态
  const toggleAPI = (id: string) => {
    const api = apiConfigs.value.find(a => a.id === id);
    if (api) {
      api.enabled = !api.enabled;
      saveToStorage();
    }
  };

  // 导出配置
  const exportConfig = () => {
    return {
      apiConfigs: apiConfigs.value,
      apiAssignments: apiAssignments.value,
      exportTime: new Date().toISOString()
    };
  };

  // 导入配置
  const importConfig = (data: any) => {
    try {
      if (data.apiConfigs && Array.isArray(data.apiConfigs)) {
        apiConfigs.value = data.apiConfigs;
      }
      if (data.apiAssignments && Array.isArray(data.apiAssignments)) {
        apiAssignments.value = data.apiAssignments;
      }
      saveToStorage();
    } catch (error) {
      console.error('[API管理] 导入配置失败:', error);
      throw error;
    }
  };

  return {
    apiConfigs,
    apiAssignments,
    enabledAPIs,
    loadFromStorage,
    saveToStorage,
    addAPI,
    updateAPI,
    deleteAPI,
    assignAPI,
    getAPIForType,
    toggleAPI,
    exportConfig,
    importConfig
  };
});
