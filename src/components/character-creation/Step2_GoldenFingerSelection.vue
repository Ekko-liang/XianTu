<template>
  <div class="golden-finger-selection-container">
    <div v-if="store.isLoading" class="loading-state">{{ $t('正在加载金手指...') }}</div>
    <div v-else-if="store.error" class="error-state">{{ $t('加载失败') }}：{{ store.error }}</div>

    <div v-else class="golden-finger-layout">
      <div class="section-intro">
        <h3>{{ $t('选择金手指') }}</h3>
        <p class="intro-text">{{ $t('初期为 D 级或未激活，随副本完成可进阶，避免开局强度失衡') }}</p>
      </div>

      <div class="golden-finger-grid">
        <div
          v-for="gf in store.creationData.goldenFingers"
          :key="gf.id"
          class="golden-finger-card"
          :class="{ selected: store.characterPayload.golden_finger_id === gf.id }"
          @click="handleSelectGoldenFinger(gf)"
        >
          <div class="card-header">
            <span class="card-name">{{ gf.name }}</span>
            <span class="card-category" :class="`cat-${gf.category}`">{{ gf.category }}</span>
          </div>
          <p class="card-desc">{{ gf.description }}</p>
          <div class="card-meta">
            <span class="initial-level">{{ $t('初期') }}: {{ gf.initialLevel }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useCharacterCreationStore } from '../../stores/characterCreationStore';
import type { GoldenFinger } from '../../data/infiniteCreationData';

const store = useCharacterCreationStore();

function handleSelectGoldenFinger(gf: GoldenFinger) {
  store.selectGoldenFinger(gf.id);
}
</script>

<style scoped>
.golden-finger-selection-container {
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

.golden-finger-layout {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  height: 100%;
  overflow-y: auto;
}

.section-intro {
  flex-shrink: 0;
}

.section-intro h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  color: #f1f5f9;
}

.intro-text {
  margin: 0;
  font-size: 0.9rem;
  color: #94a3b8;
}

.golden-finger-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}

.golden-finger-card {
  padding: 1rem;
  background: rgba(30, 41, 59, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.golden-finger-card:hover {
  background: rgba(51, 65, 85, 0.8);
  border-color: rgba(251, 191, 36, 0.3);
}

.golden-finger-card.selected {
  background: rgba(251, 191, 36, 0.15);
  border-color: rgba(251, 191, 36, 0.5);
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.card-name {
  font-weight: 600;
  color: #f1f5f9;
}

.card-category {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
}

.cat-系统 { color: #60a5fa; }
.cat-时间 { color: #a78bfa; }
.cat-情报 { color: #34d399; }
.cat-成长 { color: #fbbf24; }
.cat-特殊 { color: #f472b6; }

.card-desc {
  margin: 0 0 0.5rem;
  font-size: 0.85rem;
  color: #cbd5e1;
  line-height: 1.5;
}

.card-meta {
  font-size: 0.75rem;
  color: #64748b;
}

.initial-level {
  font-style: italic;
}
</style>
