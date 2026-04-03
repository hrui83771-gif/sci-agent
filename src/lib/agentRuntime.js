import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import MarkdownIt from 'markdown-it'

const FRONTEND_MODELS = [
  { id: 'doubao', name: '豆包', provider: 'Volcengine', available: true },
  { id: 'deepseek', name: 'DeepSeek', provider: 'DeepSeek', available: true },
  { id: 'kimi', name: 'Kimi', provider: 'Moonshot', available: true }
]

const DEFAULT_ARK_MODEL = import.meta.env.VITE_ARK_MODEL || 'doubao-1-5-vision-pro-32k-250115'
const DEFAULT_ARK_VIDEO_MODEL = import.meta.env.VITE_ARK_VIDEO_MODEL || 'doubao-seedance-1-5-pro-251215'

const LIVE_ARK_MODELS = [
  {
    id: DEFAULT_ARK_MODEL,
    name: 'Doubao Seed 2.0 Lite',
    provider: 'Volcengine Ark',
    category: 'text',
    categoryLabel: '文本 / 图片理解',
    available: true,
    chatReady: true,
    featured: true
  },
  {
    id: 'doubao-seed-1-6-250615',
    name: 'Doubao Seed 1.6',
    provider: 'Volcengine Ark',
    category: 'text',
    categoryLabel: '文本推理',
    available: true,
    chatReady: true
  },
  {
    id: 'doubao-1.5-vision-pro-32k-250115',
    name: 'Doubao Vision Pro',
    provider: 'Volcengine Ark',
    category: 'vision',
    categoryLabel: '视觉理解',
    available: true,
    chatReady: true
  },
  {
    id: 'doubao-seedream-4-5-251128',
    name: 'Doubao Seedream 4.5',
    provider: 'Volcengine Ark',
    category: 'image',
    categoryLabel: '图片生成',
    available: true,
    chatReady: true
  },
  {
    id: DEFAULT_ARK_VIDEO_MODEL,
    name: 'Doubao Seedance 1.5 Pro',
    provider: 'Volcengine Ark',
    category: 'video',
    categoryLabel: '视频生成',
    available: true,
    chatReady: true
  }
]

const ARK_CHAT_MODELS = [
  {
    id: DEFAULT_ARK_MODEL,
    name: 'Doubao Seed 2.0 Lite',
    provider: 'Volcengine Ark',
    category: 'text',
    categoryLabel: '文本 / 多模态',
    available: true,
    chatReady: true,
    featured: true
  },
  {
    id: 'doubao-1-5-vision-pro-32k-250115',
    name: 'Doubao Vision Pro',
    provider: 'Volcengine Ark',
    category: 'vision',
    categoryLabel: '视觉理解',
    available: true,
    chatReady: true
  },
  {
    id: 'doubao-seed-1-6-251015',
    name: 'Doubao Seed 1.6',
    provider: 'Volcengine Ark',
    category: 'text',
    categoryLabel: '文本推理',
    available: true,
    chatReady: true
  },
  {
    id: 'preview-seedream-4-0',
    name: 'Seedream 4.0',
    provider: 'Volcengine Ark',
    category: 'image',
    categoryLabel: '图像生成',
    available: true,
    chatReady: false
  },
  {
    id: 'preview-doubao-seedance-2-0',
    name: 'Doubao Seedance 2.0',
    provider: 'Volcengine Ark',
    category: 'video',
    categoryLabel: '视频生成',
    available: true,
    chatReady: false
  },
  {
    id: 'preview-doubao-realtime-voice',
    name: 'Doubao Realtime Voice',
    provider: 'Volcengine Ark',
    category: 'speech',
    categoryLabel: '语音',
    available: true,
    chatReady: false
  }
]

const MODE_LABELS = {
  credit: '授信审查',
  due_diligence: '尽调补件',
  risk: '风险诊断',
  memo: '会审纪要',
  post_loan: '贷后跟踪'
}

const OUTPUT_LABELS = {
  executive: '结论优先',
  checklist: '行动清单',
  memo: '会审纪要',
  json: '结构化 JSON'
}

const reportMarkdown = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true
})

function normalizeProfile(profile = {}) {
  return {
    assistantMode: profile.assistantMode || 'analysis',
    professionalRole: profile.professionalRole || 'customer_manager',
    communicationStyle: profile.communicationStyle || 'balanced',
    mode: profile.mode || 'credit',
    outputStyle: profile.outputStyle || 'executive',
    personaStyle: profile.personaStyle || '审慎银行家',
    rigor: Number(profile.rigor || 4),
    depth: Number(profile.depth || 4),
    focus: profile.focus || ['授信结论', '风险缓释'],
    enabledTools: profile.enabledTools || [],
    memory: profile.memory || '',
    objective: profile.objective || '',
    workflowLabel: profile.workflowLabel || '自由对话',
    externalBrief: profile.externalBrief || ''
  }
}

function buildQuickAssistantReply(content, profile = {}) {
  const normalized = String(content || '').trim()

  if (!normalized) {
    return '请输入你想咨询的问题。'
  }

  const styleLead =
    profile.communicationStyle === 'direct'
      ? '当前在线问答暂时不可用。'
      : profile.communicationStyle === 'careful'
        ? '当前在线模型连接异常。'
        : '当前快捷助手暂时无法连接在线模型。'

  return [
    styleLead,
    '快捷助手不会自动带入企业画像或专业分析模板，因此离线状态下无法可靠完成开放式问答。',
    '请稍后重试在线问答，或切换到“专业分析”继续使用结构化分析。',
    `你的问题：${normalized}`
  ].join('\n\n')
}

function averageRisk(risks = []) {
  if (!risks.length) return 0.35
  return risks.reduce((sum, item) => sum + Number(item.value || 0), 0) / risks.length
}

function pickPrimaryProduct(products = []) {
  return [...products].sort((a, b) => Number(b.match || 0) - Number(a.match || 0))[0]
}

function scoreLabel(score, strongLabel, mediumLabel, weakLabel) {
  if (score >= 88) return strongLabel
  if (score >= 75) return mediumLabel
  return weakLabel
}

function summarizeMaterials(materials = []) {
  if (!materials.length) {
    return {
      text: '资料池为空，建议补充财务报表、订单证明和核心技术材料。',
      count: 0,
      officialCount: 0
    }
  }

  const labelMap = {
    pdf: 'PDF',
    sheet: '表格',
    image: '图片',
    doc: '文档',
    generic: '附件'
  }

  const grouped = materials.reduce((acc, item) => {
    const key = item.kind || 'generic'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const officialCount = materials.filter((item) => item.officialFileId).length
  const parts = Object.entries(grouped).map(([key, count]) => `${labelMap[key] || '附件'} ${count} 份`)

  return {
    text: parts.join('、') + (officialCount ? `，其中 ${officialCount} 份已接入官方 Files API` : ''),
    count: materials.length,
    officialCount
  }
}

function buildGapList(enterprise, materials = []) {
  const kinds = new Set(materials.map((item) => item.kind))
  const gaps = []

  if (!kinds.has('sheet')) gaps.push('缺少财务表格或经营报表')
  if (!kinds.has('image')) gaps.push('缺少图片类佐证材料，如专利证书、设备照片或票据截图')
  if (!kinds.has('doc')) gaps.push('缺少尽调纪要、访谈记录或会议材料')
  if (Number(enterprise.scores.finance || 0) < 80) gaps.push('需要补充流水、回款凭证和应收账龄明细')
  if (Number(enterprise.scores.market || 0) < 80) gaps.push('需要补充核心客户订单、验收和复购证明')
  if (Number(enterprise.scores.tech || 0) < 85) gaps.push('需要补充专利、软著和研发项目证据')

  return gaps.length ? gaps : ['当前资料较完整，可进入更深层的授信论证']
}

function buildNextSteps(enterprise, materials, profile) {
  const steps = []

  if (profile.mode === 'due_diligence') {
    steps.push('先补齐缺失材料，再执行第二轮授信判断')
    steps.push('将资料池按财务、专利、订单、访谈四类重新归档')
  } else if (profile.mode === 'risk') {
    steps.push('优先形成风险缓释条款和提款前置条件')
    steps.push('建立风险点与证据材料的一一映射')
  } else if (profile.mode === 'memo') {
    steps.push('将当前判断整理为会审结论、依据、风险与待补事项')
    steps.push('补充核心证据后生成可直接讨论的纪要稿')
  } else if (profile.mode === 'post_loan') {
    steps.push('整理贷后监控指标、预警阈值和复盘周期')
    steps.push('建立订单、回款和经营指标联动跟踪表')
  } else {
    steps.push('先形成授信结论，再落额度、期限、利率和前提条件')
    steps.push('补足关键缺口后进入会审或审批讨论')
  }

  if (materials.length < 3) {
    steps.push('继续扩充资料池，至少覆盖财务、文本和图片三类材料')
  }

  if (Number(enterprise.scores.finance || 0) < 75) {
    steps.push('优先穿透现金流与负债结构，避免仅凭技术评分推进')
  }

  return steps
}

function buildToolPlan(profile) {
  if (!profile.enabledTools.length) return '当前未启用专项工具。'
  return `建议优先串联：${profile.enabledTools.join(' -> ')}。`
}

function detectIntent(text, profile) {
  if (text.includes('json')) return 'json'
  if (text.includes('会审') || text.includes('纪要')) return 'memo'
  if (text.includes('缺口') || text.includes('补件') || text.includes('资料')) return 'gaps'
  if (text.includes('风险') || text.includes('预警')) return 'risk'
  if (text.includes('流程') || text.includes('计划') || text.includes('下一步')) return 'plan'
  if (text.includes('额度') || text.includes('授信') || profile.mode === 'credit') return 'credit'
  return 'generic'
}

function formatChecklist(lines) {
  return lines.map((item, index) => `${index + 1}. ${item}`).join('\n')
}

function buildAssessment(enterprise, materials = [], runtimeProfile = {}) {
  const profile = normalizeProfile(runtimeProfile)
  const product = pickPrimaryProduct(enterprise.products)
  const riskAverage = averageRisk(enterprise.risks)
  const materialInfo = summarizeMaterials(materials)

  const tech = Number(enterprise.scores.tech || 0)
  const team = Number(enterprise.scores.team || 0)
  const finance = Number(enterprise.scores.finance || 0)
  const market = Number(enterprise.scores.market || 0)

  const summary = `${enterprise.name} 当前综合评分 ${enterprise.scores.total}，在 ${MODE_LABELS[profile.mode]} 模式下判断为${scoreLabel(
    Number(enterprise.scores.total || 0),
    '可优先推进',
    '补件后推进',
    '需审慎推进'
  )}。`

  const techComment = scoreLabel(
    tech,
    '技术壁垒较强，建议继续核验专利质量、研发转化效率和关键技术可替代性。',
    '技术能力中上，建议补充研发里程碑、专利清单和产品化证明。',
    '技术论证偏弱，建议优先补足专利、软著和研发团队证据。'
  )

  const teamComment = scoreLabel(
    team,
    '团队稳定性较好，可重点核验治理结构、激励绑定和关键岗位冗余。',
    '团队基础可用，但需补充高管履历、股权安排和组织连续性预案。',
    '团队稳定性存在不确定性，建议将关键人风险列为重点核验项。'
  )

  const financeComment = scoreLabel(
    finance,
    '财务结构整体健康，可继续核验现金流质量、回款节奏和债务期限结构。',
    '财务表现中性，建议加强应收、补贴到账和负债结构的穿透核验。',
    '财务承压较明显，建议采用分阶段提款、回款监管和附条件授信。'
  )

  const marketComment = scoreLabel(
    market,
    '市场验证较充分，可围绕核心客户、复购率和订单稳定性强化授信依据。',
    '市场验证已有基础，但需要更多订单、验收和客户黏性证明。',
    '市场验证偏弱，建议优先补充标杆客户、订单转化和商业闭环证据。'
  )

  const riskAdvice =
    riskAverage >= 0.58
      ? '建议采取小额起步、分阶段提款、订单或知识产权增信，并设置关键指标复审条件。'
      : '建议采用回款监管、订单增信、知识产权质押或设备抵押等方式降低敞口风险。'

  const productRecommendation = product
    ? `${product.name} 匹配度 ${Math.round(Number(product.match || 0) * 100)}%，建议以 ${product.amount} 万级别方案起草。`
    : '建议优先考虑科创信用贷或知识产权质押贷。'

  return {
    summary,
    tech_comment: techComment,
    team_comment: teamComment,
    fin_comment: financeComment,
    mkt_comment: marketComment,
    risk_advice: riskAdvice,
    product_rec: productRecommendation,
    material_summary: materialInfo.text,
    material_count: materialInfo.count,
    official_material_count: materialInfo.officialCount,
    risk_level: riskAverage >= 0.58 ? '高压观察' : riskAverage >= 0.35 ? '中等预警' : '相对稳健',
    focus_summary: profile.focus.join('、'),
    tool_summary: profile.enabledTools.length ? profile.enabledTools.join('、') : '未启用专项工具',
    workflow_label: profile.workflowLabel || '自由对话',
    gaps: buildGapList(enterprise, materials),
    next_steps: buildNextSteps(enterprise, materials, profile)
  }
}

function buildReplyPayload(content, enterprise, materials = [], analysis, runtimeProfile = {}) {
  const profile = normalizeProfile(runtimeProfile)
  if (profile.assistantMode === 'quick') {
    return buildQuickAssistantReply(content, profile)
  }

  const localAnalysis = analysis || buildAssessment(enterprise, materials, profile)
  const intent = detectIntent(content, profile)
  const toolPlan = buildToolPlan(profile)

  if (intent === 'json' || profile.outputStyle === 'json') {
    return JSON.stringify(
      {
        mode: MODE_LABELS[profile.mode],
        output_style: OUTPUT_LABELS[profile.outputStyle],
        workflow: localAnalysis.workflow_label,
        conclusion: localAnalysis.summary,
        key_findings: {
          tech: localAnalysis.tech_comment,
          team: localAnalysis.team_comment,
          finance: localAnalysis.fin_comment,
          market: localAnalysis.mkt_comment
        },
        risk: {
          level: localAnalysis.risk_level,
          advice: localAnalysis.risk_advice
        },
        product: localAnalysis.product_rec,
        materials: {
          summary: localAnalysis.material_summary,
          total_count: localAnalysis.material_count,
          official_count: localAnalysis.official_material_count
        },
        gaps: localAnalysis.gaps,
        next_steps: localAnalysis.next_steps,
        tools: profile.enabledTools
      },
      null,
      2
    )
  }

  if (intent === 'memo' || profile.outputStyle === 'memo') {
    return [
      `【模式】${MODE_LABELS[profile.mode]}`,
      `【任务流】${localAnalysis.workflow_label}`,
      `【结论】${localAnalysis.summary}`,
      `【依据】技术：${localAnalysis.tech_comment}`,
      `【依据】财务：${localAnalysis.fin_comment}`,
      `【风险】${localAnalysis.risk_advice}`,
      `【产品】${localAnalysis.product_rec}`,
      `【资料】${localAnalysis.material_summary}`,
      `【缺口】${localAnalysis.gaps.join('；')}`,
      `【下一步】${localAnalysis.next_steps.join('；')}`
    ].join('\n')
  }

  if (intent === 'gaps') {
    return formatChecklist([
      `当前资料概况：${localAnalysis.material_summary}`,
      ...localAnalysis.gaps,
      ...localAnalysis.next_steps
    ])
  }

  if (intent === 'risk') {
    return [
      `风险等级：${localAnalysis.risk_level}`,
      `风险判断：${localAnalysis.risk_advice}`,
      `资料缺口：${localAnalysis.gaps.join('；')}`,
      `工具规划：${toolPlan}`
    ].join('\n')
  }

  if (intent === 'plan') {
    return formatChecklist([
      `当前模式：${MODE_LABELS[profile.mode]}`,
      `当前目标：${profile.objective || '形成可执行授信判断'}`,
      `任务流：${localAnalysis.workflow_label}`,
      `重点关注：${localAnalysis.focus_summary}`,
      ...localAnalysis.next_steps,
      `工具规划：${toolPlan}`
    ])
  }

  if (intent === 'credit') {
    const lines = [
      `结论：${localAnalysis.summary}`,
      `建议产品：${localAnalysis.product_rec}`,
      `风险缓释：${localAnalysis.risk_advice}`,
      `资料缺口：${localAnalysis.gaps.join('；')}`,
      `资料概况：${localAnalysis.material_summary}`
    ]

    if (profile.outputStyle === 'checklist') {
      return formatChecklist(lines.concat(localAnalysis.next_steps))
    }

    return lines.concat(`下一步：${localAnalysis.next_steps.join('；')}`).join('\n')
  }

  const genericLines = [
    `当前模式：${MODE_LABELS[profile.mode]} / 输出：${OUTPUT_LABELS[profile.outputStyle]}`,
    `任务流：${localAnalysis.workflow_label}`,
    `结论：${localAnalysis.summary}`,
    `重点关注：${localAnalysis.focus_summary}`,
    `资料概况：${localAnalysis.material_summary}`,
    `工具规划：${toolPlan}`
  ]

  if (profile.memory) {
    genericLines.push(`会话记忆：${profile.memory}`)
  }

  if (profile.externalBrief) {
    genericLines.push(`外部资料：${profile.externalBrief}`)
  }

  return genericLines.join('\n')
}

export function getFrontendModels() {
  return LIVE_ARK_MODELS
}

export function analyzeEnterprise(enterprise, materials = [], runtimeProfile = {}) {
  return buildAssessment(enterprise, materials, runtimeProfile)
}

export function diagnoseEnterprise(enterprise, materials = [], runtimeProfile = {}) {
  const assessment = buildAssessment(enterprise, materials, runtimeProfile)
  return [
    `当前企业处于 ${assessment.risk_level} 状态。`,
    `风险缓释建议：${assessment.risk_advice}`,
    `资料缺口：${assessment.gaps.join('；')}`,
    `建议下一步：${assessment.next_steps.join('；')}`
  ].join('\n')
}

export function buildAssistantReply({
  content,
  enterprise,
  materials = [],
  analysis,
  runtimeProfile = {}
}) {
  return buildReplyPayload(String(content || '').trim(), enterprise, materials, analysis, runtimeProfile)
}

async function createPdfReportFile(payload, safeName) {
  const { enterprise, draftText } = payload
  const pdf = new jsPDF({
    unit: 'pt',
    format: 'a4'
  })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const mount = document.createElement('div')
  mount.style.position = 'fixed'
  mount.style.left = '-99999px'
  mount.style.top = '0'
  mount.style.width = '794px'
  mount.style.background = '#ffffff'
  mount.style.zIndex = '-1'

  const content = document.createElement('div')
  content.style.width = '794px'
  content.style.padding = '0'
  content.style.background = '#ffffff'
  content.style.color = '#152437'
  content.style.fontFamily = '"Microsoft YaHei","PingFang SC","Noto Sans CJK SC","Segoe UI",sans-serif'

  content.innerHTML = `
    <section style="background:#0f8b8d;color:#fff;padding:42px 48px 34px;">
      <h1 style="margin:0;font-size:32px;line-height:1.25;font-weight:700;">${escapeHtml(`${enterprise.name} AI 分析文档`)}</h1>
    </section>
    <section style="padding:34px 48px 12px;font-size:15px;line-height:1.8;">
      <p style="margin:0 0 8px;"><strong>行业：</strong>${escapeHtml(String(enterprise.industry || '--'))}</p>
      <p style="margin:0 0 8px;"><strong>综合评分：</strong>${escapeHtml(String(enterprise.scores?.total ?? '--'))}</p>
      <p style="margin:0 0 18px;"><strong>生成时间：</strong>${escapeHtml(new Date().toLocaleString('zh-CN'))}</p>
      <article class="report-markdown">${reportMarkdown.render(String(draftText || '').trim())}</article>
    </section>
  `

  const style = document.createElement('style')
  style.textContent = `
    .report-markdown { color:#152437; font-size:15px; line-height:1.85; }
    .report-markdown h1, .report-markdown h2, .report-markdown h3 { color:#173047; margin:0 0 14px; line-height:1.35; }
    .report-markdown h1 { font-size:28px; }
    .report-markdown h2 { font-size:24px; }
    .report-markdown h3 { font-size:20px; }
    .report-markdown p { margin:0 0 14px; }
    .report-markdown ul, .report-markdown ol { margin:0 0 14px; padding-left:22px; }
    .report-markdown li { margin:0 0 8px; }
    .report-markdown hr { border:none; border-top:1px solid rgba(21,36,55,0.14); margin:18px 0; }
    .report-markdown strong { font-weight:700; color:#173047; }
    .report-markdown blockquote { margin:0 0 14px; padding-left:14px; border-left:3px solid rgba(15,139,141,0.28); color:#607387; }
    .report-markdown pre { margin:0 0 14px; padding:14px 16px; border-radius:14px; background:#f4f8fb; overflow:hidden; white-space:pre-wrap; }
    .report-markdown code { font-family:"Consolas","SFMono-Regular",monospace; }
  `

  mount.appendChild(style)
  mount.appendChild(content)
  document.body.appendChild(mount)

  if (document.fonts?.ready) {
    try {
      await document.fonts.ready
    } catch {
      // ignore font readiness errors
    }
  }

  const canvas = await html2canvas(content, {
    backgroundColor: '#ffffff',
    scale: 2,
    useCORS: true,
    logging: false
  })

  document.body.removeChild(mount)

  const pageHeightPx = Math.floor(canvas.width * (pageHeight / pageWidth))
  let renderedHeight = 0
  let firstPage = true

  while (renderedHeight < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - renderedHeight)
    const pageCanvas = document.createElement('canvas')
    pageCanvas.width = canvas.width
    pageCanvas.height = sliceHeight
    const pageCtx = pageCanvas.getContext('2d')
    pageCtx.drawImage(
      canvas,
      0,
      renderedHeight,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight
    )

    if (!firstPage) pdf.addPage()
    firstPage = false

    const imageHeight = (sliceHeight * pageWidth) / canvas.width
    pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageWidth, imageHeight)
    renderedHeight += sliceHeight
  }

  return {
    filename: `${safeName}.pdf`,
    blob: pdf.output('blob')
  }
}

export async function createReportFile(type, payload) {
  const { enterprise, analysis, draftText } = payload
  const safeName = String(enterprise.name || 'report').replace(/[\\/:*?"<>|]/g, '_')

  if (type === 'pdf') {
    return createPdfReportFile(payload, safeName)
  }

  if (type === 'json') {
    return {
      filename: `${safeName}.json`,
      blob: new Blob(
        [
          JSON.stringify(
            {
              enterprise,
              analysis,
              draft: draftText,
              generated_at: new Date().toISOString()
            },
            null,
            2
          )
        ],
        { type: 'application/json;charset=utf-8' }
      )
    }
  }

  if (type === 'png') {
    const canvas = document.createElement('canvas')
    canvas.width = 1400
    canvas.height = 900
    const ctx = canvas.getContext('2d')

    ctx.fillStyle = '#eff4f1'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#0f8b8d'
    ctx.fillRect(0, 0, canvas.width, 110)
    ctx.fillStyle = '#ffffff'
    ctx.font = 'bold 42px Segoe UI'
    ctx.fillText(`${enterprise.name} AI 授信简报`, 56, 68)

    ctx.fillStyle = '#152437'
    ctx.font = '24px Segoe UI'
    ctx.fillText(`行业：${enterprise.industry}`, 56, 170)
    ctx.fillText(`综合评分：${enterprise.scores.total}`, 56, 214)
    ctx.fillText(`生成时间：${new Date().toLocaleString('zh-CN')}`, 56, 258)

    const lines = String(draftText)
      .replace(/#/g, '')
      .split('\n')
      .filter(Boolean)
      .slice(0, 16)

    ctx.font = '22px Segoe UI'
    let y = 330
    for (const line of lines) {
      ctx.fillText(line.slice(0, 54), 56, y)
      y += 38
    }

    return {
      filename: `${safeName}.png`,
      blob: dataUrlToBlob(canvas.toDataURL('image/png'))
    }
  }

  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeName}</title>
        <style>
          body { font-family: "Segoe UI", "PingFang SC", sans-serif; padding: 32px; color: #152437; }
          h1 { color: #0f8b8d; }
          pre { white-space: pre-wrap; line-height: 1.7; font-family: inherit; }
        </style>
      </head>
      <body>
        <h1>${enterprise.name} 授信建议</h1>
        <p>行业：${enterprise.industry}</p>
        <p>综合评分：${enterprise.scores.total}</p>
        <pre>${escapeHtml(String(draftText))}</pre>
      </body>
    </html>
  `

  return {
    filename: `${safeName}.doc`,
    blob: new Blob([html], { type: 'application/msword;charset=utf-8' })
  }
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',')
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream'
  const binary = atob(parts[1])
  const length = binary.length
  const array = new Uint8Array(length)

  for (let index = 0; index < length; index += 1) {
    array[index] = binary.charCodeAt(index)
  }

  return new Blob([array], { type: mime })
}

function escapeHtml(text) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
}
