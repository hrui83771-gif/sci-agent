function normalizeBaseUrl(baseUrl) {
  const raw = String(baseUrl || 'https://ark.cn-beijing.volces.com/api/v3').trim()
  return raw.endsWith('/') ? raw.slice(0, -1) : raw
}

function truncateText(text, maxLength = 160) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim()
  if (!normalized) return ''
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function buildSystemInstructions(runtimeProfile = {}, enterprise) {
  const official = runtimeProfile.official || {}

  if (runtimeProfile.assistantMode === 'quick' && !runtimeProfile.systemPrompt) {
    return ''
  }

  if (runtimeProfile.assistantMode === 'quick') {
    return [
      runtimeProfile.systemPrompt || '',
      runtimeProfile.communicationStyle ? `Communication Style: ${runtimeProfile.communicationStyle}` : '',
      official.enableWebSearch ? 'If facts are uncertain, say so clearly.' : ''
    ].filter(Boolean).join('\n')
  }

  const lines = [
    runtimeProfile.systemPrompt || '',
    `Role: ${runtimeProfile.personaStyle || 'professional'} credit assistant.`,
    `Mode: ${runtimeProfile.mode || 'credit'} | Output: ${runtimeProfile.outputStyle || 'executive'}`,
    runtimeProfile.roleLabel ? `Analyst Role: ${runtimeProfile.roleLabel}` : '',
    runtimeProfile.communicationStyle ? `Communication Style: ${runtimeProfile.communicationStyle}` : '',
    runtimeProfile.objective ? `Objective: ${truncateText(runtimeProfile.objective, 120)}` : '',
    runtimeProfile.memory ? `Memory: ${truncateText(runtimeProfile.memory, 120)}` : '',
    runtimeProfile.focus?.length ? `Focus: ${runtimeProfile.focus.slice(0, 3).join(', ')}` : '',
    runtimeProfile.enterpriseContext ? `Enterprise: ${truncateText(runtimeProfile.enterpriseContext, 160)}` : '',
    runtimeProfile.externalBrief ? `Materials: ${truncateText(runtimeProfile.externalBrief, 180)}` : '',
    enterprise
      ? `Profile: ${enterprise.name}, ${enterprise.industry}, founded ${enterprise.founded || 'unknown'}, score ${enterprise.scores?.total ?? '--'}.`
      : '',
    official.enableWebSearch ? 'Do not fabricate facts. Separate attached materials from public information.' : '',
    'Answer fast. Conclusion first, then evidence, risks, gaps, and next steps.'
  ]

  return lines.filter(Boolean).join('\n')
}

function normalizeHistoryMessages(history = []) {
  return history
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : 'user'
      const text = String(item?.content || '').trim()
      if (!text) return null
      return { role, content: text }
    })
    .filter(Boolean)
}

function buildMessages(content, runtimeProfile = {}, enterprise, history = []) {
  const imageUrls = (runtimeProfile.officialImageUrls || []).slice(0, 2)
  const systemInstructions = buildSystemInstructions(runtimeProfile, enterprise)
  const historyMessages = normalizeHistoryMessages(history)

  if (!imageUrls.length) {
    return [
      ...(systemInstructions
        ? [
            {
              role: 'system',
              content: systemInstructions
            }
          ]
        : []),
      ...historyMessages,
      {
        role: 'user',
        content
      }
    ]
  }

  const userContent = imageUrls.map((imageUrl) => ({
    type: 'image_url',
    image_url: { url: imageUrl }
  }))

  userContent.push({
    type: 'text',
    text: content
  })

  return [
    ...(systemInstructions
      ? [
          {
            role: 'system',
            content: systemInstructions
          }
        ]
      : []),
    ...historyMessages,
    {
      role: 'user',
      content: userContent
    }
  ]
}

function buildResponsesInput(content, runtimeProfile = {}) {
  const imageUrls = (runtimeProfile.officialImageUrls || [])
    .filter((url) => isRemoteMediaUrl(url))
    .slice(0, 2)
  const officialFiles = (runtimeProfile.officialFiles || []).slice(0, 6)
  const inlineTextMaterials = (runtimeProfile.inlineTextMaterials || []).slice(0, 3)

  const messageContent = [
    ...imageUrls.map((url) => ({
      type: 'input_image',
      image_url: url
    })),
    ...officialFiles.flatMap((file, index) => ([
      {
        type: 'input_text',
        text: `附件 ${index + 1}: ${file.name}`
      },
      {
        type: 'input_file',
        file_id: file.id
      }
    ])),
    ...inlineTextMaterials.map((item, index) => ({
      type: 'input_text',
      text: `附件文本 ${index + 1}（${item.name}）:\n${item.text}`
    })),
    {
      type: 'input_text',
      text: content
    }
  ]

  return [
    {
      role: 'user',
      content: messageContent
    }
  ]
}

function extractContentText(content, seen = new WeakSet()) {
  if (!content) return ''
  if (typeof content === 'string') return content
  if (typeof content !== 'object') return ''

  if (seen.has(content)) return ''
  seen.add(content)

  if (Array.isArray(content)) {
    return content
      .map((item) => extractContentText(item, seen))
      .filter(Boolean)
      .join('')
  }

  if (content.content) return extractContentText(content.content, seen)
  if (typeof content.text === 'string') return content.text
  if (typeof content.value === 'string') return content.value
  if (typeof content.output_text === 'string') return content.output_text
  if (content.delta) return extractContentText(content.delta, seen)
  if (content.message) return extractContentText(content.message, seen)
  if (content.output) return extractContentText(content.output, seen)

  return ''
}

function extractReasoningText(content, seen = new WeakSet()) {
  if (!content || typeof content !== 'object') return ''

  if (seen.has(content)) return ''
  seen.add(content)

  if (Array.isArray(content)) {
    return content
      .map((item) => extractReasoningText(item, seen))
      .filter(Boolean)
      .join('')
  }

  if (typeof content.reasoning_content === 'string') return content.reasoning_content
  if (typeof content.reasoning === 'string') return content.reasoning
  if (Array.isArray(content.reasoning)) return extractReasoningText(content.reasoning, seen)

  if (content.type === 'reasoning' || content.type === 'reasoning_text') {
    return extractContentText(content, seen)
  }

  if (content.delta) {
    const nested = extractReasoningText(content.delta, seen)
    if (nested) return nested
  }

  if (content.message) {
    const nested = extractReasoningText(content.message, seen)
    if (nested) return nested
  }

  if (content.output) {
    const nested = extractReasoningText(content.output, seen)
    if (nested) return nested
  }

  if (content.content) {
    const nested = extractReasoningText(content.content, seen)
    if (nested) return nested
  }

  return ''
}

function extractSsePayload(event) {
  const lines = String(event || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const dataLines = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s?/, ''))

  if (dataLines.length) {
    return dataLines.join('\n').trim()
  }

  return lines.find((line) => line.startsWith('{') || line.startsWith('[')) || ''
}

function extractStreamDelta(payload = {}) {
  return (
    extractContentText(payload.delta) ||
    extractContentText(payload.choices?.[0]?.delta) ||
    extractContentText(payload.choices?.[0]?.message) ||
    extractContentText(payload.message) ||
    extractContentText(payload.output_text) ||
    extractContentText(payload.output?.text) ||
    extractContentText(payload.output) ||
    extractContentText(payload.data) ||
    ''
  )
}

function extractStreamReasoning(payload = {}) {
  return (
    extractReasoningText(payload.delta) ||
    extractReasoningText(payload.choices?.[0]?.delta) ||
    extractReasoningText(payload.choices?.[0]?.message) ||
    extractReasoningText(payload.message) ||
    extractReasoningText(payload.output) ||
    extractReasoningText(payload.data) ||
    ''
  )
}

function extractChatText(payload = {}) {
  return (
    extractContentText(payload.choices?.[0]?.message) ||
    extractContentText(payload.choices?.[0]?.delta) ||
    extractContentText(payload.message) ||
    extractContentText(payload.output) ||
    extractContentText(payload.output_text) ||
    extractContentText(payload.output?.text) ||
    extractContentText(payload.answer) ||
    extractContentText(payload.data) ||
    ''
  )
}

function extractChatReasoning(payload = {}) {
  return (
    extractReasoningText(payload.choices?.[0]?.message) ||
    extractReasoningText(payload.choices?.[0]?.delta) ||
    extractReasoningText(payload.message) ||
    extractReasoningText(payload.output) ||
    extractReasoningText(payload.data) ||
    ''
  )
}

function extractResponsesText(payload = {}) {
  const outputs = Array.isArray(payload.output) ? payload.output : []

  return outputs
    .map((item) => {
      if (item.type === 'message') return extractContentText(item.content)
      if (item.type === 'output_text') return extractContentText(item)
      return ''
    })
    .filter(Boolean)
    .join('')
}

function extractResponsesReasoning(payload = {}) {
  const outputs = Array.isArray(payload.output) ? payload.output : []

  return outputs
    .map((item) => {
      if (item.type === 'reasoning') return extractContentText(item.summary || item.content || [])
      return ''
    })
    .filter(Boolean)
    .join('')
}

function isHttpUrl(value) {
  return typeof value === 'string' && /^https?:\/\//i.test(value.trim())
}

function normalizeSource(candidate = {}) {
  const url = [
    candidate.url,
    candidate.href,
    candidate.link,
    candidate.uri,
    candidate.source_url,
    candidate.sourceUrl,
    candidate.web_url,
    candidate.webUrl,
    candidate.citation?.url,
    candidate.url_citation?.url
  ].find(isHttpUrl)

  if (!url) return null

  let host = ''
  try {
    host = new URL(url).hostname.replace(/^www\./i, '')
  } catch {
    host = ''
  }

  const title = [
    candidate.title,
    candidate.site_name,
    candidate.name,
    candidate.label,
    candidate.text,
    candidate.citation?.title,
    candidate.url_citation?.title,
    host
  ].find((value) => typeof value === 'string' && value.trim())

  return {
    id: `${host || 'source'}-${url}`,
    title: title || '来源',
    url,
    host
  }
}

function appendSource(sources, candidate) {
  const normalized = normalizeSource(candidate)
  if (!normalized) return
  if (sources.some((item) => item.url === normalized.url)) return
  sources.push(normalized)
}

function collectSourcesFromPart(part, sources) {
  if (!part || typeof part !== 'object') return

  if (Array.isArray(part.annotations)) {
    part.annotations.forEach((annotation) => appendSource(sources, annotation))
  }

  if (Array.isArray(part.citations)) {
    part.citations.forEach((citation) => appendSource(sources, citation))
  }

  if (Array.isArray(part.sources)) {
    part.sources.forEach((source) => appendSource(sources, source))
  }

  appendSource(sources, part)
}

function extractResponsesSources(payload = {}) {
  const sources = []
  const outputs = Array.isArray(payload.output) ? payload.output : []

  for (const item of outputs) {
    if (Array.isArray(item.content)) {
      item.content.forEach((part) => collectSourcesFromPart(part, sources))
    }

    if (Array.isArray(item.annotations)) {
      item.annotations.forEach((annotation) => appendSource(sources, annotation))
    }

    if (Array.isArray(item.results)) {
      item.results.forEach((result) => appendSource(sources, result))
    }

    if (Array.isArray(item.sources)) {
      item.sources.forEach((source) => appendSource(sources, source))
    }
  }

  const references = payload.references
  if (typeof references === 'string') {
    try {
      const parsed = JSON.parse(references)
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => appendSource(sources, item))
      }
    } catch {
      // Ignore malformed references field.
    }
  } else if (Array.isArray(references)) {
    references.forEach((item) => appendSource(sources, item))
  }

  return sources
}

function extractResponseId(payload = {}) {
  return payload.response?.id || payload.id || ''
}

async function readErrorDetail(response) {
  try {
    const detail = await response.text()
    return detail ? ` ${detail}` : ''
  } catch {
    return ''
  }
}

async function readSseStream(response, handlers = {}) {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')

  if (!reader) {
    return {
      text: '',
      reasoning: ''
    }
  }

  let buffer = ''
  let fullText = ''
  let fullReasoning = ''
  let firstDeltaSeen = false

  const processEvent = (event) => {
    const raw = extractSsePayload(event)

    if (!raw || raw === '[DONE]') return

    try {
      const payload = JSON.parse(raw)
      const reasoning = extractStreamReasoning(payload)
      const delta = extractStreamDelta(payload)

      if (reasoning) {
        fullReasoning += reasoning
        handlers.onStatus?.({
          stage: 'reasoning',
          message: '思考过程输出中'
        })
        handlers.onReasoningDelta?.(reasoning)
      }

      if (!delta) return

      fullText += delta

      if (!firstDeltaSeen) {
        firstDeltaSeen = true
        handlers.onStatus?.({
          stage: 'streaming',
          message: '即将生成'
        })
      } else {
        handlers.onStatus?.({
          stage: 'composing',
          message: '流式输出中'
        })
      }

      handlers.onDelta?.(delta)
    } catch {
      // Ignore malformed SSE chunks.
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event of events) {
      processEvent(event)
    }
  }

  buffer += decoder.decode().replace(/\r\n/g, '\n')
  if (buffer.trim()) {
    processEvent(buffer)
  }

  return {
    text: fullText,
    reasoning: fullReasoning
  }
}

async function readResponsesSseStream(response, handlers = {}) {
  const reader = response.body?.getReader()
  const decoder = new TextDecoder('utf-8')

  if (!reader) {
    return {
      text: '',
      reasoning: ''
    }
  }

  let buffer = ''
  let fullText = ''
  let fullReasoning = ''
  let sources = []
  let responseId = ''
  let reasoningStarted = false
  let messageStarted = false

  const processEvent = (event) => {
    const raw = extractSsePayload(event)

    if (!raw || raw === '[DONE]') return

    try {
      const payload = JSON.parse(raw)
      const type = payload.type || ''

      responseId = responseId || extractResponseId(payload)

      if (type === 'response.reasoning_summary_text.delta') {
        const delta = String(payload.delta || '')
        if (!delta) return

        fullReasoning += delta
        reasoningStarted = true
        handlers.onStatus?.({
          stage: 'searching',
          message: '联网搜索与思考中'
        })
        handlers.onReasoningDelta?.(delta)
        return
      }

      if (type === 'response.output_item.added' && payload.item?.type === 'web_search_call') {
        handlers.onStatus?.({
          stage: 'searching',
          message: '检索网页中'
        })
        return
      }

      if (type === 'response.output_item.done' && payload.item?.type === 'web_search_call') {
        handlers.onStatus?.({
          stage: 'searching',
          message: '搜索完成，整理结果'
        })
        return
      }

      if (type === 'response.output_text.delta') {
        const delta = String(payload.delta || '')
        if (!delta) return

        fullText += delta
        messageStarted = true
        handlers.onStatus?.({
          stage: messageStarted ? 'composing' : 'streaming',
          message: '整理联网结果'
        })
        handlers.onDelta?.(delta)
        return
      }

      if (type === 'response.completed' && payload.response) {
        fullReasoning = fullReasoning || extractResponsesReasoning(payload.response)
        fullText = fullText || extractResponsesText(payload.response)
        sources = extractResponsesSources(payload.response)
        responseId = responseId || payload.response.id || ''
      }
    } catch {
      // Ignore malformed SSE chunks.
    }
  }

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n')
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const event of events) {
      processEvent(event)
    }
  }

  buffer += decoder.decode().replace(/\r\n/g, '\n')
  if (buffer.trim()) {
    processEvent(buffer)
  }

  if (reasoningStarted && !messageStarted) {
    handlers.onStatus?.({
      stage: 'streaming',
      message: '准备生成回复'
    })
  }

  return {
    text: fullText,
    reasoning: fullReasoning,
    sources,
    responseId
  }
}

function extractImageUrls(data = {}) {
  if (Array.isArray(data.data)) {
    return data.data
      .map((item) => item.url || item.image_url || item.b64_json || '')
      .filter(Boolean)
  }

  if (Array.isArray(data.images)) {
    return data.images
      .map((item) => item.url || item.image_url || item.b64_json || item)
      .filter(Boolean)
  }

  return []
}

function extractTaskId(data = {}) {
  return data.id || data.task_id || data.data?.id || data.data?.task_id || ''
}

function isMediaUrl(value) {
  if (typeof value !== 'string') return false
  return /^(https?:\/\/|blob:|data:)/i.test(value.trim())
}

function isRemoteMediaUrl(value) {
  if (typeof value !== 'string') return false
  return /^(https?:\/\/|data:)/i.test(value.trim())
}

function appendUniqueUrl(urls, value) {
  if (!isMediaUrl(value)) return
  if (!urls.includes(value)) urls.push(value)
}

function resolveVideoReferenceImageUrl(runtimeProfile = {}) {
  const remoteAttachmentUrl = (runtimeProfile.officialImageUrls || []).find((url) => isRemoteMediaUrl(url))
  if (remoteAttachmentUrl) return remoteAttachmentUrl

  const configuredUrl = runtimeProfile.official?.videoImageUrl
  return isRemoteMediaUrl(configuredUrl) ? configuredUrl : ''
}

function extractUrlsFromNode(node, urls, seen = new WeakSet()) {
  if (!node || typeof node !== 'object') return
  if (seen.has(node)) return
  seen.add(node)

  if (Array.isArray(node)) {
    for (const item of node) {
      if (typeof item === 'string') appendUniqueUrl(urls, item)
      else extractUrlsFromNode(item, urls, seen)
    }
    return
  }

  for (const key of [
    'video_url',
    'videoUrl',
    'play_url',
    'playUrl',
    'download_url',
    'downloadUrl',
    'file_url',
    'fileUrl',
    'media_url',
    'mediaUrl',
    'content_url',
    'contentUrl',
    'url',
    'src',
    'href'
  ]) {
    appendUniqueUrl(urls, node[key])
  }

  for (const value of Object.values(node)) {
    if (value && typeof value === 'object') {
      extractUrlsFromNode(value, urls, seen)
    }
  }
}

function extractVideoUrls(data = {}) {
  const urls = []
  extractUrlsFromNode(data, urls)
  return urls
}

function extractTaskStatus(data = {}) {
  return data.status || data.data?.status || data.result?.status || data.output?.status || ''
}

function extractTaskProgress(data = {}) {
  const candidates = [
    data.progress,
    data.progress_percent,
    data.progress_percentage,
    data.data?.progress,
    data.data?.progress_percent,
    data.data?.progress_percentage,
    data.result?.progress,
    data.result?.progress_percent,
    data.result?.progress_percentage,
    data.output?.progress,
    data.output?.progress_percent,
    data.output?.progress_percentage
  ]

  for (const value of candidates) {
    const number = Number(value)
    if (Number.isFinite(number)) return Math.max(0, Math.min(100, number))
  }

  return null
}

export function isOfficialArkConfigured(runtimeProfile = {}) {
  const official = runtimeProfile.official || {}
  return Boolean(official.enabled && official.apiKey && official.endpointId)
}

export function isOfficialArkFileConfigured(runtimeProfile = {}) {
  const official = runtimeProfile.official || {}
  return Boolean(official.enabled && official.apiKey)
}

export async function uploadOfficialArkFile(file, runtimeProfile = {}) {
  const official = runtimeProfile.official || {}
  const baseUrl = normalizeBaseUrl(official.baseUrl)
  const configuredPurpose = String(official.filePurpose || '').trim().toLowerCase()
  const purpose = configuredPurpose === 'assistants' ? 'user_data' : (configuredPurpose || 'user_data')

  const formData = new FormData()
  formData.append('file', file)
  formData.append('purpose', purpose)

  const response = await fetch(`${baseUrl}/files`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${official.apiKey}`
    },
    body: formData
  })

  if (!response.ok) {
    throw new Error(`Ark Files API error: ${response.status}${await readErrorDetail(response)}`)
  }

  return response.json()
}

export async function requestOfficialArk({
  content,
  runtimeProfile = {},
  enterprise,
  previousResponseId,
  historyMessages,
  onDelta,
  onReasoningDelta,
  onStatus
}) {
  return requestOfficialArkChat({
    content,
    runtimeProfile,
    enterprise,
    previousResponseId,
    historyMessages,
    onDelta,
    onReasoningDelta,
    onStatus
  })
}

export async function requestOfficialArkChat({
  content,
  runtimeProfile = {},
  enterprise,
  previousResponseId,
  historyMessages = [],
  onDelta,
  onReasoningDelta,
  onStatus
}) {
  const official = runtimeProfile.official || {}
  const baseUrl = normalizeBaseUrl(official.baseUrl)
  const attachedFileCount = (runtimeProfile.officialFileIds || []).length
  const hasImages = (runtimeProfile.officialImageUrls || []).length > 0
  const hasOfficialFiles = (runtimeProfile.officialFiles || []).length > 0
  const hasInlineTextMaterials = (runtimeProfile.inlineTextMaterials || []).length > 0
  const useResponsesRoute = Boolean(official.enableWebSearch || official.useResponsesApi || hasOfficialFiles || hasInlineTextMaterials)

  onStatus?.({
    stage: 'thinking',
    message: '正在思考',
    route: useResponsesRoute ? 'responses' : 'chat/completions',
    attachedFileCount
  })

  const candidateModels = [
    hasImages ? official.visionModel : official.endpointId,
    official.endpointId,
    official.defaultChatModel,
    official.visionModel
  ].filter(Boolean)

  let lastError = null

  for (const model of [...new Set(candidateModels)]) {
    onStatus?.({
      stage: useResponsesRoute ? 'searching' : 'routing',
      message: useResponsesRoute ? '准备联网搜索' : '整理上下文',
      route: useResponsesRoute ? 'responses' : 'chat/completions',
      attachedFileCount
    })

    const endpoint = useResponsesRoute ? 'responses' : 'chat/completions'
    const requestBody = useResponsesRoute
      ? {
          model,
          instructions: buildSystemInstructions(runtimeProfile, enterprise) || undefined,
          input: buildResponsesInput(content, runtimeProfile),
          previous_response_id: previousResponseId || undefined,
          tools: official.enableWebSearch ? [{ type: 'web_search' }] : undefined,
          stream: true
        }
      : {
          model,
          messages: buildMessages(content, runtimeProfile, enterprise, historyMessages),
          stream: true
        }

    const response = await fetch(`${baseUrl}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${official.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      lastError = new Error(`Ark ${useResponsesRoute ? 'Responses' : 'Chat'} API error: ${response.status}${await readErrorDetail(response)}`)
      continue
    }

    onStatus?.({
      stage: useResponsesRoute ? 'searching' : 'requesting',
      message: useResponsesRoute ? '联网搜索中' : '连接模型',
      route: useResponsesRoute ? 'responses' : 'chat/completions',
      attachedFileCount
    })

    const contentType = response.headers.get('content-type') || ''
    let text = ''
    let reasoning = ''
    let sources = []
    let responseId = ''

    if (contentType.includes('application/json')) {
      const payload = await response.json()
      reasoning = (useResponsesRoute ? extractResponsesReasoning(payload) : extractChatReasoning(payload)).trim()
      text = (useResponsesRoute ? extractResponsesText(payload) : extractChatText(payload)).trim()
      sources = useResponsesRoute ? extractResponsesSources(payload) : []
      responseId = useResponsesRoute ? extractResponseId(payload) : ''

      if (reasoning) {
        onStatus?.({
          stage: 'reasoning',
          message: useResponsesRoute ? '联网搜索已完成，正在思考' : '思考过程已生成',
          route: useResponsesRoute ? 'responses' : 'chat/completions',
          attachedFileCount
        })
        onReasoningDelta?.(reasoning)
      }

      if (text) {
        onStatus?.({
          stage: 'streaming',
          message: useResponsesRoute ? '整理联网结果' : '即将生成',
          route: useResponsesRoute ? 'responses' : 'chat/completions',
          attachedFileCount
        })
        onDelta?.(text)
        onStatus?.({
          stage: 'composing',
          message: useResponsesRoute ? '生成搜索结果' : '流式输出中',
          route: useResponsesRoute ? 'responses' : 'chat/completions',
          attachedFileCount
        })
      }
    } else {
      const streamResult = await (useResponsesRoute ? readResponsesSseStream(response, {
        onDelta,
        onReasoningDelta,
        onStatus: (status) => {
          onStatus?.({
            ...status,
            route: 'responses',
            attachedFileCount
          })
        }
      }) : readSseStream(response, {
        onDelta,
        onReasoningDelta,
        onStatus: (status) => {
          onStatus?.({
            ...status,
            route: 'chat/completions',
            attachedFileCount
          })
        }
      }))
      text = streamResult.text
      reasoning = streamResult.reasoning
      sources = streamResult.sources || []
      responseId = streamResult.responseId || ''
    }

    if (!text.trim() && !reasoning.trim()) {
      lastError = new Error(`Ark ${useResponsesRoute ? 'Responses' : 'Chat'} API error: empty response from model ${model}`)
      continue
    }

    onStatus?.({
      stage: 'completed',
      message: '已完成',
      route: useResponsesRoute ? 'responses' : 'chat/completions',
      attachedFileCount
    })

    return {
      text,
      reasoning,
      sources,
      responseId,
      meta: {
        provider: 'ark-official',
        route: useResponsesRoute ? 'responses' : 'chat/completions',
        attachedFileCount,
        model
      }
    }
  }

  throw lastError || new Error(`Ark ${useResponsesRoute ? 'Responses' : 'Chat'} API error: no available chat model`)
}

export async function requestArkImageGeneration({
  prompt,
  model,
  runtimeProfile = {}
}) {
  const official = runtimeProfile.official || {}
  const baseUrl = normalizeBaseUrl(official.baseUrl)

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${official.apiKey}`
    },
    body: JSON.stringify({
      model,
      prompt,
      size: '2048x2048'
    })
  })

  if (!response.ok) {
    throw new Error(`Ark Image API error: ${response.status}${await readErrorDetail(response)}`)
  }

  const data = await response.json()
  const images = extractImageUrls(data)

  if (!images.length) {
    throw new Error('Ark Image API error: no image URL returned')
  }

  return { images, raw: data }
}

async function pollVideoTask({ taskId, runtimeProfile, timeoutMs = 300000, intervalMs = 4000 }) {
  const onProgress = runtimeProfile.__onProgress
  const official = runtimeProfile.official || {}
  const baseUrl = normalizeBaseUrl(official.baseUrl)
  const startedAt = Date.now()
  let completedWithoutAssetCount = 0

  while (Date.now() - startedAt < timeoutMs) {
    const response = await fetch(`${baseUrl}/contents/generations/tasks/${taskId}`, {
      headers: {
        Authorization: `Bearer ${official.apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Ark Video Task API error: ${response.status}${await readErrorDetail(response)}`)
    }

    const data = await response.json()
    const status = extractTaskStatus(data).toLowerCase()
    const progress = extractTaskProgress(data)
    const videos = extractVideoUrls(data)

    if (['pending', 'queued', 'created', 'submitted'].includes(status)) {
      onProgress?.({ status: 'submitted', percent: progress ?? 28 })
    } else if (['running', 'processing', 'in_progress'].includes(status)) {
      onProgress?.({ status: 'running', percent: progress ?? 68 })
    }

    if (videos.length) {
      onProgress?.({ status: 'succeeded', percent: 92 })
      return { videos, raw: data, status }
    }

    if (['succeeded', 'success', 'completed', 'done', 'finished'].includes(status)) {
      completedWithoutAssetCount += 1
      onProgress?.({
        status: completedWithoutAssetCount > 1 ? 'delivering' : 'succeeded',
        percent: progress ?? Math.min(98, 90 + completedWithoutAssetCount * 2)
      })

      if (completedWithoutAssetCount >= 4) {
        return { videos, raw: data, status }
      }

      await new Promise((resolve) => window.setTimeout(resolve, 2000))
      continue
    }

    if (['failed', 'error', 'canceled', 'cancelled'].includes(status)) {
      throw new Error(`Ark Video Task failed: ${status || 'unknown'}`)
    }

    await new Promise((resolve) => window.setTimeout(resolve, intervalMs))
  }

  throw new Error('Ark Video Task timed out')
}

export async function createArkVideoGenerationTask({
  prompt,
  model,
  runtimeProfile = {},
  onProgress
}) {
  const official = runtimeProfile.official || {}
  const baseUrl = normalizeBaseUrl(official.baseUrl)
  const referenceImageUrl = resolveVideoReferenceImageUrl(runtimeProfile)
  const requestModel = model || official.videoModel || 'doubao-seedance-1-5-pro-251215'
  const requestContent = [
    {
      type: 'text',
      text: prompt
    }
  ]

  if (referenceImageUrl) {
    requestContent.push({
      type: 'image_url',
      image_url: {
        url: referenceImageUrl
      }
    })
  }

  const createResponse = await fetch(`${baseUrl}/contents/generations/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${official.apiKey}`
    },
    body: JSON.stringify({
      model: requestModel,
      content: requestContent
    })
  })

  if (!createResponse.ok) {
    throw new Error(`Ark Video Create API error: ${createResponse.status}${await readErrorDetail(createResponse)}`)
  }

  const createData = await createResponse.json()
  const taskId = extractTaskId(createData)

  if (!taskId) {
    throw new Error('Ark Video Create API error: missing task id')
  }

  onProgress?.({ status: 'submitted', percent: 12 })

  const result = await pollVideoTask({
    taskId,
    runtimeProfile: {
      ...runtimeProfile,
      __onProgress: onProgress
    }
  })

  return {
    taskId,
    videos: result.videos,
    raw: result.raw
  }
}
