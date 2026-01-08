<template>
  <div class="online-travel-panel">
    <!-- 状态提示 -->
    <div v-if="!backendReady" class="notice error-indicator">
      {{ t('未配置后端服务器，联机/穿越不可用') }}
    </div>
    <div v-else-if="!isOnlineMode" class="notice warning-indicator">
      {{ t('当前不是联机存档，无法使用穿越功能') }}
    </div>

    <template v-else>
      <!-- 标签页导航 -->
      <div class="tabs-header">
        <div class="tabs-nav">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab-btn"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <component :is="tab.icon" :size="16" />
            <span>{{ t(tab.label) }}</span>
          </button>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="refreshAll" :disabled="isLoading">
            <RefreshCw :size="16" />
          </button>
          <button class="action-btn primary" @click="handleSignin" :disabled="isLoading">
            <CalendarCheck :size="16" />
            <span>{{ t('签到') }}</span>
          </button>
        </div>
      </div>

      <!-- 标签内容 -->
      <div class="tab-content">
        <!-- 穿越标签 -->
        <div v-if="activeTab === 'travel'" class="travel-tab">
          <div class="travel-layout">
            <!-- 左侧: 世界列表 -->
            <div class="worlds-list-panel">
              <!-- 搜索和筛选 -->
              <div class="filter-bar">
                <div class="search-box">
                  <input
                    v-model="searchQuery"
                    :placeholder="t('搜索用户名...')"
                    class="search-input"
                    :disabled="isLoadingWorlds"
                  />
                </div>
                <select v-model="visibilityFilter" class="filter-select" :disabled="isLoadingWorlds">
                  <option value="">{{ t('全部') }}</option>
                  <option value="public">{{ t('公开') }}</option>
                  <option value="hidden">{{ t('隐藏') }}</option>
                </select>
              </div>

              <!-- 穿越点显示 -->
              <div class="travel-points-bar">
                <Coins :size="16" class="points-icon" />
                <span class="points-label">{{ t('穿越点') }}:</span>
                <span class="points-value">{{ travelPoints }}</span>
              </div>

              <!-- 世界列表 -->
              <div class="worlds-list">
                <div v-if="isLoadingWorlds && worldsList.length === 0" class="loading-state">
                  {{ t('加载中...') }}
                </div>
                <div v-else-if="worldsList.length === 0" class="empty-state">
                  <Globe :size="48" class="empty-icon" />
                  <p>{{ t('暂无可穿越的世界') }}</p>
                </div>
                <div v-else>
                  <div
                    v-for="world in worldsList"
                    :key="world.world_instance_id"
                    class="world-card"
                    :class="{ selected: selectedWorld?.world_instance_id === world.world_instance_id }"
                    @click="selectWorld(world)"
                  >
                    <div class="world-info">
                      <div class="owner-name">{{ world.owner_username }}</div>
                      <div class="world-meta">
                        <span class="badge" :class="`badge-${world.visibility_mode}`">
                          {{ world.visibility_mode }}
                        </span>
                        <span class="world-id">#{{ world.world_instance_id }}</span>
                      </div>
                    </div>
                  </div>

                  <!-- 加载更多 -->
                  <button
                    v-if="hasMore"
                    class="load-more-btn"
                    @click="loadMore"
                    :disabled="isLoadingWorlds"
                  >
                    {{ isLoadingWorlds ? t('加载中...') : t('加载更多') }}
                  </button>
                </div>
              </div>
            </div>

            <!-- 右侧: 穿越操作 -->
            <div class="travel-action-panel">
              <div v-if="selectedWorld" class="selected-world-detail">
                <h3>{{ selectedWorld.owner_username }} {{ t('的世界') }}</h3>

                <div class="detail-info">
                  <div class="info-row">
                    <span class="info-label">{{ t('世界ID') }}</span>
                    <span class="info-value">#{{ selectedWorld.world_instance_id }}</span>
                  </div>
                  <div class="info-row">
                    <span class="info-label">{{ t('可见性') }}</span>
                    <span class="badge" :class="`badge-${selectedWorld.visibility_mode}`">
                      {{ selectedWorld.visibility_mode }}
                    </span>
                  </div>
                </div>

                <!-- 邀请码输入(仅hidden/locked) -->
                <div v-if="selectedWorld.visibility_mode !== 'public'" class="invite-code-section">
                  <label>{{ t('邀请码') }}</label>
                  <input
                    v-model="inviteCode"
                    :placeholder="t('输入邀请码...')"
                    class="invite-code-input"
                    :disabled="isLoading"
                  />
                </div>

                <!-- 穿越按钮 -->
                <div class="action-buttons">
                  <button
                    class="action-btn primary"
                    @click="handleStartTravelToSelected"
                    :disabled="!canTravelToSelected || isLoading"
                  >
                    <ArrowRight :size="16" />
                    {{ t('穿越到此世界') }}
                  </button>

                  <!-- 当前会话信息 -->
                  <div v-if="session" class="session-info-box">
                    <div class="session-label">{{ t('当前会话') }} #{{ session.session_id }}</div>
                    <button class="action-btn" @click="handleEndTravel" :disabled="isLoading">
                      <CornerUpLeft :size="16" />
                      {{ t('返回') }}
                    </button>
                  </div>
                </div>
              </div>

              <div v-else class="empty-selection">
                <Globe :size="64" class="empty-icon" />
                <p>{{ t('请从左侧选择一个世界') }}</p>

                <!-- 我的世界信息 -->
                <div v-if="myWorld" class="my-world-info">
                  <div class="info-title"><Shield :size="16" />{{ t('我的世界') }}</div>
                  <div class="info-row"><span class="muted">ID</span><span>#{{ myWorld.world_instance_id }}</span></div>
                  <div class="info-row"><span class="muted">{{ t('隐私') }}</span><span class="badge" :class="`badge-${myWorld.visibility_mode}`">{{ myWorld.visibility_mode }}</span></div>
                  <button class="action-btn sm" @click="toggleVisibility" :disabled="isLoading">
                    <Lock :size="14" />{{ t('切换隐私') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 地图标签 -->
        <div v-else-if="activeTab === 'map'" class="map-tab">
          <div v-if="!session || !graph" class="empty-state">
            <MapIcon :size="48" class="empty-icon" />
            <p>{{ t('请先发起穿越') }}</p>
          </div>
          <div v-else class="map-layout">
            <div class="map-canvas">
              <svg :viewBox="viewBox" class="poi-map">
                <g class="edges">
                  <line v-for="e in graph.edges" :key="e.id"
                    :x1="poiById.get(e.from_poi_id)?.x ?? 0" :y1="poiById.get(e.from_poi_id)?.y ?? 0"
                    :x2="poiById.get(e.to_poi_id)?.x ?? 0" :y2="poiById.get(e.to_poi_id)?.y ?? 0"
                    class="edge-line" />
                </g>
                <g class="nodes">
                  <g v-for="p in graph.pois" :key="p.id" class="node"
                    :class="{ active: p.id === graph.viewer_poi_id, reachable: isReachable(p.id) }"
                    :transform="`translate(${p.x}, ${p.y})`" @click="handleMove(p.id)">
                    <circle r="10" /><text x="14" y="5">{{ p.poi_key }}</text>
                  </g>
                </g>
              </svg>
            </div>
            <div class="poi-sidebar">
              <div class="current-loc">{{ t('当前位置') }}: {{ currentPoiLabel }}</div>
              <div class="poi-list">
                <button v-for="p in graph.pois" :key="p.id" class="poi-item"
                  :class="{ active: p.id === graph.viewer_poi_id, reachable: isReachable(p.id) }"
                  @click="handleMove(p.id)" :disabled="isLoading || p.id === graph.viewer_poi_id || !isReachable(p.id)">
                  <span class="poi-name">{{ p.poi_key }}</span>
                  <span class="poi-meta">#{{ p.id }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 报告标签 -->
        <div v-else-if="activeTab === 'reports'" class="reports-tab">
          <div class="reports-header">
            <span class="muted">{{ t('最近 50 条入侵报告') }}</span>
            <button class="action-btn sm" @click="refreshReports" :disabled="isLoading">
              <RefreshCw :size="14" />{{ t('刷新') }}
            </button>
          </div>
          <div v-if="reports.length === 0" class="empty-state">
            <ScrollText :size="48" class="empty-icon" />
            <p>{{ t('暂无报告') }}</p>
          </div>
          <div v-else class="report-list">
            <div v-for="r in reports" :key="r.id" class="report-item">
              <span :class="['badge', r.unread ? 'unread' : 'read']">{{ r.unread ? t('未读') : t('已读') }}</span>
              <span>world: {{ r.world_instance_id }}</span>
              <span class="muted">{{ r.created_at }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { toast } from '@/utils/toast';
import { useI18n } from '@/i18n';
import { useUIStore } from '@/stores/uiStore';
import { useCharacterStore } from '@/stores/characterStore';
import { ArrowRight, CalendarCheck, Coins, CornerUpLeft, Globe, Lock, Map as MapIcon, RefreshCw, ScrollText, Shield } from 'lucide-vue-next';

const tabs = [
  { id: 'travel', label: '穿越', icon: Globe },
  { id: 'map', label: '地图', icon: MapIcon },
  { id: 'reports', label: '报告', icon: ScrollText },
];
const activeTab = ref('travel');
import {
  endTravel,
  getActiveTravelSession,
  getMapGraph,
  getMyInvasionReports,
  getMyWorldInstance,
  getTravelProfile,
  getTravelableWorlds,
  moveInWorld,
  signinTravel,
  startTravel,
  updateMyWorldVisibility,
  type MapGraphResponse,
  type TravelStartResponse,
  type TravelableWorld,
  type WorldInstanceSummary,
  type InvasionReportOut,
} from '@/services/onlineTravel';

const { t } = useI18n();
const uiStore = useUIStore();
const characterStore = useCharacterStore();

const isLoading = ref(false);
const travelPoints = ref(0);
const targetUsername = ref('');
const inviteCode = ref('');
const apiError = ref('');

const myWorld = ref<WorldInstanceSummary | null>(null);
const session = ref<TravelStartResponse | null>(null);
const graph = ref<MapGraphResponse | null>(null);
const reports = ref<InvasionReportOut[]>([]);

// 新增: 世界列表相关
const worldsList = ref<TravelableWorld[]>([]);
const selectedWorld = ref<TravelableWorld | null>(null);
const searchQuery = ref('');
const visibilityFilter = ref('');
const isLoadingWorlds = ref(false);
const currentPage = ref(0);
const pageSize = 20;
const hasMore = ref(true);
const searchDebounceTimer = ref<number | null>(null);

// 使用 uiStore 的统一后端状态
const backendReady = computed(() => uiStore.isBackendConfiguredComputed);
const isOnlineMode = computed(() => characterStore.activeCharacterProfile?.模式 === '联机');
const canStart = computed(
  () => travelPoints.value > 0 && targetUsername.value.trim().length > 0 && backendReady.value && isOnlineMode.value
);

// 新增: 是否可以穿越到选中的世界
const canTravelToSelected = computed(() => {
  return (
    selectedWorld.value !== null &&
    !session.value &&
    travelPoints.value > 0 &&
    backendReady.value &&
    isOnlineMode.value &&
    (selectedWorld.value.visibility_mode === 'public' || inviteCode.value.trim().length > 0)
  );
});

const poiById = computed(() => {
  const pois = graph.value?.pois ?? [];
  return new Map(pois.map((p) => [p.id, p] as const));
});

const currentPoiLabel = computed(() => {
  if (!graph.value?.viewer_poi_id) return t('未知');
  const poi = poiById.value.get(graph.value.viewer_poi_id);
  return poi ? `${poi.poi_key} (#${poi.id})` : `#${graph.value.viewer_poi_id}`;
});

const viewBox = computed(() => {
  const pois = graph.value?.pois ?? [];
  if (pois.length === 0) return '0 0 600 400';
  let minX = pois[0].x;
  let maxX = pois[0].x;
  let minY = pois[0].y;
  let maxY = pois[0].y;
  for (const p of pois) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const pad = 60;
  const w = Math.max(200, maxX - minX + pad * 2);
  const h = Math.max(160, maxY - minY + pad * 2);
  return `${minX - pad} ${minY - pad} ${w} ${h}`;
});

const refreshProfile = async () => {
  try {
    const profile = await getTravelProfile();
    travelPoints.value = profile.travel_points;
    apiError.value = '';
  } catch (e: any) {
    apiError.value = e?.message || '穿越服务暂不可用';
  }
};

const refreshReports = async () => {
  try {
    reports.value = await getMyInvasionReports();
  } catch {
    reports.value = [];
  }
};

const refreshMyWorld = async () => {
  try {
    myWorld.value = await getMyWorldInstance();
  } catch {
    myWorld.value = null;
  }
};

const refreshGraph = async () => {
  if (!session.value) {
    graph.value = null;
    return;
  }
  graph.value = await getMapGraph(session.value.target_world_instance_id, session.value.entry_map_id, session.value.session_id);
};

const restoreActiveSession = async () => {
  try {
    const activeSession = await getActiveTravelSession();
    if (activeSession) {
      session.value = activeSession;
      await refreshGraph();
    } else {
      session.value = null;
      graph.value = null;
    }
  } catch {
    // keep existing session state if the probe fails
  }
};

const refreshAll = async () => {
  if (!backendReady.value) return;
  isLoading.value = true;
  try {
    await refreshProfile();
    await refreshMyWorld();
    await refreshReports();
    await restoreActiveSession();
  } finally {
    isLoading.value = false;
  }
};

const handleSignin = async () => {
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const res = await signinTravel();
    travelPoints.value = res.travel_points;
    toast.success(res.message);
  } catch (e: any) {
    toast.error(e?.message || '签到失败');
  } finally {
    isLoading.value = false;
  }
};

const toggleVisibility = async () => {
  if (!myWorld.value) return;
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const next = myWorld.value.visibility_mode === 'public' ? 'hidden' : myWorld.value.visibility_mode === 'hidden' ? 'locked' : 'public';
    myWorld.value = await updateMyWorldVisibility(next);
    toast.success(`世界隐私已切换为 ${myWorld.value.visibility_mode}`);
  } catch (e: any) {
    toast.error(e?.message || '切换失败');
  } finally {
    isLoading.value = false;
  }
};

const handleStartTravel = async () => {
  if (session.value) {
    toast.info(t('已有进行中的穿越，会话结束后才能继续'));
    return;
  }
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    session.value = await startTravel(targetUsername.value.trim(), inviteCode.value.trim() || undefined);
    travelPoints.value = session.value.travel_points_left;
    await refreshGraph();
    toast.success(t('穿越成功'));
  } catch (e: any) {
    toast.error(e?.message || t('穿越失败'));
  } finally {
    isLoading.value = false;
  }
};

const handleEndTravel = async () => {
  if (!session.value) return;
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    const res = await endTravel(session.value.session_id);
    toast.success(res.message);
    session.value = null;
    graph.value = null;
    await refreshReports();
  } catch (e: any) {
    toast.error(e?.message || t('返回失败'));
  } finally {
    isLoading.value = false;
  }
};

const isReachable = (poiId: number): boolean => {
  if (!graph.value) return false;
  const from = graph.value.viewer_poi_id;
  if (!from) return false;
  return graph.value.edges.some((e) => e.from_poi_id === from && e.to_poi_id === poiId);
};

const handleMove = async (poiId: number) => {
  if (!session.value || !graph.value) return;
  if (!isReachable(poiId)) return;
  if (isLoading.value) return;
  isLoading.value = true;
  try {
    await moveInWorld(session.value.target_world_instance_id, poiId, session.value.session_id);
    await refreshGraph();
  } catch (e: any) {
    toast.error(e?.message || '移动失败');
  } finally {
    isLoading.value = false;
  }
};

// 新增: 加载可穿越世界列表
const loadWorlds = async (reset: boolean = false) => {
  if (!backendReady.value) return;

  if (reset) {
    currentPage.value = 0;
    worldsList.value = [];
    hasMore.value = true;
  }

  isLoadingWorlds.value = true;
  try {
    const worlds = await getTravelableWorlds(
      currentPage.value * pageSize,
      pageSize,
      visibilityFilter.value || undefined,
      searchQuery.value.trim() || undefined
    );

    if (worlds.length < pageSize) {
      hasMore.value = false;
    }

    if (reset) {
      worldsList.value = worlds;
    } else {
      worldsList.value = [...worldsList.value, ...worlds];
    }
  } catch (e: any) {
    toast.error(e?.message || t('加载世界列表失败'));
  } finally {
    isLoadingWorlds.value = false;
  }
};

// 新增: 加载更多
const loadMore = () => {
  if (isLoadingWorlds.value || !hasMore.value) return;
  currentPage.value++;
  loadWorlds(false);
};

// 新增: 选择世界
const selectWorld = (world: TravelableWorld) => {
  selectedWorld.value = world;
  inviteCode.value = ''; // 清空邀请码
};

// 新增: 穿越到选中的世界
const handleStartTravelToSelected = async () => {
  if (!selectedWorld.value) return;
  if (session.value) {
    toast.info(t('已有进行中的穿越，会话结束后才能继续'));
    return;
  }
  if (isLoading.value) return;

  isLoading.value = true;
  try {
    session.value = await startTravel(
      selectedWorld.value.owner_username,
      inviteCode.value.trim() || undefined
    );
    travelPoints.value = session.value.travel_points_left;
    await refreshGraph();
    toast.success(t('穿越成功'));
  } catch (e: any) {
    toast.error(e?.message || t('穿越失败'));
  } finally {
    isLoading.value = false;
  }
};

// 监听搜索和筛选变化 - 防抖处理
watch([searchQuery, visibilityFilter], () => {
  if (searchDebounceTimer.value) {
    clearTimeout(searchDebounceTimer.value);
  }

  searchDebounceTimer.value = window.setTimeout(() => {
    loadWorlds(true);
  }, 500);
});

onMounted(async () => {
  try {
    if (!backendReady.value) return;
    await refreshProfile();
    await refreshMyWorld();
    await refreshReports();
    await restoreActiveSession();
    await loadWorlds(true); // 新增: 加载可穿越世界列表
  } catch (e: any) {
    console.warn('[OnlineTravelPanel] init failed', e);
  }
});
</script>

<style scoped>
.online-travel-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.notice {
  margin: 1rem;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}
.error-indicator { background: rgba(239,68,68,0.1); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
.warning-indicator { background: rgba(245,158,11,0.1); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3); }

/* Tabs */
.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
}
.tabs-nav { display: flex; gap: 0.25rem; }
.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}
.tab-btn:hover { background: var(--color-background); color: var(--color-text); }
.tab-btn.active { background: var(--color-primary); color: #fff; }

.header-actions { display: flex; gap: 0.5rem; }
.action-btn {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-text);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.15s;
}
.action-btn:hover { border-color: var(--color-primary); }
.action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.action-btn.primary { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }
.action-btn.sm { padding: 0.35rem 0.6rem; font-size: 0.75rem; }

.tab-content { flex: 1; overflow-y: auto; padding: 1rem; }

/* Travel Tab */
.travel-layout {
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 1rem;
  height: 100%;
}

/* 左侧世界列表面板 */
.worlds-list-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  overflow: hidden;
  max-height: 600px;
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.search-box {
  flex: 1;
}

.search-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.filter-select {
  padding: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
  cursor: pointer;
}

.travel-points-bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.points-icon {
  color: var(--color-primary);
}

.points-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.points-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-primary);
}

.worlds-list {
  flex: 1;
  overflow-y: auto;
  padding: 0.5rem;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  opacity: 0.4;
  margin-bottom: 1rem;
}

.world-card {
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  cursor: pointer;
  transition: all 0.2s;
}

.world-card:hover {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.world-card.selected {
  border-color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.1);
  box-shadow: 0 0 0 1px var(--color-primary);
}

.world-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.owner-name {
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.world-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.badge {
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.badge-public {
  background: rgba(34, 197, 94, 0.15);
  color: #22c55e;
}

.badge-hidden {
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.badge-locked {
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
}

.world-id {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.load-more-btn {
  width: 100%;
  padding: 0.75rem;
  margin-top: 0.5rem;
  border: 1px dashed var(--color-border);
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background: rgba(var(--color-primary-rgb), 0.05);
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 右侧穿越操作面板 */
.travel-action-panel {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1.5rem;
}

.selected-world-detail h3 {
  margin: 0 0 1rem 0;
  font-size: 1.25rem;
  color: var(--color-text);
}

.detail-info {
  margin-bottom: 1.5rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.info-value {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text);
}

.invite-code-section {
  margin-bottom: 1.5rem;
}

.invite-code-section label {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.invite-code-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  color: var(--color-text);
  font-size: 0.875rem;
}

.invite-code-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.session-info-box {
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: rgba(var(--color-primary-rgb), 0.05);
}

.session-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.empty-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 1rem;
  text-align: center;
  color: var(--color-text-secondary);
}

.empty-selection .empty-icon {
  opacity: 0.3;
  margin-bottom: 1rem;
}

.my-world-info {
  margin-top: 2rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  width: 100%;
  max-width: 300px;
}

.info-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.muted {
  color: var(--color-text-secondary);
  font-size: 0.8rem;
}

/* Map Tab */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: var(--color-text-secondary);
}
.empty-icon { opacity: 0.4; margin-bottom: 1rem; }

.map-layout { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1rem; height: 100%; }
.map-canvas {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 0.5rem;
}
.poi-map { width: 100%; height: 350px; }
.edge-line { stroke: var(--color-border); stroke-width: 2; }
.node { cursor: pointer; }
.node circle { fill: rgba(var(--color-primary-rgb),0.15); stroke: var(--color-primary); stroke-width: 2; }
.node text { font-size: 11px; fill: var(--color-text); }
.node.reachable circle { fill: rgba(34,197,94,0.15); stroke: #22c55e; }
.node.active circle { fill: rgba(var(--color-accent-rgb),0.25); stroke: var(--color-accent); }

.poi-sidebar {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}
.current-loc { font-weight: 600; margin-bottom: 0.75rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); }
.poi-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 0.4rem; }
.poi-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background);
  cursor: pointer;
  transition: all 0.15s;
}
.poi-item:hover:not(:disabled) { border-color: var(--color-primary); }
.poi-item:disabled { opacity: 0.5; cursor: not-allowed; }
.poi-item.active { background: rgba(var(--color-accent-rgb),0.1); border-color: var(--color-accent); }
.poi-item.reachable { border-color: #22c55e; }
.poi-name { font-weight: 500; font-size: 0.875rem; }
.poi-meta { font-size: 0.75rem; color: var(--color-text-secondary); }

/* Reports Tab */
.reports-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.report-list { display: flex; flex-direction: column; gap: 0.5rem; }
.report-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.875rem;
}
.badge { padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.7rem; font-weight: 500; }
.badge.unread { background: rgba(245,158,11,0.15); color: #f59e0b; }
.badge.read { background: rgba(107,114,128,0.15); color: #6b7280; }

.muted { color: var(--color-text-secondary); font-size: 0.8rem; }

@media (max-width: 768px) {
  .travel-layout {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .worlds-list-panel {
    max-height: 40vh;
  }

  .filter-bar {
    flex-direction: column;
    gap: 0.5rem;
  }

  .travel-action-panel {
    padding: 1rem;
  }

  .map-layout {
    grid-template-columns: 1fr;
  }

  .poi-map {
    height: 250px;
  }
}
</style>
