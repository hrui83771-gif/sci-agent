<template>
  <div class="portrait-shell">
    <div class="scene-backdrop"></div>

    <header class="topbar">
      <div class="brand-copy">
        <span class="brand-kicker">3D 全景画像</span>
        <h1>{{ currentEnterprise.name }}</h1>
        <p>{{ currentEnterprise.industry }} · {{ currentEnterprise.city }} · 成立于 {{ currentEnterprise.founded }}</p>
      </div>

      <div class="topbar-actions">
        <button type="button" class="action-button action-button--ghost" @click="router.push('/')">
          返回首页
        </button>
        <button type="button" class="action-button action-button--primary" @click="router.push('/ai')">
          AI 工作台
        </button>
      </div>
    </header>

    <section class="selector-panel">
      <label class="selector-field">
        <span>选择企业</span>
        <select v-model="selectedEnterpriseId" class="selector-select">
          <option v-for="item in portraitList" :key="item.id" :value="item.id">{{ item.name }}</option>
        </select>
      </label>
    </section>

    <section class="portrait-layout">
      <div class="cube-column panel-surface">
        <EnterpriseCubePortrait
          :enterprise="currentEnterprise"
          :active-dimension="activeDimension"
          :dimension-color-map="dimensionColorMap"
          @select-dimension="setActiveDimension"
        />
      </div>

      <div class="detail-column">
        <div class="detail-scroll panel-surface">
          <DimensionInsightPanel
            :detail="activeDetail"
            :active-dimension="activeDimension"
            :color-map="dimensionColorMap"
            :recommended-product="recommendedProduct"
            :chat-entries="sceneChatEntries"
            :chat-input="sceneChatInput"
            :chat-loading="sceneChatLoading"
            :chat-context-label="sceneChatContextLabel"
            @update:chat-input="sceneChatInput = $event"
            @submit-chat="submitSceneChat"
          />
        </div>

        <div class="products-panel panel-surface">
          <ProductMatchDeck
            :key="`${currentEnterprise.id}-${activeDimension}`"
            :products="allProducts"
            :active-dimension="activeDimension"
            :dimension-label-map="dimensionLabelMap"
          />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EnterpriseCubePortrait from './portrait/EnterpriseCubePortrait.vue'
import DimensionInsightPanel from './portrait/DimensionInsightPanel.vue'
import ProductMatchDeck from './portrait/ProductMatchDeck.vue'
import { enterprisePortraits, getPortraitProductsForEnterprise } from '../data/enterprisePortraits.js'
import { useEnterpriseStore } from '../stores/enterprise.js'
import { buildAssistantReply } from '../lib/agentRuntime.js'
import { getArkClientConfig } from '../lib/arkConfig.js'
import { isOfficialArkConfigured, requestOfficialArkChat } from '../lib/arkOfficial.js'

defineEmits(['enter-ai'])

const router = useRouter()
const enterpriseStore = useEnterpriseStore()

const portraitList = enterprisePortraits
const dimensionColorMap = {
  tech: '#00d4ff',
  team: '#8b5cf6',
  finance: '#22c55e',
  market: '#f97316'
}
const dimensionLabelMap = {
  tech: '技术',
  team: '团队',
  finance: '财务',
  market: '市场'
}
const trendOffsets = {
  tech: [0.06, -0.12, 0.18, -0.04, 0.24, -0.08, 0.28, -0.1, 0.2, 0.26],
  team: [-0.08, 0.12, -0.04, 0.18, -0.02, 0.16, -0.06, 0.2, 0.04, 0.22],
  finance: [0.18, -0.16, 0.1, -0.22, 0.14, -0.08, 0.2, -0.12, 0.16, -0.04],
  market: [0.04, 0.18, -0.1, 0.26, -0.02, 0.24, -0.12, 0.3, -0.04, 0.22]
}

const selectedEnterpriseId = ref(portraitList[0]?.id || '')
const activeDimension = ref('tech')
const sceneChatEntries = ref([])
const sceneChatInput = ref('')
const sceneChatLoading = ref(false)
const sceneChatResponseId = ref('')

const currentEnterprise = computed(() => {
  return portraitList.find((item) => item.id === selectedEnterpriseId.value) || portraitList[0]
})

function normalizeScore(score = 0, modifier = 0) {
  return Math.max(48, Math.min(99, Math.round(score - 16 + modifier * 34)))
}

function buildTrendSeries(score = 0, key = 'tech') {
  return (trendOffsets[key] || trendOffsets.tech).map((offset) => normalizeScore(score, offset))
}

const activeDetail = computed(() => {
  const raw = currentEnterprise.value?.dimensions?.[activeDimension.value] || currentEnterprise.value?.dimensions?.tech
  return {
    ...raw,
    trend: buildTrendSeries(raw?.score || 0, activeDimension.value)
  }
})

const allProducts = computed(() => {
  return getPortraitProductsForEnterprise(currentEnterprise.value, activeDimension.value)
})

const recommendedProduct = computed(() => {
  return [...allProducts.value]
    .map((product) => ({
      ...product,
      currentMatch: Number(product.fit?.[activeDimension.value] ?? product.baseMatch ?? 0)
    }))
    .sort((a, b) => b.currentMatch - a.currentMatch)[0] || null
})

const sceneChatContextLabel = computed(() => `已带入${activeDetail.value.label}与当前企业画像`)

function createSceneMessage(role, content) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    content: String(content || '').trim()
  }
}

function buildSceneContext() {
  const detail = activeDetail.value
  const enterprise = currentEnterprise.value
  const highlights = Array.isArray(detail.highlights) ? detail.highlights.join('；') : ''
  const risks = Array.isArray(detail.risks) ? detail.risks.join('；') : ''
  const evidence = Array.isArray(detail.evidence) ? detail.evidence.join('；') : ''
  const recommended = recommendedProduct.value

  return [
    `企业名称：${enterprise.name}`,
    `行业：${enterprise.industry}`,
    `当前维度：${detail.label}`,
    `维度摘要：${detail.summary}`,
    highlights ? `关键要点：${highlights}` : '',
    risks ? `主要风险：${risks}` : '',
    evidence ? `核验材料：${evidence}` : '',
    recommended ? `推荐产品：${recommended.name}，${recommended.reason}` : ''
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
    personaStyle: '3d portrait copilot',
    roleLabel: 'Portrait Copilot',
    objective: `Answer follow-up questions based on current enterprise ${currentEnterprise.value.name} and dimension ${activeDetail.value.label}.`,
    focus: [activeDetail.value.label, 'risk', 'product'],
    enterpriseContext: `${currentEnterprise.value.name} | ${currentEnterprise.value.industry} | score ${currentEnterprise.value.scores.total}`,
    externalBrief: buildSceneContext(),
    systemPrompt: 'You are embedded in a 3D enterprise portrait. Use only the current enterprise and current dimension context to answer. Be concise and practical.',
    official: {
      ...official,
      enabled: official.enabled,
      endpointId: official.defaultChatModel,
      enableWebSearch: false,
      useResponsesApi: false
    }
  }
})

function setActiveDimension(key) {
  activeDimension.value = key
}

function syncToStore(enterprise) {
  if (!enterprise) return
  enterpriseStore.setMock({
    id: enterprise.id,
    name: enterprise.name,
    industry: enterprise.industry,
    founded: enterprise.founded,
    scores: enterprise.scores,
    products: enterprise.products
  })
}

watch(
  currentEnterprise,
  (enterprise) => {
    activeDimension.value = 'tech'
    syncToStore(enterprise)
  },
  { immediate: true }
)

watch(
  [currentEnterprise, activeDimension],
  () => {
    sceneChatEntries.value = [
      createSceneMessage(
        'assistant',
        `已载入 ${currentEnterprise.value.name} 的 ${activeDetail.value.label} 画像，你可以继续追问风险、产品、证据或下一步动作。`
      )
    ]
    sceneChatInput.value = ''
    sceneChatResponseId.value = ''
  },
  { immediate: true }
)

async function submitSceneChat() {
  const question = String(sceneChatInput.value || '').trim()
  if (!question || sceneChatLoading.value) return

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
        enterprise: currentEnterprise.value,
        previousResponseId: sceneChatResponseId.value || undefined,
        historyMessages
      })

      const replyText = String(result.text || '').trim() || '当前没有生成有效回复，请换个问法再试一次。'
      sceneChatEntries.value.push(createSceneMessage('assistant', replyText))
      sceneChatResponseId.value = result.responseId || ''
      return
    }

    const fallbackReply = buildAssistantReply({
      content: `${buildSceneContext()}\n\n用户追问：${question}`,
      enterprise: currentEnterprise.value,
      materials: [],
      analysis: null,
      runtimeProfile: sceneRuntimeProfile.value
    })

    sceneChatEntries.value.push(createSceneMessage('assistant', fallbackReply))
    sceneChatResponseId.value = ''
  } catch {
    sceneChatEntries.value.push(createSceneMessage('assistant', '当前维度追问暂时不可用，请稍后再试。'))
    sceneChatResponseId.value = ''
  } finally {
    sceneChatLoading.value = false
  }
}
</script>

<style scoped>
.portrait-shell {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding: 22px 22px 20px;
  overflow-x: hidden;
  overflow-y: hidden;
  background:
    radial-gradient(circle at 50% 20%, rgba(0, 212, 255, 0.12), transparent 20%),
    radial-gradient(circle at 18% 78%, rgba(139, 92, 246, 0.1), transparent 24%),
    linear-gradient(180deg, #030917 0%, #040d1f 52%, #050b17 100%);
  color: #e8f1fb;
}

.scene-backdrop {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at center, black 42%, transparent 92%);
  opacity: 0.22;
  pointer-events: none;
}

.topbar,
.selector-panel,
.portrait-layout,
.products-panel {
  position: relative;
  z-index: 1;
}

.topbar {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 14px;
  z-index: 5;
  pointer-events: auto;
}

.brand-kicker {
  color: #8be9ff;
  font-size: 12px;
  letter-spacing: 2px;
}

.brand-copy h1 {
  margin: 6px 0 4px;
  font-size: clamp(26px, 2.6vw, 42px);
  line-height: 1.08;
}

.brand-copy p {
  margin: 0;
  color: #9fb3ca;
  line-height: 1.55;
}

.action-button {
  min-width: 118px;
  padding: 12px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(18px);
  pointer-events: auto;
}

.action-button--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #00d4ff, #1570ef);
  box-shadow: 0 12px 28px rgba(0, 212, 255, 0.24);
}

.action-button--ghost {
  color: #e8f4ff;
  background: rgba(7, 17, 36, 0.84);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
}

.selector-panel {
  margin-bottom: 14px;
}

.selector-field {
  display: grid;
  gap: 8px;
}

.selector-field span {
  color: #8ca4bf;
  font-size: 12px;
  letter-spacing: 1px;
}

.selector-select {
  width: 100%;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(4, 11, 24, 0.92);
  color: #e8f1fb;
  font: inherit;
}

.portrait-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.18fr) minmax(420px, 0.82fr);
  gap: 14px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
}

.panel-surface {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(7, 15, 29, 0.84);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
}

.cube-column,
.detail-column,
.detail-scroll,
.products-panel {
  min-width: 0;
}

.cube-column {
  height: 100%;
  overflow: hidden;
}

.detail-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
  overflow: hidden;
}

.detail-scroll {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.detail-scroll::-webkit-scrollbar {
  width: 10px;
}

.detail-scroll::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.36);
  border-radius: 999px;
  border: 2px solid rgba(7, 15, 29, 0.86);
}

.detail-scroll::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px;
}

.products-panel {
  flex: 0 0 auto;
  min-height: 208px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
}

@media (max-width: 1180px) {
  .portrait-shell {
    height: auto;
    min-height: 100vh;
    overflow-y: auto;
  }

  .portrait-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .cube-column,
  .detail-column,
  .detail-scroll {
    height: auto;
  }
}

@media (max-width: 860px) {
  .portrait-shell {
    padding: 18px;
  }

  .topbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
