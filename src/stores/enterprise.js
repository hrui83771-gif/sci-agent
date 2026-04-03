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
    tech: Number(payload.scores?.tech ?? 92),
    team: Number(payload.scores?.team ?? 89),
    finance: Number(payload.scores?.finance ?? 84),
    market: Number(payload.scores?.market ?? 76)
  }

  return {
    id: payload.id ?? 'ZJ-JQZN-001',
    name: payload.name ?? '浙江机器智能公司',
    industry: payload.industry ?? '智能制造 / 机器视觉',
    founded: payload.founded ?? '2019',
    scores: {
      ...scores,
      total: Number(payload.scores?.total ?? computeTotal(scores))
    },
    risks: payload.risks ?? [
      { label: '客户集中度高', value: 0.62, level: 'high' },
      { label: '市场竞争趋于激烈', value: 0.58, level: 'high' },
      { label: '流动资金周转压力', value: 0.46, level: 'medium' },
      { label: '团队稳定性', value: 0.22, level: 'low' }
    ],
    products: payload.products ?? []
  }
}

const presetEnterprises = [
  normalizeEnterprise()
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
