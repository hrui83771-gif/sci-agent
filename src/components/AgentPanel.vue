<template>
  <div class="agent-panel" :class="{ collapsed }">
    <div class="agent-header" @click="collapsed = !collapsed">
      <span class="agent-title">
        <span class="dot" :class="agentStore.loading ? 'dot-pulse' : 'dot-green'"></span>
        {{ lang === 'zh' ? 'AI 智能体' : 'AI Agent' }}
        <span class="model-tag">{{ agentStore.currentModel }}</span>
      </span>
      <span class="toggle-icon">{{ collapsed ? '▸' : '▾' }}</span>
    </div>

    <div v-show="!collapsed" class="agent-body">
      <div class="messages" ref="msgRef">
        <div v-if="agentStore.messages.length === 0" class="empty-hint">
          {{ lang === 'zh' ? '可以直接提问，也可以点击下方快捷按钮开始分析。' : 'Ask AI or click quick buttons to start.' }}
        </div>
        <div
          v-for="(m, i) in agentStore.messages"
          :key="i"
          :class="['msg', m.role === 'user' ? 'msg-user' : 'msg-ai']"
        >
          {{ m.content }}
        </div>
      </div>

      <div class="quick-btns">
        <button class="quick-btn" @click="quickDiagnose">{{ lang === 'zh' ? '全维诊断' : 'Full Diagnosis' }}</button>
        <button class="quick-btn" @click="quickRisk">{{ lang === 'zh' ? '风险分析' : 'Risk Analysis' }}</button>
        <button class="quick-btn" @click="quickProduct">{{ lang === 'zh' ? '产品建议' : 'Product Advice' }}</button>
        <button class="quick-btn" @click="agentStore.clearMessages()">{{ lang === 'zh' ? '清空会话' : 'Clear' }}</button>
      </div>

      <div class="input-row">
        <input
          v-model="inputText"
          class="agent-input"
          :placeholder="lang === 'zh' ? '输入问题或指令...' : 'Ask a question...'"
          @keydown.enter="send"
        />
        <button class="send-btn" :disabled="agentStore.loading" @click="send">
          {{ agentStore.loading ? '…' : '↗' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'
import { useAgentStore } from '../stores/agent.js'

const props = defineProps({
  enterprise: { type: Object, default: null },
  lang: { type: String, default: 'zh' }
})

const agentStore = useAgentStore()
const inputText = ref('')
const collapsed = ref(false)
const msgRef = ref(null)

async function send() {
  const text = inputText.value.trim()
  if (!text || agentStore.loading) return
  inputText.value = ''
  await agentStore.sendMessage(text, props.enterprise)
  scrollBottom()
}

async function quickDiagnose() {
  if (!props.enterprise) return
  await agentStore.runAnalysis(props.enterprise)
  const result = agentStore.analysis
  if (result) {
    agentStore.messages.push({ role: 'assistant', content: result.summary || JSON.stringify(result) })
    scrollBottom()
  }
}

async function quickRisk() {
  if (!props.enterprise) return
  const result = await agentStore.runDiagnosis(props.enterprise)
  agentStore.messages.push({ role: 'assistant', content: result })
  scrollBottom()
}

async function quickProduct() {
  const q = props.lang === 'zh'
    ? '请根据企业画像推荐最适合的授信产品组合，并说明原因。'
    : 'Please recommend the best credit product combination based on the enterprise profile.'
  await agentStore.sendMessage(q, props.enterprise)
  scrollBottom()
}

function scrollBottom() {
  nextTick(() => {
    if (msgRef.value) msgRef.value.scrollTop = msgRef.value.scrollHeight
  })
}

watch(() => agentStore.messages.length, scrollBottom)
</script>

<style scoped>
.agent-panel {
  position: fixed;
  bottom: 28px;
  left: 50%;
  z-index: 150;
  width: 460px;
  transform: translateX(-50%);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 18px;
  overflow: hidden;
  background: rgba(2, 8, 24, 0.9);
  backdrop-filter: blur(20px);
  box-shadow: 0 0 40px rgba(0, 212, 255, 0.1);
}

.agent-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.agent-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #00d4ff;
}

.model-tag {
  padding: 2px 7px;
  font-size: 10px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  border-radius: 8px;
}

.toggle-icon {
  font-size: 13px;
  color: #94a3b8;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.dot-green {
  background: #10b981;
}

.dot-pulse {
  background: #f97316;
  animation: pulse-dot 0.8s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 1; }
  50% { opacity: .35; }
}

.agent-body {
  padding: 10px 12px;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 6px;
  height: 142px;
  margin-bottom: 8px;
  overflow-y: auto;
}

.messages::-webkit-scrollbar {
  width: 3px;
}

.messages::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
}

.empty-hint {
  margin-top: 44px;
  font-size: 12px;
  text-align: center;
  color: #475569;
}

.msg {
  max-width: 85%;
  padding: 8px 11px;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  border-radius: 10px;
}

.msg-ai {
  align-self: flex-start;
  color: #e2e8f0;
  background: rgba(0, 212, 255, 0.08);
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.msg-user {
  align-self: flex-end;
  color: #e2e8f0;
  background: rgba(168, 85, 247, 0.08);
  border: 1px solid rgba(168, 85, 247, 0.2);
}

.quick-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.quick-btn {
  padding: 5px 10px;
  font-size: 11px;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  cursor: pointer;
  transition: all .2s;
}

.quick-btn:hover {
  color: #00d4ff;
  border-color: #00d4ff;
}

.input-row {
  display: flex;
  gap: 6px;
}

.agent-input {
  flex: 1;
  padding: 8px 12px;
  font-size: 12px;
  color: #e2e8f0;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 20px;
  outline: none;
}

.agent-input:focus {
  border-color: #00d4ff;
}

.send-btn {
  width: 34px;
  height: 34px;
  font-size: 15px;
  font-weight: 700;
  color: #041019;
  background: #00d4ff;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: transform .15s;
}

.send-btn:hover:not(:disabled) {
  transform: scale(1.08);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
