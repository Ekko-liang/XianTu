<template>
  <div class="template-selection-container">
    <div v-if="store.isLoading" class="loading-state">{{ $t('正在加载人物模版...') }}</div>
    <div v-else-if="store.error" class="error-state">{{ $t('加载失败') }}：{{ store.error }}</div>

    <div v-else class="template-layout">
      <div class="left-panel">
        <div class="section-label">{{ $t('人物模版') }}</div>
        <p class="section-hint">{{ $t('身份背景与初始技能打包，选择即确定') }}</p>
        <div class="list-container">
          <div
            v-for="tpl in store.creationData.templates"
            :key="tpl.id"
            class="list-item"
            :class="{ selected: store.characterPayload.template_id === tpl.id }"
            @click="handleSelectTemplate(tpl)"
            @mouseover="activeTemplate = tpl"
          >
            <span class="item-name">{{ tpl.name }}</span>
          </div>
        </div>
      </div>

      <div class="details-container">
        <div v-if="activeTemplate" class="template-details">
          <h2 class="details-title">{{ activeTemplate.name }}</h2>
          <p class="era">【{{ activeTemplate.era }}】</p>
          <p class="description">{{ activeTemplate.description }}</p>
          <div class="skills-section">
            <h4>{{ $t('初始技能') }}</h4>
            <ul>
              <li v-for="skill in activeTemplate.skills" :key="skill.id">
                <span class="skill-name">{{ skill.name }}</span>
                <span class="skill-desc">{{ skill.description }}</span>
              </li>
            </ul>
          </div>
        </div>
        <div v-else class="placeholder">{{ $t('请选择人物模版') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useCharacterCreationStore } from '../../stores/characterCreationStore';
import type { CharacterTemplate } from '../../data/infiniteCreationData';

const store = useCharacterCreationStore();
const activeTemplate = ref<CharacterTemplate | null>(null);

function handleSelectTemplate(tpl: CharacterTemplate) {
  store.selectTemplate(tpl.id);
}
</script>

<style scoped>
.template-selection-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.loading-state,
.error-state {
  padding: 2rem;
  text-align: center;
  color: #94a3b8;
}

.error-state {
  color: #f87171;
}

.template-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  height: 100%;
  min-height: 0;
}

.left-panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.section-label {
  font-weight: 600;
  color: #f1f5f9;
}

.section-hint {
  font-size: 0.8rem;
  color: #64748b;
  margin: 0;
}

.list-container {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.list-item {
  padding: 0.75rem 1rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.list-item:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(96, 165, 250, 0.3);
}

.list-item.selected {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(96, 165, 250, 0.5);
}

.item-name {
  font-weight: 500;
  color: #f1f5f9;
}

.details-container {
  overflow-y: auto;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.template-details {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.details-title {
  margin: 0;
  font-size: 1.25rem;
  color: #f1f5f9;
}

.era {
  margin: 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.description {
  margin: 0;
  color: #cbd5e1;
  line-height: 1.6;
}

.skills-section h4 {
  margin: 0.5rem 0 0.25rem;
  font-size: 0.9rem;
  color: #94a3b8;
}

.skills-section ul {
  margin: 0;
  padding-left: 1.25rem;
  list-style: disc;
}

.skills-section li {
  margin-bottom: 0.25rem;
  color: #cbd5e1;
}

.skill-name {
  font-weight: 500;
  margin-right: 0.5rem;
}

.skill-desc {
  font-size: 0.85rem;
  color: #64748b;
}

.placeholder {
  color: #64748b;
  font-style: italic;
}
</style>
