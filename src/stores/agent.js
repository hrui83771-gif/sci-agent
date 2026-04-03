import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  analyzeEnterprise,
  buildAssistantReply,
  createReportFile,
  diagnoseEnterprise,
  getFrontendModels
} from '../lib/agentRuntime.js'
import { isOfficialArkConfigured, requestOfficialArkChat } from '../lib/arkOfficial.js'

function pickPreferredModel(models) {
  const featured = models.find((model) => model.featured && model.available && model.chatReady !== false)
  if (featured) return featured.id

  const firstReady = models.find((model) => model.available && model.chatReady !== false)
  if (firstReady) return firstReady.id

  return models[0]?.id ?? 'doubao-1-5-vision-pro-32k-250115'
}

function buildEnterpriseContext(enterprise) {
  if (!enterprise) return ''

  return `Enterprise ${enterprise.name || '--'} | Industry ${enterprise.industry || '--'} | Founded ${enterprise.founded || '--'} | Score ${enterprise.scores?.total ?? '--'}`
}

function buildExternalBrief(materials = []) {
  if (!materials.length) return ''

  return materials
    .slice(0, 3)
    .map((item) => `${item.name}: ${String(item.summary || '').slice(0, 72)}`)
    .join(' | ')
}

function emitStatus(onStatus, stage, message, route, attachedFileCount) {
  onStatus?.({
    stage,
    message,
    route,
    attachedFileCount
  })
}

function cleanAssistantText(text) {
  return String(text ?? '')
    .replace(/\u0000/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/�/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function cleanAssistantChunk(text) {
  return String(text ?? '')
    .replace(/\u0000/g, '')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/�/g, '')
    .replace(/\r\n/g, '\n')
}

function pickAssistantPart(streamText, resultText) {
  return cleanAssistantText(streamText) || cleanAssistantText(resultText)
}

function createMessage(role, content = '', meta = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    role,
    content,
    createdAt: Date.now(),
    ...meta
  }
}

function shouldCreateDocumentArtifact(text = '') {
  const normalized = String(text || '').toLowerCase()
  return [
    '生成文档',
    '整理成文档',
    '总结成文档',
    '导出文档',
    '导出pdf',
    'pdf下载',
    '下载链接',
    '输出结果总结成文档'
  ].some((pattern) => normalized.includes(pattern))
}

function revokeArtifacts(message = {}) {
  for (const artifact of message.artifacts || []) {
    if (typeof artifact?.url === 'string' && artifact.url.startsWith('blob:')) {
      URL.revokeObjectURL(artifact.url)
    }
  }
}

async function createDocumentArtifact(message, enterprise, analysis) {
  if (!message?.content || !enterprise) return null

  const { filename, blob } = await createReportFile('pdf', {
    enterprise,
    analysis,
    draftText: message.content
  })

  return {
    id: `artifact-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    kind: 'document',
    label: '下载 PDF',
    filename,
    mime: 'application/pdf',
    url: URL.createObjectURL(blob)
  }
}

function resultRoute() {
  return 'chat/completions'
}

function buildHistoryMessages(messages = [], maxCount = 8) {
  return messages
    .filter((item) => item?.role === 'user' || item?.role === 'assistant')
    .map((item) => ({
      role: item.role,
      content: String(item.content || '').trim()
    }))
    .filter((item) => item.content)
    .slice(-maxCount)
}

export const useAgentStore = defineStore('agent', () => {
  const models = ref([])
  const currentModel = ref('doubao-1-5-vision-pro-32k-250115')
  const messages = ref([])
  const analysis = ref(null)
  const loading = ref(false)
  const language = ref('zh')
  const officialResponseId = ref('')

  async function loadModels() {
    models.value = getFrontendModels()
    currentModel.value = pickPreferredModel(models.value)
  }

  async function sendMessage(content, enterprise, options = {}) {
    const text = String(content || '').trim()
    const displayText = typeof options.displayContent === 'string'
      ? String(options.displayContent || '').trim()
      : text
    if (!text) return ''
    const historyMessages = buildHistoryMessages(messages.value)

    const attachments = options.attachments || []
    const shouldGenerateDocument = shouldCreateDocumentArtifact(displayText)
    const userMedia = attachments
      .filter((item) => item.kind === 'image' && item.url)
      .map((item) => ({
        type: 'image',
        url: item.url,
        title: item.name,
        description: 'Attached with the current message.'
      }))

    messages.value.push(createMessage('user', displayText, {
      attachments: attachments.map((item) => ({ id: item.id, name: item.name })),
      media: userMedia,
      tag: userMedia.length ? 'Image Input' : ''
    }))
    loading.value = true

    try {
      messages.value.push(createMessage('assistant', '', { reasoning: '', sources: [] }))
      const assistantMessage = messages.value[messages.value.length - 1]
      const isQuickAssistant = options.runtimeProfile?.assistantMode === 'quick'

      const runtimeProfile = {
        ...options.runtimeProfile,
        enterpriseContext: isQuickAssistant ? '' : (options.runtimeProfile?.enterpriseContext || buildEnterpriseContext(enterprise)),
        externalBrief: isQuickAssistant ? '' : (options.runtimeProfile?.externalBrief || buildExternalBrief(options.materials ?? [])),
        officialFileIds: (options.materials ?? []).map((item) => item.officialFileId).filter(Boolean),
        officialFiles: (options.materials ?? [])
          .filter((item) => item.officialFileId)
          .map((item) => ({ id: item.officialFileId, name: item.name, kind: item.kind })),
        inlineTextMaterials: (options.materials ?? [])
          .filter((item) => item.inlineText)
          .map((item) => ({ name: item.name, kind: item.kind, text: item.inlineText }))
      }

      const attachedFileCount = runtimeProfile.officialFileIds.length

      if (isOfficialArkConfigured(runtimeProfile)) {
        emitStatus(options.onStatus, 'thinking', '正在思考', resultRoute(), attachedFileCount)

        try {
          const result = await requestOfficialArkChat({
            content: text,
            runtimeProfile,
            enterprise: isQuickAssistant ? null : enterprise,
            previousResponseId: officialResponseId.value || undefined,
            historyMessages,
            onDelta: (delta) => {
              const safeDelta = cleanAssistantChunk(delta)
              if (!safeDelta) return

              assistantMessage.content = `${assistantMessage.content || ''}${safeDelta}`
            },
            onReasoningDelta: (delta) => {
              const safeDelta = cleanAssistantChunk(delta)
              if (!safeDelta) return

              assistantMessage.reasoning = `${assistantMessage.reasoning || ''}${safeDelta}`
            },
            onStatus: (status) => {
              options.onStatus?.({
                ...status,
                route: status.route || resultRoute(),
                attachedFileCount:
                  typeof status.attachedFileCount === 'number'
                    ? status.attachedFileCount
                    : attachedFileCount
              })
            }
          })

          assistantMessage.content = pickAssistantPart(assistantMessage.content, result.text)
          assistantMessage.reasoning = pickAssistantPart(assistantMessage.reasoning, result.reasoning)
          assistantMessage.sources = result.sources || []
          officialResponseId.value = result.responseId || ''

          if (!assistantMessage.content && !assistantMessage.reasoning) {
            throw new Error('empty assistant response')
          }

          emitStatus(
            options.onStatus,
            'completed',
            '已完成',
            result.meta?.route || resultRoute(),
            result.meta?.attachedFileCount ?? attachedFileCount
          )

          if (shouldGenerateDocument) {
            assistantMessage.artifacts = [
              await createDocumentArtifact(assistantMessage, enterprise, options.analysis ?? analysis.value)
            ].filter(Boolean)
          }

          return assistantMessage.content
        } catch {
          const streamedReply = pickAssistantPart(assistantMessage.content, '')
          const streamedReasoning = pickAssistantPart(assistantMessage.reasoning, '')

          if (streamedReply || streamedReasoning) {
            assistantMessage.content = streamedReply
            assistantMessage.reasoning = streamedReasoning
            officialResponseId.value = ''
            emitStatus(options.onStatus, 'fallback', '保留已收到内容', resultRoute(), attachedFileCount)
            emitStatus(options.onStatus, 'completed', '已完成', resultRoute(), attachedFileCount)
            if (shouldGenerateDocument) {
              assistantMessage.artifacts = [
                await createDocumentArtifact(assistantMessage, enterprise, options.analysis ?? analysis.value)
              ].filter(Boolean)
            }
            return assistantMessage.content
          }

          const reply = buildAssistantReply({
            content: text,
            enterprise: isQuickAssistant ? null : enterprise,
            materials: isQuickAssistant ? [] : (options.materials ?? []),
            analysis: options.analysis ?? analysis.value,
            runtimeProfile
          })

          assistantMessage.content = cleanAssistantText(reply)
          officialResponseId.value = ''
          emitStatus(options.onStatus, 'fallback', '切换到本地回复', 'local', attachedFileCount)
          emitStatus(options.onStatus, 'completed', '已完成', 'local', attachedFileCount)
          if (shouldGenerateDocument) {
            assistantMessage.artifacts = [
              await createDocumentArtifact(assistantMessage, enterprise, options.analysis ?? analysis.value)
            ].filter(Boolean)
          }
          return assistantMessage.content
        }
      }

      const reply = buildAssistantReply({
        content: text,
        enterprise: isQuickAssistant ? null : enterprise,
        materials: isQuickAssistant ? [] : (options.materials ?? []),
        analysis: options.analysis ?? analysis.value,
        runtimeProfile
      })

      emitStatus(options.onStatus, 'thinking', '正在思考', 'local', attachedFileCount)
      emitStatus(options.onStatus, 'streaming', '即将生成', 'local', attachedFileCount)
      assistantMessage.content = cleanAssistantText(reply)
      officialResponseId.value = ''
      emitStatus(options.onStatus, 'completed', '已完成', 'local', attachedFileCount)
      if (shouldGenerateDocument) {
        assistantMessage.artifacts = [
          await createDocumentArtifact(assistantMessage, enterprise, options.analysis ?? analysis.value)
        ].filter(Boolean)
      }
      return assistantMessage.content
    } catch {
      const fallback = '当前回答生成失败，请稍后重试。'
      messages.value.push(createMessage('assistant', fallback))
      officialResponseId.value = ''
      emitStatus(options.onStatus, 'error', '生成失败', 'local', 0)
      return fallback
    } finally {
      loading.value = false
    }
  }

  async function runAnalysis(enterprise, options = {}) {
    loading.value = true

    try {
      analysis.value = analyzeEnterprise(enterprise, options.materials ?? [], options.runtimeProfile ?? {})
      return analysis.value
    } finally {
      loading.value = false
    }
  }

  async function runDiagnosis(enterprise, options = {}) {
    loading.value = true

    try {
      return diagnoseEnterprise(enterprise, options.materials ?? [], options.runtimeProfile ?? {})
    } finally {
      loading.value = false
    }
  }

  function clearMessages() {
    messages.value.forEach(revokeArtifacts)
    messages.value = []
    officialResponseId.value = ''
  }

  return {
    models,
    currentModel,
    messages,
    analysis,
    loading,
    language,
    loadModels,
    sendMessage,
    runAnalysis,
    runDiagnosis,
    clearMessages
  }
})
