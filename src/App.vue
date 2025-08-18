<template>
  <div id="app-container">
    <div class="global-actions">
      <button @click="toggleTheme" class="theme-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
      </button>
      <button @click="toggleFullscreen" class="fullscreen-toggle">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path></svg>
      </button>
    </div>

    <!-- 创世加载结界：通过 :visible 属性控制，并绑定动态消息 -->
    <LoadingModal :visible="isInitializing" :message="loadingMessage" />

    <!-- 主视图容器 -->
    <component
          v-show="!isInitializing"
          :is="activeView"
          @start-creation="handleStartCreation"
          @show-character-list="handleShowCharacterList"
          :onBack="handleBack"
          @loggedIn="handleLoggedIn"
          @creation-complete="handleCreationComplete"
          @select="handleCharacterSelect"
          :character-id="activeCharacterId"
          :summary="creationSummary"
        />
  </div>
</template>

<script setup lang="ts">
import { shallowRef, ref, onMounted, computed } from 'vue'
import ModeSelection from './views/ModeSelection.vue'
import CharacterCreation from './views/CharacterCreation.vue'
import LoginView from './views/LoginView.vue'
import GameView from './views/GameView.vue'
import MapView from './components/game-view/MapView.vue' // 引入坤舆图志
import CharacterManagementView from './views/CharacterManagementView.vue' // 引入人物列表
import LoadingModal from './components/LoadingModal.vue' // 引入加载组件
import './style.css'
import { useCharacterCreationStore } from './stores/characterCreationStore'
import { verifyStoredToken } from './services/request'
import { initializeGameSession } from './services/gameInitializer' // 引入创世引擎
import { toast } from './utils/toast'
import type { LocalCharacterWithGameData } from './data/localData'
import type { CharacterData } from './types'

const isLoggedIn = ref(false);
const isInitializing = ref(false); // 创世加载状态
const loadingMessage = ref('正在开天辟地，衍化万物...'); // 创世加载信息
const activeCharacterId = ref<number | null>(null); // **【精炼信标】**
const creationSummary = ref<{ name: string; origin: string; spiritRoot: string; age: number; } | null>(null);

// --- 核心视图管理 ---
const views = {
  ModeSelection,
  CharacterCreation,
  Login: LoginView,
  GameView,
  MapView, // 注册坤舆图志
  CharacterManagementView, // 注册人物列表
}
type ViewName = keyof typeof views;
const activeView = shallowRef<any>(views.ModeSelection)

const store = useCharacterCreationStore();

const switchView = (viewName: ViewName) => {
  const component = views[viewName]
  if (component) {
    activeView.value = component
  } else {
    activeView.value = ModeSelection
  }
}

const handleStartCreation = async (mode: 'single' | 'cloud') => {
  isInitializing.value = true;
  loadingMessage.value = '正在连接天地法则...';
  try {
    store.setMode(mode);
    await store.initializeStore(mode); // 在切换视图前，先初始化数据

    if (mode === 'single') {
      switchView('CharacterCreation');
    } else {
      // 联机模式，需要按需验证登录
      isLoggedIn.value = await verifyStoredToken();
      if (isLoggedIn.value) {
        switchView('CharacterCreation');
      } else {
        toast.error('联机共修需先登入道籍！');
        switchView('Login');
      }
    }
  } catch (error) {
    console.error("Failed to initialize creation data:", error);
    toast.error("初始化创角数据失败，请稍后重试。");
    switchView('ModeSelection'); // 如果失败，返回模式选择
  } finally {
    isInitializing.value = false;
  }
}

const handleShowCharacterList = async () => {
  // 按需验证登录
  isLoggedIn.value = await verifyStoredToken();
  if (isLoggedIn.value) {
    switchView('CharacterManagementView');
  } else {
    toast.error('查看云端法身需先登入道籍！');
    switchView('Login');
  }
}

const handleBack = () => {
  // 只重置角色创建的进度，而不是整个 store
  store.resetCharacter();
  switchView('ModeSelection');
}

const handleLoggedIn = () => {
  isLoggedIn.value = true;
  // 登录后不应自动跳转到创角，而是返回模式选择，让用户决定是创角还是读档
  switchView('ModeSelection');
}

const handleCharacterSelect = (character: CharacterData) => {
  activeCharacterId.value = character.id;
  switchView('GameView');
}

const handleCreationComplete = async (payload: any) => {
  console.log('[App.vue] handleCreationComplete() received event.');
  console.log('【调试】handleCreationComplete 被调用，负载：', payload);
  
  // 1. 开启创世结界
  isInitializing.value = true;
  loadingMessage.value = '准备开天辟地...'; // 设置初始消息

  try {
    // 2. 验证数据完整性
    if (!payload || !payload.world) {
      const errorMsg = "创世失败：传递数据不完整！";
      console.error('[App.vue] Error:', errorMsg, payload);
      toast.error(errorMsg);
      throw new Error("Invalid payload structure.");
    }
    
    console.log('【调试】创世契约已准备：', payload);

    // 3. 启动创世引擎，并传入进度回调
    console.log('[App.vue] Calling initializeGameSession...');
    console.log('【调试】即将启动创世引擎...');
    const createdCharacterId = await initializeGameSession(payload, (msg: string) => {
      console.log('【调试】创世进度：', msg);
      loadingMessage.value = msg;
    });

    console.log('【调试】创世引擎完成！返回角色ID:', createdCharacterId);

    // 4. 创世成功，设置活动角色ID
    activeCharacterId.value = createdCharacterId;
    
    // 5. 创世完成后，才能安全地重置角色创建数据
    store.resetCharacter();
    
    // 6. 切换到游戏视图
    switchView('GameView');

  } catch (error) {
    console.error("【严重错误】处理角色创建完成时出错:", error);
    console.error("【错误堆栈】", error instanceof Error ? error.stack : '未知错误类型');
    toast.error("创世失败，请检查控制台获取详细错误信息。");
    // 如果失败，也要重置状态
    store.resetCharacter();
    // 返回到模式选择界面
    switchView('ModeSelection');
  } finally {
    // 7. 无论成败，都撤去结界
    isInitializing.value = false;
  }
}

// --- 主题切换 ---
const isDarkMode = ref(true);
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
  document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light');
}

const checkInitialLoginStatus = async () => {
  isLoggedIn.value = await verifyStoredToken();
  if (isLoggedIn.value) {
    toast.info('检测到有效身份令牌');
  }
};


onMounted(() => {
  document.documentElement.setAttribute('data-theme', 'dark');

  // 启动心跳阵法，每小时检查一次令牌状态
  setInterval(async () => {
    // 只在联机模式且非登录界面时检查
    if (store.mode === 'cloud' && activeView.value !== views.Login) {
      const isValid = await verifyStoredToken();
      if (!isValid) {
        isLoggedIn.value = false;
        toast.error('身份令牌已失效，请重新登入。');
        switchView('Login');
      } else {
        isLoggedIn.value = true;
      }
    }
  }, 3600 * 1000); // 1小时
})


// --- 全屏切换 ---
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}
</script>

<style>
#app-container {
  width: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow-x: hidden; /* 强制禁止水平滚动条 */
}
.global-actions {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
  display: flex;
  gap: 0.5rem;
}
.global-actions button {
  background: rgba(40, 40, 40, 0.7);
  border: 1px solid #555;
  color: #c8ccd4;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
}
.global-actions button:hover {
  background: #e5c07b;
  color: #1a1a1a;
}
</style>
