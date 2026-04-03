<template>
  <section class="run-surface">
    <div v-if="previewMedia" class="preview-overlay" @click.self="previewMedia = null">
      <div class="preview-dialog">
        <button type="button" class="preview-close" @click="previewMedia = null">×</button>
        <img
          v-if="previewMedia.type === 'image'"
          :src="previewMedia.url"
          :alt="previewMedia.title || 'preview'"
          class="preview-image"
        />
        <video
          v-else
          class="preview-video"
          :src="previewMedia.url"
          controls
          autoplay
          playsinline
        ></video>
      </div>
    </div>

    <div ref="scrollRef" class="message-scroll">
      <div v-if="displayEntries.length === 0" class="empty-state">
        <div class="empty-card">
          <strong>{{ ui.emptyTitle }}</strong>
          <p>{{ ui.emptyState }}</p>
        </div>
      </div>

      <article
        v-for="entry in displayEntries"
        :key="entry.id"
        class="message-row"
        :class="entry.kind"
      >
        <div class="avatar">
          <span>{{ avatarLabel(entry.kind) }}</span>
        </div>

        <div class="message-main">
          <div class="message-head">
            <strong>{{ labelFor(entry.kind) }}</strong>
            <div v-if="entry.tag || entry.kind !== 'assistant_message'" class="head-meta">
              <span v-if="entry.tag" class="head-tag">{{ entry.tag }}</span>
              <time v-if="entry.kind !== 'assistant_message'">{{ formatTime(entry.createdAt) }}</time>
            </div>
          </div>

          <div class="message-bubble">
            <div v-if="entry.progress" class="progress-card">
              <div class="progress-head">
                <strong>{{ entry.progress.title }}</strong>
                <span>{{ entry.progress.statusText }}</span>
              </div>

              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${entry.progress.percent || 0}%` }"></div>
              </div>

              <div class="progress-steps">
                <article
                  v-for="step in entry.progress.steps"
                  :key="step.id"
                  class="progress-step"
                  :class="step.state"
                >
                  <span class="step-dot"></span>
                  <div>
                    <strong>{{ step.label }}</strong>
                    <p>{{ step.description }}</p>
                  </div>
                </article>
              </div>
            </div>

            <div
              v-if="entry.kind === 'assistant_message' && !entry.body && !shouldShowReasoning(entry) && busy && isLatestAssistant(entry)"
              class="loading-card"
            >
              <div class="loading-line">
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
                <span class="loading-dot"></span>
              </div>
              <span>{{ loadingLabel }}</span>
            </div>

            <section v-if="shouldShowReasoning(entry)" class="reasoning-block">
              <button
                type="button"
                class="reasoning-toggle"
                :aria-expanded="String(isReasoningOpen(entry))"
                @click="toggleReasoning(entry)"
              >
                <span class="reasoning-toggle-copy">
                  <strong>{{ ui.reasoningLabel }}</strong>
                  <small>{{ reasoningStatusLabel(entry) }}</small>
                </span>
                <span class="reasoning-toggle-icon" :class="{ open: isReasoningOpen(entry) }">></span>
              </button>

              <div v-if="isReasoningOpen(entry)" class="reasoning-content">
                <template v-if="entry.reasoning">
                  <p
                    v-for="(line, index) in splitLines(entry.reasoning)"
                    :key="`${entry.id}-reasoning-${index}`"
                  >
                    {{ line }}
                  </p>
                  <span
                    v-if="isStreamingReasoning(entry)"
                    class="stream-cursor"
                    aria-hidden="true"
                  ></span>
                </template>

                <div v-else class="reasoning-loading">
                  <div class="loading-line">
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                    <span class="loading-dot"></span>
                  </div>
                  <span>{{ ui.reasoningWorking }}</span>
                </div>
              </div>
            </section>

            <div v-if="entry.body" class="message-content">
              <div v-if="entry.reasoning" class="answer-head">
                <strong>{{ ui.answerLabel }}</strong>
              </div>
              <div class="message-markdown" v-html="renderMarkdown(entry.body)"></div>
              <span
                v-if="isStreamingMessage(entry)"
                class="stream-cursor"
                aria-hidden="true"
              ></span>

              <div v-if="entry.kind === 'assistant_message'" class="assistant-answer-footer">
                <span
                  v-if="isStreamingMessage(entry)"
                  class="status-pill answer-status"
                >
                  {{ loadingLabel }}
                </span>
                <time class="answer-time">{{ formatTime(entry.createdAt) }}</time>
                <button
                  type="button"
                  class="text-action answer-copy"
                  @click="copyMessage(entry)"
                >
                  {{ copiedId === entry.id ? ui.copied : ui.copy }}
                </button>
              </div>

              <div v-if="entry.sources?.length" class="source-strip">
                <a
                  v-for="source in entry.sources"
                  :key="source.id || source.url"
                  class="source-chip"
                  :href="source.url"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{{ source.title }}</span>
                  <small>{{ source.host || source.url }}</small>
                </a>
              </div>

              <div v-if="entry.artifacts?.length" class="artifact-strip">
                <a
                  v-for="artifact in entry.artifacts"
                  :key="artifact.id || artifact.url"
                  class="artifact-chip"
                  :href="artifact.url"
                  :download="artifact.filename"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>{{ artifact.label || artifact.filename }}</span>
                  <small>{{ artifact.filename }}</small>
                </a>
              </div>
            </div>

            <div v-if="showAssistantEmptyState(entry)" class="empty-assistant">
              {{ ui.emptyAssistant }}
            </div>

            <div
              v-if="entry.media?.length"
              class="media-grid"
              :class="{
                'image-grid': entry.media.every((item) => item.type === 'image'),
                'video-grid': entry.media.every((item) => item.type === 'video')
              }"
            >
              <article
                v-for="(media, index) in entry.media"
                :key="`${entry.id}-${index}`"
                class="media-card"
              >
                <div class="media-stage">
                  <span>{{ media.type === 'video' ? ui.videoReady : ui.imageReady }}</span>
                  <strong>{{ media.title || ui.generatedResult }}</strong>
                </div>

                <img
                  v-if="media.type === 'image'"
                  :src="media.url"
                  :alt="media.alt || 'generated image'"
                  class="media-image"
                  @click="openPreview(media)"
                />

                <video
                  v-else-if="media.type === 'video'"
                  class="media-video"
                  :src="media.url"
                  controls
                  playsinline
                  preload="metadata"
                  @click="openPreview(media)"
                ></video>

                <div class="media-meta">
                  <p>{{ media.description || '' }}</p>
                  <div class="media-actions">
                    <button type="button" class="action-link" @click="copyMediaUrl(media.url)">
                      {{ ui.copyLink }}
                    </button>
                    <button type="button" class="action-link" @click="downloadMedia(media)">
                      {{ ui.download }}
                    </button>
                    <a class="action-link" :href="media.url" target="_blank" rel="noreferrer">
                      {{ ui.open }}
                    </a>
                  </div>
                </div>
              </article>
            </div>

            <div v-if="entry.attachments?.length" class="attachment-list">
              <span v-for="item in entry.attachments" :key="item.id" class="attachment-chip">
                {{ item.name }}
              </span>
            </div>
          </div>

        </div>
      </article>
    </div>

    <footer class="composer">
      <div v-if="attachments.length" class="attachment-preview">
        <article v-for="item in attachments" :key="item.id" class="preview-chip">
          <button
            v-if="item.kind === 'image' && item.previewUrl"
            type="button"
            class="preview-thumb-button"
            @click="openPreview({ type: 'image', url: item.previewUrl, title: item.name })"
          >
            <img :src="item.previewUrl" :alt="item.name" class="preview-thumb" />
          </button>

          <div class="preview-copy">
            <div class="preview-head">
              <strong>{{ item.name }}</strong>
              <span v-if="item.statusLabel" class="preview-status" :class="{ processing: item.processing }">
                <span v-if="item.processing" class="mini-loading">
                  <span></span>
                  <span></span>
                  <span></span>
                </span>
                {{ item.statusLabel }}
              </span>
            </div>
            <span class="preview-summary">{{ item.summary }}</span>
          </div>
          <button type="button" class="remove-chip" @click="$emit('remove-attachment', item.id)">
            ×
          </button>
        </article>
      </div>

      <div v-if="imagePromptSuggestions.length" class="quick-prompts">
        <button
          v-for="prompt in imagePromptSuggestions"
          :key="prompt"
          type="button"
          class="quick-prompt-chip"
          @click="$emit('update:chatInput', prompt)"
        >
          {{ prompt }}
        </button>
      </div>

      <div class="composer-tools">
        <div class="tool-menu-wrap">
          <button
            type="button"
            class="tool-button feature-button"
            :class="{ active: toolMenuOpen }"
            @click="roleMenuOpen = false; toolMenuOpen = !toolMenuOpen"
          >
            <span class="feature-icon" aria-hidden="true">
              <span></span>
              <span></span>
              <span></span>
            </span>
            <span>{{ ui.tools }}</span>
          </button>

          <div v-if="toolMenuOpen" class="tool-menu">
            <button type="button" class="tool-menu-item" @click="handleMenuUpload">
              {{ ui.upload }}
            </button>

            <button
              type="button"
              class="tool-menu-item"
              :class="{ selected: webSearchEnabled }"
              @click="handleToggleWebSearch"
            >
              {{ webSearchEnabled ? ui.webSearchOn : ui.webSearchOff }}
            </button>

            <button
              v-for="option in capabilityOptions"
              :key="option.value"
              type="button"
              class="tool-menu-item"
              :class="{ selected: option.value === capability }"
              @click="handleCapability(option.value)"
            >
              <span>{{ option.label }}</span>
              <small>{{ option.note }}</small>
            </button>
          </div>
        </div>

        <label class="model-picker">
          <span>{{ ui.model }}</span>
          <select
            :value="currentModel"
            class="model-select"
            @change="$emit('update:currentModel', $event.target.value)"
          >
            <option v-for="model in filteredModels" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
        </label>

        <div class="role-menu-wrap mobile-role-only">
          <button
            type="button"
            class="tool-button role-button"
            :class="{ active: roleMenuOpen }"
            @click="toolMenuOpen = false; roleMenuOpen = !roleMenuOpen"
          >
            <span>{{ roleButtonLabel }}</span>
          </button>

          <div v-if="roleMenuOpen" class="role-menu">
            <button
              v-for="option in assistantModeOptions"
              :key="option.value"
              type="button"
              class="role-menu-item"
              :class="{ selected: option.value === assistantMode }"
              @click="selectAssistantMode(option.value)"
            >
              <span>{{ option.label }}</span>
              <small>{{ option.note }}</small>
            </button>

            <div v-if="assistantMode === 'analysis'" class="role-menu-divider"></div>

            <button
              v-for="option in assistantMode === 'analysis' ? analysisRoleOptions : []"
              :key="option.value"
              type="button"
              class="role-menu-item subrole-item"
              :class="{ selected: option.value === analysisRole }"
              @click="selectAnalysisRole(option.value)"
            >
              <span>{{ option.label }}</span>
              <small>{{ option.note }}</small>
            </button>
          </div>
        </div>

        <button type="button" class="text-action clear-action" @click="$emit('clear')">
          {{ ui.clear }}
        </button>
      </div>

      <div class="composer-main">
        <textarea
          :value="chatInput"
          class="composer-input"
          :placeholder="placeholderText"
          rows="4"
          @input="$emit('update:chatInput', $event.target.value)"
          @keydown="handleComposerKeydown"
        ></textarea>

        <button
          type="button"
          class="send-button"
          :disabled="busy || attachmentsProcessing || !canSend"
          @click="$emit('send')"
        >
          {{ attachmentsProcessing ? ui.fileWorking : busy ? ui.sending : actionLabel }}
        </button>
      </div>

      <div class="composer-hint">
        {{ attachmentsProcessing ? ui.fileHint : ui.sendHint }}
      </div>
    </footer>
  </section>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import MarkdownIt from 'markdown-it'

const props = defineProps({
  entries: { type: Array, default: () => [] },
  chatInput: { type: String, default: '' },
  busy: { type: Boolean, default: false },
  attachmentsProcessing: { type: Boolean, default: false },
  liveStatus: { type: Object, default: () => ({}) },
  models: { type: Array, default: () => [] },
  currentModel: { type: String, default: '' },
  webSearchEnabled: { type: Boolean, default: false },
  attachments: { type: Array, default: () => [] },
  capability: { type: String, default: 'chat' },
  capabilityOptions: { type: Array, default: () => [] },
  assistantMode: { type: String, default: 'quick' },
  assistantModeOptions: { type: Array, default: () => [] },
  analysisRole: { type: String, default: '' },
  analysisRoleOptions: { type: Array, default: () => [] },
  roleLabel: { type: String, default: '' },
  ui: { type: Object, default: () => ({}) }
})

const emit = defineEmits([
  'update:chatInput',
  'update:currentModel',
  'update:capability',
  'update:assistantMode',
  'update:analysisRole',
  'toggle-web-search',
  'open-upload',
  'remove-attachment',
  'send',
  'clear'
])

const scrollRef = ref(null)
const copiedId = ref('')
const toolMenuOpen = ref(false)
const roleMenuOpen = ref(false)
const previewMedia = ref(null)
const reasoningOpenState = ref({})
const markdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true
})

const fallbackUi = {
  emptyTitle: '开始一轮新的协作',
  emptyState: '这里会展示对话、图片理解、图片生成和视频生成结果。',
  inputPlaceholder: '输入问题、任务，或直接描述企业情况...',
  imagePlaceholder: '描述你想生成的图片，例如：一张科技金融风格的企业封面图。',
  videoPlaceholder: '描述你想生成的视频，例如：一段 5 秒的企业宣传镜头。',
  clear: '清空',
  copy: '复制',
  copied: '已复制',
  copyLink: '复制链接',
  download: '下载',
  open: '打开',
  upload: '上传文件',
  tools: '功能',
  webSearchOn: '关闭联网搜索',
  webSearchOff: '开启联网搜索',
  model: '模型',
  send: '发送',
  sending: '处理中',
  generateImage: '生成图片',
  generateVideo: '生成视频',
  generatedResult: '生成结果',
  imageReady: '图片已生成',
  videoReady: '视频已生成',
  fileWorking: '处理中',
  fileHint: '附件处理中，完成后即可发送',
  reasoningLabel: '思考过程',
  answerLabel: '最终答复',
  reasoningWorking: '思考中',
  reasoningDone: '思考结束',
  emptyAssistant: '本次返回暂未生成可展示内容，请检查模型或接口配置。',
  sendHint: 'Ctrl/Cmd + Enter 发送',
  typeLabels: {
    user_message: '你',
    assistant_message: '助手'
  },
  progressSteps: {
    thinking: '正在思考',
    reasoning: '思考过程输出中',
    searching: '联网搜索中',
    routing: '整理上下文',
    requesting: '连接模型',
    streaming: '即将生成',
    composing: '流式输出中',
    completed: '已完成',
    fallback: '正在回退',
    error: '生成失败'
  }
}

const ui = computed(() => ({
  ...fallbackUi,
  ...props.ui,
  typeLabels: {
    ...fallbackUi.typeLabels,
    ...(props.ui?.typeLabels || {})
  },
  progressSteps: {
    ...fallbackUi.progressSteps,
    ...(props.ui?.progressSteps || {})
  }
}))

const filteredModels = computed(() => {
  return props.models.filter((model) => {
    if (props.capability === 'image') return model.category === 'image'
    if (props.capability === 'video') return model.category === 'video'
    return model.category === 'text' || model.category === 'vision'
  })
})

const displayEntries = computed(() => {
  return props.entries.filter((entry) => {
    if (entry.kind !== 'assistant_message') return true
    return Boolean(entry.reasoning) || Boolean(entry.body) || Boolean(entry.media?.length) || isLatestAssistantEntry(entry)
  })
})

const loadingLabel = computed(() => {
  const stage = props.liveStatus?.stage || 'thinking'
  return ui.value.progressSteps[stage] || props.liveStatus?.message || ui.value.sending
})

const actionLabel = computed(() => {
  if (props.capability === 'image') return ui.value.generateImage
  if (props.capability === 'video') return ui.value.generateVideo
  return ui.value.send
})

const placeholderText = computed(() => {
  if (props.capability === 'image') return ui.value.imagePlaceholder
  if (props.capability === 'video') return ui.value.videoPlaceholder
  return ui.value.inputPlaceholder
})

const roleButtonLabel = computed(() => props.roleLabel || props.assistantModeOptions[0]?.label || '')
const hasImageAttachments = computed(() => props.attachments.some((item) => item.kind === 'image'))
const canSend = computed(() => Boolean(props.chatInput.trim()) || props.attachments.length > 0)
const imagePromptSuggestions = computed(() => {
  if (props.capability !== 'chat' || !hasImageAttachments.value || props.chatInput.trim()) return []
  return [
    '这张图里有什么？',
    '提取图中的文字',
    '帮我概括关键信息'
  ]
})

function handleMenuUpload() {
  toolMenuOpen.value = false
  emit('open-upload')
}

function handleToggleWebSearch() {
  toolMenuOpen.value = false
  emit('toggle-web-search')
}

function handleCapability(value) {
  toolMenuOpen.value = false
  emit('update:capability', value)
}

function selectAssistantMode(value) {
  roleMenuOpen.value = false
  emit('update:assistantMode', value)
}

function selectAnalysisRole(value) {
  roleMenuOpen.value = false
  emit('update:analysisRole', value)
}

function handleComposerKeydown(event) {
  if (event.isComposing) return
  if (event.key !== 'Enter') return

  if (event.ctrlKey || event.metaKey) {
    event.preventDefault()
    emit('send')
  }
}

function openPreview(media) {
  previewMedia.value = media
}

function isLatestAssistantEntry(entry) {
  const lastAssistant = [...props.entries].reverse().find((item) => item.kind === 'assistant_message')
  return lastAssistant?.id === entry.id
}

function isLatestAssistant(entry) {
  return isLatestAssistantEntry(entry)
}

function isStreamingMessage(entry) {
  return props.busy && isLatestAssistantEntry(entry) && Boolean(entry.body)
}

function isStreamingReasoning(entry) {
  return isReasoningPending(entry) && Boolean(entry.reasoning)
}

function isStreamingEntry(entry) {
  return props.busy && isLatestAssistantEntry(entry) && Boolean(entry.body || entry.reasoning)
}

function isReasoningPending(entry) {
  if (entry.kind !== 'assistant_message') return false
  if (!props.busy || !isLatestAssistantEntry(entry)) return false

  const stage = props.liveStatus?.stage || 'thinking'
  return ['thinking', 'routing', 'requesting', 'reasoning', 'searching'].includes(stage)
}

function shouldShowReasoning(entry) {
  return entry.kind === 'assistant_message' && (Boolean(entry.reasoning) || isReasoningPending(entry))
}

function isReasoningOpen(entry) {
  return Boolean(reasoningOpenState.value[entry.id])
}

function toggleReasoning(entry) {
  reasoningOpenState.value = {
    ...reasoningOpenState.value,
    [entry.id]: !isReasoningOpen(entry)
  }
}

function reasoningStatusLabel(entry) {
  return isReasoningPending(entry) ? ui.value.reasoningWorking : ui.value.reasoningDone
}

function showAssistantEmptyState(entry) {
  return entry.kind === 'assistant_message' &&
    isLatestAssistantEntry(entry) &&
    !props.busy &&
    !entry.progress &&
    !entry.reasoning &&
    !entry.body &&
    !entry.media?.length
}

function labelFor(kind) {
  return ui.value.typeLabels[kind] || kind
}

function avatarLabel(kind) {
  return kind === 'user_message' ? '你' : 'AI'
}

function splitLines(text) {
  return String(text || '')
    .split('\n')
    .filter((line, index, list) => line.trim() || index !== list.length - 1)
}

function renderMarkdown(text) {
  return markdown.render(String(text || '').trim())
}

function formatTime(value) {
  if (!value) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

async function copyMessage(entry) {
  try {
    const sections = []

    if (entry.reasoning) {
      sections.push(`${ui.value.reasoningLabel}\n${entry.reasoning}`)
    }

    if (entry.body) {
      sections.push(sections.length ? `${ui.value.answerLabel}\n${entry.body}` : entry.body)
    }

    await navigator.clipboard.writeText(sections.join('\n\n') || '')
    copiedId.value = entry.id
    window.setTimeout(() => {
      if (copiedId.value === entry.id) copiedId.value = ''
    }, 1400)
  } catch {
    copiedId.value = ''
  }
}

async function copyMediaUrl(url) {
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    // ignore clipboard errors
  }
}

function downloadMedia(media) {
  const link = document.createElement('a')
  link.href = media.url
  link.download = media.filename || `${media.type || 'asset'}-${Date.now()}`
  link.target = '_blank'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function scrollToBottom() {
  await nextTick()
  const element = scrollRef.value
  if (!element) return
  element.scrollTop = element.scrollHeight
}

watch(
  () => props.entries.map((item) => `${item.id}:${item.reasoning?.length || 0}:${item.body?.length || 0}:${item.media?.length || 0}`).join('|'),
  scrollToBottom,
  { immediate: true }
)

watch(
  () => props.liveStatus?.stage,
  () => {
    if (props.busy) scrollToBottom()
  }
)
</script>

<style scoped>
.run-surface {
  position: relative;
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  min-height: 0;
  height: 100%;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 32px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(244, 248, 252, 0.92)),
    radial-gradient(circle at top left, rgba(15, 139, 141, 0.12), transparent 38%);
  box-shadow:
    0 24px 60px rgba(14, 36, 56, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.65);
  overflow: hidden;
}

.preview-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: grid;
  place-items: center;
  padding: 28px;
  background: rgba(7, 14, 24, 0.68);
  backdrop-filter: blur(10px);
}

.preview-dialog {
  position: relative;
  width: min(960px, 92vw);
  max-height: 88vh;
  padding: 18px;
  border-radius: 28px;
  background: rgba(11, 25, 39, 0.96);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.35);
}

.preview-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
  font-size: 24px;
  cursor: pointer;
}

.preview-image,
.preview-video {
  display: block;
  width: 100%;
  max-height: calc(88vh - 36px);
  object-fit: contain;
  border-radius: 18px;
}

.message-scroll {
  min-height: 0;
  overflow: auto;
  padding: 22px 22px 14px;
}

.empty-state {
  display: grid;
  place-items: center;
  min-height: 360px;
}

.empty-card {
  max-width: 460px;
  padding: 26px 28px;
  border: 1px solid rgba(32, 56, 78, 0.08);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.78);
  color: #23415b;
  text-align: center;
  box-shadow: 0 18px 40px rgba(25, 42, 67, 0.08);
}

.empty-card strong {
  display: block;
  margin-bottom: 10px;
  font-size: 20px;
}

.message-row {
  display: grid;
  grid-template-columns: 46px minmax(0, 1fr);
  gap: 12px;
  margin-bottom: 18px;
}

.avatar {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 16px;
  background: linear-gradient(135deg, #10364a, #1e556d);
  color: #ffffff;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 10px 22px rgba(16, 54, 74, 0.18);
}

.user_message .avatar {
  background: linear-gradient(135deg, #0f8b8d, #146c94);
}

.message-main {
  min-width: 0;
}

.message-head,
.head-meta,
.media-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.message-head {
  margin-bottom: 8px;
  color: #5f7387;
}

.message-head strong {
  color: #1c3147;
  font-size: 15px;
}

.head-meta {
  color: #7b8c9d;
  font-size: 12px;
}

.head-tag,
.status-pill,
.attachment-chip {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 139, 141, 0.1);
  color: #0f8b8d;
  font-size: 12px;
  font-weight: 700;
}

.message-bubble {
  padding: 6px 0;
  background: transparent;
  border: none;
  box-shadow: none;
}

.progress-card {
  margin-bottom: 14px;
  padding: 16px;
  border: 1px solid rgba(15, 139, 141, 0.14);
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(15, 139, 141, 0.08), rgba(20, 108, 148, 0.04));
}

.progress-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  color: #1d3147;
}

.progress-head strong {
  font-size: 14px;
}

.progress-head span {
  color: #0f8b8d;
  font-size: 12px;
  font-weight: 700;
}

.progress-bar {
  overflow: hidden;
  height: 8px;
  border-radius: 999px;
  background: rgba(15, 139, 141, 0.08);
}

.progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(135deg, #0f8b8d, #146c94);
  transition: width 0.25s ease;
}

.progress-steps {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.progress-step {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr);
  gap: 10px;
  color: #678093;
}

.progress-step strong {
  display: block;
  margin-bottom: 2px;
  color: #1d3147;
  font-size: 13px;
}

.progress-step p {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
}

.step-dot {
  width: 14px;
  height: 14px;
  margin-top: 2px;
  border-radius: 999px;
  background: rgba(15, 139, 141, 0.1);
  border: 2px solid rgba(15, 139, 141, 0.16);
}

.progress-step.active .step-dot,
.progress-step.done .step-dot {
  background: #0f8b8d;
  border-color: #0f8b8d;
}

.progress-step.active strong,
.progress-step.done strong {
  color: #0f8b8d;
}

.message-content {
  color: #1d3147;
  line-height: 1.78;
}

.answer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.answer-head strong {
  color: #34526a;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.message-markdown {
  color: #1d3147;
}

.message-markdown :deep(h1),
.message-markdown :deep(h2),
.message-markdown :deep(h3) {
  margin: 0 0 14px;
  color: #173047;
  line-height: 1.3;
}

.message-markdown :deep(h1) {
  font-size: 28px;
}

.message-markdown :deep(h2) {
  font-size: 22px;
}

.message-markdown :deep(h3) {
  font-size: 18px;
}

.message-markdown :deep(p) {
  margin: 0 0 14px;
}

.message-markdown :deep(ol),
.message-markdown :deep(ul) {
  margin: 0 0 14px;
  padding-left: 22px;
}

.message-markdown :deep(li) {
  margin: 0 0 8px;
}

.message-markdown :deep(hr) {
  margin: 16px 0;
  border: none;
  border-top: 1px solid rgba(32, 56, 78, 0.12);
}

.message-markdown :deep(strong) {
  color: #173047;
  font-weight: 700;
}

.message-markdown :deep(em) {
  font-style: italic;
}

.message-markdown :deep(code) {
  padding: 2px 6px;
  border-radius: 8px;
  background: rgba(15, 139, 141, 0.08);
  font-size: 0.95em;
}

.message-markdown :deep(pre) {
  overflow: auto;
  margin: 0 0 14px;
  padding: 14px 16px;
  border-radius: 16px;
  background: #f4f8fb;
}

.message-markdown :deep(pre code) {
  padding: 0;
  background: transparent;
}

.message-markdown :deep(blockquote) {
  margin: 0 0 14px;
  padding-left: 14px;
  border-left: 3px solid rgba(15, 139, 141, 0.28);
  color: #607387;
}

.message-markdown :deep(a) {
  color: #0f8b8d;
}

.message-markdown :deep(*:last-child) {
  margin-bottom: 0;
}

.assistant-answer-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 12px;
  color: #6f8194;
  font-size: 12px;
}

.answer-time {
  color: #7b8c9d;
}

.answer-copy {
  color: #5f7387;
  font-size: 12px;
}

.answer-status {
  padding: 4px 8px;
  font-size: 11px;
}

.source-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.source-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: min(100%, 280px);
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 139, 141, 0.08);
  color: #0f8b8d;
  text-decoration: none;
}

.source-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
}

.source-chip small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #607387;
  font-size: 11px;
}

.artifact-strip {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}

.artifact-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: min(100%, 280px);
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(20, 108, 148, 0.1);
  color: #146c94;
  text-decoration: none;
}

.artifact-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 700;
}

.artifact-chip small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #607387;
  font-size: 11px;
}

.reasoning-block {
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid rgba(32, 56, 78, 0.08);
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(245, 248, 252, 0.92), rgba(234, 241, 248, 0.88));
}

.reasoning-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 4px 2px;
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

.reasoning-toggle-copy {
  display: grid;
  gap: 4px;
}

.reasoning-toggle-copy strong {
  color: #34526a;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.reasoning-toggle-copy small {
  color: #607387;
  font-size: 12px;
  font-weight: 700;
}

.reasoning-toggle-icon {
  color: #607387;
  font-size: 16px;
  line-height: 1;
  transform: rotate(90deg);
  transition: transform 0.2s ease;
}

.reasoning-toggle-icon.open {
  transform: rotate(270deg);
}

.reasoning-content {
  margin-top: 10px;
  color: #546b80;
  line-height: 1.72;
}

.reasoning-content p {
  margin: 0 0 10px;
  white-space: pre-wrap;
}

.reasoning-content p:last-child {
  margin-bottom: 0;
}

.reasoning-loading {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #607387;
  font-weight: 700;
}

.empty-assistant {
  color: #6d8194;
  line-height: 1.7;
}

.loading-card {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  color: #0f8b8d;
  font-weight: 700;
}

.loading-line {
  display: inline-flex;
  gap: 6px;
}

.loading-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #0f8b8d;
  animation: typing-bounce 1s infinite ease-in-out;
}

.loading-dot:nth-child(2) {
  animation-delay: 0.15s;
}

.loading-dot:nth-child(3) {
  animation-delay: 0.3s;
}

.stream-cursor {
  display: inline-block;
  width: 10px;
  height: 1.1em;
  margin-left: 5px;
  vertical-align: text-bottom;
  border-radius: 2px;
  background: #0f8b8d;
  animation: cursor-blink 0.9s infinite;
}

.media-grid {
  display: grid;
  gap: 14px;
  margin-top: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}

.media-grid.video-grid {
  grid-template-columns: 1fr;
}

.media-card {
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(32, 56, 78, 0.08);
  background: #f9fbfd;
  min-width: 0;
}

.media-stage {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(15, 139, 141, 0.08);
  color: #0f8b8d;
  font-size: 12px;
  font-weight: 700;
}

.media-image,
.media-video {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
  background: #dfe8ef;
  cursor: pointer;
}

.image-grid .media-image {
  aspect-ratio: 1 / 1;
  object-fit: cover;
}

.media-meta {
  padding: 14px 16px 16px;
}

.media-meta p {
  margin: 0 0 12px;
  color: #607387;
  line-height: 1.6;
}

.action-link,
.text-action {
  border: none;
  padding: 0;
  background: transparent;
  color: #5f7387;
  font: inherit;
  cursor: pointer;
  text-decoration: none;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.composer {
  padding: 14px 20px 20px;
  border-top: 1px solid rgba(32, 56, 78, 0.08);
  background: rgba(255, 255, 255, 0.9);
}

.attachment-preview {
  display: flex;
  gap: 10px;
  overflow: auto;
  padding-bottom: 10px;
  margin-bottom: 12px;
}

.preview-chip {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 220px;
  padding: 12px 14px;
  border: 1px solid rgba(32, 56, 78, 0.08);
  border-radius: 18px;
  background: #f5f8fb;
}

.preview-thumb-button {
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
}

.preview-thumb {
  display: block;
  width: 64px;
  height: 64px;
  border-radius: 14px;
  object-fit: cover;
  background: #dfe8ef;
  box-shadow: inset 0 0 0 1px rgba(32, 56, 78, 0.08);
}

.preview-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.preview-copy strong {
  color: #1c3147;
  font-size: 13px;
}

.preview-summary {
  color: #6f8194;
  font-size: 12px;
}

.preview-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(15, 139, 141, 0.08);
  color: #0f8b8d;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.preview-status.processing {
  background: rgba(20, 108, 148, 0.08);
  color: #146c94;
}

.mini-loading {
  display: inline-flex;
  gap: 3px;
}

.mini-loading span {
  width: 5px;
  height: 5px;
  border-radius: 999px;
  background: currentColor;
  animation: typing-bounce 1s infinite ease-in-out;
}

.mini-loading span:nth-child(2) {
  animation-delay: 0.15s;
}

.mini-loading span:nth-child(3) {
  animation-delay: 0.3s;
}

.quick-prompts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.quick-prompt-chip {
  border: 1px solid rgba(15, 139, 141, 0.14);
  border-radius: 999px;
  padding: 8px 12px;
  background: rgba(15, 139, 141, 0.08);
  color: #0f8b8d;
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.remove-chip {
  border: none;
  background: transparent;
  color: #7b8c9d;
  font-size: 18px;
  cursor: pointer;
}

.composer-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.tool-menu-wrap {
  position: relative;
}

.role-menu-wrap {
  position: relative;
}

.tool-button,
.model-select,
.send-button {
  border: 1px solid rgba(32, 56, 78, 0.08);
  border-radius: 16px;
  font: inherit;
}

.tool-button {
  padding: 10px 14px;
  background: #f4f8fb;
  color: #244055;
  cursor: pointer;
}

.tool-button.active {
  background: rgba(15, 139, 141, 0.12);
  border-color: rgba(15, 139, 141, 0.18);
  color: #0f8b8d;
}

.feature-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 88px;
  font-weight: 700;
}

.feature-icon {
  display: grid;
  gap: 3px;
  width: 18px;
}

.feature-icon span {
  display: block;
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.feature-icon span:nth-child(1) {
  width: 18px;
}

.feature-icon span:nth-child(2) {
  width: 12px;
}

.feature-icon span:nth-child(3) {
  width: 15px;
}

.tool-menu {
  position: absolute;
  left: 0;
  bottom: calc(100% + 10px);
  z-index: 8;
  display: grid;
  gap: 8px;
  min-width: 220px;
  padding: 10px;
  border: 1px solid rgba(32, 56, 78, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 40px rgba(23, 43, 71, 0.14);
}

.role-menu {
  position: absolute;
  right: 0;
  bottom: calc(100% + 10px);
  z-index: 8;
  display: grid;
  gap: 8px;
  min-width: 250px;
  padding: 10px;
  border: 1px solid rgba(32, 56, 78, 0.08);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 40px rgba(23, 43, 71, 0.14);
}

.tool-menu-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: #f6fafc;
  color: #244055;
  text-align: left;
  cursor: pointer;
}

.tool-menu-item small {
  color: #6f8194;
  font-size: 12px;
}

.tool-menu-item.selected {
  border-color: rgba(15, 139, 141, 0.16);
  background: rgba(15, 139, 141, 0.1);
  color: #0f8b8d;
}

.role-menu-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 11px 12px;
  border: 1px solid transparent;
  border-radius: 14px;
  background: #f6fafc;
  color: #244055;
  text-align: left;
  cursor: pointer;
}

.role-menu-item small {
  color: #6f8194;
  font-size: 12px;
}

.role-menu-item.selected {
  border-color: rgba(15, 139, 141, 0.16);
  background: rgba(15, 139, 141, 0.1);
  color: #0f8b8d;
}

.subrole-item {
  margin-left: 10px;
}

.role-menu-divider {
  height: 1px;
  background: rgba(32, 56, 78, 0.08);
}

.role-button {
  min-width: 112px;
  justify-content: center;
  font-weight: 700;
}

.mobile-role-only {
  display: none;
}

.model-picker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #6f8194;
  font-size: 13px;
  font-weight: 700;
}

.model-select {
  min-width: 260px;
  padding: 10px 12px;
  background: #ffffff;
  color: #1d3147;
}

.clear-action {
  margin-left: auto;
}

.composer-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.composer-hint {
  margin-top: 10px;
  color: #6f8194;
  font-size: 12px;
  text-align: right;
}

.composer-input {
  width: 100%;
  min-height: 122px;
  padding: 16px 18px;
  border: 1px solid rgba(32, 56, 78, 0.08);
  border-radius: 24px;
  background: #ffffff;
  color: #1c3147;
  font: inherit;
  line-height: 1.7;
  resize: vertical;
  outline: none;
}

.composer-input:focus {
  border-color: rgba(15, 139, 141, 0.22);
  box-shadow: 0 0 0 4px rgba(15, 139, 141, 0.08);
}

.send-button {
  min-width: 126px;
  padding: 15px 18px;
  background: linear-gradient(135deg, #0f8b8d, #146c94);
  color: #ffffff;
  cursor: pointer;
  box-shadow: 0 12px 24px rgba(20, 108, 148, 0.18);
}

.send-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@keyframes typing-bounce {
  0%,
  80%,
  100% {
    transform: translateY(0);
    opacity: 0.45;
  }

  40% {
    transform: translateY(-4px);
    opacity: 1;
  }
}

@keyframes cursor-blink {
  0%,
  50% {
    opacity: 1;
  }

  50.1%,
  100% {
    opacity: 0.12;
  }
}

@media (max-width: 960px) {
  .mobile-role-only {
    display: block;
  }

  .composer-main {
    grid-template-columns: 1fr;
  }

  .send-button {
    width: 100%;
  }

  .model-picker {
    width: 100%;
    justify-content: space-between;
  }

  .model-select {
    min-width: 0;
    width: 100%;
  }

  .clear-action {
    margin-left: 0;
  }

  .composer-hint {
    text-align: left;
  }
}

@media (max-width: 720px) {
  .message-scroll,
  .composer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .message-row {
    grid-template-columns: 38px minmax(0, 1fr);
  }

  .avatar {
    width: 38px;
    height: 38px;
    border-radius: 14px;
  }

  .composer-tools {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    align-items: stretch;
  }

  .tool-menu-wrap,
  .role-menu-wrap,
  .model-picker,
  .clear-action {
    width: 100%;
  }

  .tool-button,
  .role-button,
  .clear-action {
    width: 100%;
    justify-content: center;
  }

  .model-picker {
    display: grid;
    gap: 8px;
  }

  .model-picker span {
    font-size: 12px;
  }

  .tool-menu {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 18px;
    top: auto;
    width: auto;
    min-width: 0;
    max-height: min(58vh, 460px);
    overflow: auto;
    border-radius: 22px;
    padding: 12px;
    z-index: 40;
    box-shadow: 0 24px 48px rgba(23, 43, 71, 0.22);
  }

  .role-menu {
    position: fixed;
    left: 16px;
    right: 16px;
    bottom: 18px;
    top: auto;
    width: auto;
    min-width: 0;
    max-height: min(58vh, 460px);
    overflow: auto;
    border-radius: 22px;
    padding: 12px;
    z-index: 40;
    box-shadow: 0 24px 48px rgba(23, 43, 71, 0.22);
  }

  .tool-menu-item,
  .role-menu-item {
    padding: 13px 14px;
  }

  .subrole-item {
    margin-left: 0;
  }
}
</style>
