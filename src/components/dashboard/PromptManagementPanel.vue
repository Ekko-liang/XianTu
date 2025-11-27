<template>
  <div class="prompt-panel">
    <div class="panel-header compact">
      <button class="back-btn" @click="goBack" title="返回">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      </button>
      <div class="panel-title-compact">
        <span class="title-text">📝 提示词管理</span>
      </div>
      <div class="panel-actions">
        <button class="action-btn-compact" @click="expandAllCategories" title="全部展开">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <button class="action-btn-compact" @click="collapseAllCategories" title="全部折叠">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
        <button class="action-btn-compact" @click="exportPrompts" title="导出全部">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
        </button>
        <button class="action-btn-compact" @click="importPrompts" title="导入">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
        </button>
        <button class="action-btn-compact primary" @click="saveAll" title="保存全部">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
            <polyline points="17 21 17 13 7 13 7 21"></polyline>
            <polyline points="7 3 7 8 15 8"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <div class="prompt-list">
      <!-- 分类显示 -->
      <div v-for="(categoryData, categoryKey) in promptsByCategory" :key="categoryKey" class="category-section">
        <!-- 分类头部 -->
        <div class="category-header" @click="toggleCategory(categoryKey)">
          <div class="category-title">
            <span class="category-icon">{{ categoryData.info.icon }}</span>
            <span class="category-name">{{ categoryData.info.name }}</span>
            <span class="category-count">{{ categoryData.prompts.length }} 个提示词</span>
          </div>
          <div class="category-actions">
            <span class="category-desc">{{ categoryData.info.description }}</span>
            <svg
              class="expand-icon"
              :class="{ expanded: expandedCategories[categoryKey] }"
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
        </div>

        <!-- 分类内容 -->
        <div v-if="expandedCategories[categoryKey]" class="category-content">
          <div v-for="prompt in categoryData.prompts" :key="prompt.key" class="prompt-item">
            <div class="prompt-header" @click="togglePrompt(prompt.key)">
              <div class="prompt-title-area">
                <!-- 显示顺序号（仅核心请求提示词） -->
                <span v-if="categoryKey === 'coreRequest' && prompt.order" class="prompt-order">
                  {{ prompt.order }}
                </span>
                <span class="prompt-title">{{ prompt.name }}</span>
              </div>
              <div class="prompt-meta">
                <span v-if="prompt.description" class="prompt-desc" :title="prompt.description">
                  {{ truncateText(prompt.description, 30) }}
                </span>
                <span class="prompt-status" :class="{ modified: prompt.modified }">
                  {{ prompt.modified ? '已修改' : '默认' }}
                </span>
              </div>
            </div>
            <div v-if="expandedPrompts[prompt.key]" class="prompt-content">
              <div v-if="prompt.description" class="prompt-description-full">
                {{ prompt.description }}
              </div>
              <textarea
                v-model="prompt.content"
                @input="markModified(prompt.key)"
                rows="20"
                class="prompt-textarea"
              ></textarea>
              <div class="prompt-actions">
                <button class="btn-small" @click="resetPrompt(prompt.key)">重置为默认</button>
                <button class="btn-small" @click="exportSingle(prompt.key)">导出此项</button>
                <button class="btn-small btn-primary" @click="saveSingle(prompt.key)">保存修改</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { promptStorage, type PromptItem, type PromptsByCategory } from '@/services/promptStorage';
import { toast } from '@/utils/toast';

const router = useRouter();

const promptsByCategory = ref<PromptsByCategory>({});
const expandedPrompts = ref<Record<string, boolean>>({});
const expandedCategories = ref<Record<string, boolean>>({});

onMounted(async () => {
  await loadPrompts();
});

async function loadPrompts() {
  promptsByCategory.value = await promptStorage.loadByCategory();
  // 默认展开第一个分类
  const firstCategory = Object.keys(promptsByCategory.value)[0];
  if (firstCategory) {
    expandedCategories.value[firstCategory] = true;
  }
}

function goBack() {
  // 根据来源决定返回位置
  // 如果是从独立路由访问，返回首页
  // 如果是从游戏内访问，返回设置页
  const currentPath = router.currentRoute.value.path;
  if (currentPath === '/prompts') {
    router.push('/');
  } else {
    router.push('/game/settings');
  }
}

function toggleCategory(categoryKey: string) {
  expandedCategories.value[categoryKey] = !expandedCategories.value[categoryKey];
}

function togglePrompt(key: string) {
  expandedPrompts.value[key] = !expandedPrompts.value[key];
}

function expandAllCategories() {
  for (const key in promptsByCategory.value) {
    expandedCategories.value[key] = true;
  }
}

function collapseAllCategories() {
  for (const key in promptsByCategory.value) {
    expandedCategories.value[key] = false;
  }
  // 同时折叠所有提示词
  expandedPrompts.value = {};
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function markModified(key: string) {
  // 找到对应的提示词并标记为已修改
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      prompt.modified = prompt.content !== prompt.default;
      break;
    }
  }
}

async function saveSingle(key: string) {
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      await promptStorage.save(key, prompt.content);
      toast.success(`已保存: ${prompt.name}`);
      break;
    }
  }
}

async function saveAll() {
  let savedCount = 0;
  for (const categoryKey in promptsByCategory.value) {
    for (const prompt of promptsByCategory.value[categoryKey].prompts) {
      if (prompt.modified) {
        await promptStorage.save(prompt.key, prompt.content);
        savedCount++;
      }
    }
  }
  if (savedCount > 0) {
    toast.success(`已保存 ${savedCount} 项修改`);
  } else {
    toast.info('没有需要保存的修改');
  }
}

async function resetPrompt(key: string) {
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      prompt.content = prompt.default;
      prompt.modified = false;
      await promptStorage.reset(key);
      toast.info(`已重置: ${prompt.name}`);
      break;
    }
  }
}

function exportSingle(key: string) {
  for (const categoryKey in promptsByCategory.value) {
    const prompt = promptsByCategory.value[categoryKey].prompts.find(p => p.key === key);
    if (prompt) {
      const data = { [key]: prompt.content };
      downloadJSON(data, `prompt_${key}.json`);
      break;
    }
  }
}

async function exportPrompts() {
  const data = await promptStorage.exportAll();
  downloadJSON(data, 'prompts_all.json');
  toast.success('已导出全部提示词');
}

function importPrompts() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const count = await promptStorage.importPrompts(data);
      // 重新加载
      await loadPrompts();
      toast.success(`成功导入 ${count} 个提示词`);
    } catch (error) {
      toast.error('导入失败，请检查文件格式');
    }
  };
  input.click();
}

function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
</script>

<style scoped>
.prompt-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-background);
}

.panel-header.compact {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: var(--color-surface-hover);
  color: var(--color-primary);
}

.panel-title-compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.title-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
}

.panel-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-btn-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn-compact:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.action-btn-compact.primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.action-btn-compact.primary:hover {
  background: var(--color-primary-hover);
}

.prompt-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

/* 分类样式 */
.category-section {
  margin-bottom: 1.5rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  background: var(--color-surface);
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-surface-hover) 100%);
  cursor: pointer;
  user-select: none;
  transition: all 0.2s;
}

.category-header:hover {
  background: var(--color-surface-hover);
}

.category-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.category-icon {
  font-size: 1.25rem;
}

.category-name {
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
}

.category-count {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  background: var(--color-background);
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
}

.category-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.category-desc {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.expand-icon {
  transition: transform 0.3s ease;
  color: var(--color-text-secondary);
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.category-content {
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

/* 提示词项目样式 */
.prompt-item {
  border-bottom: 1px solid var(--color-border);
}

.prompt-item:last-child {
  border-bottom: none;
}

.prompt-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.875rem 1.25rem;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s;
}

.prompt-header:hover {
  background: var(--color-surface-hover);
}

.prompt-title-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.prompt-order {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  padding: 0 6px;
  background: var(--color-primary);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 6px;
}

.prompt-title {
  font-weight: 500;
  color: var(--color-text);
}

.prompt-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.prompt-desc {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.prompt-status {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: var(--color-surface);
  color: var(--color-text-secondary);
}

.prompt-status.modified {
  background: rgba(var(--color-warning-rgb), 0.2);
  color: var(--color-warning);
}

.prompt-content {
  padding: 1rem 1.25rem;
  background: var(--color-background);
  border-top: 1px solid var(--color-border);
}

.prompt-description-full {
  margin-bottom: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.prompt-textarea {
  width: 100%;
  min-height: 400px;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 0.85rem;
  line-height: 1.6;
  resize: vertical;
}

.prompt-textarea:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(var(--color-primary-rgb), 0.2);
}

.prompt-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  justify-content: flex-end;
}

.btn-small {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-small:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-primary);
}

.btn-small.btn-primary {
  background: var(--color-primary);
  color: white;
  border-color: var(--color-primary);
}

.btn-small.btn-primary:hover {
  background: var(--color-primary-hover);
}

/* 响应式适配 */
@media (max-width: 768px) {
  .category-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .category-actions {
    width: 100%;
    justify-content: space-between;
  }

  .prompt-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .prompt-meta {
    width: 100%;
    justify-content: space-between;
  }

  .prompt-desc {
    max-width: 150px;
  }

  .prompt-textarea {
    min-height: 300px;
  }
}
</style>
