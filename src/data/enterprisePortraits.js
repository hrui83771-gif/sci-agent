function computeTotal(scores = {}) {
  const values = ['tech', 'team', 'finance', 'market'].map((key) => Number(scores[key] ?? 0))
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
}

function buildProduct(id, name, amount, rate, color, fit, reason, category = 'credit') {
  const values = Object.values(fit || {}).map((item) => Number(item ?? 0))
  const baseMatch = Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2))

  return {
    id,
    name,
    name_en: name,
    amount,
    rate,
    color,
    fit,
    baseMatch,
    reason,
    category
  }
}

function buildDimension(label, score, summary, highlights, risks, evidence, recommendation) {
  return {
    label,
    score,
    summary,
    highlights,
    risks,
    evidence,
    recommendation
  }
}

function buildEnterprise(payload) {
  const total = computeTotal(payload.scores)

  return {
    ...payload,
    scores: {
      ...payload.scores,
      total
    }
  }
}

export const enterprisePortraits = [
  buildEnterprise({
    id: 'E001',
    name: '深鉴智造科技有限公司',
    industry: '高端装备 / 工业视觉',
    founded: '2019',
    city: '合肥',
    overview: '核心优势在工业视觉算法、检测装备与场景化交付能力，属于技术和市场双强型企业。',
    scores: { tech: 88, team: 84, finance: 76, market: 91 },
    dimensions: {
      tech: buildDimension(
        '技术维度',
        88,
        '技术壁垒较强，建议继续核验专利质量、研发转化效率和关键技术可替代性。',
        ['拥有工业视觉算法与装备协同能力', '技术路线清晰，交付场景成熟', '应持续验证关键技术替代风险'],
        ['研发投入回报周期偏长', '专利质量与商业转化需持续跟踪'],
        ['近两年专利与软著清单', '核心算法与设备说明书', '样板客户验收材料'],
        '适合继续推进科创信用授信，并将专利质量与技术转化作为重点核验项。'
      ),
      team: buildDimension(
        '团队维度',
        84,
        '核心团队基础可用，但需补充高管履历、股权安排和组织延续性预案。',
        ['核心成员稳定性尚可', '产研结构较完整', '组织扩张阶段需要强化治理'],
        ['市场化管理经验仍待补强', '关键岗位冗余不足'],
        ['高管履历与股权结构', '核心岗位组织图', '激励机制说明'],
        '建议关注管理层补位和治理机制，授信时同步审查关键人风险。'
      ),
      finance: buildDimension(
        '财务维度',
        76,
        '财务表现中性，建议加强应收、补贴到账和负债结构的穿透核验。',
        ['收入规模具备基础', '现金流承压但可控', '负债结构需持续观察'],
        ['回款节奏受制造业周期影响', '研发投入抬升短期利润压力'],
        ['近两年财务报表', '应收账款账龄明细', '补贴到账凭证'],
        '宜采用额度分步投放与回款监管，缓释财务波动带来的授信风险。'
      ),
      market: buildDimension(
        '市场维度',
        91,
        '市场验证较充分，可围绕核心客户、复购率和订单稳定性强化授信依据。',
        ['头部客户认可度较高', '订单延续性较强', '赛道处于景气扩张阶段'],
        ['下游资本开支周期影响订单波动', '客户集中度需持续跟踪'],
        ['前五大客户清单', '在手订单合同', '项目验收与复购记录'],
        '可将市场侧优势作为授信支持项，同时持续跟踪客户结构变化。'
      )
    },
    products: [
      buildProduct('P101', '科创信用贷', 5000, 'LPR + 45BP', '#00d4ff', { tech: 0.92, team: 0.84, finance: 0.73, market: 0.9 }, '适合技术与市场双强、缺少重资产抵押的成长型企业。'),
      buildProduct('P102', '知识产权质押贷', 3200, 'LPR + 70BP', '#f59e0b', { tech: 0.95, team: 0.76, finance: 0.68, market: 0.74 }, '适合用专利和软著强化授信抓手。'),
      buildProduct('P103', '订单回款贷', 2600, 'LPR + 60BP', '#22c55e', { tech: 0.7, team: 0.74, finance: 0.86, market: 0.9 }, '适合有明确订单和回款路径的项目型企业。')
    ]
  }),
  buildEnterprise({
    id: 'E002',
    name: '清源储能系统有限公司',
    industry: '新能源 / 储能系统',
    founded: '2018',
    city: '苏州',
    overview: '市场端表现强于财务端，具备订单基础，但成本波动和回款周期需重点关注。',
    scores: { tech: 84, team: 87, finance: 82, market: 92 },
    dimensions: {
      tech: buildDimension('技术维度', 84, '技术体系成熟，重点关注电芯集成方案和系统安全验证。', ['系统集成能力较完整', '产品验证路径清晰', '安全性验证资料较关键'], ['对上游供应链技术依赖度较高'], ['认证证书', '产品测试报告', '系统方案书'], '适合围绕系统方案与安全认证进行授信核验。'),
      team: buildDimension('团队维度', 87, '团队成熟度较好，治理和交付协同能力强。', ['管理层具备行业经验', '交付团队稳定', '组织协同效率较高'], ['扩张阶段需要强化区域管控'], ['管理团队履历', '组织架构图', '交付制度说明'], '团队可以作为支撑项，但仍需核关键人持续性。'),
      finance: buildDimension('财务维度', 82, '财务基础较稳，建议持续关注回款周期与原材料价格波动。', ['现金流基本可控', '负债结构尚可', '成本波动传导较明显'], ['项目回款周期偏长'], ['财务报表', '采购合同', '回款进度表'], '可考虑中性偏积极授信，辅以订单和回款监控。'),
      market: buildDimension('市场维度', 92, '订单和客户验证较强，是当前最主要优势维度。', ['头部客户订单明确', '新能源景气度较高', '项目交付记录较稳定'], ['政策节奏对需求释放有影响'], ['订单台账', '客户验收材料', '渠道合作协议'], '可围绕订单储备与客户结构强化产品匹配。')
    },
    products: [
      buildProduct('P201', '订单回款贷', 4600, 'LPR + 48BP', '#22c55e', { tech: 0.78, team: 0.84, finance: 0.88, market: 0.95 }, '与储能系统订单场景匹配度高。'),
      buildProduct('P202', '项目履约贷', 3800, 'LPR + 62BP', '#38bdf8', { tech: 0.8, team: 0.86, finance: 0.82, market: 0.91 }, '适合设备交付和工程履约并行的企业。'),
      buildProduct('P203', '设备更新贷', 2400, 'LPR + 75BP', '#a855f7', { tech: 0.76, team: 0.8, finance: 0.79, market: 0.74 }, '用于支持产线扩产和设备升级。')
    ]
  }),
  buildEnterprise({
    id: 'E003',
    name: '星穹生物医药有限公司',
    industry: '生物医药 / 创新药',
    founded: '2020',
    city: '上海',
    overview: '技术亮点明显，但财务和市场验证仍处于爬坡阶段，整体更适合审慎授信。',
    scores: { tech: 95, team: 80, finance: 68, market: 73 },
    dimensions: {
      tech: buildDimension('技术维度', 95, '研发能力突出，重点核验临床阶段、专利布局和技术转化路径。', ['研发壁垒强', '管线布局清晰', '技术可讲述性强'], ['研发商业化周期长'], ['专利清单', '临床里程碑', '研发计划'], '技术可作为核心亮点，但授信节奏应匹配研发阶段。'),
      team: buildDimension('团队维度', 80, '团队结构尚可，需重点补充医学与商业化双线能力。', ['科研团队有深度', '核心管理层稳定'], ['商业化经验不足'], ['核心成员履历', '组织分工', '股权安排'], '建议强化关键人风险与商业化补位审查。'),
      finance: buildDimension('财务维度', 68, '财务承压明显，需要重点审查现金消耗和下一轮融资衔接。', ['账上资金可支撑阶段运营', '研发投入占比高'], ['现金消耗快', '盈利转化周期长'], ['现金流预测', '融资计划', '费用明细'], '宜采用小额、分阶段、附条件式授信。'),
      market: buildDimension('市场维度', 73, '市场验证仍处于早期，更适合围绕BD合作和阶段成果审慎推进。', ['潜在市场空间较大', '合作预期存在'], ['真实收入与订单基础不足'], ['BD协议', '阶段性合作框架', '市场测算'], '建议将市场端资料作为授信前置补件。')
    },
    products: [
      buildProduct('P301', '研发桥接贷', 1800, 'LPR + 95BP', '#a855f7', { tech: 0.94, team: 0.74, finance: 0.7, market: 0.68 }, '适合研发管线推进期的小额阶段融资。'),
      buildProduct('P302', '知识产权质押贷', 2200, 'LPR + 80BP', '#f59e0b', { tech: 0.96, team: 0.7, finance: 0.65, market: 0.6 }, '以专利与技术成果作为授信支撑更合适。'),
      buildProduct('P303', '股债联动储备方案', 3000, '定制化', '#22c55e', { tech: 0.88, team: 0.76, finance: 0.64, market: 0.71 }, '适合作为后续资本协同方案储备。')
    ]
  }),
  buildEnterprise({
    id: 'E004',
    name: '云岚机器人科技有限公司',
    industry: '智能机器人 / 工业自动化',
    founded: '2017',
    city: '深圳',
    overview: '团队与市场均衡，产品化能力较好，适合做中性偏积极的画像展示。',
    scores: { tech: 86, team: 90, finance: 79, market: 88 },
    dimensions: {
      tech: buildDimension('技术维度', 86, '软硬件一体化能力较好，重点关注核心部件自研比例。', ['控制算法成熟', '方案复制能力强'], ['核心部件依赖外采'], ['软硬件方案', '测试报告', '产品手册'], '授信时核验核心部件供应链稳定性。'),
      team: buildDimension('团队维度', 90, '团队成熟度高，是当前最稳的支撑维度。', ['交付与销售协同好', '创始团队稳定', '管理层产业背景强'], ['跨区域复制仍需磨合'], ['组织架构', '履历证明', '考核机制'], '团队可作为授信正向支撑项。'),
      finance: buildDimension('财务维度', 79, '财务表现尚可，重点关注应收和扩张成本。', ['收入增长稳定', '现金流尚可'], ['扩张带来费用增长'], ['财报', '应收明细', '回款台账'], '适合配套回款监控与额度分层。'),
      market: buildDimension('市场维度', 88, '市场验证较充分，具备可复制客户场景。', ['客户复购率较好', '行业需求清晰'], ['制造业景气波动会影响交付'], ['客户名单', '订单合同', '交付案例'], '市场端可支撑中长期合作。')
    },
    products: [
      buildProduct('P401', '设备更新贷', 3600, 'LPR + 52BP', '#38bdf8', { tech: 0.83, team: 0.9, finance: 0.82, market: 0.84 }, '适用于产线和设备升级。'),
      buildProduct('P402', '科创信用贷', 4200, 'LPR + 50BP', '#00d4ff', { tech: 0.88, team: 0.92, finance: 0.78, market: 0.88 }, '适合团队与市场较均衡的机器人企业。'),
      buildProduct('P403', '订单履约贷', 2600, 'LPR + 65BP', '#22c55e', { tech: 0.74, team: 0.84, finance: 0.8, market: 0.9 }, '适合项目交付与设备验收场景。')
    ]
  }),
  buildEnterprise({
    id: 'E005',
    name: '极芯半导体设备有限公司',
    industry: '半导体设备 / 核心零部件',
    founded: '2016',
    city: '无锡',
    overview: '技术与团队得分高，但市场验证仍依赖少数核心客户，画像呈现为技术驱动型。',
    scores: { tech: 93, team: 88, finance: 74, market: 78 },
    dimensions: {
      tech: buildDimension('技术维度', 93, '设备与零部件技术壁垒高，需重点核验国产替代落地节奏。', ['技术壁垒高', '国产替代空间大'], ['认证周期较长'], ['技术说明', '认证报告', '客户验证'], '技术可作为授信核心亮点。'),
      team: buildDimension('团队维度', 88, '团队专业度高，关键人在研发体系中作用显著。', ['研发骨干稳定', '产业经验深'], ['关键人集中度偏高'], ['核心成员履历', '激励安排', '组织图'], '需同步审查关键人连续性风险。'),
      finance: buildDimension('财务维度', 74, '财务基础一般，建议重点穿透设备回款和研发资本化。', ['收入规模在增长', '利润弹性受交付影响'], ['回款节奏和项目周期较长'], ['财务报表', '项目回款表', '资本化明细'], '授信节奏应匹配设备交付和验收周期。'),
      market: buildDimension('市场维度', 78, '市场验证已有基础，但客户集中度较高。', ['头部客户认可度较高'], ['客户结构偏集中'], ['客户清单', '验收记录', '订单预测'], '建议将客户集中度作为重点观察指标。')
    },
    products: [
      buildProduct('P501', '知识产权质押贷', 2800, 'LPR + 72BP', '#f59e0b', { tech: 0.95, team: 0.82, finance: 0.68, market: 0.7 }, '适合以核心专利和工艺作为授信支撑。'),
      buildProduct('P502', '设备制造贷', 4200, 'LPR + 58BP', '#38bdf8', { tech: 0.9, team: 0.86, finance: 0.76, market: 0.78 }, '适合设备生产和交付周期较长的场景。'),
      buildProduct('P503', '科创信用贷', 3000, 'LPR + 62BP', '#00d4ff', { tech: 0.88, team: 0.88, finance: 0.72, market: 0.74 }, '适合作为综合授信方案的基础产品。')
    ]
  }),
  buildEnterprise({
    id: 'E006',
    name: '天巡卫星网络有限公司',
    industry: '卫星互联网 / 航天通信',
    founded: '2021',
    city: '北京',
    overview: '技术前瞻性很强，但财务与市场仍处早期，是典型高技术、低成熟度画像。',
    scores: { tech: 91, team: 82, finance: 63, market: 69 },
    dimensions: {
      tech: buildDimension('技术维度', 91, '核心技术具备前瞻性，重点核验工程化与落地路线。', ['技术路线清晰', '前沿属性强'], ['商业化转化慢'], ['技术白皮书', '试验数据', '项目节点'], '适合在技术亮点上做展示，但授信要谨慎。'),
      team: buildDimension('团队维度', 82, '团队具备科研背景，商业化补位仍需观察。', ['核心研发背景强'], ['市场化团队尚在搭建'], ['核心成员资料', '组织结构', '项目分工'], '建议加强商业化团队能力核验。'),
      finance: buildDimension('财务维度', 63, '财务承压明显，授信应以小额和附条件为主。', ['有阶段性资金支持'], ['现金消耗较快'], ['融资计划', '现金流预测', '费用预算'], '财务是主要短板，不宜激进授信。'),
      market: buildDimension('市场维度', 69, '市场验证处于早期，更适合作为战略储备观察。', ['潜在空间大'], ['落地客户有限'], ['合作框架', '试点项目', '市场测算'], '适合作为中长期观察项目。')
    },
    products: [
      buildProduct('P601', '研发桥接贷', 1200, 'LPR + 98BP', '#a855f7', { tech: 0.92, team: 0.72, finance: 0.62, market: 0.6 }, '适合小额阶段性研发资金安排。'),
      buildProduct('P602', '知识产权质押贷', 1600, 'LPR + 82BP', '#f59e0b', { tech: 0.94, team: 0.68, finance: 0.6, market: 0.58 }, '适合以前沿技术成果为授信依据。'),
      buildProduct('P603', '政策协同方案', 2000, '定制化', '#22c55e', { tech: 0.84, team: 0.72, finance: 0.64, market: 0.66 }, '结合专项资金与政策工具更合适。')
    ]
  }),
  buildEnterprise({
    id: 'E007',
    name: '岚禾新材料有限公司',
    industry: '新材料 / 功能膜材',
    founded: '2015',
    city: '宁波',
    overview: '财务和市场较稳，技术中上，画像偏成熟制造型科创企业。',
    scores: { tech: 81, team: 83, finance: 89, market: 86 },
    dimensions: {
      tech: buildDimension('技术维度', 81, '技术能力中上，重点关注新材料迭代和成本优势。', ['工艺成熟', '量产能力较好'], ['持续创新速度需观察'], ['工艺文件', '检测报告', '研发项目'], '技术中性偏正向，适合与财务优势结合判断。'),
      team: buildDimension('团队维度', 83, '团队稳定，组织成熟度较好。', ['组织协同平稳', '关键岗位完整'], ['创新团队活力需增强'], ['团队履历', '组织架构', '制度材料'], '团队适合作为基础支撑维度。'),
      finance: buildDimension('财务维度', 89, '财务表现稳健，是当前画像中的核心支撑。', ['现金流健康', '利润稳定', '负债结构较优'], ['原材料价格波动需跟踪'], ['财务报表', '回款记录', '成本结构'], '可作为较稳的授信切入点。'),
      market: buildDimension('市场维度', 86, '市场基础较好，客户结构相对均衡。', ['客户分散度适中', '订单稳定性较好'], ['行业景气波动影响需求'], ['客户清单', '订单记录', '复购数据'], '适合搭配财务优势形成整体画像。')
    },
    products: [
      buildProduct('P701', '流动资金贷', 3800, 'LPR + 42BP', '#22c55e', { tech: 0.76, team: 0.8, finance: 0.92, market: 0.88 }, '适合成熟制造型企业的日常经营周转。'),
      buildProduct('P702', '设备更新贷', 2600, 'LPR + 50BP', '#38bdf8', { tech: 0.82, team: 0.78, finance: 0.88, market: 0.8 }, '支持产线扩能和设备升级。'),
      buildProduct('P703', '绿色制造贷', 3000, 'LPR + 46BP', '#00d4ff', { tech: 0.8, team: 0.78, finance: 0.86, market: 0.84 }, '适用于节能工艺和绿色制造场景。')
    ]
  }),
  buildEnterprise({
    id: 'E008',
    name: '禾木数字医疗有限公司',
    industry: '数字医疗 / AI 诊断',
    founded: '2020',
    city: '杭州',
    overview: '技术与团队尚可，但市场和合规验证仍需加强，画像偏早期数字医疗。',
    scores: { tech: 87, team: 79, finance: 72, market: 75 },
    dimensions: {
      tech: buildDimension('技术维度', 87, 'AI 诊断模型和数据处理能力较好，重点关注临床验证。', ['算法能力较强', '数据处理体系完整'], ['临床验证资料需持续补强'], ['模型说明', '测试报告', '样本数据'], '技术是主要加分项，但需要配套验证材料。'),
      team: buildDimension('团队维度', 79, '团队具备产品和算法能力，医疗合规经验仍需加强。', ['产品研发协同较好'], ['合规与医疗运营经验偏弱'], ['团队履历', '岗位配置', '合作机制'], '建议同步核验医疗合规与运营能力。'),
      finance: buildDimension('财务维度', 72, '财务基础一般，需重点关注收入可持续性。', ['收入开始形成', '成本仍较高'], ['回款和续费稳定性需观察'], ['财务报表', '合同清单', '续费记录'], '可采用小额、试探式授信。'),
      market: buildDimension('市场维度', 75, '市场验证初具基础，但客户规模仍需提升。', ['已有标杆医院客户'], ['商业化复制速度一般'], ['试点项目', '客户反馈', '合作协议'], '建议在市场扩展更清晰后再做增量授信。')
    },
    products: [
      buildProduct('P801', '科创信用贷', 2600, 'LPR + 60BP', '#00d4ff', { tech: 0.88, team: 0.74, finance: 0.7, market: 0.72 }, '适合数字医疗轻资产成长企业。'),
      buildProduct('P802', '知识产权质押贷', 1800, 'LPR + 78BP', '#f59e0b', { tech: 0.9, team: 0.68, finance: 0.64, market: 0.62 }, '适合以前沿算法成果作为补充支撑。'),
      buildProduct('P803', '场景试点贷', 1500, 'LPR + 72BP', '#22c55e', { tech: 0.76, team: 0.72, finance: 0.66, market: 0.8 }, '适合围绕医院试点和阶段项目推进。')
    ]
  }),
  buildEnterprise({
    id: 'E009',
    name: '御风低空科技有限公司',
    industry: '低空经济 / 无人机系统',
    founded: '2019',
    city: '成都',
    overview: '市场热度高但财务波动较大，画像体现为高成长、高波动的低空经济企业。',
    scores: { tech: 85, team: 81, finance: 70, market: 89 },
    dimensions: {
      tech: buildDimension('技术维度', 85, '系统集成与应用方案较好，重点关注飞控与安全冗余。', ['产品体系完整', '场景覆盖广'], ['飞控与安全验证持续要求高'], ['飞控方案', '测试材料', '认证报告'], '技术适合展示，但需持续关注安全验证。'),
      team: buildDimension('团队维度', 81, '团队中规中矩，项目制组织能力较关键。', ['项目执行力较强'], ['跨区域交付组织承压'], ['团队简历', '项目分工', '管理机制'], '建议重点核项目组织与交付连续性。'),
      finance: buildDimension('财务维度', 70, '财务波动偏大，受项目交付和采购节奏影响明显。', ['存在阶段性收入弹性'], ['现金流波动明显'], ['财报', '项目回款表', '采购计划'], '建议审慎设置提用节奏和支付条件。'),
      market: buildDimension('市场维度', 89, '低空经济景气度高，市场端是当前最大亮点。', ['政策风口明显', '应用场景拓展快'], ['需求释放节奏受政策推动'], ['订单资料', '示范项目', '客户访谈'], '可以将市场端作为画像亮点，但授信仍需看现金流。')
    },
    products: [
      buildProduct('P901', '项目履约贷', 3400, 'LPR + 64BP', '#22c55e', { tech: 0.78, team: 0.8, finance: 0.72, market: 0.92 }, '适用于项目交付和政府示范场景。'),
      buildProduct('P902', '设备更新贷', 2200, 'LPR + 58BP', '#38bdf8', { tech: 0.84, team: 0.76, finance: 0.68, market: 0.78 }, '适用于飞控与整机设备升级。'),
      buildProduct('P903', '科创信用贷', 2800, 'LPR + 68BP', '#00d4ff', { tech: 0.82, team: 0.78, finance: 0.7, market: 0.86 }, '适合高成长但波动偏大的科创企业。')
    ]
  }),
  buildEnterprise({
    id: 'E010',
    name: '丰川农业科技有限公司',
    industry: '农业科技 / 智慧农机',
    founded: '2017',
    city: '长沙',
    overview: '市场和财务比较均衡，画像偏稳健型智慧农业企业。',
    scores: { tech: 78, team: 82, finance: 85, market: 83 },
    dimensions: {
      tech: buildDimension('技术维度', 78, '技术能力偏应用型，重点看设备可靠性和持续迭代。', ['应用场景清晰', '设备稳定性较好'], ['技术壁垒不算突出'], ['产品说明', '测试资料', '升级记录'], '技术维度中性，需要与市场和财务一起判断。'),
      team: buildDimension('团队维度', 82, '团队结构稳定，执行和服务能力较好。', ['区域服务能力较强'], ['组织成熟度较稳'], ['团队资料', '服务网络', '管理制度'], '团队可作为稳定支撑项。'),
      finance: buildDimension('财务维度', 85, '财务质量较好，是稳健画像的重要来源。', ['现金流较稳', '回款节奏可控'], ['季节性波动需要关注'], ['财务资料', '回款表', '订单明细'], '适合搭配经营周转类产品。'),
      market: buildDimension('市场维度', 83, '市场基础尚可，区域客户网络较稳定。', ['渠道和服务网络较完整'], ['区域集中度偏高'], ['客户资料', '渠道协议', '订单记录'], '适合做区域深耕型企业画像。')
    },
    products: [
      buildProduct('P1001', '流动资金贷', 3000, 'LPR + 43BP', '#22c55e', { tech: 0.72, team: 0.8, finance: 0.9, market: 0.84 }, '适合稳健经营型智慧农机企业。'),
      buildProduct('P1002', '设备更新贷', 2400, 'LPR + 52BP', '#38bdf8', { tech: 0.8, team: 0.78, finance: 0.84, market: 0.8 }, '支持设备升级和农机产线改造。'),
      buildProduct('P1003', '乡村振兴专项贷', 2800, 'LPR + 46BP', '#00d4ff', { tech: 0.74, team: 0.8, finance: 0.86, market: 0.82 }, '适合农业科技和区域服务网络企业。')
    ]
  })
]

export function findPortraitEnterprise(keyword = '') {
  const query = String(keyword || '').trim().toLowerCase()
  if (!query) return enterprisePortraits[0]

  return enterprisePortraits.find((item) => item.name.toLowerCase().includes(query)) || enterprisePortraits[0]
}

export const realisticCreditCatalog = [
  buildProduct(
    'RC001',
    '种子期科创贷',
    200,
    '3.5% - 5.0%',
    '#38bdf8',
    { tech: 0.82, team: 0.7, finance: 0.56, market: 0.52 },
    '适用于种子期企业早期研发与产品验证，额度区间参考 50-200 万，支持信用或人才类增信。',
    'credit'
  ),
  buildProduct(
    'RC002',
    '种子期人才贷',
    150,
    '3.8% - 5.2%',
    '#8b5cf6',
    { tech: 0.74, team: 0.88, finance: 0.5, market: 0.48 },
    '适用于人才团队稳定、技术方向明确的种子期企业，额度区间参考 30-150 万。',
    'credit'
  ),
  buildProduct(
    'RC003',
    '种子期启航贷',
    600,
    '3.5% - 6.5%',
    '#14b8a6',
    { tech: 0.78, team: 0.74, finance: 0.58, market: 0.6 },
    '来源于可售产品配置，适合具备初步市场验证的种子期项目，常见线上渠道可投放。',
    'credit'
  ),
  buildProduct(
    'RC004',
    '初创期启航贷',
    500,
    '4.0% - 5.5%',
    '#00d4ff',
    { tech: 0.9, team: 0.8, finance: 0.66, market: 0.72 },
    '适用于初创期企业研发投入和市场拓展，额度区间参考 100-500 万，可配知识产权质押。',
    'credit'
  ),
  buildProduct(
    'RC005',
    '初创期科创立贷',
    800,
    '4.2% - 5.8%',
    '#22c55e',
    { tech: 0.84, team: 0.78, finance: 0.68, market: 0.74 },
    '适用于初创期企业经营起量阶段，额度区间参考 200-800 万，常见担保方式含信用或知识产权。',
    'credit'
  ),
  buildProduct(
    'RC006',
    '初创期惠企贷',
    1500,
    '4.0% - 6.0%',
    '#06b6d4',
    { tech: 0.82, team: 0.76, finance: 0.7, market: 0.78 },
    '来源于可售产品配置，面向通过审核运营的初创期企业，额度上限约 1500 万。',
    'credit'
  ),
  buildProduct(
    'RC007',
    '成长期加速贷',
    1500,
    '3.8% - 5.2%',
    '#f59e0b',
    { tech: 0.9, team: 0.84, finance: 0.78, market: 0.86 },
    '适用于成长期企业订单放量和扩张阶段，额度区间参考 300-1500 万，常见担保方式含知识产权质押与保证担保。',
    'credit'
  ),
  buildProduct(
    'RC008',
    '成长期发展贷',
    2000,
    '3.5% - 5.0%',
    '#f97316',
    { tech: 0.84, team: 0.82, finance: 0.8, market: 0.88 },
    '适用于成长期企业持续扩张和产能建设，额度区间参考 500-2000 万。',
    'credit'
  ),
  buildProduct(
    'RC009',
    '科创成长贷',
    1500,
    '3.8% - 5.2%',
    '#0ea5e9',
    { tech: 0.88, team: 0.82, finance: 0.8, market: 0.9 },
    '来源于可售产品列表，适用于成长期科创企业，常见投放渠道包括手机银行、网上银行和客户经理。',
    'credit'
  ),
  buildProduct(
    'RC010',
    '成熟期腾飞贷',
    10000,
    '3.5% - 5.0%',
    '#22c55e',
    { tech: 0.76, team: 0.84, finance: 0.94, market: 0.88 },
    '适用于成熟期企业稳态经营与投贷联动场景，额度区间参考 1000 万至 1 亿元。',
    'credit'
  ),
  buildProduct(
    'RC011',
    '知识产权质押贷',
    1000,
    '4.2% - 5.5%',
    '#eab308',
    { tech: 0.96, team: 0.72, finance: 0.68, market: 0.74 },
    '适用于拥有较强专利、软著和技术成果的企业，常作为科技型授信的重要增信抓手。',
    'credit'
  )
]

export const wealthProductCatalog = [
  buildProduct(
    'W001',
    '企业现金管理计划',
    500,
    '2.1% - 2.6%',
    '#14b8a6',
    { tech: 0.62, team: 0.72, finance: 0.94, market: 0.7 },
    '适合账上资金较充裕、需要兼顾流动性与稳健增值的企业。',
    'wealth'
  ),
  buildProduct(
    'W002',
    '稳健增益理财',
    800,
    '2.8% - 3.4%',
    '#22c55e',
    { tech: 0.58, team: 0.76, finance: 0.9, market: 0.68 },
    '适合财务稳健、希望提高闲置资金收益的企业客户。',
    'wealth'
  ),
  buildProduct(
    'W003',
    '产业链票据理财',
    300,
    '2.6% - 3.0%',
    '#38bdf8',
    { tech: 0.66, team: 0.72, finance: 0.88, market: 0.84 },
    '适合订单和回款节奏明确、希望做短期资金安排的企业。',
    'wealth'
  ),
  buildProduct(
    'W004',
    '结构性存款组合',
    1000,
    '2.9% - 3.8%',
    '#8b5cf6',
    { tech: 0.74, team: 0.7, finance: 0.82, market: 0.78 },
    '适合风险承受能力较高、希望兼顾收益弹性的企业。',
    'wealth'
  )
]

function pickLifecycleProducts(total = 80) {
  if (total < 72) {
    return ['RC001', 'RC002', 'RC003', 'RC011']
  }

  if (total < 82) {
    return ['RC004', 'RC005', 'RC006', 'RC011']
  }

  if (total < 90) {
    return ['RC007', 'RC008', 'RC009', 'RC011']
  }

  return ['RC009', 'RC010', 'RC011']
}

function inferLifecycleStage(enterprise = {}) {
  const total = Number(enterprise?.scores?.total ?? 80)
  const founded = Number(enterprise?.founded || 2020)
  const age = Math.max(1, 2026 - founded)

  if (age <= 2 || total < 72) return 'seed'
  if (age <= 4 || total < 82) return 'startup'
  if (age <= 8 || total < 90) return 'growth'
  return 'mature'
}

function productStage(productId = '') {
  if (productId.startsWith('RC001') || productId.startsWith('RC002') || productId.startsWith('RC003')) return 'seed'
  if (productId.startsWith('RC004') || productId.startsWith('RC005') || productId.startsWith('RC006')) return 'startup'
  if (productId.startsWith('RC007') || productId.startsWith('RC008') || productId.startsWith('RC009')) return 'growth'
  return 'mature'
}

function industryBoost(product, industry = '') {
  const text = String(industry || '')
  const name = String(product.name || '')
  let boost = 0

  if (/生物|医药|医疗/.test(text) && (/研发/.test(name) || /知识产权/.test(name))) boost += 0.08
  if (/半导体|高端装备|工业视觉|机器人/.test(text) && (/知识产权/.test(name) || /设备/.test(name) || /科创/.test(name))) boost += 0.08
  if (/新能源|储能|低空/.test(text) && (/订单/.test(name) || /设备/.test(name) || /成长/.test(name))) boost += 0.08
  if (/新材料|农业/.test(text) && (/流动资金/.test(name) || /成熟/.test(name) || /发展/.test(name))) boost += 0.06

  return boost
}

export function getPortraitProductsForEnterprise(enterprise = {}, activeDimension = 'tech') {
  const total = Number(enterprise?.scores?.total ?? 80)
  const lifecycle = inferLifecycleStage(enterprise)
  const selectedIds = pickLifecycleProducts(total)
  const enterpriseSpecific = (Array.isArray(enterprise?.products) ? enterprise.products : [])
    .map((product) => {
      const fit = {
        tech: Number(product.fit?.tech ?? 0.7),
        team: Number(product.fit?.team ?? 0.7),
        finance: Number(product.fit?.finance ?? 0.7),
        market: Number(product.fit?.market ?? 0.7)
      }

      const currentMatch = Math.min(
        0.99,
        fit[activeDimension] + 0.1 + industryBoost(product, enterprise?.industry)
      )

      return {
        ...product,
        fit,
        currentMatch: Number(currentMatch.toFixed(2)),
        source: 'enterprise'
      }
    })

  const genericProducts = realisticCreditCatalog
    .filter((product) => selectedIds.includes(product.id))
    .map((product) => {
      const fit = {
        tech: Number(product.fit?.tech ?? 0.7),
        team: Number(product.fit?.team ?? 0.7),
        finance: Number(product.fit?.finance ?? 0.7),
        market: Number(product.fit?.market ?? 0.7)
      }

      const stageBoost = productStage(product.id) === lifecycle ? 0.12 : 0
      const currentMatch = Math.min(
        0.99,
        fit[activeDimension] + stageBoost + industryBoost(product, enterprise?.industry)
      )

      return {
        ...product,
        fit,
        currentMatch: Number(currentMatch.toFixed(2)),
        source: 'catalog'
      }
    })

  const usedNames = new Set(enterpriseSpecific.map((item) => item.name))
  const merged = [
    ...enterpriseSpecific,
    ...genericProducts.filter((item) => !usedNames.has(item.name))
  ]

  return merged
    .sort((a, b) => {
      const sourceWeightA = a.source === 'enterprise' ? 1 : 0
      const sourceWeightB = b.source === 'enterprise' ? 1 : 0
      if (sourceWeightA !== sourceWeightB) return sourceWeightB - sourceWeightA
      return b.currentMatch - a.currentMatch
    })
}
