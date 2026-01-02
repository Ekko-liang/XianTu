<template>
  <div class="workshop-container">
    <VideoBackground />

    <div class="workshop-panel">
      <div class="header">
        <div class="title-row">
          <h2 class="title">创意工坊</h2>
          <div class="auth-pill" :class="{ ok: authState === 'authed', warn: authState !== 'authed' }">
            <span v-if="authState === 'checking'">检测中…</span>
            <span v-else-if="authState === 'authed'">已验证</span>
            <span v-else>未验证</span>
            <button v-if="authState !== 'authed'" class="pill-link" @click="goLogin">去验证</button>
            <button class="pill-link" @click="refreshAuth">刷新</button>
          </div>
        </div>
        <p class="subtitle">用于玩家之间上传/分享：设置、提示词、开局配置、存档等内容</p>
      </div>

      <div class="sections">
        <div class="section">
          <h3>世界观</h3>
          <p>浏览、订阅、更新日志（开发中）</p>
        </div>
        <div class="section">
          <h3>提示词</h3>
          <p>导入/导出、评分、版本管理（开发中）</p>
        </div>
        <div class="section">
          <h3>角色模板</h3>
          <p>上传立绘/设定、标签、同步到云端（开发中）</p>
        </div>
        <div class="section">
          <h3>存档 / 开局配置</h3>
          <p>上传分享、订阅同步（开发中）</p>
          <p class="hint">提示：上传/同步会要求先完成账号验证（用于识别作者与权限控制）</p>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-secondary" @click="goBack">返回</button>
        <button class="btn" :disabled="authState !== 'authed'" @click="openUpload">
          上传（开发中）
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import VideoBackground from '@/components/common/VideoBackground.vue';
import { verifyStoredToken } from '@/services/request';
import { toast } from '@/utils/toast';

const router = useRouter();

const authState = ref<'checking' | 'authed' | 'unauthed'>('checking');

const refreshAuth = async () => {
  authState.value = 'checking';
  try {
    const ok = await verifyStoredToken();
    authState.value = ok ? 'authed' : 'unauthed';
  } catch (_e) {
    authState.value = 'unauthed';
  }
};

onMounted(() => {
  void refreshAuth();
});

const goBack = () => {
  router.push('/');
};

const goLogin = () => {
  router.push('/login');
};

const openUpload = () => {
  if (authState.value !== 'authed') {
    toast.info('上传前需要先完成账号验证');
    return;
  }
  toast.info('上传功能开发中');
};
</script>

<style scoped>
.workshop-container {
  width: 100%;
  height: 100vh;
  min-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  box-sizing: border-box;
  overflow: auto;
}

.workshop-panel {
  width: 100%;
  max-width: 720px;
  background: var(--mode-selection-bg, rgba(15, 23, 42, 0.75));
  border: 1px solid var(--mode-selection-border, rgba(255, 255, 255, 0.08));
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  padding: 2.5rem;
  color: var(--mode-selection-text, #e2e8f0);
}

.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.title {
  margin: 0;
  font-family: var(--font-family-serif);
  font-size: 2rem;
  color: var(--mode-selection-accent, #93c5fd);
}

.auth-pill {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(30, 41, 59, 0.50);
  color: #e2e8f0;
  user-select: none;
  white-space: nowrap;
}

.auth-pill.ok {
  border-color: rgba(34, 197, 94, 0.30);
}

.auth-pill.warn {
  border-color: rgba(251, 191, 36, 0.25);
}

.pill-link {
  border: none;
  background: transparent;
  color: var(--mode-selection-accent, #93c5fd);
  cursor: pointer;
  padding: 0;
}

.pill-link:hover {
  text-decoration: underline;
}

.subtitle {
  margin: 0.75rem 0 0;
  color: var(--mode-selection-subtitle, #94a3b8);
  line-height: 1.6;
}

.sections {
  margin-top: 2rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.section {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: var(--mode-selection-card-bg, rgba(30, 41, 59, 0.45));
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.06));
}

.section h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  color: #e2e8f0;
}

.section p {
  margin: 0.25rem 0 0;
  color: var(--mode-selection-subtitle, #94a3b8);
}

.hint {
  margin-top: 0.5rem !important;
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.92rem;
}

.actions {
  margin-top: 2rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.btn {
  flex: 1;
  padding: 0.9rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--mode-selection-card-border, rgba(255, 255, 255, 0.08));
  background: rgba(51, 65, 85, 0.7);
  color: #e2e8f0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn:hover {
  background: rgba(51, 65, 85, 0.9);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(30, 41, 59, 0.6);
}
</style>
