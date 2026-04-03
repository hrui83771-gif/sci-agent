<template>
  <section class="insight-panel">
    <header class="panel-head">
      <div class="title-group">
        <span class="panel-kicker">维度详情</span>
        <h3>{{ detail.label }}</h3>
        <p class="panel-summary">{{ detail.summary }}</p>
      </div>

      <div class="score-pill" :style="{ '--accent': accentColor }">
        <strong>{{ detail.score }}</strong>
        <span>分</span>
      </div>
    </header>

    <section class="stat-strip">
      <article class="stat-chip">
        <span>关键要点</span>
        <strong>{{ detail.highlights?.length || 0 }}</strong>
      </article>
      <article class="stat-chip">
        <span>风险项</span>
        <strong>{{ detail.risks?.length || 0 }}</strong>
      </article>
      <article class="stat-chip">
        <span>核验材料</span>
        <strong>{{ detail.evidence?.length || 0 }}</strong>
      </article>
      <article v-if="recommendedProduct" class="stat-chip">
        <span>产品匹配</span>
        <strong>{{ Math.round((recommendedProduct.currentMatch ?? recommendedProduct.baseMatch ?? 0) * 100) }}%</strong>
      </article>
    </section>

    <section class="top-grid">
      <div class="chart-card" :key="`chart-${activeDimension}`">
        <div class="card-head">
          <span class="block-title">波动曲线</span>
          <strong>{{ trendDeltaLabel }}</strong>
        </div>

        <svg class="trend-chart" viewBox="0 0 320 110" preserveAspectRatio="none">
          <defs>
            <linearGradient id="trend-area" x1="0%" x2="0%" y1="0%" y2="100%">
              <stop offset="0%" :stop-color="accentColor" stop-opacity="0.42" />
              <stop offset="100%" :stop-color="accentColor" stop-opacity="0.03" />
            </linearGradient>
            <clipPath id="reveal-clip">
              <rect x="0" y="0" width="320" height="110" class="reveal-rect"></rect>
            </clipPath>
          </defs>

          <path class="chart-grid-line" d="M0 22 H320" />
          <path class="chart-grid-line" d="M0 55 H320" />
          <path class="chart-grid-line" d="M0 88 H320" />

          <g clip-path="url(#reveal-clip)">
            <path class="trend-area" :d="areaPath"></path>
            <path class="trend-line" :d="linePath" :style="{ stroke: accentColor }"></path>
            <circle
              v-for="(point, index) in points"
              :key="`${point.x}-${point.y}`"
              class="trend-dot"
              :cx="point.x"
              :cy="point.y"
              :r="index === points.length - 1 ? 4 : 3"
              :style="{ fill: accentColor, animationDelay: `${index * 0.06 + 0.2}s` }"
            />
          </g>
        </svg>
      </div>

      <div v-if="recommendedProduct" class="recommend-card" :style="{ '--accent': recommendedProduct.color }">
        <div class="card-head">
          <span class="block-title">推荐产品</span>
          <span class="recommend-type">{{ recommendedProduct.category === 'wealth' ? '理财产品' : '授信产品' }}</span>
        </div>

        <strong class="recommend-name">{{ recommendedProduct.name }}</strong>
        <div class="recommend-meta">
          <span>{{ recommendedProduct.amount }} 万</span>
          <span>{{ recommendedProduct.rate }}</span>
          <span>匹配度 {{ Math.round((recommendedProduct.currentMatch ?? recommendedProduct.baseMatch ?? 0) * 100) }}%</span>
        </div>
        <p>{{ recommendedProduct.reason }}</p>
      </div>
    </section>

    <section class="content-grid">
      <div class="panel-block">
        <div class="card-head">
          <span class="block-title">关键要点</span>
          <strong>{{ detail.highlights?.length || 0 }} 条</strong>
        </div>
        <div class="tag-list">
          <span v-for="item in detail.highlights" :key="item" class="tag-item">{{ item }}</span>
        </div>
      </div>

      <div class="panel-block">
        <div class="card-head">
          <span class="block-title">核验材料</span>
          <strong>{{ detail.evidence?.length || 0 }} 项</strong>
        </div>
        <ul class="compact-list">
          <li v-for="item in detail.evidence" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div class="panel-block">
        <div class="card-head">
          <span class="block-title">主要风险</span>
          <strong>{{ detail.risks?.length || 0 }} 项</strong>
        </div>
        <ul class="compact-list compact-list--risk">
          <li v-for="item in detail.risks" :key="item">{{ item }}</li>
        </ul>
      </div>

      <div class="panel-block panel-block--accent">
        <div class="card-head">
          <span class="block-title">建议动作</span>
          <strong>立即执行</strong>
        </div>
        <p>{{ detail.recommendation }}</p>
      </div>
    </section>

    <section class="chat-card">
      <div class="card-head">
        <span class="block-title">维度追问</span>
        <strong>{{ chatContextLabel }}</strong>
      </div>

      <div class="chat-feed">
        <article
          v-for="entry in chatEntries"
          :key="entry.id"
          class="chat-bubble"
          :class="entry.role === 'user' ? 'chat-bubble--user' : 'chat-bubble--assistant'"
        >
          <span class="chat-role">{{ entry.role === 'user' ? '你' : '画像助手' }}</span>
          <p>{{ entry.content }}</p>
        </article>
      </div>

      <div class="chat-compose">
        <textarea
          class="chat-input"
          :value="chatInput"
          rows="2"
          placeholder="继续追问这个维度，比如：最大的风险是什么？"
          @input="$emit('update:chat-input', $event.target.value)"
          @keydown.enter.exact.prevent="$emit('submit-chat')"
        ></textarea>
        <button type="button" class="chat-submit" :disabled="chatLoading" @click="$emit('submit-chat')">
          {{ chatLoading ? '发送中' : '发送' }}
        </button>
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  detail: {
    type: Object,
    required: true
  },
  colorMap: {
    type: Object,
    default: () => ({})
  },
  activeDimension: {
    type: String,
    default: 'tech'
  },
  recommendedProduct: {
    type: Object,
    default: null
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

defineEmits(['update:chat-input', 'submit-chat'])

const accentColor = computed(() => props.colorMap?.[props.activeDimension] || '#00d4ff')

const points = computed(() => {
  const values = Array.isArray(props.detail?.trend) && props.detail.trend.length ? props.detail.trend : [68, 72, 60, 79, 66, 84, 62, 88, 72, 91]
  const width = 320
  const height = 110
  const paddingX = 12
  const paddingY = 10
  const step = (width - paddingX * 2) / Math.max(values.length - 1, 1)

  return values.map((value, index) => ({
    x: paddingX + step * index,
    y: height - paddingY - ((value - 50) / 50) * (height - paddingY * 2)
  }))
})

const linePath = computed(() => {
  return points.value.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
})

const areaPath = computed(() => {
  if (!points.value.length) return ''
  const first = points.value[0]
  const last = points.value[points.value.length - 1]
  return `${linePath.value} L ${last.x} 110 L ${first.x} 110 Z`
})

const trendDeltaLabel = computed(() => {
  const values = Array.isArray(props.detail?.trend) && props.detail.trend.length ? props.detail.trend : []
  if (values.length < 2) return '趋势稳定'
  const delta = values[values.length - 1] - values[0]
  if (delta >= 6) return '趋势走强'
  if (delta <= -6) return '趋势承压'
  return '趋势平稳'
})
</script>

<style scoped>
.insight-panel {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: linear-gradient(180deg, rgba(8, 18, 37, 0.94), rgba(5, 11, 24, 0.92));
  box-shadow: 0 18px 42px rgba(0, 0, 0, 0.2);
}

.insight-panel::-webkit-scrollbar {
  width: 10px;
}

.insight-panel::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.36);
  border-radius: 999px;
  border: 2px solid rgba(7, 15, 29, 0.86);
}

.insight-panel::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.04);
  border-radius: 999px;
}

.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.title-group {
  min-width: 0;
}

.panel-kicker,
.block-title {
  color: #8ca4bf;
  font-size: 11px;
  letter-spacing: 1px;
}

.panel-head h3 {
  margin: 2px 0 6px;
  color: #f8fbff;
  font-size: 20px;
  line-height: 1.15;
}

.panel-summary {
  margin: 0;
  color: #d8e7f6;
  font-size: 13px;
  line-height: 1.55;
}

.score-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--accent) 45%, rgba(255, 255, 255, 0.14));
  background: color-mix(in srgb, var(--accent) 14%, rgba(5, 12, 24, 0.88));
  color: #f8fbff;
}

.score-pill strong {
  font-size: 18px;
}

.stat-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}

.stat-chip,
.chart-card,
.panel-block,
.recommend-card,
.chat-card {
  padding: 10px 12px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(255, 255, 255, 0.03);
}

.stat-chip {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-chip span {
  color: #8ca4bf;
  font-size: 10px;
}

.stat-chip strong {
  color: #f8fbff;
  font-size: 16px;
}

.top-grid,
.content-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.card-head strong {
  color: #d8e7f6;
  font-size: 11px;
}

.trend-chart {
  width: 100%;
  height: 74px;
}

.chart-grid-line {
  stroke: rgba(148, 163, 184, 0.16);
  stroke-width: 1;
}

.trend-area {
  fill: url(#trend-area);
}

.trend-line {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-dot {
  filter: drop-shadow(0 0 6px currentColor);
  opacity: 0;
  animation: fade-in-dot 0.4s ease forwards;
}

.reveal-rect {
  animation: reveal-chart 1.2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
}

@keyframes reveal-chart {
  0% { width: 0; }
  100% { width: 320px; }
}

@keyframes fade-in-dot {
  0% { opacity: 0; transform: scale(0); transform-origin: center; }
  100% { opacity: 1; transform: scale(1); transform-origin: center; }
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag-item {
  padding: 6px 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: #e1eefb;
  font-size: 11px;
  line-height: 1.35;
}

.compact-list {
  margin: 0;
  padding-left: 18px;
  color: #d8e7f6;
  line-height: 1.5;
  font-size: 13px;
}

.compact-list li + li {
  margin-top: 4px;
}

.recommend-card {
  border-color: color-mix(in srgb, var(--accent) 26%, rgba(148, 163, 184, 0.12));
  background: linear-gradient(180deg, color-mix(in srgb, var(--accent) 10%, rgba(255, 255, 255, 0.03)), rgba(255, 255, 255, 0.03));
}

.recommend-name {
  display: block;
  margin-bottom: 8px;
  color: #f8fbff;
  font-size: 16px;
  line-height: 1.4;
}

.recommend-type {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--accent) 16%, rgba(255, 255, 255, 0.06));
  color: #f8fbff;
  font-size: 11px;
}

.recommend-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 6px;
  color: #9fb3ca;
  font-size: 11px;
}

.recommend-card p,
.panel-block p {
  margin: 0;
  color: #e6f4ff;
  line-height: 1.55;
  font-size: 12px;
}

.chat-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-feed {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 90px;
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
  gap: 4px;
  padding: 8px 10px;
  border-radius: 14px;
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
  font-size: 12px;
  line-height: 1.5;
  white-space: pre-wrap;
}

.chat-compose {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: end;
}

.chat-input {
  width: 100%;
  resize: none;
  padding: 9px 11px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(4, 11, 24, 0.9);
  color: #e8f1fb;
  font: inherit;
  line-height: 1.45;
}

.chat-submit {
  height: 38px;
  padding: 0 14px;
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
  .stat-strip,
  .top-grid,
  .content-grid,
  .chat-compose {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .insight-panel {
    padding: 12px;
    gap: 8px;
  }

  .panel-head {
    gap: 10px;
  }

  .panel-head h3 {
    font-size: 18px;
  }

  .stat-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trend-chart {
    height: 68px;
  }

  .chat-feed {
    max-height: 96px;
  }
}
</style>
