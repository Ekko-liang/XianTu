<template>
  <div class="team-panel">
    <header class="header">
      <h2>队伍管理</h2>
      <button class="add-btn" @click="recruit">招募队友</button>
    </header>

    <p class="hint">队伍事件会直接影响副本评分、特殊事件权重与关系走向。</p>

    <div v-if="isMissionActive" class="phase-banner">当前处于副本阶段：队伍协作/背叛/死亡将即时写入副本特殊事件。</div>

    <div v-if="members.length === 0" class="empty">
      当前无队友，建议先招募 1-2 名成员再进入高难副本。
    </div>

    <div v-else class="list">
      <div v-for="member in members" :key="member.id" class="member">
        <div class="top">
          <div>
            <span class="name">{{ member.name }}</span>
            <span class="role">{{ member.role || '轮回者' }}</span>
          </div>
          <span class="status" :class="member.status">{{ statusLabel(member.status) }}</span>
        </div>

        <div class="trust-row">
          <label>信任度</label>
          <input type="range" min="0" max="100" :value="member.trust" @input="onTrustInput(member.id, $event)" />
          <span>{{ member.trust }}</span>
        </div>

        <div class="status-actions">
          <button @click="setStatus(member.id, 'active')">在队</button>
          <button @click="setStatus(member.id, 'injured')">受伤</button>
          <button @click="setStatus(member.id, 'betrayed')">背叛</button>
          <button @click="setStatus(member.id, 'dead')">阵亡</button>
        </div>
      </div>
    </div>

    <div class="event-actions" v-if="members.length > 0">
      <h3>快速事件</h3>
      <div class="buttons">
        <button @click="recordCooperation">记录协作成功</button>
        <button @click="recordConflict">记录冲突事件</button>
      </div>
    </div>

    <div class="resources">
      <h3>共享资源</h3>
      <div v-if="sharedResources.length === 0" class="empty-sub">暂无共享资源。</div>
      <div v-else class="resource-list">
        <div v-for="resource in sharedResources" :key="resource.id" class="resource-item">
          <span>{{ resource.name }}</span>
          <span>x{{ resource.quantity }}</span>
        </div>
      </div>
    </div>

    <div class="events">
      <h3>最近队伍事件</h3>
      <div v-if="recentEvents.length === 0" class="empty-sub">暂无事件。</div>
      <div v-else class="event-list">
        <div v-for="event in recentEvents" :key="event.id" class="event-item">
          <div class="event-top">
            <span class="event-type">{{ event.type }}</span>
            <span class="event-time">{{ formatTime(event.time) }}</span>
          </div>
          <div>{{ event.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useGameStateStore } from '@/stores/gameStateStore';
import { toast } from '@/utils/toast';

const gameStateStore = useGameStateStore();
const members = computed(() => gameStateStore.teamState?.members ?? []);
const sharedResources = computed(() => gameStateStore.teamState?.sharedResources ?? []);
const recentEvents = computed(() => ((gameStateStore.teamState as any)?.teamEvents ?? []).slice(0, 8));
const isMissionActive = computed(() => gameStateStore.gamePhase === 'mission' && !!gameStateStore.currentMission);

const recruit = () => {
  const id = `tm_${Date.now()}`;
  const alias = `轮回者-${members.value.length + 1}`;
  gameStateStore.addTeamMember({ id, name: alias });
  toast.success(`已招募队友：${alias}`);
};

const onTrustInput = (memberId: string, event: Event) => {
  const value = Number((event.target as HTMLInputElement).value ?? 50);
  gameStateStore.updateTeamMemberTrust(memberId, value);
};

const setStatus = (memberId: string, status: 'active' | 'injured' | 'dead' | 'missing' | 'betrayed') => {
  gameStateStore.markTeamMemberStatus(memberId, status);
  const msgMap: Record<string, string> = {
    active: '成员状态已设为在队',
    injured: '成员状态已设为受伤',
    dead: '成员状态已设为阵亡（已记录结算影响）',
    betrayed: '成员状态已设为背叛（已记录结算影响）',
    missing: '成员状态已设为失联',
  };
  toast.warning(msgMap[status] ?? '状态已更新');
};

const recordCooperation = () => {
  const activeMembers = members.value.filter((m) => m.status === 'active' || m.status === 'injured').map((m) => m.id);
  if (activeMembers.length === 0) {
    toast.warning('当前无可协作成员');
    return;
  }
  gameStateStore.recordTeamCooperation(activeMembers, '队伍完成一次高压协作，成功推进目标');
  toast.success('已记录协作事件（已联动副本特殊事件）');
};

const recordConflict = () => {
  const target = members.value.find((m) => m.status === 'active' || m.status === 'injured');
  if (!target) {
    toast.warning('当前无可记录冲突成员');
    return;
  }
  gameStateStore.recordTeamEvent({
    type: 'conflict',
    memberId: target.id,
    description: `${target.name} 与队伍发生冲突，行动配合下降`,
    weight: 1.06,
  });
  gameStateStore.updateTeamMemberTrust(target.id, Math.max(0, target.trust - 10));
  toast.warning('已记录冲突事件');
};

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    active: '在队',
    injured: '受伤',
    dead: '阵亡',
    missing: '失联',
    betrayed: '背叛',
  };
  return map[status] ?? status;
};

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
</script>

<style scoped>
.team-panel {
  padding: 16px;
  color: var(--color-text);
  display: grid;
  gap: 12px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
h2 {
  margin: 0;
}
.add-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  border-radius: 8px;
  padding: 7px 10px;
  cursor: pointer;
}
.hint {
  margin: 0;
  color: var(--color-text-secondary);
}
.phase-banner {
  border: 1px solid rgba(var(--color-primary-rgb), 0.4);
  background: rgba(var(--color-primary-rgb), 0.12);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 13px;
}
.empty,
.empty-sub {
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  padding: 12px;
  color: var(--color-text-secondary);
}
.list {
  display: grid;
  gap: 10px;
}
.member {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-surface);
  padding: 12px;
  display: grid;
  gap: 10px;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.name {
  font-weight: 700;
}
.role {
  margin-left: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}
.status {
  font-size: 12px;
}
.status.dead,
.status.betrayed {
  color: #dc2626;
}
.status.injured {
  color: var(--color-warning);
}
.trust-row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
}
.status-actions,
.buttons {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.status-actions button,
.buttons button {
  border: 1px solid var(--color-border);
  background: var(--color-surface-light);
  color: var(--color-text);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
.resources,
.events,
.event-actions {
  display: grid;
  gap: 8px;
}
h3 {
  margin: 0;
  font-size: 15px;
}
.resource-list,
.event-list {
  display: grid;
  gap: 6px;
}
.resource-item,
.event-item {
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 8px 10px;
  background: var(--color-surface);
}
.event-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 3px;
}
.event-type {
  font-size: 12px;
  color: var(--color-primary);
}
.event-time {
  font-size: 12px;
  color: var(--color-text-secondary);
}
</style>
