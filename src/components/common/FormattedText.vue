<template>
  <div class="formatted-text">
    <template v-for="(part, index) in parsedText" :key="index">
      <span v-if="part.type !== 'judgement-card'" :class="getPartClass(part.type)">
        {{ part.content }}
      </span>
      <div v-else-if="isJudgementData(part.content)" class="judgement-card" :class="{
        'is-success': isSuccessResult(part.content.result),
        'is-failure': isFailureResult(part.content.result),
        'is-great-success': part.content.result?.includes('大成功'),
        'is-great-failure': part.content.result?.includes('大失败')
      }">
        <div class="card-icon">
          <svg v-if="isSuccessResult(part.content.result)" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <svg v-else-if="isFailureResult(part.content.result)" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
          <svg v-else width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <div class="card-content">
          <div class="card-header">
            <span class="judgement-title">{{ part.content.title }}</span>
            <span class="judgement-badge">{{ part.content.result }}</span>
          </div>
          <div class="card-body">
            <div class="stat-item">
              <span class="stat-icon">🎲</span>
              <div class="stat-info">
                <span class="stat-label">骰点</span>
                <span class="stat-value">{{ part.content.dice }}</span>
              </div>
            </div>
            <div class="stat-item">
              <span class="stat-icon">⚡</span>
              <div class="stat-info">
                <span class="stat-label">属性</span>
                <span class="stat-value">{{ part.content.attribute }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface JudgementData {
  title: string
  result: '成功' | '失败' | string
  dice: string
  attribute: string
}

interface TextPart {
  type: 'environment' | 'psychology' | 'dialogue' | 'judgement-card' | 'normal'
  content: string | JudgementData
}

const isJudgementData = (content: string | JudgementData): content is JudgementData => {
  return typeof content === 'object' && content !== null && 'title' in content
}

const props = defineProps<{
  text: string
}>()

const parsedText = computed(() => {
  const parts: TextPart[] = []
  const text = props.text || ''
  
  if (!text.trim()) {
    return [{ type: 'normal', content: text }]
  }

  let currentIndex = 0
  // 统一换行并规范化引号（压缩重复的中英文引号，避免解析异常）
  // 🔥 增强：将各种Unicode引号统一转换为标准引号
  const processedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 将各种左引号统一为中文左引号 "
    .replace(/["""‟„]/g, '"')
    // 将各种右引号统一为中文右引号 "
    .replace(/["""‟„]/g, '"')
    // 压缩重复引号
    .replace(/"{2,}/g, '"')
    .replace(/"{2,}/g, '"')

  while (currentIndex < processedText.length) {
    // 查找标记的顺序：先找最近的开始标记
    const markers = []
    
    // 环境描写 【】
    const envStart = processedText.indexOf('【', currentIndex)
    if (envStart !== -1) {
      const envEnd = processedText.indexOf('】', envStart + 1)
      if (envEnd !== -1) {
        markers.push({ 
          start: envStart, 
          end: envEnd + 1, 
          type: 'environment' as const, 
          contentStart: envStart + 1,
          contentEnd: envEnd
        })
      }
    }
    
    // 心理描写 ``
    const psyStart = processedText.indexOf('`', currentIndex)
    if (psyStart !== -1) {
      const psyEnd = processedText.indexOf('`', psyStart + 1)
      if (psyEnd !== -1) {
        markers.push({ 
          start: psyStart, 
          end: psyEnd + 1, 
          type: 'psychology' as const,
          contentStart: psyStart + 1,
          contentEnd: psyEnd
        })
      }
    }
    
    // 对话：支持半角双引号 "" 与中文引号 “ ”
    // 半角引号
    const dialogStart = processedText.indexOf('"', currentIndex)
    if (dialogStart !== -1) {
      const dialogEnd = processedText.indexOf('"', dialogStart + 1)
      if (dialogEnd !== -1) {
        markers.push({ 
          start: dialogStart, 
          end: dialogEnd + 1, 
          type: 'dialogue' as const,
          contentStart: dialogStart + 1,
          contentEnd: dialogEnd
        })
      }
    }
    // 中文引号
    const zhDialogStart = processedText.indexOf('"', currentIndex)
    if (zhDialogStart !== -1) {
      const zhDialogEnd = processedText.indexOf('"', zhDialogStart + 1)
      if (zhDialogEnd !== -1) {
        markers.push({
          start: zhDialogStart,
          end: zhDialogEnd + 1,
          type: 'dialogue' as const,
          // 包含引号本身
          contentStart: zhDialogStart,
          contentEnd: zhDialogEnd + 1
        })
      }
    }
    
    // 🔥 新增：书名号「」也解析为对话
    const bookQuoteStart = processedText.indexOf('「', currentIndex)
    if (bookQuoteStart !== -1) {
      const bookQuoteEnd = processedText.indexOf('」', bookQuoteStart + 1)
      if (bookQuoteEnd !== -1) {
        markers.push({
          start: bookQuoteStart,
          end: bookQuoteEnd + 1,
          type: 'dialogue' as const,
          // 包含书名号本身
          contentStart: bookQuoteStart,
          contentEnd: bookQuoteEnd + 1
        })
      }
    }
    
    // 判定结果 〖〗
    const judgementStart = processedText.indexOf('〖', currentIndex)
    if (judgementStart !== -1) {
      const judgementEnd = processedText.indexOf('〗', judgementStart + 1)
      if (judgementEnd !== -1) {
        markers.push({ 
          start: judgementStart, 
          end: judgementEnd + 1, 
          type: 'judgement' as const,
          contentStart: judgementStart + 1,
          contentEnd: judgementEnd
        })
      }
    }

    // 过滤和排序标记
    const validMarkers = markers
      .filter(m => m.start >= currentIndex && m.contentStart < m.contentEnd)
      .sort((a, b) => a.start - b.start)

    if (validMarkers.length === 0) {
      // 没有更多标记，剩余的都是普通文本
      if (currentIndex < processedText.length) {
        parts.push({
          type: 'normal',
          content: processedText.slice(currentIndex)
        })
      }
      break
    }

    const nextMarker = validMarkers[0]

    // 添加标记前的普通文本
    if (nextMarker.start > currentIndex) {
      const normalText = processedText.slice(currentIndex, nextMarker.start)
      if (normalText) {
        parts.push({
          type: 'normal',
          content: normalText
        })
      }
    }

    // 添加标记内容
    const markedContent = processedText.slice(nextMarker.contentStart, nextMarker.contentEnd)
    if (markedContent.trim()) {
      if (nextMarker.type === 'judgement') {
        // 使用简单的分隔符解析判定内容
        // 格式: "感悟判定:失败,骰点:98,悟性:5"
        const contentParts = markedContent.split(',').map(p => p.trim())
        
        if (contentParts.length >= 2) {
          const titleResult = contentParts[0].split(':')
          const diceInfo = contentParts.find(p => p.includes('骰点'))
          const attrInfo = contentParts.find(p => !p.includes('骰点') && p !== contentParts[0])
          
          if (titleResult.length === 2) {
            parts.push({
              type: 'judgement-card',
              content: {
                title: titleResult[0].trim(),
                result: titleResult[1].trim(),
                dice: diceInfo ? diceInfo.split(':')[1]?.trim() || '未知' : '未知',
                attribute: attrInfo || '未知属性'
              }
            })
          } else {
            // 解析失败，作为普通文本处理
            parts.push({ type: 'normal', content: `〖${markedContent}〗` })
          }
        } else {
          // 解析失败，作为普通文本处理
          parts.push({ type: 'normal', content: `〖${markedContent}〗` })
        }
      } else {
        parts.push({
          type: nextMarker.type,
          content: processedText.slice(nextMarker.start, nextMarker.end)
        })
      }
    }

    currentIndex = nextMarker.end
  }

  return parts.length > 0 ? parts : [{ type: 'normal', content: text }]
})

const getPartClass = (type: string) => {
  return {
    'text-environment': type === 'environment',
    'text-psychology': type === 'psychology',
    'text-dialogue': type === 'dialogue',
    'text-normal': type === 'normal'
  }
}

// 判断成功/失败的辅助函数
const isSuccessResult = (result: string) => {
  return ['成功', '大成功', '完美', '通过'].includes(result)
}

const isFailureResult = (result: string) => {
  return ['失败', '大失败', '失败惨重', '未通过'].includes(result)
}
</script>

<style scoped>
.formatted-text {
  white-space: pre-wrap;
  word-wrap: break-word;
  text-align: justify;
  text-indent: 2em;
  margin: 0;
  line-height: 1.8;
  padding-bottom: 1.5rem;
}

/* 环境描写 - 青色 */
.text-environment {
  color: #0891b2;
  font-weight: 500;
}

/* 心理描写 - 紫色 */
.text-psychology {
  color: #7c3aed;
  font-style: italic;
  font-weight: 500;
}

/* 对话 - 橙色，增强样式 */
.text-dialogue {
  color: #d97706;
  font-weight: 500;
  font-style: normal;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.12) 0%, rgba(251, 146, 60, 0.06) 100%);
  padding: 0.15em 0.5em;
  border-radius: 6px;
  margin: 0 0.2em;
  border-left: 3px solid rgba(234, 88, 12, 0.4);
  box-shadow: 0 1px 3px rgba(234, 88, 12, 0.1);
  display: inline-block;
}

/* 普通文本 */
.text-normal {
  color: var(--color-text, #1a1a1a);
}

/* 判定卡片样式 - 重新设计 */
.judgement-card {
  display: flex;
  gap: 1rem;
  margin: 1.25rem 0;
  padding: 1.25rem;
  background: linear-gradient(135deg, #fefefe 0%, #f8f9fa 100%);
  border-radius: 16px;
  border: 2px solid #e2e8f0;
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.04),
    0 4px 16px rgba(0, 0, 0, 0.02);
  text-indent: 0;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.judgement-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg,
    transparent 0%,
    var(--card-color, #6366f1) 50%,
    transparent 100%);
}

.judgement-card:hover {
  transform: translateY(-2px);
  box-shadow:
    0 4px 12px rgba(0, 0, 0, 0.06),
    0 8px 24px rgba(0, 0, 0, 0.04);
}

/* 成功状态 */
.judgement-card.is-success {
  border-color: #86efac;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  --card-color: #10b981;
}

.judgement-card.is-great-success {
  border-color: #fbbf24;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  --card-color: #f59e0b;
  animation: pulse-success 2s ease-in-out infinite;
}

/* 失败状态 */
.judgement-card.is-failure {
  border-color: #fca5a5;
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  --card-color: #ef4444;
}

.judgement-card.is-great-failure {
  border-color: #c084fc;
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  --card-color: #a855f7;
  animation: pulse-failure 2s ease-in-out infinite;
}

@keyframes pulse-success {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
}

@keyframes pulse-failure {
  0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(168, 85, 247, 0); }
}

/* 图标区域 */
.card-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 12px;
  border: 2px solid var(--card-color, #6366f1);
  color: var(--card-color, #6366f1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

/* 内容区域 */
.card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* 标题行 */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.judgement-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
  letter-spacing: -0.01em;
}

.judgement-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  background: var(--card-color, #6366f1);
  color: white;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 统计信息行 */
.card-body {
  display: flex;
  gap: 1.25rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 1rem;
  background: white;
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stat-icon {
  font-size: 1.375rem;
  line-height: 1;
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #1e293b;
}

.dice-roll, .attribute-check {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem;
  background: var(--color-surface-light, #ebe9e6);
  border-radius: 8px;
  border: 1px solid var(--color-border, rgba(0, 0, 0, 0.1));
  transition: all 0.2s ease;
  text-align: center;
}

.dice-roll:hover, .attribute-check:hover {
  background: var(--color-surface, #f2f1ee);
  transform: translateY(-1px);
}

.dice-roll .label, .attribute-check .label {
  font-size: 0.8em;
  color: var(--color-text-secondary, #666666);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
  font-weight: 500;
}

.dice-roll .value, .attribute-check .value {
  font-size: 1.4em;
  font-weight: 700;
  color: var(--color-text, #1a1a1a);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.dice-roll .value {
  color: #6366f1;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* 深色主题适配 */
[data-theme="dark"] .text-normal {
  color: var(--color-text, #f7f7f5);
}

[data-theme="dark"] .text-environment {
  color: #22d3ee;
}

[data-theme="dark"] .text-psychology {
  color: #a78bfa;
}

[data-theme="dark"] .text-dialogue {
  color: #fb923c;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(251, 146, 60, 0.08) 100%);
  border-left-color: rgba(234, 88, 12, 0.6);
  box-shadow: 0 1px 3px rgba(234, 88, 12, 0.2);
}

[data-theme="dark"] .judgement-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, var(--color-background, rgb(30, 41, 59)) 100%);
  border-color: var(--color-border, rgba(173, 216, 230, 0.5));
}

[data-theme="dark"] .card-header {
  color: var(--color-text, #f7f7f5);
}

[data-theme="dark"] .result-text,
[data-theme="dark"] .dice-roll,
[data-theme="dark"] .attribute-check {
  background: var(--color-surface-light, #414868);
  border-color: var(--color-border, rgba(173, 216, 230, 0.5));
}

[data-theme="dark"] .dice-roll .label,
[data-theme="dark"] .attribute-check .label {
  color: var(--color-text-secondary, #d0d0d0);
}

[data-theme="dark"] .dice-roll .value,
[data-theme="dark"] .attribute-check .value {
  color: var(--color-text, #f7f7f5);
}
</style>
