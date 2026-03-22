import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

function computeTotal(scores = {}) {
  const values = [
    Number(scores.tech ?? 0),
    Number(scores.team ?? 0),
    Number(scores.finance ?? 0),
    Number(scores.market ?? 0)
  ]

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1))
}

function normalizeEnterprise(payload = {}) {
  const scores = {
    tech: Number(payload.scores?.tech ?? 88),
    team: Number(payload.scores?.team ?? 84),
    finance: Number(payload.scores?.finance ?? 76),
    market: Number(payload.scores?.market ?? 91)
  }

  return {
    id: payload.id ?? 'E001',
    name: payload.name ?? '星枢智造科技有限公司',
    industry: payload.industry ?? '科创金融 / 智能制造',
    founded: payload.founded ?? '2019',
    scores: {
      ...scores,
      total: Number(payload.scores?.total ?? computeTotal(scores))
    },
    risks: payload.risks ?? [
      { label: '信用风险', value: 0.34, level: 'medium' },
      { label: '市场波动', value: 0.42, level: 'medium' },
      { label: '经营连续性', value: 0.26, level: 'low' },
      { label: '流动性压力', value: 0.58, level: 'high' },
      { label: '合规风险', value: 0.18, level: 'low' }
    ],
    products: payload.products ?? [
      { id: 'P001', name: '科创信用贷', name_en: 'Tech Credit Loan', match: 0.94, amount: 3200, rate: 'LPR + 55BP', color: '#0f8b8d' },
      { id: 'P002', name: '知识产权质押贷', name_en: 'IP Pledge Loan', match: 0.89, amount: 4500, rate: 'LPR + 80BP', color: '#f3a712' },
      { id: 'P003', name: '研发补贴过桥贷款', name_en: 'R&D Bridge Loan', match: 0.77, amount: 1800, rate: 'LPR + 95BP', color: '#3f7d20' }
    ]
  }
}

const presetEnterprises = [
  normalizeEnterprise(),
  normalizeEnterprise({
    id: 'E002',
    name: '清源储能系统有限公司',
    industry: '新能源 / 储能系统',
    founded: '2018',
    scores: { tech: 84, team: 87, finance: 82, market: 92 }
  }),
  normalizeEnterprise({
    id: 'E003',
    name: '星穹生物医药有限公司',
    industry: '创新药 / 生物制造',
    founded: '2020',
    scores: { tech: 95, team: 80, finance: 68, market: 73 }
  })
]

export const useEnterpriseStore = defineStore('enterprise', () => {
  const current = ref(null)
  const list = ref([...presetEnterprises])
  const loading = ref(false)

  const totalScore = computed(() => current.value?.scores?.total ?? 0)

  async function fetchList() {
    list.value = [...presetEnterprises]
    return list.value
  }

  async function fetchById(id) {
    loading.value = true
    try {
      const matched = presetEnterprises.find((item) => item.id === id) ?? presetEnterprises[0]
      current.value = normalizeEnterprise(matched)
      return current.value
    } finally {
      loading.value = false
    }
  }

  function setMock(payload) {
    current.value = normalizeEnterprise(payload)
  }

  return {
    current,
    list,
    loading,
    totalScore,
    fetchList,
    fetchById,
    setMock
  }
})
