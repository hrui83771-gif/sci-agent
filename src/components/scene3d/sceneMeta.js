export const SCENE_DIMS = [
  {
    key: 'tech',
    label: '技术维度',
    color: '#00d4ff',
    color3: 0x00d4ff,
    desc: '专利储备、研发效率与技术壁垒的综合表现。'
  },
  {
    key: 'team',
    label: '团队维度',
    color: '#9b5cff',
    color3: 0x9b5cff,
    desc: '核心团队稳定性、管理能力与组织韧性的综合表现。'
  },
  {
    key: 'finance',
    label: '财务维度',
    color: '#18d18f',
    color3: 0x18d18f,
    desc: '营收质量、现金流压力与负债结构的综合表现。'
  },
  {
    key: 'market',
    label: '市场维度',
    color: '#ff8c3a',
    color3: 0xff8c3a,
    desc: '市场占位、增长潜力与客户结构质量的综合表现。'
  }
]

export const DEFAULT_SCENE_ANALYSIS = {
  tech: '系统正在扫描技术专利、研发投入和技术替代风险，建议重点关注研发效率与壁垒持续性。',
  team: '系统正在梳理核心团队履历、治理结构与关键岗位稳定性，建议补齐组织与激励信息。',
  finance: '系统正在梳理财务表现、现金流状态与负债结构，建议继续补齐穿透财务资料与回款证明。',
  market: '系统正在梳理客户结构、订单稳定性与市场验证情况，建议持续跟踪客户集中度与增长质量。'
}
