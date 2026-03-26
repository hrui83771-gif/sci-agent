<template>
  <div class="import-wrap">
    <button class="import-trigger" @click="open = !open" title="导入自定义数据集">
      <span>⬆</span> {{ lang === 'zh' ? '导入数据' : 'Import' }}
    </button>

    <Teleport to="body">
      <div v-if="open" class="import-modal" @click.self="open = false">
        <div class="import-inner">
          <button class="modal-close" @click="open = false">✕</button>
          <h3>{{ lang === 'zh' ? '导入自定义数据集' : 'Import Dataset' }}</h3>

          <!-- Tabs -->
          <div class="tabs">
            <button :class="['tab', { active: tab === 'json' }]" @click="tab = 'json'">JSON</button>
            <button :class="['tab', { active: tab === 'csv' }]" @click="tab = 'csv'">CSV</button>
            <button :class="['tab', { active: tab === 'manual' }]" @click="tab = 'manual'">
              {{ lang === 'zh' ? '手动输入' : 'Manual' }}
            </button>
          </div>

          <!-- JSON Tab -->
          <div v-if="tab === 'json'" class="tab-body">
            <div class="hint">{{ lang === 'zh' ? '上传或粘贴 JSON 文件' : 'Upload or paste JSON' }}</div>
            <div class="file-drop" @dragover.prevent @drop.prevent="onDrop($event, 'json')" @click="$refs.jsonFile.click()">
              <input ref="jsonFile" type="file" accept=".json" style="display:none" @change="onFileChange($event, 'json')" />
              <span>{{ lang === 'zh' ? '拖拽或点击上传 .json' : 'Drag or click to upload .json' }}</span>
            </div>
            <textarea v-model="jsonText" class="code-area" :placeholder="jsonPlaceholder" rows="8" />
            <div class="schema-hint">
              <span>{{ lang === 'zh' ? '格式示例：' : 'Format:' }}</span>
              <code>{{ jsonPlaceholder }}</code>
            </div>
          </div>

          <!-- CSV Tab -->
          <div v-if="tab === 'csv'" class="tab-body">
            <div class="hint">{{ lang === 'zh' ? '上传 CSV 文件（首行为表头）' : 'Upload CSV (first row = headers)' }}</div>
            <div class="file-drop" @dragover.prevent @drop.prevent="onDrop($event, 'csv')" @click="$refs.csvFile.click()">
              <input ref="csvFile" type="file" accept=".csv" style="display:none" @change="onFileChange($event, 'csv')" />
              <span>{{ lang === 'zh' ? '拖拽或点击上传 .csv' : 'Drag or click to upload .csv' }}</span>
            </div>
            <div class="csv-hint">
              <code>name,tech,team,finance,market<br>星辰科技,92,85,78,95</code>
            </div>
          </div>

          <!-- Manual Tab -->
          <div v-if="tab === 'manual'" class="tab-body">
            <div class="manual-form">
              <div class="form-row">
                <label>{{ lang === 'zh' ? '企业名称' : 'Name' }}</label>
                <input v-model="manual.name" class="form-input" />
              </div>
              <div class="form-row">
                <label>{{ lang === 'zh' ? '行业' : 'Industry' }}</label>
                <input v-model="manual.industry" class="form-input" />
              </div>
              <div v-for="d in DIMS" :key="d.key" class="form-row score-row">
                <label :style="{ color: d.color }">{{ d.label }}</label>
                <input v-model.number="manual.scores[d.key]" type="range" min="0" max="100" class="score-slider" :style="{ '--c': d.color }" />
                <span class="score-num" :style="{ color: d.color }">{{ manual.scores[d.key] }}</span>
              </div>
            </div>
          </div>

          <div class="analysis-upload">
            <div class="hint">{{ lang === 'zh' ? '可选：上传 PDF / 图片 / 文本文件，应用数据后直接做 dossier 分析' : 'Optional: upload PDF / image / text files and run dossier analysis after applying data.' }}</div>
            <div class="file-drop" @dragover.prevent @drop.prevent="onAnalysisDrop" @click="$refs.analysisFile.click()">
              <input
                ref="analysisFile"
                type="file"
                multiple
                accept=".pdf,.txt,.md,.csv,.json,image/*"
                style="display:none"
                @change="onAnalysisFileChange"
              />
              <span>{{ lang === 'zh' ? '拖拽或点击上传分析文件' : 'Drag or click to upload analysis files' }}</span>
            </div>

            <div v-if="analysisFiles.length" class="analysis-files">
              <article v-for="file in analysisFiles" :key="`${file.name}-${file.size}`" class="analysis-file-chip">
                <div>
                  <strong>{{ file.name }}</strong>
                  <span>{{ formatSize(file.size) }}</span>
                </div>
                <button type="button" class="chip-remove" @click="removeAnalysisFile(file)">✕</button>
              </article>
            </div>
          </div>

          <!-- Error -->
          <div v-if="error" class="error-msg">{{ error }}</div>

          <!-- Actions -->
          <div class="import-actions">
            <button class="btn-cancel" @click="open = false">{{ lang === 'zh' ? '取消' : 'Cancel' }}</button>
            <button class="btn-apply" @click="apply">
              {{ analysisFiles.length ? (lang === 'zh' ? '应用并分析' : 'Apply & Analyze') : (lang === 'zh' ? '应用数据' : 'Apply') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'

const props = defineProps({ lang: { type: String, default: 'zh' } })
const emit = defineEmits(['import'])

const DIMS = [
  { key: 'tech',    label: '技术', color: '#00d4ff' },
  { key: 'team',    label: '团队', color: '#a855f7' },
  { key: 'finance', label: '财务', color: '#10b981' },
  { key: 'market',  label: '市场', color: '#f97316' },
]

const open = ref(false)
const tab = ref('json')
const jsonText = ref('')
const error = ref('')
const analysisFiles = ref([])
const manual = reactive({
  name: '新企业', industry: '科技',
  scores: { tech: 80, team: 80, finance: 80, market: 80 }
})

const jsonPlaceholder = `{"name":"企业名","industry":"行业","scores":{"tech":90,"team":85,"finance":78,"market":92}}`

function onDrop(e, type) {
  const file = e.dataTransfer.files[0]
  if (file) readFile(file, type)
}
function onFileChange(e, type) {
  const file = e.target.files[0]
  if (file) readFile(file, type)
}
function readFile(file, type) {
  const reader = new FileReader()
  reader.onload = ev => {
    if (type === 'json') jsonText.value = ev.target.result
    else parseCsv(ev.target.result)
  }
  reader.readAsText(file)
}

function onAnalysisDrop(e) {
  const files = Array.from(e.dataTransfer.files || [])
  if (files.length) {
    analysisFiles.value = [...analysisFiles.value, ...files]
  }
}

function onAnalysisFileChange(e) {
  const files = Array.from(e.target.files || [])
  if (files.length) {
    analysisFiles.value = [...analysisFiles.value, ...files]
  }
  e.target.value = ''
}

function removeAnalysisFile(file) {
  analysisFiles.value = analysisFiles.value.filter((item) => item !== file)
}

function formatSize(bytes = 0) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}

function parseCsv(text) {
  error.value = ''
  const lines = text.trim().split('\n')
  if (lines.length < 2) { error.value = 'CSV至少需要2行'; return }
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  const row = lines[1].split(',').map(v => v.trim())
  const get = (key) => {
    const idx = headers.indexOf(key)
    return idx >= 0 ? (parseFloat(row[idx]) || 0) : 0
  }
  const data = {
    name: row[headers.indexOf('name')] || '导入企业',
    industry: row[headers.indexOf('industry')] || '科技',
    scores: { tech: get('tech'), team: get('team'), finance: get('finance'), market: get('market') }
  }
  jsonText.value = JSON.stringify(data, null, 2)
  tab.value = 'json'
}

function apply() {
  error.value = ''
  let data
  if (tab.value === 'manual') {
    data = { name: manual.name, industry: manual.industry, scores: { ...manual.scores } }
  } else {
    try {
      data = JSON.parse(jsonText.value)
    } catch {
      error.value = props.lang === 'zh' ? 'JSON格式错误' : 'Invalid JSON'
      return
    }
  }
  if (!data.scores || typeof data.scores.tech !== 'number') {
    error.value = props.lang === 'zh' ? '缺少 scores 字段' : 'Missing scores field'
    return
  }
  // Compute total
  const s = data.scores
  data.scores.total = ((s.tech + s.team + s.finance + s.market) / 4).toFixed(1) * 1
  emit('import', {
    enterprise: data,
    analysisFiles: [...analysisFiles.value]
  })
  analysisFiles.value = []
  open.value = false
}
</script>

<style scoped>
.import-trigger {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #94a3b8; padding: 5px 12px; border-radius: 20px;
  cursor: pointer; font-size: 12px; transition: all .2s; display: flex; align-items: center; gap: 5px;
}
.import-trigger:hover { border-color: #00d4ff; color: #00d4ff; }

.import-modal {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(2,8,24,0.75); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
}
.import-inner {
  background: rgba(8,16,40,0.97); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 20px; padding: 24px; width: 480px; position: relative;
  box-shadow: 0 0 60px rgba(0,212,255,0.12);
  animation: modal-in .25s ease;
}
@keyframes modal-in { from{transform:scale(.88);opacity:0} to{transform:scale(1);opacity:1} }
.modal-close { position: absolute; top: 12px; right: 14px; background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 16px; }
.import-inner h3 { color: #00d4ff; margin-bottom: 14px; font-size: 15px; }

.tabs { display: flex; gap: 4px; margin-bottom: 14px; }
.tab {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: #94a3b8; padding: 5px 14px; border-radius: 20px; cursor: pointer; font-size: 12px; transition: all .2s;
}
.tab.active { background: rgba(0,212,255,0.15); border-color: #00d4ff; color: #00d4ff; }

.tab-body { display: flex; flex-direction: column; gap: 10px; }
.hint { font-size: 11px; color: #94a3b8; }
.file-drop {
  border: 1px dashed rgba(0,212,255,0.3); border-radius: 10px; padding: 16px;
  text-align: center; cursor: pointer; color: #94a3b8; font-size: 12px; transition: all .2s;
}
.file-drop:hover { border-color: #00d4ff; color: #00d4ff; background: rgba(0,212,255,0.05); }
.code-area {
  background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.1);
  color: #e2e8f0; border-radius: 8px; padding: 10px; font-size: 11px;
  font-family: monospace; resize: vertical; outline: none; width: 100%;
}
.code-area:focus { border-color: #00d4ff; }
.schema-hint { font-size: 10px; color: #475569; }
.schema-hint code { color: #94a3b8; }
.csv-hint { background: rgba(0,0,0,0.3); border-radius: 8px; padding: 10px; font-size: 11px; }
.csv-hint code { color: #10b981; white-space: pre; }

.manual-form { display: flex; flex-direction: column; gap: 10px; }
.form-row { display: flex; align-items: center; gap: 10px; }
.form-row label { font-size: 12px; color: #94a3b8; width: 60px; flex-shrink: 0; }
.form-input {
  flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #e2e8f0; padding: 6px 10px; border-radius: 8px; font-size: 12px; outline: none;
}
.form-input:focus { border-color: #00d4ff; }
.score-row { gap: 8px; }
.score-slider {
  flex: 1; accent-color: var(--c); cursor: pointer;
}
.score-num { font-size: 13px; font-weight: 700; width: 28px; text-align: right; }

.error-msg { color: #ef4444; font-size: 12px; margin-top: 4px; }
.import-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
.btn-cancel {
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
  color: #94a3b8; padding: 7px 18px; border-radius: 20px; cursor: pointer; font-size: 12px;
}
.btn-apply {
  background: rgba(0,212,255,0.15); border: 1px solid #00d4ff;
  color: #00d4ff; padding: 7px 18px; border-radius: 20px; cursor: pointer; font-size: 12px; font-weight: 700;
  transition: all .2s;
}
.btn-apply:hover { background: rgba(0,212,255,0.3); }
</style>
