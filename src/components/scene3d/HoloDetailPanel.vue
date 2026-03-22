<template>
  <div
    ref="panelEl"
    class="scene-detail-panel"
    :style="{
      borderColor: popup?.color || '#00ffff',
      boxShadow: `0 0 24px ${popup?.color || '#00ffff'}30 inset`
    }"
  >
    <div class="panel-grid"></div>

    <div class="panel-shell">
      <header class="panel-header">
        <div class="header-main">
          <span class="header-kicker">维度详情</span>
          <h2 class="holo-title" :style="{ color: popup?.color || '#00ffff' }">
            {{ popup?.label || '维度分析' }}
          </h2>
          <p v-if="popup?.meta" class="holo-meta">{{ popup.meta }}</p>
        </div>

        <div class="header-side">
          <div class="score-card">
            <strong class="holo-score">{{ popup?.score || '90' }}</strong>
            <span>pts</span>
          </div>
          <button type="button" class="holo-back" @click.stop="$emit('back')">返回总览</button>
        </div>
      </header>

      <div class="holo-line" :style="{ background: popup?.color || '#00ffff' }"></div>

      <div v-if="popup?.metrics?.length" class="signal-ribbon">
        <article v-for="metric in popup.metrics.slice(0, 3)" :key="metric.label" class="signal-chip">
          <span>{{ metric.label }}</span>
          <strong>{{ metric.value }}</strong>
        </article>
      </div>

      <section class="summary-panel">
        <div class="section-label">AI 摘要</div>
        <div class="summary-copy">
          <div class="typewriter-text">{{ typewriterText }}</div>
          <span v-if="isTyping" class="cursor" :style="{ background: popup?.color || '#00ffff' }"></span>
        </div>
      </section>

      <div class="detail-layout">
        <section v-if="popup?.highlights?.length" class="detail-section">
          <div class="section-head">
            <span class="detail-kicker">关键要点</span>
            <strong>{{ popup.highlights.length }} 条</strong>
          </div>
          <div class="highlight-list">
            <article v-for="item in popup.highlights" :key="item" class="highlight-item">
              <span class="highlight-marker"></span>
              <p>{{ item }}</p>
            </article>
          </div>
        </section>

        <section v-if="popup?.metrics?.length" class="detail-section">
          <div class="section-head">
            <span class="detail-kicker">子指标</span>
            <strong>{{ popup.metrics.length }} 项</strong>
          </div>
          <div class="metric-grid">
            <article v-for="metric in popup.metrics" :key="metric.label" class="metric-card">
              <span>{{ metric.label }}</span>
              <strong>{{ metric.value }}</strong>
              <small>{{ metric.tone }}</small>
            </article>
          </div>
        </section>

        <section v-if="popup?.evidence?.length" class="detail-section detail-section--wide">
          <div class="section-head">
            <span class="detail-kicker">证据线索</span>
            <strong>{{ popup.evidence.length }} 项</strong>
          </div>
          <div class="evidence-grid">
            <article v-for="item in popup.evidence" :key="item.title" class="evidence-card">
              <div class="evidence-top">
                <strong>{{ item.title }}</strong>
                <small>{{ item.state }}</small>
              </div>
              <p>{{ item.excerpt }}</p>
            </article>
          </div>
        </section>
      </div>

      <section class="chat-panel">
        <div class="section-head">
          <span class="detail-kicker">场景追问</span>
          <strong>{{ chatContextLabel || '已带入当前场景资料' }}</strong>
        </div>

        <div class="chat-feed">
          <article
            v-for="entry in chatEntries"
            :key="entry.id"
            class="chat-bubble"
            :class="entry.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'"
          >
            <span class="chat-role">{{ entry.role === 'user' ? '你' : '场景助手' }}</span>
            <p>{{ entry.content }}</p>
          </article>
        </div>

        <div class="chat-compose">
          <textarea
            class="chat-input"
            :value="chatInput"
            rows="3"
            placeholder="基于当前维度继续追问，比如：这个维度最大的风险是什么？"
            @input="$emit('update:chatInput', $event.target.value)"
            @keydown.enter.exact.prevent="$emit('submit-chat')"
          ></textarea>
          <button type="button" class="chat-submit" :disabled="chatLoading" @click="$emit('submit-chat')">
            {{ chatLoading ? '发送中' : '发送' }}
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  popup: {
    type: Object,
    default: null
  },
  typewriterText: {
    type: String,
    default: ''
  },
  isTyping: {
    type: Boolean,
    default: false
  },
  chatEntries: {
    type: Array,
    default: () => []
  },
  chatInput: {
    type: String,
    default: ''
  },
  chatLoading: {
    type: Boolean,
    default: false
  },
  chatContextLabel: {
    type: String,
    default: ''
  }
})

defineEmits(['back', 'update:chatInput', 'submit-chat'])

const panelEl = ref(null)

function getPanelEl() {
  return panelEl.value
}

defineExpose({
  getPanelEl
})
</script>

<style scoped>
.scene-detail-panel {
  position: relative;
  width: 100%;
  height: 100%;
  max-height: 100%;
  overflow: auto;
  border: 2px solid;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(7, 18, 34, 0.95), rgba(5, 12, 24, 0.94));
  backdrop-filter: blur(18px);
  color: #e6eef8;
}

.scene-detail-panel::-webkit-scrollbar {
  width: 8px;
}

.scene-detail-panel::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.22);
  border-radius: 999px;
}

.panel-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.55;
  pointer-events: none;
}

.panel-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 26px 28px 24px;
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.header-main {
  min-width: 0;
}

.header-kicker {
  display: inline-flex;
  margin-bottom: 10px;
  color: #7f94ad;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.holo-title {
  margin: 0;
  font-size: 30px;
  line-height: 1.1;
  font-weight: 800;
  letter-spacing: 2px;
  text-shadow: 0 0 15px currentColor;
}

.holo-meta {
  margin: 12px 0 0;
  color: #9bb0c7;
  font-size: 13px;
  line-height: 1.6;
}

.header-side {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 0 0 auto;
}

.score-card {
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.holo-score {
  color: #ffffff;
  font-size: 42px;
  font-weight: 900;
  line-height: 1;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.28);
}

.score-card span {
  margin-bottom: 4px;
  color: #8ca4bf;
  font-size: 14px;
}

.holo-back {
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.08);
  color: #d9ecff;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.holo-line {
  height: 4px;
  width: 100%;
  border-radius: 999px;
  box-shadow: 0 0 14px currentColor;
}

.signal-ribbon {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.signal-chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.signal-chip span {
  color: #7f94ad;
  font-size: 12px;
}

.signal-chip strong {
  color: #f8fbff;
  font-size: 18px;
}

.summary-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.section-label {
  color: #7f94ad;
  font-size: 12px;
  letter-spacing: 1px;
}

.summary-copy {
  position: relative;
  min-height: 108px;
  padding: 18px 22px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: linear-gradient(180deg, rgba(12, 24, 47, 0.9), rgba(7, 16, 32, 0.76));
  font-size: 17px;
  line-height: 1.8;
  color: #eef5ff;
}

.typewriter-text {
  white-space: pre-wrap;
}

.cursor {
  display: inline-block;
  width: 9px;
  height: 20px;
  vertical-align: middle;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0;
  }
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
  gap: 14px;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: linear-gradient(180deg, rgba(8, 18, 37, 0.92), rgba(5, 11, 24, 0.8));
  box-shadow: inset 0 0 24px rgba(0, 212, 255, 0.04);
}

.detail-section--wide {
  grid-column: 1 / -1;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.detail-kicker {
  color: #7f94ad;
  font-size: 11px;
  letter-spacing: 2px;
  text-transform: uppercase;
}

.section-head strong {
  color: #d8e7f8;
  font-size: 12px;
  font-weight: 600;
}

.highlight-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.highlight-item {
  display: grid;
  grid-template-columns: 10px minmax(0, 1fr);
  gap: 10px;
  align-items: start;
  padding: 12px 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.highlight-marker {
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: currentColor;
  color: #68e5ff;
  box-shadow: 0 0 10px currentColor;
}

.highlight-item p {
  margin: 0;
  color: #deebf8;
  font-size: 14px;
  line-height: 1.65;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.metric-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 116px;
  padding: 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(148, 163, 184, 0.1);
}

.metric-card span {
  color: #8ca4bf;
  font-size: 13px;
}

.metric-card strong {
  color: #ffffff;
  font-size: 22px;
  line-height: 1.15;
}

.metric-card small {
  color: #d9ecff;
  font-size: 14px;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.evidence-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 118px;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(255, 255, 255, 0.035);
}

.evidence-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.evidence-top strong {
  color: #f8fafc;
  font-size: 14px;
  line-height: 1.55;
}

.evidence-top small {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(103, 232, 249, 0.12);
  color: #67e8f9;
  font-size: 11px;
}

.evidence-card p {
  margin: 0;
  color: #9eb2c9;
  font-size: 13px;
  line-height: 1.65;
}

.chat-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: linear-gradient(180deg, rgba(8, 18, 37, 0.92), rgba(5, 11, 24, 0.8));
}

.chat-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 240px;
  overflow: auto;
  padding-right: 4px;
}

.chat-feed::-webkit-scrollbar {
  width: 6px;
}

.chat-feed::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.18);
  border-radius: 999px;
}

.chat-bubble {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.chat-bubble--assistant {
  background: rgba(255, 255, 255, 0.03);
}

.chat-bubble--user {
  align-self: flex-end;
  background: rgba(0, 212, 255, 0.08);
  border-color: rgba(0, 212, 255, 0.18);
}

.chat-role {
  color: #7f94ad;
  font-size: 11px;
  letter-spacing: 1px;
}

.chat-bubble p {
  margin: 0;
  color: #e4eef9;
  font-size: 13px;
  line-height: 1.7;
  white-space: pre-wrap;
}

.chat-compose {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: end;
}

.chat-input {
  width: 100%;
  resize: none;
  padding: 12px 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(4, 11, 24, 0.9);
  color: #e8f1fb;
  font: inherit;
  line-height: 1.6;
}

.chat-submit {
  height: 44px;
  padding: 0 18px;
  border: 1px solid rgba(0, 212, 255, 0.18);
  border-radius: 999px;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.22), rgba(21, 112, 239, 0.3));
  color: #f8fbff;
  font: inherit;
  cursor: pointer;
}

.chat-submit:disabled {
  opacity: 0.6;
  cursor: default;
}

@media (max-width: 960px) {
  .panel-shell {
    padding: 20px 20px 18px;
  }

  .panel-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-side {
    justify-content: space-between;
  }

  .signal-ribbon {
    grid-template-columns: 1fr;
  }

  .detail-layout,
  .metric-grid,
  .evidence-grid {
    grid-template-columns: 1fr;
  }

  .chat-compose {
    grid-template-columns: 1fr;
  }

  .detail-section--wide {
    grid-column: auto;
  }
}
</style>
