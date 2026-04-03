import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

function buildFallbackDetails(scores = {}) {
  return {
    tech: {
      label: '技术维度',
      score: scores.tech ?? 0,
      summary: '技术维度暂无详细分析。',
      highlights: [],
      meta: ''
    },
    team: {
      label: '团队维度',
      score: scores.team ?? 0,
      summary: '团队维度暂无详细分析。',
      highlights: [],
      meta: ''
    },
    finance: {
      label: '财务维度',
      score: scores.finance ?? 0,
      summary: '财务维度暂无详细分析。',
      highlights: [],
      meta: ''
    },
    market: {
      label: '市场维度',
      score: scores.market ?? 0,
      summary: '市场维度暂无详细分析。',
      highlights: [],
      meta: ''
    }
  }
}

export const useSceneStateStore = defineStore('sceneState', () => {
  const sceneMode = ref('overview')
  const activeDim = ref(null)
  const enterpriseProfile = ref(null)
  const dossier = ref(null)
  const detailsMap = ref(buildFallbackDetails())

  const scores = computed(() => dossier.value?.dimensionScores || enterpriseProfile.value?.scores || {
    tech: 88,
    team: 84,
    finance: 76,
    market: 91,
    total: 84.8
  })

  function sync(payload = {}) {
    enterpriseProfile.value = payload.enterpriseProfile || enterpriseProfile.value
    dossier.value = payload.dossier || dossier.value
    detailsMap.value = payload.detailsMap || detailsMap.value
  }

  function setFocus(dim) {
    activeDim.value = dim || null
    sceneMode.value = dim ? 'dimension_detail' : 'overview'
  }

  function clearFocus() {
    activeDim.value = null
    sceneMode.value = 'overview'
  }

  return {
    sceneMode,
    activeDim,
    enterpriseProfile,
    dossier,
    detailsMap,
    scores,
    sync,
    setFocus,
    clearFocus
  }
})
