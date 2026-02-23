<template>
  <div class="character-details-panel">
    <div v-if="!gameStateStore.isGameLoaded" class="empty">未加载角色数据。</div>

    <template v-else>
      <header class="hero">
        <div>
          <h2>{{ baseName }}</h2>
          <p>{{ levelText }} · 灵魂强度 {{ reincarnator.soulStrength }}</p>
        </div>
        <div class="phase">阶段：{{ phaseText }}</div>
      </header>

      <section class="grid two">
        <article class="card">
          <h3>轮回者核心</h3>
          <div class="kv">
            <span>神点</span>
            <strong>{{ reincarnator.godPoints }}</strong>
          </div>
          <div class="kv">
            <span>副本完成数</span>
            <strong>{{ reincarnator.missionCount }}</strong>
          </div>
          <div class="kv">
            <span>存活率</span>
            <strong>{{ Math.round((reincarnator.survivalRate ?? 0) * 100) }}%</strong>
          </div>
          <div class="kv">
            <span>晋升资格点</span>
            <strong>{{ reincarnator.promotionPoints }}</strong>
          </div>
          <div class="kv">
            <span>有效副本进度</span>
            <strong>{{ effectiveMissionText }}</strong>
          </div>
          <div class="kv" v-if="reincarnator.promotionTrialPending">
            <span>待触发试炼</span>
            <strong class="warn">→ {{ reincarnator.pendingPromotionTarget }}</strong>
          </div>
          <div class="kv" v-if="reincarnator.promotionTrialFailures > 0">
            <span>连续失败次数</span>
            <strong class="danger">{{ reincarnator.promotionTrialFailures }}</strong>
          </div>
          <div class="kv" v-if="reincarnator.soulStrengthCapMultiplier < 1">
            <span>灵魂上限惩罚</span>
            <strong class="danger">-{{ Math.round((1 - reincarnator.soulStrengthCapMultiplier) * 100) }}%</strong>
          </div>
        </article>

        <article class="card">
          <h3>基础属性</h3>
          <div class="attr-grid">
            <div class="attr"><span>STR</span><strong>{{ reincarnator.attributes.STR }}</strong></div>
            <div class="attr"><span>PER</span><strong>{{ reincarnator.attributes.PER }}</strong></div>
            <div class="attr"><span>INT</span><strong>{{ reincarnator.attributes.INT }}</strong></div>
            <div class="attr"><span>LUK</span><strong>{{ reincarnator.attributes.LUK }}</strong></div>
            <div class="attr"><span>CHA</span><strong>{{ reincarnator.attributes.CHA }}</strong></div>
            <div class="attr"><span>WIL</span><strong>{{ reincarnator.attributes.WIL }}</strong></div>
          </div>
        </article>
      </section>

      <section class="grid two">
        <article class="card">
          <h3>生命体征</h3>
          <div class="bar-group" v-for="v in vitalsRows" :key="v.key">
            <div class="bar-top">
              <span>{{ v.key }}</span>
              <span>{{ v.current }}/{{ v.max }}</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" :style="{ width: `${v.percent}%` }"></div>
            </div>
          </div>
        </article>

        <article class="card">
          <h3>能力与携带</h3>
          <div class="kv">
            <span>已解锁能力</span>
            <strong>{{ reincarnator.abilities?.length ?? 0 }}</strong>
          </div>
          <div class="chips" v-if="(reincarnator.abilities?.length ?? 0) > 0">
            <span v-for="ability in reincarnator.abilities" :key="ability" class="chip">{{ ability }}</span>
          </div>
          <div v-else class="subtle">暂无永久能力</div>

          <div class="kv">
            <span>携带配置</span>
            <strong>{{ loadout.length }}</strong>
          </div>
          <div class="chips" v-if="loadout.length">
            <span v-for="ability in loadout" :key="ability" class="chip active">{{ ability }}</span>
          </div>
          <div v-else class="subtle">未配置携带能力</div>
        </article>
      </section>

      <section class="card" v-if="currentMission">
        <h3>当前副本状态</h3>
        <div class="kv"><span>副本</span><strong>{{ currentMission.name }}</strong></div>
        <div class="kv"><span>难度</span><strong>{{ currentMission.difficulty }}</strong></div>
        <div class="kv"><span>状态</span><strong>{{ currentMission.status }}</strong></div>
        <div class="kv"><span>天数</span><strong>第 {{ currentMission.day }} 天</strong></div>

        <div class="objective-group">
          <h4>主线目标</h4>
          <ul>
            <li v-for="obj in currentMission.mainQuest.objectives" :key="obj.id">
              <span :class="{ done: obj.completed }">{{ obj.description }}</span>
              <small>{{ obj.completed ? '完成' : '进行中' }}</small>
            </li>
          </ul>
        </div>

        <div class="objective-group" v-if="currentMission.sideQuests.length">
          <h4>支线目标</h4>
          <ul>
            <li v-for="quest in currentMission.sideQuests" :key="quest.id">
              <span>{{ quest.title }}</span>
              <small>{{ quest.completed ? '完成' : '未完成' }}</small>
            </li>
          </ul>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { PROMOTION_REQUIREMENTS, getEffectiveMissionCountForRank, normalizeDifficultyStats } from '@/utils/reincarnatorProgress';

const gameStateStore = useGameStateStore();

const reincarnator = computed(() => gameStateStore.reincarnator);
const baseName = computed(() => gameStateStore.character?.名字 || gameStateStore.reincarnator?.level || '无名轮回者');
const phaseText = computed(() => {
  const map: Record<string, string> = {
    hub: '主神空间',
    mission: '副本进行中',
    settlement: '副本结算',
  };
  return map[gameStateStore.gamePhase] ?? gameStateStore.gamePhase;
});
const levelText = computed(() => `${reincarnator.value.level}级${reincarnator.value.star}星`);
const loadout = computed(() => {
  const arr = (gameStateStore.reincarnator as any)?.loadout;
  return Array.isArray(arr) ? arr : [];
});
const currentMission = computed(() => gameStateStore.currentMission);
const effectiveMissionText = computed(() => {
  const level = reincarnator.value.level;
  if (level === 'SSS') return '已达等级上限';
  const requirement = PROMOTION_REQUIREMENTS[level as keyof typeof PROMOTION_REQUIREMENTS];
  if (!requirement) return '--';
  const stats = normalizeDifficultyStats(reincarnator.value.effectiveMissionCountByDifficulty);
  const count = getEffectiveMissionCountForRank(stats, level);
  return `${count} / ${requirement.minMissions}`;
});

const vitalsRows = computed(() => {
  const rows = [
    { key: 'HP', current: reincarnator.value.vitals.HP.current, max: reincarnator.value.vitals.HP.max },
    { key: 'EP', current: reincarnator.value.vitals.EP.current, max: reincarnator.value.vitals.EP.max },
    { key: 'MP', current: reincarnator.value.vitals.MP.current, max: reincarnator.value.vitals.MP.max },
  ];
  return rows.map((row) => ({ ...row, percent: row.max > 0 ? Math.min(100, Math.max(0, Math.round((row.current / row.max) * 100))) : 0 }));
});
</script>

<style scoped>
.character-details-panel {
  padding: 16px;
  display: grid;
  gap: 12px;
  color: var(--color-text);
}
.empty {
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  padding: 14px;
  color: var(--color-text-secondary);
}
.hero {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  background: var(--color-surface);
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.hero h2 {
  margin: 0;
}
.hero p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
}
.phase {
  color: var(--color-primary);
  font-weight: 700;
}
.grid {
  display: grid;
  gap: 10px;
}
.grid.two {
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
.card {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 12px;
  display: grid;
  gap: 8px;
}
.card h3 {
  margin: 0;
}
.kv {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.warn {
  color: var(--color-warning);
}
.danger {
  color: #dc2626;
}
.attr-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}
.attr {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px;
  display: grid;
  gap: 4px;
  background: var(--color-surface-light);
}
.attr span {
  color: var(--color-text-secondary);
  font-size: 12px;
}
.bar-group {
  display: grid;
  gap: 6px;
}
.bar-top {
  display: flex;
  justify-content: space-between;
}
.bar-track {
  height: 8px;
  border-radius: 999px;
  background: var(--color-surface-light);
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, rgba(var(--color-primary-rgb), 0.8), rgba(var(--color-primary-rgb), 0.4));
}
.chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 3px 10px;
  font-size: 12px;
}
.chip.active {
  border-color: rgba(var(--color-primary-rgb), 0.55);
  color: var(--color-primary);
}
.subtle {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.objective-group {
  border-top: 1px dashed var(--color-border);
  padding-top: 8px;
}
.objective-group h4 {
  margin: 0 0 6px;
}
.objective-group ul {
  margin: 0;
  padding-left: 18px;
  display: grid;
  gap: 6px;
}
.objective-group li {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.done {
  text-decoration: line-through;
  opacity: 0.7;
}
</style>
