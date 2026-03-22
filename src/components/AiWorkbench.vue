<template>
  <div class="ai-shell">
    <div class="shell-toolbar">
      <div class="toolbar-group mobile-only">
        <button
          type="button"
          class="toolbar-button"
          :class="{ active: mobilePanel === 'chat' }"
          @click="mobilePanel = 'chat'"
        >
          {{ ui.chat }}
        </button>
        <button
          type="button"
          class="toolbar-button"
          :class="{ active: mobilePanel === 'settings' }"
          @click="mobilePanel = 'settings'"
        >
          {{ ui.settings }}
        </button>
      </div>

      <button type="button" class="locale-switch" @click="toggleLocale">
        {{ locale === 'zh' ? 'EN' : '中文' }}
      </button>
    </div>

    <div class="workspace-grid">
      <div class="surface-panel" :class="{ active: mobilePanel === 'chat' }">
        <RunSurfacePanel
          :entries="feedEntries"
          :chat-input="chatInput"
          :busy="agentStore.loading || generationState.loading"
          :attachments-processing="hasPendingMaterials"
          :live-status="liveStatus"
          :models="agentStore.models"
          :current-model="agentStore.currentModel"
          :web-search-enabled="agentConfig.official.enableWebSearch"
          :attachments="attachmentsForUi"
          :capability="activeCapability"
          :capability-options="capabilityOptions"
          :assistant-mode="agentConfig.assistantMode"
          :assistant-mode-options="assistantModeOptions"
          :analysis-role="agentConfig.professionalRole"
          :analysis-role-options="professionalRoleOptions"
          :role-label="currentAssistantRoleLabel"
          :ui="chatUi"
          @update:chatInput="chatInput = $event"
          @update:currentModel="handleModelChange"
          @update:capability="handleCapabilityChange"
          @update:assistantMode="handleAssistantModeChange"
          @update:analysisRole="handleProfessionalRoleChange"
          @toggle-web-search="agentConfig.official.enableWebSearch = !agentConfig.official.enableWebSearch"
          @open-upload="openMaterialDialog"
          @remove-attachment="removeAttachment"
          @send="handleSubmit"
          @clear="resetConversation"
        />
      </div>

      <aside class="inspector-panel" :class="{ active: mobilePanel === 'settings' }">
        <section class="hero-card">
          <div class="hero-copy">
            <span class="hero-label">{{ ui.workspaceLabel }}</span>
            <h2>{{ ui.workspaceTitle }}</h2>
            <p>{{ ui.workspaceDescription }}</p>
          </div>

          <div class="hero-badges">
            <span class="hero-pill">{{ currentModelMeta?.name || 'Doubao' }}</span>
            <span class="hero-pill">{{ currentAssistantRoleLabel }}</span>
            <span class="hero-pill">{{ capabilityLabel }}</span>
          </div>
        </section>

        <section class="inspector-card">
          <div class="card-head">
            <span class="card-title">{{ ui.agentSettings }}</span>
            <span class="card-badge">{{ currentModelMeta?.provider || 'Volcengine Ark' }}</span>
          </div>

          <div class="assistant-mode-grid">
            <button
              v-for="option in assistantModeOptions"
              :key="option.value"
              type="button"
              class="mode-card"
              :class="{ active: option.value === agentConfig.assistantMode }"
              @click="handleAssistantModeChange(option.value)"
            >
              <strong>{{ option.label }}</strong>
              <span>{{ option.note }}</span>
            </button>
          </div>

          <div v-if="isProfessionalMode" class="analysis-role-grid">
            <button
              v-for="role in professionalRoleOptions"
              :key="role.value"
              type="button"
              class="role-card"
              :class="{ active: role.value === agentConfig.professionalRole }"
              @click="handleProfessionalRoleChange(role.value)"
            >
              <strong>{{ role.label }}</strong>
              <span>{{ role.note }}</span>
            </button>
          </div>

          <div class="compact-grid">
            <label class="field">
              <span>{{ ui.communicationStyle }}</span>
              <select v-model="agentConfig.communicationStyle" class="control">
                <option v-for="option in communicationStyleOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label class="field">
              <span>{{ ui.currentRoute }}</span>
              <input class="control" :value="routeLabel" readonly />
            </label>
          </div>

          <div v-if="isProfessionalMode" class="focus-panel">
            <span>{{ ui.focusAreas }}</span>
            <div class="focus-chips">
              <span v-for="item in currentProfessionalRoleMeta.focus" :key="item" class="focus-chip">{{ item }}</span>
            </div>
          </div>

          <div v-else class="support-text quick-note">
            {{ ui.quickAssistantHint }}
          </div>

          <template v-if="isProfessionalMode">
            <label class="field">
              <span>{{ ui.objective }}</span>
              <input
                v-model="agentConfig.customObjective"
                class="control"
                :placeholder="ui.objectivePlaceholder"
              />
            </label>

            <label class="field">
              <span>{{ ui.memory }}</span>
              <textarea
                v-model="agentConfig.memory"
                class="control textarea"
                rows="4"
                :placeholder="ui.memoryPlaceholder"
              ></textarea>
            </label>
          </template>
        </section>

        <section class="inspector-card">
          <div class="card-head">
            <span class="card-title">{{ ui.intake }}</span>
            <button type="button" class="ghost-button" @click="fillSample">{{ ui.sample }}</button>
          </div>

          <p class="support-text">{{ ui.sessionOnly }}</p>

          <div class="intake-actions">
            <DataImport :lang="locale" @import="handleEnterpriseImport" />
          </div>

          <label class="field">
            <span>{{ ui.enterpriseName }}</span>
            <input v-model="enterprise.name" class="control" />
          </label>

          <label class="field">
            <span>{{ ui.industry }}</span>
            <input v-model="enterprise.industry" class="control" />
          </label>

          <label class="field">
            <span>{{ ui.founded }}</span>
            <input v-model="enterprise.founded" class="control" />
          </label>

          <div class="compact-grid">
            <label class="field">
              <span>{{ ui.techScore }}</span>
              <input
                :value="enterprise.scores.tech"
                type="number"
                min="0"
                max="100"
                class="control"
                @input="updateScore('tech', $event.target.value)"
              />
            </label>

            <label class="field">
              <span>{{ ui.teamScore }}</span>
              <input
                :value="enterprise.scores.team"
                type="number"
                min="0"
                max="100"
                class="control"
                @input="updateScore('team', $event.target.value)"
              />
            </label>

            <label class="field">
              <span>{{ ui.financeScore }}</span>
              <input
                :value="enterprise.scores.finance"
                type="number"
                min="0"
                max="100"
                class="control"
                @input="updateScore('finance', $event.target.value)"
              />
            </label>

            <label class="field">
              <span>{{ ui.marketScore }}</span>
              <input
                :value="enterprise.scores.market"
                type="number"
                min="0"
                max="100"
                class="control"
                @input="updateScore('market', $event.target.value)"
              />
            </label>
          </div>

          <div class="info-strip">
            <span>{{ ui.totalScore }}</span>
            <strong>{{ enterprise.scores.total }}</strong>
          </div>

          <div class="info-strip">
            <span>{{ ui.attachments }}</span>
            <strong>{{ analysisMaterialLibrary.length }}</strong>
          </div>

          <div class="dossier-panel">
            <div class="dossier-head">
              <span>{{ ui.dossierTitle }}</span>
              <strong>{{ dossierStatusLabel }}</strong>
            </div>

            <template v-if="dossier">
              <div class="dossier-block">
                <span>{{ ui.dossierOverview }}</span>
                <p>{{ dossier.overview }}</p>
              </div>

              <div class="dossier-block">
                <span>{{ ui.dossierScores }}</span>
                <div class="dossier-score-grid">
                  <article class="dossier-score-card">
                    <strong>{{ dossier.dimensionScores?.tech ?? enterprise.scores.tech }}</strong>
                    <small>{{ ui.techScore }}</small>
                  </article>
                  <article class="dossier-score-card">
                    <strong>{{ dossier.dimensionScores?.team ?? enterprise.scores.team }}</strong>
                    <small>{{ ui.teamScore }}</small>
                  </article>
                  <article class="dossier-score-card">
                    <strong>{{ dossier.dimensionScores?.finance ?? enterprise.scores.finance }}</strong>
                    <small>{{ ui.financeScore }}</small>
                  </article>
                  <article class="dossier-score-card">
                    <strong>{{ dossier.dimensionScores?.market ?? enterprise.scores.market }}</strong>
                    <small>{{ ui.marketScore }}</small>
                  </article>
                  <article class="dossier-score-card total">
                    <strong>{{ dossier.dimensionScores?.total ?? enterprise.scores.total }}</strong>
                    <small>{{ ui.totalScore }}</small>
                  </article>
                </div>
              </div>
            </template>

            <p v-else class="support-text dossier-empty">{{ ui.dossierEmpty }}</p>
          </div>

          <input
            ref="materialInput"
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.json,image/*"
            hidden
            @change="handleFileSelection"
          />
        </section>
      </aside>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import DataImport from './DataImport.vue'
import RunSurfacePanel from './RunSurfacePanel.vue'
import {
  createArkVideoGenerationTask,
  isOfficialArkConfigured,
  requestArkImageGeneration,
  uploadOfficialArkFile
} from '../lib/arkOfficial.js'
import { getArkClientConfig } from '../lib/arkConfig.js'
import { getQuickAssistantPrompt } from '../prompts/modes/index.js'
import { DEFAULT_PROFESSIONAL_ROLE, getProfessionalRoleOptions } from '../prompts/roles/index.js'
import { useAgentStore } from '../stores/agent.js'
import { useEnterpriseDossierStore } from '../stores/enterpriseDossier.js'
import { useEnterpriseStore } from '../stores/enterprise.js'

const env = import.meta.env
const arkConfig = getArkClientConfig(env)
const locale = ref('zh')
const mobilePanel = ref('chat')
const activeCapability = ref('chat')

const agentStore = useAgentStore()
const dossierStore = useEnterpriseDossierStore()
const enterpriseStore = useEnterpriseStore()

const materialInput = ref(null)
const chatInput = ref('')
const materialLibrary = ref([])
const analysisMaterialLibrary = ref([])
const customEntries = ref([])

const OFFICIAL_FILE_EXTENSIONS = new Set(['pdf'])
const INLINE_TEXT_EXTENSIONS = new Set(['txt', 'md', 'csv', 'json'])

const liveStatus = reactive({
  stage: 'idle',
  message: '待命',
  route: 'chat/completions',
  attachedFileCount: 0
})

const generationState = reactive({
  loading: false
})

const agentConfig = reactive({
  assistantMode: 'quick',
  professionalRole: DEFAULT_PROFESSIONAL_ROLE,
  communicationStyle: 'balanced',
  customObjective: '',
  memory: '',
  official: {
    enabled: arkConfig.enabled,
    apiKey: arkConfig.apiKey,
    baseUrl: arkConfig.baseUrl,
    defaultChatModel: arkConfig.defaultChatModel,
    visionModel: arkConfig.visionModel,
    videoModel: arkConfig.videoModel,
    videoImageUrl: arkConfig.videoImageUrl,
    enableStream: true,
    enableWebSearch: false,
    useResponsesApi: false,
    filePurpose: arkConfig.filePurpose
  }
})

const ui = computed(() => (
  locale.value === 'en'
    ? {
        chat: 'Chat',
        settings: 'Settings',
        workspaceLabel: 'AI Workbench',
        workspaceTitle: 'Credit Agent Control Surface',
        workspaceDescription: 'Handle chat, image understanding, image generation and video generation in one place.',
        agentSettings: 'Assistant Settings',
        assistantMode: 'Assistant Mode',
        communicationStyle: 'Style',
        currentRoute: 'Route',
        objective: 'Objective',
        objectivePlaceholder: 'Optional: refine the analyst’s task focus.',
        memory: 'Memory',
        memoryPlaceholder: 'Optional: keep stable preferences for this analysis session.',
        focusAreas: 'Focus Areas',
        quickAssistantHint: 'Quick Assistant keeps chat natural and does not auto-inject enterprise profile or material summaries.',
        intake: 'Instant Intake',
        uploadAnalysis: 'Upload analysis files',
        submitAnalysis: 'Run analysis',
        analysisPreparing: 'Preparing files',
        sample: 'Sample',
        sessionOnly: 'All inputs stay in the current browser session only.',
        enterpriseName: 'Enterprise',
        industry: 'Industry',
        founded: 'Founded',
        techScore: 'Tech',
        teamScore: 'Team',
        financeScore: 'Finance',
        marketScore: 'Market',
        totalScore: 'Total score',
        attachments: 'Attachments',
        dossierTitle: 'Enterprise Dossier',
        dossierOverview: 'Overview',
        dossierScores: 'AI Dimension Scores',
        dossierReady: 'Ready',
        dossierBuilding: 'Refreshing',
        dossierEmpty: 'The dossier will appear here after enterprise data or materials are prepared.'
      }
    : {
        chat: '对话',
        settings: '设置',
        workspaceLabel: 'AI 工作台',
        workspaceTitle: '信贷智能体控制台',
        workspaceDescription: '把对话、图片理解、图片生成、视频生成放进同一块工作界面里。',
        agentSettings: '助手设置',
        assistantMode: '助手模式',
        communicationStyle: '表达风格',
        currentRoute: '当前链路',
        objective: '补充要求',
        objectivePlaceholder: '例如：更关注担保结构、定价区间和审批条件。',
        memory: '会话记忆',
        memoryPlaceholder: '例如：保持会审纪要口吻，优先给出审批要点。',
        focusAreas: '当前聚焦',
        quickAssistantHint: '快捷助手不预设角色提示词，也不自动带入企业画像和资料摘要，更适合自然问答。',
        intake: '即时录入',
        uploadAnalysis: '上传分析文件',
        submitAnalysis: '提交分析',
        analysisPreparing: '文件准备中',
        sample: '填入示例',
        sessionOnly: '所有录入和上传只在当前浏览器会话中使用，不做持久化留存。',
        enterpriseName: '企业名称',
        industry: '行业',
        founded: '成立年份',
        techScore: '技术',
        teamScore: '团队',
        financeScore: '财务',
        marketScore: '市场',
        totalScore: '综合评分',
        attachments: '附件数量',
        dossierTitle: '企业 Dossier',
        dossierOverview: '统一摘要',
        dossierScores: 'AI 维度分',
        dossierReady: '已就绪',
        dossierBuilding: '刷新中',
        dossierEmpty: '当企业录入或附件准备完成后，这里会生成统一中间分析结果。'
      }
))

const chatUi = computed(() => (
  locale.value === 'en'
    ? {
        emptyTitle: 'Start a new run',
        emptyState: 'Type a question, upload files for visual understanding, or switch to image/video generation.',
        inputPlaceholder: 'Ask a question, assign a task, or describe the enterprise situation...',
        imagePlaceholder: 'Describe the image you want, for example: a polished sci-tech credit report cover visual.',
        videoPlaceholder: 'Describe the video you want, for example: a 5-second futuristic financing promo shot.',
        clear: 'Clear',
        copy: 'Copy',
        copied: 'Copied',
        copyLink: 'Copy link',
        open: 'Open',
        upload: 'Upload file',
        webSearch: 'Web search',
        model: 'Model',
        send: 'Send',
        sending: 'Working',
        generateImage: 'Generate image',
        generateVideo: 'Generate video',
        generatedResult: 'Generated result',
        fileWorking: 'Preparing files',
        fileHint: 'Files are still being prepared. You can send once they are ready.',
        reasoningLabel: 'Reasoning',
        answerLabel: 'Answer',
        reasoningWorking: 'Thinking',
        reasoningDone: 'Thought finished',
        sendHint: 'Ctrl/Cmd + Enter to send',
        typeLabels: {
          user_message: 'You',
          assistant_message: 'Assistant'
        },
        progressSteps: {
          thinking: 'Thinking',
          reasoning: 'Reasoning',
          searching: 'Searching the web',
          routing: 'Preparing context',
          requesting: 'Connecting model',
          streaming: 'Ready to answer',
          composing: 'Streaming response',
          completed: 'Completed',
          fallback: 'Fallback',
          error: 'Failed'
        }
      }
    : {
        emptyTitle: '开始一轮新的协作',
        emptyState: '直接提问、上传文件做图片理解，或者切换到图片/视频生成。',
        inputPlaceholder: '输入问题、任务，或直接描述企业情况...',
        imagePlaceholder: '描述你想生成的图片，例如：一张科技金融风格的企业封面图。',
        videoPlaceholder: '描述你想生成的视频，例如：一段 5 秒的企业宣传镜头。',
        clear: '清空',
        copy: '复制',
        copied: '已复制',
        copyLink: '复制链接',
        open: '打开',
        upload: '上传文件',
        webSearch: '联网搜索',
        model: '模型',
        send: '发送',
        sending: '处理中',
        generateImage: '生成图片',
        generateVideo: '生成视频',
        generatedResult: '生成结果',
        fileWorking: '文件处理中',
        fileHint: '附件还在处理中，完成后即可发送',
        reasoningLabel: '思考过程',
        answerLabel: '最终答复',
        reasoningWorking: '思考中',
        reasoningDone: '思考结束',
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
))

const assistantModeOptions = computed(() => (
  locale.value === 'en'
    ? [
        {
          value: 'quick',
          label: 'Quick Assistant',
          note: 'Natural Q&A without preset role or enterprise context.'
        },
        {
          value: 'analysis',
          label: 'Professional Analysis',
          note: 'Structured banking roles for customer, product and risk work.'
        }
      ]
    : [
        {
          value: 'quick',
          label: '快捷助手',
          note: '不预设角色和企业上下文，适合自然问答。'
        },
        {
          value: 'analysis',
          label: '专业分析',
          note: '切换银行专业角色，做客户、产品和风控分析。'
        }
      ]
))

const professionalRoleOptions = computed(() => getProfessionalRoleOptions(locale.value))

const communicationStyleOptions = computed(() => (
  locale.value === 'en'
    ? [
        { value: 'balanced', label: 'Balanced', promptLabel: 'balanced and collaborative' },
        { value: 'direct', label: 'Direct', promptLabel: 'direct and decisive' },
        { value: 'careful', label: 'Prudent', promptLabel: 'prudent and rigorous' }
      ]
    : [
        { value: 'balanced', label: '平衡协作', promptLabel: '平衡、协作' },
        { value: 'direct', label: '直接清晰', promptLabel: '直接、清晰' },
        { value: 'careful', label: '审慎严谨', promptLabel: '审慎、严谨' }
      ]
))

const personaOptions = computed(() => (
  locale.value === 'en'
    ? [
        { value: 'Prudent Banker', label: 'Prudent Banker' },
        { value: 'Industry Researcher', label: 'Industry Researcher' },
        { value: 'Risk Director', label: 'Risk Director' },
        { value: 'Committee Writer', label: 'Committee Writer' }
      ]
    : [
        { value: '审慎银行家', label: '审慎银行家' },
        { value: '产业研究员', label: '产业研究员' },
        { value: '风控总监', label: '风控总监' },
        { value: '会审撰写者', label: '会审撰写者' }
      ]
))

const modeOptions = computed(() => (
  locale.value === 'en'
    ? [
        { value: 'credit', label: 'Credit Review' },
        { value: 'due_diligence', label: 'Due Diligence' },
        { value: 'risk', label: 'Risk Diagnosis' },
        { value: 'memo', label: 'Committee Memo' },
        { value: 'post_loan', label: 'Post-loan' }
      ]
    : [
        { value: 'credit', label: '授信审查' },
        { value: 'due_diligence', label: '尽调补件' },
        { value: 'risk', label: '风险诊断' },
        { value: 'memo', label: '会审纪要' },
        { value: 'post_loan', label: '贷后跟踪' }
      ]
))

const outputOptions = computed(() => (
  locale.value === 'en'
    ? [
        { value: 'executive', label: 'Conclusion First' },
        { value: 'checklist', label: 'Checklist' },
        { value: 'memo', label: 'Memo' },
        { value: 'json', label: 'Structured JSON' }
      ]
    : [
        { value: 'executive', label: '结论优先' },
        { value: 'checklist', label: '行动清单' },
        { value: 'memo', label: '会审纪要' },
        { value: 'json', label: '结构化 JSON' }
      ]
))

const capabilityOptions = computed(() => (
  locale.value === 'en'
    ? [
        { value: 'chat', label: 'Chat', note: 'Text + image understanding' },
        { value: 'image', label: 'Image Gen', note: 'Seedream official route' },
        { value: 'video', label: 'Video Gen', note: 'Seedance official route' }
      ]
    : [
        { value: 'chat', label: '对话', note: '文本 + 图片理解' },
        { value: 'image', label: '图片生成', note: 'Seedream 官方链路' },
        { value: 'video', label: '视频生成', note: 'Seedance 官方链路' }
      ]
))

const enterprise = computed(() => enterpriseStore.current)
const currentModelMeta = computed(() => agentStore.models.find((item) => item.id === agentStore.currentModel))
const isProfessionalMode = computed(() => agentConfig.assistantMode === 'analysis')
const currentAssistantModeMeta = computed(() => assistantModeOptions.value.find((item) => item.value === agentConfig.assistantMode) || assistantModeOptions.value[0])
const currentProfessionalRoleMeta = computed(() => professionalRoleOptions.value.find((item) => item.value === agentConfig.professionalRole) || professionalRoleOptions.value[0])
const currentCommunicationStyleMeta = computed(() => communicationStyleOptions.value.find((item) => item.value === agentConfig.communicationStyle) || communicationStyleOptions.value[0])
const currentQuickAssistantPrompt = computed(() => getQuickAssistantPrompt(locale.value))
const currentAssistantRoleLabel = computed(() => (
  isProfessionalMode.value
    ? currentProfessionalRoleMeta.value?.label || currentAssistantModeMeta.value?.label || ''
    : currentAssistantModeMeta.value?.label || ''
))
const routeLabel = computed(() => {
  if (activeCapability.value === 'image') return 'images/generations'
  if (activeCapability.value === 'video') return 'contents/generations/tasks'
  return liveStatus.route || 'chat/completions'
})
const capabilityLabel = computed(() => capabilityOptions.value.find((item) => item.value === activeCapability.value)?.label || '')
const dossier = computed(() => dossierStore.dossier)
const dossierStatusLabel = computed(() => {
  if (dossierStore.status === 'building') return ui.value.dossierBuilding
  if (dossierStore.status === 'ready') return ui.value.dossierReady
  return ''
})

const attachmentsForUi = computed(() => materialLibrary.value.map((item) => ({
  id: item.id,
  name: item.name,
  summary: item.summary,
  statusLabel: item.statusLabel || '',
  processing: Boolean(item.processing),
  officialStatus: item.officialStatus || '',
  kind: item.kind,
  previewUrl: item.dataUrl || item.previewUrl || ''
})))

const hasPendingMaterials = computed(() => materialLibrary.value.some((item) => item.processing))
const analysisMaterialsForUi = computed(() => analysisMaterialLibrary.value.map((item) => ({
  id: item.id,
  name: item.name,
  summary: item.summary,
  statusLabel: item.statusLabel || '',
  processing: Boolean(item.processing)
})))
const hasPendingAnalysisMaterials = computed(() => analysisMaterialLibrary.value.some((item) => item.processing))

const feedEntries = computed(() => {
  const messageEntries = agentStore.messages.map((message) => ({
    id: message.id,
    kind: message.role === 'user' ? 'user_message' : 'assistant_message',
    reasoning: message.reasoning || '',
    body: message.content,
    artifacts: message.artifacts || [],
    sources: message.sources || [],
    media: message.media || [],
    attachments: message.attachments || [],
    tag: message.tag || '',
    createdAt: message.createdAt
  }))

  return [...messageEntries, ...customEntries.value].sort((a, b) => a.createdAt - b.createdAt)
})

function toggleLocale() {
  locale.value = locale.value === 'zh' ? 'en' : 'zh'
}

function createDefaultEnterprise() {
  return {
    id: 'E001',
    name: locale.value === 'en' ? 'DeepVision Technologies' : '深鉴智造科技有限公司',
    industry: locale.value === 'en' ? 'Advanced Manufacturing / Industrial Vision' : '高端装备 / 工业视觉',
    founded: '2019',
    scores: {
      tech: 88,
      team: 84,
      finance: 76,
      market: 91,
      total: 84.8
    },
    risks: [],
    products: []
  }
}

if (!enterpriseStore.current) {
  enterpriseStore.setMock(createDefaultEnterprise())
}

function calculateTotal(scores) {
  const values = ['tech', 'team', 'finance', 'market'].map((key) => Number(scores[key] ?? 0))
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
}

function updateScore(key, value) {
  enterprise.value.scores[key] = Number(value || 0)
  enterprise.value.scores.total = calculateTotal(enterprise.value.scores)
}

function fillSample() {
  enterpriseStore.setMock(createDefaultEnterprise())
}

function handleEnterpriseImport(payload) {
  const nextEnterprise = payload?.enterprise || payload
  const nextFiles = Array.isArray(payload?.analysisFiles) ? payload.analysisFiles : []

  enterpriseStore.setMock(nextEnterprise)
  analysisMaterialLibrary.value.forEach((item) => {
    if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
  })
  analysisMaterialLibrary.value = []

  if (nextFiles.length) {
    ingestSelectedFiles(nextFiles, analysisMaterialLibrary, { scope: 'dossier' }).then(() => {
      runDossierAnalysis()
    })
  }
}

function createCustomEntry(kind, payload = {}) {
  return {
    id: `${kind}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    kind,
    reasoning: payload.reasoning || '',
    body: payload.body || '',
    artifacts: payload.artifacts || [],
    sources: payload.sources || [],
    media: payload.media || [],
    attachments: payload.attachments || [],
    progress: payload.progress || null,
    tag: payload.tag || '',
    createdAt: Date.now()
  }
}

function createProgressState(title, steps = []) {
  return {
    title,
    statusText: '进行中',
    percent: 8,
    steps: steps.map((step, index) => ({
      ...step,
      state: index === 0 ? 'active' : 'pending'
    }))
  }
}

function setProgressStep(progress, currentId, percent, statusText) {
  if (!progress) return
  progress.percent = percent
  progress.statusText = statusText
  progress.steps = progress.steps.map((step) => {
    if (step.id === currentId) return { ...step, state: 'active' }
    const currentIndex = progress.steps.findIndex((item) => item.id === currentId)
    const stepIndex = progress.steps.findIndex((item) => item.id === step.id)
    return {
      ...step,
      state: stepIndex < currentIndex ? 'done' : step.state === 'done' ? 'done' : 'pending'
    }
  })
}

function completeProgress(progress, statusText = '已完成') {
  if (!progress) return
  progress.percent = 100
  progress.statusText = statusText
  progress.steps = progress.steps.map((step) => ({ ...step, state: 'done' }))
}

function applyVideoProgress(progress, signal) {
  if (!progress) return

  const percent =
    typeof signal?.percent === 'number'
      ? signal.percent
      : signal === 'submitted'
        ? 28
        : signal === 'running'
          ? 68
          : signal === 'succeeded'
            ? 92
            : progress.percent

  const status =
    typeof signal === 'object'
      ? signal.status
      : signal

  if (status === 'delivering') {
    setProgressStep(progress, 'deliver', percent, '杩斿洖缁撴灉')
    return
  }

  if (status === 'submitted') {
    setProgressStep(progress, 'queue', percent, '等待处理')
  } else if (status === 'running') {
    setProgressStep(progress, 'render', percent, '生成视频')
  } else if (status === 'succeeded') {
    setProgressStep(progress, 'deliver', percent, '返回结果')
  }
}

function handleAgentStatus(status = {}) {
  liveStatus.stage = status.stage || 'idle'
  liveStatus.message = status.message || '待命'
  liveStatus.route = status.route || 'chat/completions'
  liveStatus.attachedFileCount = status.attachedFileCount ?? materialLibrary.value.length
}

function handleAssistantModeChange(nextMode) {
  if (agentConfig.assistantMode === nextMode) return
  agentConfig.assistantMode = nextMode
  resetConversation()
}

function handleProfessionalRoleChange(roleId) {
  if (agentConfig.professionalRole === roleId) return
  agentConfig.professionalRole = roleId
  if (isProfessionalMode.value) {
    resetConversation()
  }
}

function handleCapabilityChange(nextCapability) {
  activeCapability.value = nextCapability

  const nextModel = agentStore.models.find((model) => {
    if (nextCapability === 'image') return model.category === 'image'
    if (nextCapability === 'video') return model.category === 'video'
    return model.category === 'text' || model.category === 'vision'
  })

  if (nextModel) {
    agentStore.currentModel = nextModel.id
  }

  agentConfig.official.enableWebSearch = false
}

function handleModelChange(modelId) {
  agentStore.currentModel = modelId
}

function classifyMaterial(file) {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf')) return 'pdf'
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'sheet'
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')) return 'image'
  if (name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt') || name.endsWith('.md')) return 'doc'
  return 'generic'
}

function getFileExtension(name = '') {
  const parts = String(name).toLowerCase().split('.')
  return parts.length > 1 ? parts.pop() : ''
}

function supportsOfficialFileInput(file) {
  return OFFICIAL_FILE_EXTENSIONS.has(getFileExtension(file.name))
}

function supportsInlineTextInput(file) {
  return INLINE_TEXT_EXTENSIONS.has(getFileExtension(file.name))
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(reader.error || new Error('read file failed'))
    reader.readAsDataURL(file)
  })
}

async function extractInlineTextMaterial(file) {
  const raw = await file.text()
  const normalized = String(raw || '')
    .replace(/\u0000/g, '')
    .replace(/\r\n/g, '\n')
    .trim()

  if (!normalized) return ''

  return normalized.slice(0, 12000)
}

function createMaterialSummary(kind) {
  if (locale.value === 'en') {
    if (kind === 'sheet') return 'Spreadsheet ready for financial inspection.'
    if (kind === 'image') return 'Image ready for visual understanding.'
    if (kind === 'doc') return 'Document ready for extraction.'
    if (kind === 'pdf') return 'PDF ready for reference.'
    return 'File ready in this session.'
  }

  if (kind === 'sheet') return '表格已就绪，可用于财务检查。'
  if (kind === 'image') return '图片已就绪，可用于视觉理解。'
  if (kind === 'doc') return '文档已就绪，可用于摘要抽取。'
  if (kind === 'pdf') return 'PDF 已就绪，可作为参考资料。'
  return '文件已进入当前会话。'
}

function buildAttachmentOnlyPrompt(materials = []) {
  const hasImage = materials.some((item) => item.kind === 'image')
  const hasFile = materials.some((item) => item.kind !== 'image')

  if (locale.value === 'en') {
    if (hasImage && hasFile) return 'Please analyze the uploaded images and files, then summarize the key information.'
    if (hasImage) return 'Please analyze the uploaded image and tell me the key information.'
    return 'Please read the uploaded files and summarize the key points.'
  }

  if (hasImage && hasFile) return '请结合我上传的图片和文件，提取关键信息并给出简明总结。'
  if (hasImage) return '请分析我上传的图片，并告诉我其中的关键信息。'
  return '请阅读我上传的文件，并提炼其中的关键要点。'
}

function buildMaterialProgressCopy(stage) {
  if (locale.value === 'en') {
    if (stage === 'queued') {
      return {
        statusLabel: 'Queued',
        summary: 'Added to the session and waiting to be processed.'
      }
    }
    if (stage === 'reading') {
      return {
        statusLabel: 'Reading',
        summary: 'Reading local file content for this session.'
      }
    }
    if (stage === 'parsing') {
      return {
        statusLabel: 'Parsing',
        summary: 'Extracting text so the file can join the chat context.'
      }
    }
    if (stage === 'uploading') {
      return {
        statusLabel: 'Uploading',
        summary: 'Uploading to Ark File API for file-grounded conversation.'
      }
    }
    if (stage === 'ready') {
      return {
        statusLabel: 'Ready',
        summary: 'File is ready to be used in the conversation.'
      }
    }
    if (stage === 'warning') {
      return {
        statusLabel: 'Limited',
        summary: 'Only part of this file can be used right now. Prefer PDF, TXT, MD, CSV or JSON.'
      }
    }
    return {
      statusLabel: 'Failed',
      summary: 'This file could not be prepared for chat yet.'
    }
  }

  if (stage === 'queued') {
    return {
      statusLabel: '排队中',
      summary: '文件已加入当前会话，正在等待处理。'
    }
  }
  if (stage === 'reading') {
    return {
      statusLabel: '读取中',
      summary: '正在读取本地文件内容。'
    }
  }
  if (stage === 'parsing') {
    return {
      statusLabel: '解析中',
      summary: '正在提取文本，准备加入对话上下文。'
    }
  }
  if (stage === 'uploading') {
    return {
      statusLabel: '上传中',
      summary: '正在上传到 Ark File API，准备参与文件对话。'
    }
  }
  if (stage === 'ready') {
    return {
      statusLabel: '已就绪',
      summary: '文件已准备完成，可直接参与对话。'
    }
  }
  if (stage === 'warning') {
    return {
      statusLabel: '能力受限',
      summary: '当前仅能部分使用该文件，建议优先上传 PDF、TXT、MD、CSV 或 JSON。'
    }
  }
  return {
    statusLabel: '处理失败',
    summary: '当前无法完成该文件处理，请稍后重试。'
  }
}

function createMaterialItem(file) {
  const isImage = file.type.startsWith('image/')
  const kind = classifyMaterial(file)
  const initialCopy = buildMaterialProgressCopy(isImage ? 'reading' : 'queued')

  return {
    id: `material-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    name: file.name,
    kind,
    summary: initialCopy.summary,
    statusLabel: initialCopy.statusLabel,
    processing: true,
    officialFileId: '',
    officialStatus: '',
    inlineText: '',
    file,
    previewUrl: isImage ? URL.createObjectURL(file) : '',
    dataUrl: ''
  }
}

function updateMaterialItem(collectionRef, id, patch = {}) {
  collectionRef.value = collectionRef.value.map((item) => (
    item.id === id
      ? { ...item, ...patch }
      : item
  ))
}

function openMaterialDialog() {
  materialInput.value?.click()
}

async function processMaterialItem(item) {
  const isImage = item.kind === 'image'
  const collectionRef = item.scope === 'dossier' ? analysisMaterialLibrary : materialLibrary

  if (isImage) {
    updateMaterialItem(collectionRef, item.id, buildMaterialProgressCopy('reading'))
    try {
      const dataUrl = await readFileAsDataUrl(item.file)
      updateMaterialItem(collectionRef, item.id, {
        dataUrl,
        processing: false,
        officialStatus: 'image',
        ...buildMaterialProgressCopy('ready'),
        summary: locale.value === 'en'
          ? 'Image prepared and ready for visual understanding.'
          : '图片已准备完成，可直接参与视觉理解。'
      })
      return
    } catch {
      updateMaterialItem(collectionRef, item.id, {
        processing: false,
        officialStatus: 'failed',
        ...buildMaterialProgressCopy('failed')
      })
      return
    }
  }

  let inlineText = ''

  if (supportsInlineTextInput(item.file)) {
    updateMaterialItem(collectionRef, item.id, buildMaterialProgressCopy('parsing'))
    try {
      inlineText = await extractInlineTextMaterial(item.file)
      if (inlineText) {
        updateMaterialItem(collectionRef, item.id, {
          inlineText,
          officialStatus: 'inline',
          processing: false,
          ...buildMaterialProgressCopy('ready'),
          summary: locale.value === 'en'
            ? 'Text extracted and ready for chat context.'
            : '文本内容已提取，可直接参与对话理解。'
        })
        return
      }
    } catch {
      inlineText = ''
    }
  }

  if (supportsOfficialFileInput(item.file) && isOfficialArkConfigured(runtimeProfile.value)) {
    updateMaterialItem(collectionRef, item.id, buildMaterialProgressCopy('uploading'))
    try {
      const result = await uploadOfficialArkFile(item.file, runtimeProfile.value)
      const officialFileId = result.id || result.file_id || ''
      if (officialFileId) {
        updateMaterialItem(collectionRef, item.id, {
          officialFileId,
          officialStatus: 'uploaded',
          processing: false,
          ...buildMaterialProgressCopy('ready'),
          summary: locale.value === 'en'
            ? 'Uploaded to Ark File API and ready for file-grounded conversation.'
            : '已上传到 Ark File API，可作为文件输入参与对话。'
        })
        return
      }
    } catch {
      // fall through to warning/failed
    }
  }

  updateMaterialItem(collectionRef, item.id, {
    processing: false,
    officialStatus: inlineText ? 'inline' : 'failed',
    ...(inlineText ? buildMaterialProgressCopy('ready') : buildMaterialProgressCopy('warning')),
    summary: inlineText
      ? (locale.value === 'en'
        ? 'Part of the file was extracted and can join the chat context.'
        : '文件部分内容已提取，可参与当前对话。')
      : (locale.value === 'en'
        ? 'This file type is not wired into file-grounded chat yet. Prefer PDF, TXT, MD, CSV or JSON.'
        : '当前文件类型暂未直连文件对话，建议优先上传 PDF、TXT、MD、CSV 或 JSON。')
  })
}

async function ingestSelectedFiles(files, collectionRef, options = {}) {
  const items = files.map((file) => ({
    ...createMaterialItem(file),
    scope: options.scope || 'chat'
  }))
  collectionRef.value = [...items, ...collectionRef.value]
  if (options.scope !== 'dossier') {
    liveStatus.attachedFileCount = materialLibrary.value.length
  }
  await Promise.allSettled(items.map((item) => processMaterialItem(item)))
}

function handleFileSelection(event) {
  const files = Array.from(event.target.files ?? [])
  if (!files.length) return

  ingestSelectedFiles(files, materialLibrary, { scope: 'chat' }).finally(() => {
    event.target.value = ''
  })
}

function removeAttachment(id) {
  const target = materialLibrary.value.find((item) => item.id === id)
  if (target?.previewUrl) {
    URL.revokeObjectURL(target.previewUrl)
  }
  materialLibrary.value = materialLibrary.value.filter((item) => item.id !== id)
  liveStatus.attachedFileCount = materialLibrary.value.length
}

function resetConversation() {
  agentStore.clearMessages()
  customEntries.value = []
  liveStatus.stage = 'idle'
  liveStatus.message = '待命'
  liveStatus.route = 'chat/completions'
}

async function runDossierAnalysis() {
  if (!enterprise.value || hasPendingAnalysisMaterials.value) return
  dossierStore.syncMaterials(analysisMaterialLibrary.value, runtimeProfile.value)
  await dossierStore.refresh(dossierRuntimeProfile.value)
}

const runtimeProfile = computed(() => ({
  assistantMode: agentConfig.assistantMode,
  professionalRole: isProfessionalMode.value ? agentConfig.professionalRole : '',
  roleLabel: currentAssistantRoleLabel.value,
  communicationStyle: currentCommunicationStyleMeta.value?.promptLabel || '',
  systemPrompt: isProfessionalMode.value ? currentProfessionalRoleMeta.value.systemPrompt : currentQuickAssistantPrompt.value.systemPrompt,
  personaStyle: isProfessionalMode.value
    ? `${currentProfessionalRoleMeta.value.personaStyle} / ${currentCommunicationStyleMeta.value?.promptLabel || ''}`
    : currentCommunicationStyleMeta.value?.promptLabel || '',
  mode: isProfessionalMode.value ? currentProfessionalRoleMeta.value.mode : '',
  outputStyle: isProfessionalMode.value ? currentProfessionalRoleMeta.value.outputStyle : '',
  focus: isProfessionalMode.value ? currentProfessionalRoleMeta.value.focus : [],
  enabledTools: isProfessionalMode.value ? currentProfessionalRoleMeta.value.enabledTools : [],
  objective: isProfessionalMode.value
    ? (agentConfig.customObjective.trim() || currentProfessionalRoleMeta.value.objective)
    : '',
  memory: isProfessionalMode.value ? agentConfig.memory : '',
  workflowLabel: isProfessionalMode.value ? currentProfessionalRoleMeta.value.workflowLabel : (locale.value === 'en' ? 'Quick chat' : '快捷问答'),
  enterpriseContext: isProfessionalMode.value
    ? (dossierStore.contextBrief || '')
    : '',
  externalBrief: isProfessionalMode.value
    ? (dossier.value?.materialSummary || '')
    : '',
  officialFileIds: materialLibrary.value.map((item) => item.officialFileId).filter(Boolean),
  officialFiles: materialLibrary.value
    .filter((item) => item.officialFileId)
    .map((item) => ({ id: item.officialFileId, name: item.name, kind: item.kind })),
  inlineTextMaterials: materialLibrary.value
    .filter((item) => item.inlineText)
    .map((item) => ({ name: item.name, kind: item.kind, text: item.inlineText })),
  officialImageUrls: materialLibrary.value
    .filter((item) => item.kind === 'image' && (item.dataUrl || item.previewUrl))
    .map((item) => item.dataUrl || item.previewUrl),
  official: {
    ...agentConfig.official,
    endpointId: agentStore.currentModel
  }
}))

const dossierRuntimeProfile = computed(() => ({
  ...runtimeProfile.value,
  officialFileIds: analysisMaterialLibrary.value.map((item) => item.officialFileId).filter(Boolean),
  officialFiles: analysisMaterialLibrary.value
    .filter((item) => item.officialFileId)
    .map((item) => ({ id: item.officialFileId, name: item.name, kind: item.kind })),
  inlineTextMaterials: analysisMaterialLibrary.value
    .filter((item) => item.inlineText)
    .map((item) => ({ name: item.name, kind: item.kind, text: item.inlineText })),
  officialImageUrls: analysisMaterialLibrary.value
    .filter((item) => item.kind === 'image' && (item.dataUrl || item.previewUrl))
    .map((item) => item.dataUrl || item.previewUrl)
}))

watch(
  enterprise,
  (value) => {
    if (value) dossierStore.syncEnterprise(value, dossierRuntimeProfile.value)
  },
  { deep: true, immediate: true }
)

watch(
  analysisMaterialLibrary,
  (value) => {
    dossierStore.syncMaterials(value, dossierRuntimeProfile.value)
  },
  { deep: true, immediate: true }
)

async function handleSubmit() {
  if (activeCapability.value === 'image') {
    await submitImageGeneration()
    return
  }

  if (activeCapability.value === 'video') {
    await submitVideoGeneration()
    return
  }

  await submitChat()
}

async function submitChat() {
  const content = chatInput.value.trim()

  const attachments = materialLibrary.value.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
    url: item.previewUrl || ''
  }))

  if ((!content && attachments.length === 0) || agentStore.loading || generationState.loading || hasPendingMaterials.value) return

  const requestContent = content || buildAttachmentOnlyPrompt(materialLibrary.value)
  const displayContent = content

  chatInput.value = ''
  await agentStore.sendMessage(requestContent, enterprise.value, {
    materials: materialLibrary.value,
    attachments,
    displayContent,
    analysis: dossierStore.analysisSnapshot,
    runtimeProfile: runtimeProfile.value,
    onStatus: handleAgentStatus
  })
}

async function submitImageGeneration() {
  const prompt = chatInput.value.trim()
  if (!prompt || generationState.loading) return

  const userEntry = createCustomEntry('user_message', { body: prompt, tag: '图片生成' })
  const assistantEntry = createCustomEntry('assistant_message', {
    body: '',
    tag: '图片生成',
    progress: createProgressState('图片生成进度', [
      { id: 'prepare', label: '准备请求', description: '正在整理提示词和模型参数。' },
      { id: 'generate', label: '生成图片', description: '调用 Seedream 图像生成能力。' },
      { id: 'deliver', label: '返回结果', description: '整理图片地址并生成预览卡片。' }
    ])
  })
  customEntries.value.push(userEntry, assistantEntry)
  generationState.loading = true
  chatInput.value = ''
  handleAgentStatus({ stage: 'thinking', message: '正在思考', route: 'images/generations' })

  try {
    setProgressStep(assistantEntry.progress, 'prepare', 18, '准备请求')
    const result = await requestArkImageGeneration({
      prompt,
      model: agentStore.currentModel,
      runtimeProfile: runtimeProfile.value
    })

    setProgressStep(assistantEntry.progress, 'generate', 72, '生成图片')
    assistantEntry.body = locale.value === 'en'
      ? 'Image generation finished. You can preview or open the result below.'
      : '图片生成已完成，你可以在下方预览或打开结果。'
    assistantEntry.media = result.images.map((url, index) => ({
      type: 'image',
      url,
      title: `${locale.value === 'en' ? 'Image' : '图片'} ${index + 1}`,
      description: currentModelMeta.value?.name || 'Seedream',
      filename: `seedream-${Date.now()}-${index + 1}.png`
    }))
    completeProgress(assistantEntry.progress, '已完成')
    handleAgentStatus({ stage: 'completed', message: '正在整理', route: 'images/generations' })
  } catch (error) {
    assistantEntry.body = error.message || (locale.value === 'en' ? 'Image generation failed.' : '图片生成失败。')
    if (assistantEntry.progress) {
      assistantEntry.progress.statusText = '生成失败'
    }
    handleAgentStatus({ stage: 'error', message: '生成失败', route: 'images/generations' })
  } finally {
    generationState.loading = false
  }
}

async function submitVideoGeneration() {
  const prompt = chatInput.value.trim()
  if (!prompt || generationState.loading) return

  const userEntry = createCustomEntry('user_message', { body: prompt, tag: '视频生成' })
  const assistantEntry = createCustomEntry('assistant_message', {
    body: '',
    tag: '视频生成',
    progress: createProgressState('视频生成进度', [
      { id: 'create', label: '创建任务', description: '正在创建视频生成任务。' },
      { id: 'queue', label: '等待处理', description: '任务已提交，正在等待生成资源。' },
      { id: 'render', label: '生成视频', description: '模型正在生成视频片段。' },
      { id: 'deliver', label: '返回结果', description: '视频已完成，准备预览与下载。' }
    ])
  })
  customEntries.value.push(userEntry, assistantEntry)
  generationState.loading = true
  chatInput.value = ''
  handleAgentStatus({ stage: 'thinking', message: '正在思考', route: 'contents/generations/tasks' })

  try {
    setProgressStep(assistantEntry.progress, 'create', 12, '创建任务')
    const result = await createArkVideoGenerationTask({
      prompt,
      model: agentStore.currentModel,
      runtimeProfile: runtimeProfile.value,
      onProgress: (status) => {
        applyVideoProgress(assistantEntry.progress, status)
      }
    })

    assistantEntry.body = locale.value === 'en'
      ? 'Video generation finished. The result is ready below.'
      : '视频生成已完成，结果已展示在下方。'
    assistantEntry.media = (result.videos || []).map((url, index) => ({
      type: 'video',
      url,
      title: `${locale.value === 'en' ? 'Video' : '视频'} ${index + 1}`,
      description: currentModelMeta.value?.name || 'Seedance',
      filename: `seedance-${Date.now()}-${index + 1}.mp4`
    }))
    completeProgress(assistantEntry.progress, '已完成')
    handleAgentStatus({ stage: 'completed', message: '正在整理', route: 'contents/generations/tasks' })
  } catch (error) {
    assistantEntry.body = error.message || (locale.value === 'en' ? 'Video generation failed.' : '视频生成失败。')
    if (assistantEntry.progress) {
      assistantEntry.progress.statusText = '生成失败'
    }
    handleAgentStatus({ stage: 'error', message: '生成失败', route: 'contents/generations/tasks' })
  } finally {
    generationState.loading = false
  }
}

onMounted(async () => {
  await agentStore.loadModels()
  handleCapabilityChange('chat')
})
</script>

<style scoped>
.ai-shell {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 14px;
  min-height: 100vh;
  height: 100dvh;
  overflow: hidden;
  padding: 24px;
  color: #162334;
  background:
    radial-gradient(circle at top left, rgba(15, 139, 141, 0.12), transparent 28%),
    linear-gradient(135deg, #eff5f4, #dde9f2);
}

.shell-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1600px;
  width: 100%;
  margin: 0 auto;
}

.toolbar-group {
  display: flex;
  gap: 8px;
}

.toolbar-button,
.locale-switch {
  border: 1px solid rgba(22, 35, 52, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.76);
  color: #22344a;
  font: inherit;
  cursor: pointer;
}

.toolbar-button {
  padding: 9px 14px;
}

.toolbar-button.active,
.locale-switch {
  background: rgba(15, 139, 141, 0.12);
  color: #0f8b8d;
}

.locale-switch {
  min-width: 64px;
  padding: 9px 16px;
  font-weight: 700;
}

.mobile-only {
  display: none;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 18px;
  min-height: 0;
  height: 100%;
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
}

.surface-panel,
.inspector-panel {
  min-height: 0;
}

.inspector-panel {
  display: grid;
  gap: 14px;
  overflow: auto;
  padding-right: 4px;
}

.hero-card,
.inspector-card {
  border: 1px solid rgba(255, 255, 255, 0.52);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 36px rgba(23, 43, 71, 0.08);
}

.hero-card {
  display: grid;
  gap: 18px;
  padding: 20px;
  background:
    linear-gradient(155deg, rgba(12, 53, 76, 0.96), rgba(16, 91, 104, 0.92)),
    radial-gradient(circle at top right, rgba(255, 255, 255, 0.2), transparent 32%);
  color: #f2fbff;
}

.hero-label {
  display: inline-flex;
  margin-bottom: 10px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-card h2 {
  margin: 0 0 10px;
  font-size: 28px;
  line-height: 1.15;
}

.hero-card p {
  margin: 0;
  color: rgba(242, 251, 255, 0.78);
  line-height: 1.7;
}

.hero-badges {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.hero-pill,
.card-badge {
  padding: 8px 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.hero-pill {
  background: rgba(255, 255, 255, 0.12);
}

.inspector-card {
  padding: 18px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-title {
  color: #22344a;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.card-badge {
  background: rgba(15, 139, 141, 0.08);
  color: #0f8b8d;
}

.support-text,
.field span {
  color: #6c7e90;
}

.support-text {
  margin: 10px 0 0;
  line-height: 1.6;
}

.compact-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.field {
  display: grid;
  gap: 10px;
  margin-top: 12px;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field span {
  font-size: 13px;
  font-weight: 700;
}

.control,
.ghost-button {
  border: 1px solid rgba(22, 35, 52, 0.1);
  border-radius: 16px;
  font: inherit;
}

.control {
  width: 100%;
  padding: 11px 12px;
  background: rgba(255, 255, 255, 0.88);
  color: inherit;
  outline: none;
}

.textarea {
  resize: vertical;
}

.ghost-button {
  padding: 9px 14px;
  background: rgba(15, 139, 141, 0.08);
  color: #0f8b8d;
  cursor: pointer;
}

.primary-ghost {
  background: rgba(15, 139, 141, 0.14);
  border-color: rgba(15, 139, 141, 0.22);
  color: #0f8b8d;
  font-weight: 700;
}

.primary-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.intake-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 14px;
}

.analysis-attachment-list {
  display: grid;
  gap: 10px;
  margin-top: 14px;
}

.analysis-attachment-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 16px;
  background: #f5f8fb;
  border: 1px solid rgba(22, 35, 52, 0.06);
}

.analysis-attachment-card strong {
  display: block;
  margin-bottom: 4px;
  color: #244055;
  font-size: 13px;
}

.analysis-attachment-card p {
  margin: 0;
  color: #6c7e90;
  font-size: 12px;
  line-height: 1.6;
}

.analysis-attachment-meta {
  display: grid;
  gap: 8px;
  justify-items: end;
}

.analysis-status {
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 139, 141, 0.1);
  color: #0f8b8d;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}

.analysis-status.processing {
  background: rgba(20, 108, 148, 0.1);
  color: #146c94;
}

.assistant-mode-grid,
.analysis-role-grid {
  display: grid;
  gap: 12px;
  margin-top: 14px;
}

.assistant-mode-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.analysis-role-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.mode-card,
.role-card {
  display: grid;
  gap: 6px;
  padding: 15px 16px;
  border: 1px solid rgba(22, 35, 52, 0.08);
  border-radius: 20px;
  background: rgba(245, 248, 251, 0.92);
  color: #244055;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease;
}

.mode-card strong,
.role-card strong {
  font-size: 14px;
}

.mode-card span,
.role-card span {
  color: #6c7e90;
  font-size: 12px;
  line-height: 1.6;
}

.mode-card.active,
.role-card.active {
  border-color: rgba(15, 139, 141, 0.22);
  background: linear-gradient(135deg, rgba(15, 139, 141, 0.12), rgba(20, 108, 148, 0.08));
  box-shadow: 0 12px 24px rgba(20, 108, 148, 0.08);
  transform: translateY(-1px);
}

.focus-panel {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  background: #f5f8fb;
  color: #244055;
}

.focus-panel > span {
  display: block;
  margin-bottom: 10px;
  color: #6c7e90;
  font-size: 13px;
  font-weight: 700;
}

.focus-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.focus-chip {
  padding: 8px 10px;
  border-radius: 999px;
  background: rgba(15, 139, 141, 0.1);
  color: #0f8b8d;
  font-size: 12px;
  font-weight: 700;
}

.quick-note {
  margin-top: 14px;
  padding: 14px 16px;
  border-radius: 20px;
  background: #f5f8fb;
}

.info-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: #f5f8fb;
  color: #244055;
}

.info-strip strong {
  font-size: 18px;
}

.dossier-panel {
  display: grid;
  gap: 12px;
  margin-top: 14px;
  padding: 14px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(245, 248, 251, 0.96), rgba(238, 244, 248, 0.92));
  border: 1px solid rgba(22, 35, 52, 0.06);
}

.dossier-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  color: #244055;
}

.dossier-head span {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.dossier-head strong {
  color: #0f8b8d;
  font-size: 12px;
}

.dossier-block {
  display: grid;
  gap: 8px;
}

.dossier-block > span {
  color: #6c7e90;
  font-size: 12px;
  font-weight: 700;
}

.dossier-block p {
  margin: 0;
  color: #244055;
  line-height: 1.7;
}

.dossier-score-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.dossier-score-card {
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.82);
  border: 1px solid rgba(22, 35, 52, 0.06);
  text-align: center;
}

.dossier-score-card strong {
  display: block;
  margin-bottom: 4px;
  color: #244055;
  font-size: 24px;
  line-height: 1;
}

.dossier-score-card small {
  display: block;
  color: #7b8c9d;
  font-size: 11px;
  font-weight: 700;
}

.dossier-score-card.total {
  grid-column: 1 / -1;
  background: linear-gradient(135deg, rgba(15, 139, 141, 0.12), rgba(20, 108, 148, 0.08));
}

.dossier-score-card.total strong {
  color: #0f8b8d;
}

.dossier-empty {
  margin: 0;
}

@media (max-width: 980px) {
  .mobile-only {
    display: flex;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .surface-panel,
  .inspector-panel {
    display: none;
  }

  .surface-panel.active,
  .inspector-panel.active {
    display: block;
  }

  .analysis-role-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .ai-shell {
    padding: 16px;
  }

  .assistant-mode-grid,
  .compact-grid {
    grid-template-columns: 1fr;
  }

  .dossier-score-grid {
    grid-template-columns: 1fr;
  }

  .intake-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .analysis-attachment-card {
    flex-direction: column;
  }

}
</style>
