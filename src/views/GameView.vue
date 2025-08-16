<template>
  <div class="game-view-container">
    <!-- 开局引导阶段 -->
    <transition name="fade-slide" mode="out-in">
      <div v-if="gamePhase === 'prologue'" class="prologue-container">
        <div class="prologue-backdrop"></div>
        <div class="prologue-content">
          <div class="cultivation-aura"></div>
          
          <!-- 序章文本 -->
          <div class="prologue-text" :class="{ 'fade-in': prologueStep > 0 }">
            <h1 class="ancient-title">{{ prologueTexts[prologueStep].title }}</h1>
            <div class="divider-ornament">❋ ❋ ❋</div>
            <p class="ancient-text" v-html="prologueTexts[prologueStep].content"></p>
          </div>

          <!-- 选择面板 -->
          <transition name="slide-up">
            <div v-if="prologueStep === 2" class="destiny-choice">
              <h3>选择你的初始道路</h3>
              <div class="choice-cards">
                <div 
                  v-for="path in startingPaths" 
                  :key="path.id"
                  class="choice-card"
                  :class="{ selected: selectedPath === path.id }"
                  @click="selectPath(path.id)"
                >
                  <div class="card-icon">{{ path.icon }}</div>
                  <h4>{{ path.name }}</h4>
                  <p>{{ path.description }}</p>
                  <div class="card-benefits">
                    <span v-for="benefit in path.benefits" :key="benefit">
                      {{ benefit }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </transition>

          <!-- 控制按钮 -->
          <div class="prologue-controls">
            <button 
              v-if="prologueStep < 2" 
              @click="nextPrologueStep"
              class="btn btn-primary shimmer-on-hover"
            >
              <span v-if="prologueStep === 0">踏入修仙界</span>
              <span v-else>继续</span>
            </button>
            <button 
              v-if="prologueStep === 2 && selectedPath" 
              @click="startGame"
              class="btn btn-complete pulse-glow"
            >
              开始修行
            </button>
            <button 
              v-if="prologueStep > 0"
              @click="skipPrologue"
              class="btn-skip"
            >
              跳过引导
            </button>
          </div>
        </div>
      </div>

      <!-- 游戏主界面 -->
      <div v-else-if="gamePhase === 'main'" class="main-game-container">
        <!-- 顶部信息栏 -->
        <div class="game-header">
          <div class="character-info">
            <div class="avatar-frame">
              <div class="avatar-placeholder">{{ characterInitial }}</div>
              <div class="realm-badge">{{ currentRealm }}</div>
            </div>
            <div class="basic-stats">
              <h3>{{ character?.character_name || '无名修士' }}</h3>
              <div class="stat-bars">
                <div class="stat-bar">
                  <span class="stat-label">灵力</span>
                  <div class="bar-container">
                    <div class="bar-fill spiritual-power" :style="{ width: spiritualPowerPercent + '%' }"></div>
                  </div>
                  <span class="stat-value">{{ gameState.spiritual_power }}/{{ gameState.max_spiritual_power }}</span>
                </div>
                <div class="stat-bar">
                  <span class="stat-label">神识</span>
                  <div class="bar-container">
                    <div class="bar-fill spirit-sense" :style="{ width: spiritSensePercent + '%' }"></div>
                  </div>
                  <span class="stat-value">{{ gameState.spirit_sense }}/{{ gameState.max_spirit_sense }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="resource-display">
            <div class="resource-item">
              <img src="/图片图标/AlbedoBase_XL_Game_currency_icon_an_irregular_translucent_cyan_1.jpg" alt="灵石" />
              <span>{{ gameState.spiritual_stones }}</span>
            </div>
            <div class="resource-item">
              <span class="icon">📅</span>
              <span>{{ gameState.current_age }}岁</span>
            </div>
            <div class="resource-item">
              <span class="icon">⏳</span>
              <span>寿元: {{ gameState.max_lifespan }}年</span>
            </div>
          </div>
        </div>

        <!-- 主要游戏区域 -->
        <div class="game-content">
          <!-- 左侧功能面板 -->
          <div class="side-panel left-panel">
            <div class="panel-section">
              <h4>快捷功能</h4>
              <div class="quick-actions">
                <button 
                  v-for="action in quickActions" 
                  :key="action.id"
                  @click="performAction(action.id)"
                  class="action-btn"
                  :class="{ disabled: !action.available }"
                  :title="action.tooltip"
                >
                  <span class="action-icon">{{ action.icon }}</span>
                  <span class="action-name">{{ action.name }}</span>
                </button>
              </div>
            </div>

            <div class="panel-section">
              <h4>修炼进度</h4>
              <div class="cultivation-progress">
                <div class="progress-circle">
                  <svg viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" class="progress-bg" />
                    <circle 
                      cx="50" 
                      cy="50" 
                      r="45" 
                      class="progress-fill"
                      :stroke-dasharray="cultivationDasharray"
                    />
                  </svg>
                  <div class="progress-text">{{ cultivationProgressPercent }}%</div>
                </div>
                <p class="progress-hint">距离突破还需 {{ breakthroughRequirement }}</p>
              </div>
            </div>
          </div>

          <!-- 中央交互区域 -->
          <div class="central-area">
            <div class="scene-display">
              <div class="scene-header">
                <h3>{{ currentLocation }}</h3>
                <span class="scene-time">{{ currentTimeOfDay }}</span>
              </div>
              
              <!-- 场景描述与消息流 -->
              <div class="message-scroll" ref="messageContainer">
                <transition-group name="message-fade">
                  <div 
                    v-for="(msg, index) in gameMessages" 
                    :key="msg.id"
                    class="game-message"
                    :class="[msg.type, { latest: index === gameMessages.length - 1 }]"
                  >
                    <span v-if="msg.timestamp" class="msg-time">{{ formatTime(msg.timestamp) }}</span>
                    <div class="msg-content" v-html="msg.content"></div>
                  </div>
                </transition-group>
              </div>

              <!-- 交互选项 -->
              <div v-if="currentChoices.length > 0" class="choice-panel">
                <h4>选择你的行动：</h4>
                <div class="choices-grid">
                  <button 
                    v-for="choice in currentChoices" 
                    :key="choice.id"
                    @click="makeChoice(choice.id)"
                    class="choice-btn"
                    :class="{ recommended: choice.recommended }"
                  >
                    <span class="choice-icon">{{ choice.icon }}</span>
                    <div class="choice-text">
                      <strong>{{ choice.title }}</strong>
                      <small>{{ choice.description }}</small>
                    </div>
                  </button>
                </div>
              </div>

              <!-- 输入区域 -->
              <div class="input-area">
                <input 
                  v-model="userInput"
                  @keyup.enter="sendCommand"
                  placeholder="输入指令或对话..."
                  class="game-input"
                />
                <button @click="sendCommand" class="send-btn">
                  <span>发送</span>
                </button>
              </div>
            </div>
          </div>

          <!-- 右侧信息面板 -->
          <div class="side-panel right-panel">
            <div class="panel-tabs">
              <button 
                v-for="tab in rightPanelTabs" 
                :key="tab.id"
                @click="activeRightTab = tab.id"
                class="tab-btn"
                :class="{ active: activeRightTab === tab.id }"
              >
                {{ tab.name }}
              </button>
            </div>

            <div class="panel-content">
              <!-- 物品栏 -->
              <div v-if="activeRightTab === 'inventory'" class="inventory-grid">
                <div 
                  v-for="(item, index) in inventoryItems" 
                  :key="index"
                  class="inventory-slot"
                  :class="{ empty: !item, equipped: item?.equipped }"
                  @click="item && selectItem(item)"
                >
                  <img v-if="item" :src="item.icon" :alt="item.name" />
                  <span v-if="item?.quantity > 1" class="item-quantity">{{ item.quantity }}</span>
                </div>
              </div>

              <!-- 技能列表 -->
              <div v-else-if="activeRightTab === 'skills'" class="skills-list">
                <div 
                  v-for="skill in learnedSkills" 
                  :key="skill.id"
                  class="skill-item"
                  @click="useSkill(skill.id)"
                >
                  <div class="skill-icon">{{ skill.icon }}</div>
                  <div class="skill-info">
                    <h5>{{ skill.name }}</h5>
                    <p>{{ skill.level }}级</p>
                  </div>
                </div>
              </div>

              <!-- 任务追踪 -->
              <div v-else-if="activeRightTab === 'quests'" class="quest-tracker">
                <div 
                  v-for="quest in activeQuests" 
                  :key="quest.id"
                  class="quest-item"
                  :class="{ completed: quest.completed }"
                >
                  <h5>{{ quest.name }}</h5>
                  <p>{{ quest.description }}</p>
                  <div class="quest-progress">
                    <div class="progress-bar">
                      <div class="progress-fill" :style="{ width: quest.progress + '%' }"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部控制栏 -->
        <div class="game-footer">
          <button @click="openMenu" class="menu-btn">
            <span class="icon">☰</span>
            <span>菜单</span>
          </button>
          <button @click="quickSave" class="save-btn">
            <span class="icon">💾</span>
            <span>快速存档</span>
          </button>
          <button @click="toggleAutoPlay" class="auto-btn" :class="{ active: isAutoPlaying }">
            <span class="icon">▶</span>
            <span>{{ isAutoPlaying ? '停止自动' : '自动修炼' }}</span>
          </button>
        </div>
      </div>

      <!-- 加载过渡界面 -->
      <div v-else-if="gamePhase === 'loading'" class="loading-transition">
        <div class="loading-content">
          <div class="yin-yang-spinner"></div>
          <h2>{{ loadingMessage }}</h2>
          <p>天机正在为你演化独一无二的开局...</p>
        </div>
      </div>
    </transition>

    <!-- 游戏菜单（覆盖层） -->
    <transition name="modal-fade">
      <div v-if="showMenu" class="game-menu-overlay" @click.self="closeMenu">
        <div class="game-menu">
          <h2>游戏菜单</h2>
          <div class="menu-options">
            <button @click="saveGame" class="menu-btn">存档</button>
            <button @click="loadGame" class="menu-btn">读档</button>
            <button @click="openSettings" class="menu-btn">设置</button>
            <button @click="viewHelp" class="menu-btn">帮助</button>
            <button @click="returnToTitle" class="menu-btn danger">返回主界面</button>
          </div>
          <button @click="closeMenu" class="close-btn">✕</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { http as api } from '@/services/request'
import { showToast } from '@/utils/toast'
import { generateInitialGameStateWithTavernAI, isTavernEnvironment } from '@/utils/tavernAI'

// Props & Emits
const props = defineProps({
  character: {
    type: Object,
    default: () => null,
  },
})

const emit = defineEmits(['back'])

// 游戏阶段管理
type GamePhase = 'prologue' | 'loading' | 'main'
const gamePhase = ref<GamePhase>('prologue')
const prologueStep = ref(0)
const selectedPath = ref<string | null>(null)

// 游戏状态
const gameState = ref({
  spiritual_power: 100,
  max_spiritual_power: 100,
  spirit_sense: 50,
  max_spirit_sense: 50,
  spiritual_stones: 10,
  current_age: 16,
  max_lifespan: 80,
  current_realm: '炼气一层',
  cultivation_progress: 0,
  current_location: '未知之地',
  current_scene: 'unknown',
})

// 序章文本内容
const prologueTexts = ref([
  {
    title: '天道轮回',
    content: `混沌初开，道生一，一生二，二生三，三生万物。<br/>
              天地玄黄，宇宙洪荒。日月盈昃，辰宿列张。<br/>
              <br/>
              你，一个寻常凡人，偶得机缘，踏上了这条逆天改命的修仙之路。<br/>
              前路漫漫，是成仙成圣，还是身死道消，皆在一念之间。`
  },
  {
    title: '道心初定',
    content: `修仙之路，始于道心。<br/>
              心若不定，则道不成。心若坚定，可撼天动地。<br/>
              <br/>
              你静坐蒲团之上，感受着天地间游离的灵气。<br/>
              丹田之内，一缕微弱的真气正在缓缓凝聚...`
  },
  {
    title: '选择道途',
    content: `每个修仙者都有自己的道路。<br/>
              或剑修一道，以剑破万法；或丹药之道，以丹证长生；<br/>
              或阵法之道，以阵御乾坤。<br/>
              <br/>
              现在，选择你的起始之路...`
  }
])

// 起始道路选项
const startingPaths = ref([
  {
    id: 'sword',
    name: '剑修之道',
    icon: '⚔️',
    description: '以剑入道，一剑破万法',
    benefits: ['攻击力+10', '剑法亲和+20%', '获得：基础剑诀']
  },
  {
    id: 'alchemy',
    name: '丹药之道',
    icon: '🏺',
    description: '炼丹制药，以丹证长生',
    benefits: ['炼丹成功率+15%', '获得：基础丹方', '灵石+50']
  },
  {
    id: 'formation',
    name: '阵法之道',
    icon: '☯',
    description: '布阵御敌，掌控乾坤',
    benefits: ['阵法威力+10%', '神识+10', '获得：聚灵阵']
  }
])

// 游戏消息流
const gameMessages = ref<any[]>([])

// 当前选择项
const currentChoices = ref<any[]>([])

// 用户输入
const userInput = ref('')

// UI状态
const showMenu = ref(false)
const isAutoPlaying = ref(false)
const activeRightTab = ref('inventory')
const loadingMessage = ref('沟通天地，推演天机...')

// 快捷操作
const quickActions = ref([
  { id: 'cultivate', name: '打坐修炼', icon: '🧘', available: true, tooltip: '进行基础修炼' },
  { id: 'explore', name: '外出历练', icon: '🗺️', available: true, tooltip: '探索周围区域' },
  { id: 'trade', name: '坊市交易', icon: '💰', available: false, tooltip: '需要到达坊市' },
  { id: 'craft', name: '炼器炼丹', icon: '⚗️', available: false, tooltip: '需要相应设施' },
])

// 右侧面板标签
const rightPanelTabs = ref([
  { id: 'inventory', name: '背包' },
  { id: 'skills', name: '技能' },
  { id: 'quests', name: '任务' },
])

// 示例数据
const inventoryItems = ref<any[]>(Array(30).fill(null))
const learnedSkills = ref<any[]>([])
const activeQuests = ref<any[]>([])

// 计算属性
const characterInitial = computed(() => props.character?.character_name?.charAt(0) || '无')
const currentRealm = computed(() => gameState.value.current_realm)
const spiritualPowerPercent = computed(() => (gameState.value.spiritual_power / gameState.value.max_spiritual_power) * 100)
const spiritSensePercent = computed(() => (gameState.value.spirit_sense / gameState.value.max_spirit_sense) * 100)
const cultivationProgressPercent = computed(() => Math.floor(gameState.value.cultivation_progress))
const cultivationDasharray = computed(() => {
  const circumference = 2 * Math.PI * 45
  const progress = gameState.value.cultivation_progress / 100
  return `${progress * circumference} ${circumference}`
})
const breakthroughRequirement = computed(() => `${(100 - gameState.value.cultivation_progress).toFixed(1)}% 修为`)
const currentLocation = computed(() => gameState.value.current_location)
const currentTimeOfDay = computed(() => {
  const hours = new Date().getHours()
  if (hours < 6) return '子时'
  if (hours < 9) return '辰时'
  if (hours < 12) return '巳时'
  if (hours < 15) return '午时'
  if (hours < 18) return '申时'
  if (hours < 21) return '酉时'
  return '亥时'
})

// 方法
const nextPrologueStep = () => {
  if (prologueStep.value < prologueTexts.value.length - 1) {
    prologueStep.value++
  }
}

const selectPath = (pathId: string) => {
  selectedPath.value = pathId
  showToast('success', `你选择了${startingPaths.value.find(p => p.id === pathId)?.name}`)
}

const skipPrologue = () => {
  startGame()
}

const startGame = async () => {
  if (!isTavernEnvironment()) {
    showToast('error', '未在酒馆环境中，无法启动AI演算！');
    return;
  }
  
  gamePhase.value = 'loading'
  
  try {
    loadingMessage.value = '正在沟通天道，推演开局...'
    const initialData = await generateInitialGameStateWithTavernAI(props.character);
    
    loadingMessage.value = '天机已现，正在为你塑造世界...'
    await initializeGame(initialData);

    setTimeout(() => {
      gamePhase.value = 'main'
      addGameMessage('system', `欢迎来到修仙世界，${props.character?.character_name}！`)
      addGameMessage('narration', initialData.initial_message)
      addGameMessage('event', initialData.initial_event)
      currentChoices.value = initialData.initial_choices;
    }, 1500)

  } catch (error) {
    console.error("AI开局生成失败:", error);
    showToast('error', '天机演算失败，请稍后重试。');
    gamePhase.value = 'prologue'; // Or some error state
  }
}

const initializeGame = async (initialData: any) => {
  // 从后端加载角色的游戏状态 (如果存在)
  if (props.character?.id) {
    try {
      const response = await api.get(`/api/v1/characters/${props.character.id}/game_state`);
      if (response && (response as any).id) { // 检查响应是否为有效的游戏状态
        Object.assign(gameState.value, response);
      }
    } catch (error) {
      console.error('加载游戏状态失败:', error)
    }
  }

  // 应用AI生成的数据
  gameState.value.current_location = initialData.location;
  gameState.value.spiritual_stones += initialData.starting_items.find((i: any) => i.name.includes('灵石'))?.quantity || 0;
  
  // 将初始物品放入背包
  const items = initialData.starting_items;
  for (let i = 0; i < items.length; i++) {
    inventoryItems.value[i] = items[i];
  }

  // 可以在这里将初始化的游戏状态保存到后端
  // await api.put(`/api/v1/characters/${props.character.id}/game_state`, gameState.value);
}

const addGameMessage = (type: string, content: string) => {
  gameMessages.value.push({
    id: Date.now() + Math.random(),
    type,
    content,
    timestamp: new Date()
  })
  
  nextTick(() => {
    const container = document.querySelector('.message-scroll')
    if (container) container.scrollTop = container.scrollHeight
  })
}

const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const makeChoice = (choiceId: string) => {
  addGameMessage('action', `你选择了：${currentChoices.value.find(c => c.id === choiceId)?.title}`);
  currentChoices.value = [];
}

const performAction = (actionId: string) => {
  const action = quickActions.value.find(a => a.id === actionId);
  if (!action?.available) {
    showToast('warning', '时机未到，无法执行此操作。');
    return;
  }
  
  switch(actionId) {
    case 'cultivate':
      addGameMessage('action', '你盘膝而坐，开始运转功法...');
      gameState.value.cultivation_progress += 2;
      gameState.value.spiritual_power = Math.max(0, gameState.value.spiritual_power - 5);
      break;
    // ... 其他快捷操作逻辑
  }
}

const sendCommand = () => {
  if (userInput.value.trim()) {
    addGameMessage('user', userInput.value);
    userInput.value = '';
  }
}

// [新增] 物品和技能函数
const selectItem = (item: any) => {
  showToast('info', `你查看了【${item.name}】：${item.description}`);
}

const useSkill = (skillId: any) => {
  const skill = learnedSkills.value.find(s => s.id === skillId);
  if (skill) {
    showToast('success', `你使用了技能【${skill.name}】！`);
  }
}


// 菜单相关
const openMenu = () => showMenu.value = true
const closeMenu = () => showMenu.value = false
const saveGame = () => { showToast('info', '存档中...'); closeMenu(); }
const loadGame = () => { showToast('info', '读档中...'); closeMenu(); }
const openSettings = () => { showToast('info', '打开设置...'); closeMenu(); }
const viewHelp = () => { showToast('info', '查看帮助...'); closeMenu(); }
const returnToTitle = () => {
  closeMenu();
  emit('back');
}
const quickSave = () => showToast('success', '快速存档成功！')
const toggleAutoPlay = () => isAutoPlaying.value = !isAutoPlaying.value

onMounted(() => {
  // 初始化时清空消息，避免旧数据残留
  gameMessages.value = [];
});

</script>

<style scoped>
/* --- 主容器 --- */
.game-view-container {
  width: 100vw;
  height: 100vh;
  background-color: var(--color-background);
  color: var(--color-text);
  overflow: hidden;
}

/* --- 序章样式 --- */
.prologue-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
  overflow: hidden;
}

.prologue-backdrop {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at center, rgba(var(--color-primary-rgb), 0.2) 0%, var(--color-background) 70%);
  z-index: 1;
}

.cultivation-aura {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 80vmin;
  height: 80vmin;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, rgba(var(--color-primary-rgb), 0.15) 0%, rgba(var(--color-primary-rgb), 0) 60%);
  border-radius: 50%;
  animation: pulse-aura 8s ease-in-out infinite;
  z-index: 2;
}

@keyframes pulse-aura {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.8; }
  50% { transform: translate(-50%, -50%) scale(1.1); opacity: 1; }
}

.prologue-content {
  position: relative;
  z-index: 3;
  padding: 2rem;
  max-width: 800px;
}

.ancient-title {
  font-family: var(--font-family-serif);
  font-size: 3.5rem;
  font-weight: 500;
  color: var(--color-primary);
  margin-bottom: 1rem;
  letter-spacing: 0.2em;
  text-shadow: 0 0 15px rgba(var(--color-primary-rgb), 0.4);
}

.divider-ornament {
  color: var(--color-accent);
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}

.ancient-text {
  font-size: 1.2rem;
  line-height: 1.8;
  color: var(--color-text-secondary);
  max-width: 600px;
  margin: 0 auto 2.5rem;
}

.destiny-choice {
  margin-top: 2rem;
}
.destiny-choice h3 {
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  font-family: var(--font-family-serif);
}

.choice-cards {
  display: flex;
  gap: 1.5rem;
  justify-content: center;
}

.choice-card {
  flex: 1;
  max-width: 220px;
  padding: 1.5rem;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-surface);
  cursor: pointer;
  transition: all 0.3s ease;
}
.choice-card:hover {
  transform: translateY(-10px);
  border-color: var(--color-primary);
  box-shadow: 0 10px 25px rgba(var(--color-primary-rgb), 0.1);
}
.choice-card.selected {
  border-color: var(--color-accent);
  background: rgba(var(--color-primary-rgb), 0.1);
}
.card-icon { font-size: 2.5rem; margin-bottom: 0.5rem; }
.card-benefits { margin-top: 1rem; font-size: 0.8rem; color: var(--color-nature); }
.card-benefits span { display: block; }

.prologue-controls {
  margin-top: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}
.btn-skip {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  transition: color 0.2s;
}
.btn-skip:hover { color: var(--color-primary); }

/* --- 加载过渡 --- */
.loading-transition {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}
.loading-content {
  text-align: center;
}
.loading-content h2 {
  font-family: var(--font-family-serif);
  font-size: 2rem;
  margin-bottom: 1rem;
}
.yin-yang-spinner {
  width: 80px;
  height: 80px;
  border: 4px solid var(--color-text);
  border-radius: 50%;
  position: relative;
  animation: spin 2s linear infinite;
  margin: 0 auto 2rem;
}
.yin-yang-spinner::before, .yin-yang-spinner::after {
  content: '';
  position: absolute;
  width: 40px;
  height: 80px;
  background: var(--color-text);
}
.yin-yang-spinner::before {
  top: 0;
  left: 0;
  border-radius: 40px 0 0 40px;
}
.yin-yang-spinner::after {
  top: 0;
  right: 0;
  background: var(--color-background);
  border-radius: 0 40px 40px 0;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* --- 主游戏界面 --- */
.main-game-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  padding: 1rem;
  box-sizing: border-box;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.character-info { display: flex; align-items: center; gap: 1rem; }
.avatar-frame { position: relative; }
.avatar-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-background);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 2rem;
  font-family: var(--font-family-serif);
}
.realm-badge {
  position: absolute;
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--color-accent);
  color: var(--color-background);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
}

.basic-stats h3 { margin: 0 0 0.5rem; }
.stat-bars { display: flex; flex-direction: column; gap: 0.3rem; }
.stat-bar { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; }
.stat-label { width: 30px; }
.bar-container { flex-grow: 1; height: 10px; background: rgba(var(--color-primary-rgb), 0.1); border-radius: 5px; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease; }
.spiritual-power { background: #4dabf7; }
.spirit-sense { background: #9b59b6; }
.stat-value { min-width: 70px; text-align: right; }

.resource-display { display: flex; gap: 1.5rem; }
.resource-item { display: flex; align-items: center; gap: 0.5rem; }
.resource-item img { width: 24px; height: 24px; }
.resource-item .icon { font-size: 1.2rem; }

.game-content {
  flex-grow: 1;
  display: flex;
  gap: 1rem;
  padding: 1rem 0;
  overflow: hidden;
}

.side-panel {
  width: 25%;
  max-width: 300px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  background: var(--color-surface-light);
  padding: 1rem;
  border-radius: 8px;
  overflow-y: auto;
}

.central-area {
  flex-grow: 1;
  display: flex;
  flex-direction: column;
}
.scene-display {
  flex-grow: 1;
  background: var(--color-surface);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.scene-header { display: flex; justify-content: space-between; align-items: baseline; padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); }

.message-scroll {
  flex-grow: 1;
  overflow-y: auto;
  padding: 1rem 0;
}
.game-message { margin-bottom: 0.8rem; }
.game-message.system .msg-content { color: var(--color-accent); font-style: italic; }
.game-message.narration .msg-content { color: var(--color-text-secondary); }
.game-message.event .msg-content { color: var(--color-nature); }
.game-message.dialogue .msg-content { color: var(--color-primary); }
.game-message.user .msg-content { text-align: right; }

.input-area {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}
.game-input {
  flex-grow: 1;
  padding: 0.75rem;
  border-radius: 6px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
}
.send-btn {
  padding: 0.75rem 1.5rem;
  background: var(--color-primary);
  color: var(--color-background);
  border: none;
  border-radius: 6px;
  cursor: pointer;
}

.game-footer {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}
.game-footer button {
  padding: 0.5rem 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* --- 菜单样式 --- */
.game-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}
.game-menu {
  background: var(--color-surface);
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  width: 90%;
  max-width: 400px;
  position: relative;
}
.menu-options { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-top: 1rem; }
.menu-btn { width: 100%; padding: 1rem; }
.menu-btn.danger { background: var(--color-danger); color: white; border-color: var(--color-danger); }
.close-btn { position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; }

/* 动画 */
.fade-slide-enter-active, .fade-slide-leave-active { transition: opacity 0.5s, transform 0.5s; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(20px); }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.5s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; transform: translateY(30px); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.3s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
</style>