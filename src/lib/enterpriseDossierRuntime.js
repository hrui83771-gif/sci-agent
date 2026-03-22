import { analyzeEnterprise } from './agentRuntime.js'

function toNumber(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function clampScore(value, fallback = 0) {
  return Math.max(0, Math.min(100, toNumber(value, fallback)))
}

function computeTotal(scores = {}) {
  return Number((
    (clampScore(scores.tech) + clampScore(scores.team) + clampScore(scores.finance) + clampScore(scores.market)) / 4
  ).toFixed(1))
}

export function normalizeProfileRecord(enterprise = {}) {
  const scores = {
    tech: clampScore(enterprise.scores?.tech, 0),
    team: clampScore(enterprise.scores?.team, 0),
    finance: clampScore(enterprise.scores?.finance, 0),
    market: clampScore(enterprise.scores?.market, 0)
  }

  return {
    id: enterprise.id || 'E001',
    name: enterprise.name || '未命名企业',
    industry: enterprise.industry || '未分类行业',
    founded: enterprise.founded || '--',
    scores: {
      ...scores,
      total: clampScore(enterprise.scores?.total, computeTotal(scores))
    },
    risks: Array.isArray(enterprise.risks) ? enterprise.risks : [],
    products: Array.isArray(enterprise.products) ? enterprise.products : []
  }
}

function getMaterialState(material = {}) {
  if (material.processing) return '处理中'
  if (material.officialFileId) return 'Ark 文件输入'
  if (material.inlineText) return '文本已提取'
  if (material.kind === 'image') return '图片就绪'
  if (material.officialStatus === 'failed') return '处理受限'
  return '待补充'
}

export function buildEvidenceItems(materials = []) {
  return materials.slice(0, 6).map((item, index) => {
    const excerpt = String(item.inlineText || '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 120)

    return {
      id: item.id || `evidence-${index + 1}`,
      name: item.name || `附件 ${index + 1}`,
      kind: item.kind || 'generic',
      state: getMaterialState(item),
      excerpt
    }
  })
}

function buildDimensionScores(profile = {}) {
  const scores = {
    tech: clampScore(profile.scores?.tech),
    team: clampScore(profile.scores?.team),
    finance: clampScore(profile.scores?.finance),
    market: clampScore(profile.scores?.market)
  }

  return {
    ...scores,
    total: computeTotal(scores)
  }
}

function buildContextBrief(profile, dossier = {}, materials = []) {
  const evidenceSummary = buildEvidenceItems(materials)
    .slice(0, 3)
    .map((item) => `${item.name}(${item.state})${item.excerpt ? `: ${item.excerpt}` : ''}`)
    .join(' | ')

  return [
    `企业：${dossier.companyProfile?.name || profile.name}，行业：${dossier.companyProfile?.industry || profile.industry}，成立年份：${dossier.companyProfile?.founded || profile.founded}。`,
    dossier.companyProfile?.business ? `主营业务：${dossier.companyProfile.business}` : '',
    dossier.overview ? `统一摘要：${dossier.overview}` : '',
    dossier.dimensionScores ? `维度分：技术 ${dossier.dimensionScores.tech}，团队 ${dossier.dimensionScores.team}，财务 ${dossier.dimensionScores.finance}，市场 ${dossier.dimensionScores.market}，总分 ${dossier.dimensionScores.total}。` : '',
    evidenceSummary ? `资料概况：${evidenceSummary}` : ''
  ].filter(Boolean).join('\n')
}

export function buildEnterpriseDossier(enterprise = {}, materials = [], runtimeProfile = {}) {
  const profile = normalizeProfileRecord(enterprise)
  const analysis = analyzeEnterprise(profile, materials, runtimeProfile)
  const dimensionScores = buildDimensionScores(profile)

  const dossier = {
    version: 1,
    source: 'local',
    generatedAt: new Date().toISOString(),
    normalizedProfile: profile,
    companyProfile: {
      name: profile.name,
      industry: profile.industry,
      founded: profile.founded,
      business: ''
    },
    dimensionScores,
    overview: analysis.summary || '',
    keyHighlights: [
      analysis.tech_comment,
      analysis.team_comment,
      analysis.fin_comment,
      analysis.mkt_comment
    ].filter(Boolean).slice(0, 4),
    evidenceItems: buildEvidenceItems(materials),
    materialSummary: analysis.material_summary || '',
    analysisSnapshot: {
      ...analysis,
      scores: dimensionScores
    }
  }

  dossier.contextBrief = buildContextBrief(profile, dossier, materials)
  return dossier
}

export function shouldUseAIDossier(runtimeProfile = {}, materials = []) {
  if (!runtimeProfile?.official?.enabled || !runtimeProfile?.official?.apiKey || !runtimeProfile?.official?.endpointId) {
    return false
  }

  return materials.some((item) => item.officialFileId || item.inlineText || item.kind === 'image')
}

export function buildDossierAnalysisRuntimeProfile(baseProfile = {}, materials = []) {
  const evidenceList = buildEvidenceItems(materials)
    .map((item) => `${item.name}（${item.kind}，${item.state}）`)
    .join('、')

  return {
    ...baseProfile,
    assistantMode: 'analysis',
    professionalRole: 'dossier_analyst',
    roleLabel: 'Enterprise Dossier Analyst',
    communicationStyle: '审慎、结构化',
    personaStyle: '企业资料抽取与授信预分析助手',
    mode: 'credit',
    outputStyle: 'json',
    objective: '基于当前企业录入信息与附件内容，提炼企业摘要并给出四维度分析分。',
    focus: ['企业画像', '主营业务', '四维度评分', '摘要结论'],
    enabledTools: ['文件理解', '信息抽取', '维度评分'],
    workflowLabel: 'Enterprise dossier analysis',
    systemPrompt: [
      '你是企业 dossier 预分析助手。',
      '请优先读取用户上传的 PDF、图片和文本附件，提炼企业的基础画像与主营业务。',
      '你的任务不是写授信审批意见，而是生成稳定的中间层企业摘要，供后续角色复用。',
      '请仅基于录入信息与附件内容作答，不要凭空补全未出现的事实。',
      '请给出技术、团队、财务、市场四个维度 0-100 的评分，并输出一句完整摘要。',
      '如果信息不足，也要给出保守评分，并在 highlights 中说明依据不足。'
    ].join('\n'),
    externalBrief: evidenceList ? `已接入资料：${evidenceList}` : ''
  }
}

export function buildDossierAnalysisPrompt(profile, materials = []) {
  const evidenceHints = buildEvidenceItems(materials)
    .map((item, index) => `${index + 1}. ${item.name} / ${item.kind} / ${item.state}${item.excerpt ? ` / ${item.excerpt}` : ''}`)
    .join('\n')

  return [
    '请基于企业录入信息与附件内容，输出严格 JSON，不要输出 markdown，不要补充解释。',
    '字段结构如下：',
    '{',
    '  "company_profile": {',
    '    "name": "字符串",',
    '    "industry": "字符串",',
    '    "founded": "字符串",',
    '    "business": "一句主营业务描述"',
    '  },',
    '  "dimension_scores": {',
    '    "tech": 0-100 数字,',
    '    "team": 0-100 数字,',
    '    "finance": 0-100 数字,',
    '    "market": 0-100 数字',
    '  },',
    '  "overview": "100字以内摘要",',
    '  "highlights": ["字符串1", "字符串2", "字符串3"]',
    '}',
    '',
    `当前企业录入信息：名称=${profile.name}；行业=${profile.industry}；成立年份=${profile.founded}；现有评分=${profile.scores.total}。`,
    evidenceHints ? `当前已接入资料：\n${evidenceHints}` : '当前无附件资料。'
  ].join('\n')
}

function extractJsonBlock(text = '') {
  const raw = String(text || '').trim()
  if (!raw) return null

  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] || raw
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < 0 || end <= start) return null

  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    return null
  }
}

export function mergeAIDossier(baseDossier, aiResult = {}, materials = []) {
  const companyProfile = {
    ...baseDossier.companyProfile,
    ...(aiResult.company_profile || {})
  }

  const aiScores = {
    tech: clampScore(aiResult.dimension_scores?.tech, baseDossier.dimensionScores.tech),
    team: clampScore(aiResult.dimension_scores?.team, baseDossier.dimensionScores.team),
    finance: clampScore(aiResult.dimension_scores?.finance, baseDossier.dimensionScores.finance),
    market: clampScore(aiResult.dimension_scores?.market, baseDossier.dimensionScores.market)
  }

  const dimensionScores = {
    ...aiScores,
    total: computeTotal(aiScores)
  }

  const dossier = {
    ...baseDossier,
    source: 'ai',
    generatedAt: new Date().toISOString(),
    companyProfile,
    dimensionScores,
    overview: String(aiResult.overview || baseDossier.overview || '').trim(),
    keyHighlights: Array.isArray(aiResult.highlights) && aiResult.highlights.length
      ? aiResult.highlights.map((item) => String(item).trim()).filter(Boolean).slice(0, 4)
      : baseDossier.keyHighlights,
    analysisSnapshot: {
      ...baseDossier.analysisSnapshot,
      summary: String(aiResult.overview || baseDossier.analysisSnapshot?.summary || '').trim(),
      scores: dimensionScores
    }
  }

  dossier.contextBrief = buildContextBrief(baseDossier.normalizedProfile, dossier, materials)
  return dossier
}

export function parseDossierAnalysisResult(text = '') {
  return extractJsonBlock(text)
}
