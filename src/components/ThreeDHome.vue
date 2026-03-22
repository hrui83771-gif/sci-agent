<template>
  <div class="home-shell">
    <Scene3D
      ref="sceneRef"
      :scores="enterprise?.scores ?? defaultScores"
      :details="dimensionDetails"
      :scene-chat-entries="sceneChatEntries"
      :scene-chat-input="sceneChatInput"
      :scene-chat-loading="sceneChatLoading"
      :scene-chat-context-label="sceneChatContextLabel"
      @focus-change="handleFocusChange"
      @update:scene-chat-input="sceneChatInput = $event"
      @submit-scene-chat="submitSceneChat"
    />
    <CameraGesture :enabled="cameraEnabled" />
    <DimCards
      :scores="enterprise?.scores ?? defaultScores"
      :details-map="dimensionDetails"
      :active-dim="activeDim"
      @dim-click="focusDimension"
    />

    <div class="floating-actions">
      <button type="button" class="action-button action-button--primary" @click="$emit('enter-ai')">
        AI 工作台
      </button>
      <button type="button" class="action-button action-button--ghost" @click="settingsOpen = !settingsOpen">
        配置
      </button>
    </div>

    <div v-if="settingsOpen" class="settings-popover">
      <div class="popover-head">
        <strong>场景配置</strong>
        <button type="button" class="popover-close" @click="settingsOpen = false">关闭</button>
      </div>

      <label class="setting-line">
        <span>手势控制</span>
        <button type="button" class="toggle-chip" :class="{ active: cameraEnabled }" @click="cameraEnabled = !cameraEnabled">
          {{ cameraEnabled ? '已开启' : '已关闭' }}
        </button>
      </label>

      <div class="setting-block">
        <span>当前企业</span>
        <strong>{{ enterprise?.name || '默认企业画像' }}</strong>
      </div>

      <div class="setting-block">
        <span>行业</span>
        <strong>{{ enterprise?.industry || '科创金融' }}</strong>
      </div>

      <div class="setting-block">
        <span>交互提示</span>
        <p>点击左侧维度卡片，可联动聚焦 3D 场景的对应维度。</p>
      </div>

      <div class="setting-block">
        <span>当前模式</span>
        <strong>{{ sceneStateStore.sceneMode === 'dimension_detail' ? '维度详情模式' : '总览模式' }}</strong>
      </div>

      <div v-if="activeDim" class="setting-block">
        <span>当前聚焦</span>
        <strong>{{ dimensionDetails[activeDim]?.label || activeDim }}</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, watchEffect } from 'vue'
import CameraGesture from './CameraGesture.vue'
import DimCards from './DimCards.vue'
import Scene3D from './Scene3D.vue'
import { useEnterpriseDossierStore } from '../stores/enterpriseDossier.js'
import { useEnterpriseStore } from '../stores/enterprise.js'
import { useSceneStateStore } from '../stores/sceneState.js'
import { buildAssistantReply } from '../lib/agentRuntime.js'
import { getArkClientConfig } from '../lib/arkConfig.js'
import { isOfficialArkConfigured, requestOfficialArkChat } from '../lib/arkOfficial.js'

defineEmits(['enter-ai'])

const enterpriseStore = useEnterpriseStore()
const dossierStore = useEnterpriseDossierStore()
const sceneStateStore = useSceneStateStore()
const sceneRef = ref(null)
const cameraEnabled = ref(false)
const settingsOpen = ref(false)
const sceneChatEntries = ref([])
const sceneChatInput = ref('')
const sceneChatLoading = ref(false)
const sceneChatResponseId = ref('')
const defaultScores = { tech: 88, team: 84, finance: 76, market: 91, total: 84.8 }

if (!enterpriseStore.current) {
  enterpriseStore.setMock()
}

const enterprise = computed(() => enterpriseStore.current)
const dossier = computed(() => dossierStore.dossier)
const activeDim = computed(() => sceneStateStore.activeDim)

function createSceneMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    content: String(content || '').trim()
  }
}

function toHighlights(text = '') {
  return String(text || '')
    .split(/[。；\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 3)
}

function scoreLevel(score = 0) {
  if (score >= 88) return '强'
  if (score >= 75) return '稳'
  return '关注'
}

function safeDossier(dossierValue) {
  return dossierValue && typeof dossierValue === 'object' ? dossierValue : {}
}

function buildDimensionMetrics(dim, score, snapshot = {}, dossierValue = null) {
  const normalizedDossier = safeDossier(dossierValue)
  const materialCount = Array.isArray(normalizedDossier.evidenceItems) ? normalizedDossier.evidenceItems.length : 0

  if (dim === 'tech') {
    return [
      { label: '维度得分', value: `${score}`, tone: scoreLevel(score) },
      { label: '技术判断', value: snapshot.tech_comment ? scoreLevel(score) : '待补充', tone: scoreLevel(score) },
      { label: '资料覆盖', value: `${materialCount} 份`, tone: materialCount >= 2 ? '已接入' : '待补充' }
    ]
  }
  if (dim === 'team') {
    return [
      { label: '维度得分', value: `${score}`, tone: scoreLevel(score) },
      { label: '团队判断', value: snapshot.team_comment ? scoreLevel(score) : '待补充', tone: scoreLevel(score) },
      { label: '治理完整度', value: score >= 80 ? '较好' : '需核验', tone: score >= 80 ? '稳定' : '关注' }
    ]
  }
  if (dim === 'finance') {
    return [
      { label: '维度得分', value: `${score}`, tone: scoreLevel(score) },
      { label: '现金流状态', value: score >= 80 ? '可控' : '承压', tone: score >= 80 ? '稳' : '关注' },
      { label: '财务穿透', value: materialCount >= 1 ? '已接入资料' : '待补资料', tone: materialCount >= 1 ? '进行中' : '待补充' }
    ]
  }

  return [
    { label: '维度得分', value: `${score}`, tone: scoreLevel(score) },
    { label: '市场判断', value: snapshot.mkt_comment ? scoreLevel(score) : '待补充', tone: scoreLevel(score) },
    { label: '验证材料', value: materialCount >= 2 ? '较充分' : '偏少', tone: materialCount >= 2 ? '已接入' : '待补充' }
  ]
}

function buildDimensionEvidence(dim, dossierValue = null) {
  const normalizedDossier = safeDossier(dossierValue)
  const evidence = Array.isArray(normalizedDossier.evidenceItems) ? normalizedDossier.evidenceItems : []
  const keywords = {
    tech: ['专利', '技术', '研发', '图片', 'pdf'],
    team: ['团队', '访谈', '纪要', '文档'],
    finance: ['财务', 'sheet', '表格', 'pdf', 'csv'],
    market: ['市场', '订单', '客户', '图片', 'pdf']
  }

  const filtered = evidence.filter((item) => {
    const haystack = `${item.name || ''} ${item.excerpt || ''} ${item.kind || ''}`.toLowerCase()
    return keywords[dim].some((keyword) => haystack.includes(keyword))
  })

  return (filtered.length ? filtered : evidence).slice(0, 3).map((item) => ({
    title: item.name,
    state: item.state,
    excerpt: item.excerpt || item.kind
  }))
}

const dimensionDetails = computed(() => {
  const normalizedDossier = safeDossier(dossier.value)
  const scoreSource = normalizedDossier.dimensionScores || enterprise.value?.scores || defaultScores
  const snapshot = normalizedDossier.analysisSnapshot || {}
  const companyName = dossier.value?.companyProfile?.name || enterprise.value?.name || '当前企业'
  const industry = dossier.value?.companyProfile?.industry || enterprise.value?.industry || '未分类行业'
  const business = dossier.value?.companyProfile?.business || ''
  const overview = dossier.value?.overview || ''

  return {
    tech: {
      label: '技术维度',
      score: scoreSource.tech ?? defaultScores.tech,
      summary: snapshot.tech_comment || '技术维度暂无详细分析。',
      highlights: toHighlights(snapshot.tech_comment || overview),
      meta: [companyName, industry, business].filter(Boolean).join(' · '),
      metrics: buildDimensionMetrics('tech', scoreSource.tech ?? defaultScores.tech, snapshot, dossier.value),
      evidence: buildDimensionEvidence('tech', dossier.value)
    },
    team: {
      label: '团队维度',
      score: scoreSource.team ?? defaultScores.team,
      summary: snapshot.team_comment || '团队维度暂无详细分析。',
      highlights: toHighlights(snapshot.team_comment || overview),
      meta: [companyName, industry].filter(Boolean).join(' · '),
      metrics: buildDimensionMetrics('team', scoreSource.team ?? defaultScores.team, snapshot, dossier.value),
      evidence: buildDimensionEvidence('team', dossier.value)
    },
    finance: {
      label: '财务维度',
      score: scoreSource.finance ?? defaultScores.finance,
      summary: snapshot.fin_comment || '财务维度暂无详细分析。',
      highlights: toHighlights(snapshot.fin_comment || overview),
      meta: [companyName, `总分 ${scoreSource.total ?? defaultScores.total}`].join(' · '),
      metrics: buildDimensionMetrics('finance', scoreSource.finance ?? defaultScores.finance, snapshot, dossier.value),
      evidence: buildDimensionEvidence('finance', dossier.value)
    },
    market: {
      label: '市场维度',
      score: scoreSource.market ?? defaultScores.market,
      summary: snapshot.mkt_comment || '市场维度暂无详细分析。',
      highlights: toHighlights(snapshot.mkt_comment || overview),
      meta: [companyName, industry].filter(Boolean).join(' · '),
      metrics: buildDimensionMetrics('market', scoreSource.market ?? defaultScores.market, snapshot, dossier.value),
      evidence: buildDimensionEvidence('market', dossier.value)
    }
  }
})

const currentDetail = computed(() => (activeDim.value ? dimensionDetails.value?.[activeDim.value] || null : null))
const sceneChatContextLabel = computed(() => (
  currentDetail.value
    ? `已带入 ${currentDetail.value.label} 与当前企业资料`
    : '已带入当前企业资料'
))

function buildSceneContext(detail = currentDetail.value) {
  if (!detail) return ''

  const highlights = Array.isArray(detail.highlights) ? detail.highlights.slice(0, 3).join('；') : ''
  const metrics = Array.isArray(detail.metrics)
    ? detail.metrics.slice(0, 3).map((item) => `${item.label}:${item.value}`).join(' | ')
    : ''
  const evidence = Array.isArray(detail.evidence)
    ? detail.evidence.slice(0, 2).map((item) => `${item.title}:${item.excerpt}`).join(' | ')
    : ''

  return [
    detail.label ? `当前维度：${detail.label}` : '',
    detail.summary ? `维度摘要：${detail.summary}` : '',
    highlights ? `关键要点：${highlights}` : '',
    metrics ? `子指标：${metrics}` : '',
    evidence ? `证据：${evidence}` : ''
  ].filter(Boolean).join('\n')
}

const sceneRuntimeProfile = computed(() => {
  const official = getArkClientConfig(import.meta.env)

  return {
    assistantMode: 'analysis',
    professionalRole: 'scene_copilot',
    communicationStyle: 'balanced',
    mode: 'credit',
    outputStyle: 'executive',
    personaStyle: 'scene analysis copilot',
    roleLabel: 'Scene Copilot',
    objective: currentDetail.value
      ? `Answer follow-up questions based on the focused dimension ${currentDetail.value.label}.`
      : 'Answer follow-up questions based on the current enterprise scene.',
    focus: currentDetail.value
      ? [currentDetail.value.label, 'evidence', 'risk']
      : ['overview', 'evidence', 'risk'],
    enterpriseContext: enterprise.value
      ? `Enterprise ${enterprise.value.name || '--'} | Industry ${enterprise.value.industry || '--'} | Founded ${enterprise.value.founded || '--'} | Score ${enterprise.value.scores?.total ?? '--'}`
      : '',
    externalBrief: buildSceneContext(),
    systemPrompt: 'You are embedded in a 3D credit analysis screen. Answer based on the current focused dimension and current enterprise materials. Keep replies concise, grounded, and practical.',
    official: {
      ...official,
      enabled: official.enabled,
      endpointId: official.defaultChatModel,
      enableWebSearch: false,
      useResponsesApi: false
    }
  }
})

watch(
  activeDim,
  (dim) => {
    if (!dim) {
      sceneChatEntries.value = []
      sceneChatInput.value = ''
      sceneChatResponseId.value = ''
      return
    }

    const detail = dimensionDetails.value?.[dim]
    sceneChatEntries.value = [
      createSceneMessage(
        'assistant',
        detail
          ? `已载入 ${detail.label} 当前资料。你可以继续追问，比如风险点、证据依据、下一步动作或授信建议。`
          : '已载入当前场景资料，可以继续追问。'
      )
    ]
    sceneChatInput.value = ''
    sceneChatResponseId.value = ''
  },
  { immediate: true }
)

watchEffect(() => {
  sceneStateStore.sync({
    enterpriseProfile: enterprise.value,
    dossier: dossier.value,
    detailsMap: dimensionDetails.value
  })
})

function focusDimension(dimKey) {
  sceneRef.value?.focusDimension?.(dimKey)
}

function handleFocusChange(payload = {}) {
  if (payload.activeDim) {
    sceneStateStore.setFocus(payload.activeDim)
  } else {
    sceneStateStore.clearFocus()
  }
}

async function submitSceneChat() {
  const question = String(sceneChatInput.value || '').trim()
  if (!question || !enterprise.value || sceneChatLoading.value) return

  const historyMessages = sceneChatEntries.value
    .filter((item) => item?.content)
    .map((item) => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      content: item.content
    }))
    .slice(-6)

  sceneChatEntries.value.push(createSceneMessage('user', question))
  sceneChatInput.value = ''
  sceneChatLoading.value = true

  try {
    if (isOfficialArkConfigured(sceneRuntimeProfile.value)) {
      const result = await requestOfficialArkChat({
        content: question,
        runtimeProfile: sceneRuntimeProfile.value,
        enterprise: enterprise.value,
        previousResponseId: sceneChatResponseId.value || undefined,
        historyMessages
      })

      const replyText = String(result.text || result.reasoning || '').trim() || '当前没有生成有效回复，请换个问法再试一次。'
      sceneChatEntries.value.push(createSceneMessage('assistant', replyText))
      sceneChatResponseId.value = result.responseId || ''
      return
    }

    const fallbackReply = buildAssistantReply({
      content: `${buildSceneContext()}\n\n用户追问：${question}`,
      enterprise: enterprise.value,
      materials: Array.isArray(dossierStore.rawMaterials) ? dossierStore.rawMaterials : [],
      runtimeProfile: sceneRuntimeProfile.value
    })

    sceneChatEntries.value.push(createSceneMessage('assistant', fallbackReply))
    sceneChatResponseId.value = ''
  } catch {
    sceneChatEntries.value.push(
      createSceneMessage('assistant', '当前场景追问暂时不可用，请稍后重试，或去 AI 工作台继续分析。')
    )
    sceneChatResponseId.value = ''
  } finally {
    sceneChatLoading.value = false
  }
}
</script>

<style scoped>
.home-shell {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: #020818;
  color: #e2e8f0;
}

.floating-actions {
  position: fixed;
  top: 18px;
  right: 18px;
  z-index: 1200;
  display: flex;
  gap: 10px;
  align-items: center;
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.action-button {
  min-width: 108px;
  padding: 11px 16px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  opacity: 1;
  visibility: visible;
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
}

.action-button--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #00d4ff, #1570ef);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 12px 28px rgba(0, 212, 255, 0.24);
}

.action-button--ghost {
  color: #e8f4ff;
  background: rgba(7, 17, 36, 0.84);
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12), 0 12px 28px rgba(0, 0, 0, 0.24);
}

.settings-popover {
  position: fixed;
  top: 70px;
  right: 18px;
  z-index: 1200;
  width: min(300px, calc(100vw - 36px));
  display: grid;
  gap: 14px;
  opacity: 1;
  visibility: visible;
  padding: 16px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(6, 15, 32, 0.94);
  backdrop-filter: blur(20px);
  box-shadow: 0 20px 44px rgba(0, 0, 0, 0.3);
}

.popover-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.popover-head strong {
  font-size: 16px;
}

.popover-close,
.toggle-chip {
  padding: 7px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: #d9ecff;
  font: inherit;
  cursor: pointer;
}

.toggle-chip.active {
  color: #08101f;
  background: #8be8ff;
}

.setting-line {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 12px;
  align-items: center;
}

.setting-block {
  display: grid;
  gap: 6px;
}

.setting-line span,
.setting-block span {
  color: #8ea2bc;
  font-size: 12px;
}

.setting-block strong,
.setting-block p {
  margin: 0;
  color: #e2e8f0;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .floating-actions {
    top: 12px;
    right: 12px;
    gap: 8px;
  }

  .action-button {
    min-width: 92px;
    padding: 10px 14px;
  }

  .settings-popover {
    top: 60px;
    right: 12px;
    width: min(280px, calc(100vw - 24px));
  }
}
</style>
