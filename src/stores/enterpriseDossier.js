import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { isOfficialArkConfigured, requestOfficialArkChat } from '../lib/arkOfficial.js'
import {
  buildDossierAnalysisPrompt,
  buildDossierAnalysisRuntimeProfile,
  buildEnterpriseDossier,
  mergeAIDossier,
  parseDossierAnalysisResult,
  shouldUseAIDossier
} from '../lib/enterpriseDossierRuntime.js'

function cloneJsonSafe(value) {
  return JSON.parse(JSON.stringify(value ?? null))
}

function sanitizeMaterials(materials = []) {
  return materials.map((item) => ({
    id: item.id,
    name: item.name,
    kind: item.kind,
    summary: item.summary,
    statusLabel: item.statusLabel || '',
    processing: Boolean(item.processing),
    officialFileId: item.officialFileId || '',
    officialStatus: item.officialStatus || '',
    inlineText: item.inlineText || '',
    dataUrl: item.dataUrl || '',
    previewUrl: item.previewUrl || ''
  }))
}

export const useEnterpriseDossierStore = defineStore('enterpriseDossier', () => {
  const rawProfile = ref(null)
  const rawMaterials = ref([])
  const dossier = ref(null)
  const status = ref('idle')
  const version = ref(0)
  const lastAnalyzedAt = ref('')

  const contextBrief = computed(() => dossier.value?.contextBrief || '')
  const analysisSnapshot = computed(() => dossier.value?.analysisSnapshot || null)

  function rebuildLocal(runtimeProfile = {}) {
    if (!rawProfile.value) {
      dossier.value = null
      status.value = 'idle'
      return null
    }

    dossier.value = buildEnterpriseDossier(rawProfile.value, rawMaterials.value, runtimeProfile)
    version.value += 1
    return dossier.value
  }

  async function refresh(runtimeProfile = {}) {
    if (!rawProfile.value) {
      dossier.value = null
      status.value = 'idle'
      return null
    }

    status.value = 'building'
    const baseDossier = rebuildLocal(runtimeProfile)

    if (!baseDossier) {
      status.value = 'idle'
      return null
    }

    if (!shouldUseAIDossier(runtimeProfile, rawMaterials.value) || !isOfficialArkConfigured(runtimeProfile)) {
      status.value = 'ready'
      lastAnalyzedAt.value = new Date().toISOString()
      return dossier.value
    }

    try {
      const analysisProfile = buildDossierAnalysisRuntimeProfile(runtimeProfile, rawMaterials.value)
      const result = await requestOfficialArkChat({
        content: buildDossierAnalysisPrompt(baseDossier.normalizedProfile, rawMaterials.value),
        runtimeProfile: analysisProfile,
        enterprise: null
      })

      const parsed = parseDossierAnalysisResult(result.text)
      if (parsed) {
        dossier.value = mergeAIDossier(baseDossier, parsed, rawMaterials.value)
      }
      status.value = 'ready'
      lastAnalyzedAt.value = new Date().toISOString()
      return dossier.value
    } catch {
      status.value = 'ready'
      lastAnalyzedAt.value = new Date().toISOString()
      return dossier.value
    }
  }

  function syncEnterprise(profile, runtimeProfile = {}) {
    rawProfile.value = cloneJsonSafe(profile)
    return rebuildLocal(runtimeProfile)
  }

  function syncMaterials(materials, runtimeProfile = {}) {
    rawMaterials.value = sanitizeMaterials(materials)
    return rebuildLocal(runtimeProfile)
  }

  function clear() {
    rawProfile.value = null
    rawMaterials.value = []
    dossier.value = null
    status.value = 'idle'
    version.value = 0
    lastAnalyzedAt.value = ''
  }

  return {
    rawProfile,
    rawMaterials,
    dossier,
    status,
    version,
    lastAnalyzedAt,
    contextBrief,
    analysisSnapshot,
    refresh,
    syncEnterprise,
    syncMaterials,
    clear
  }
})
