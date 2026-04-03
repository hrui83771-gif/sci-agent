<template>
  <div class="cards-wrap">
    <button
      v-for="dim in dims"
      :key="dim.key"
      type="button"
      class="dim-card"
      :class="{ active: activeDim === dim.key }"
      :style="{ '--accent': dim.color, '--accent-strong': dim.color2 }"
      @click="$emit('dim-click', dim.key)"
    >
      <div class="card-head">
        <div class="card-title-wrap">
          <span class="card-dot"></span>
          <div class="card-title">{{ lang === 'zh' ? dim.label : dim.labelEn }}</div>
        </div>
        <div class="card-score">{{ dim.score }}</div>
      </div>

      <div class="card-bar">
        <div
          class="card-bar-fill"
          :style="{ width: `${dim.score}%`, background: `linear-gradient(90deg, ${dim.color}, ${dim.color2})` }"
        ></div>
      </div>

      <div class="card-summary-label">{{ lang === 'zh' ? '摘要' : 'Summary' }}</div>
      <div class="card-desc">{{ lang === 'zh' ? dim.desc : dim.descEn }}</div>

      <div class="card-meta">
        <span>{{ lang === 'zh' ? '企业' : 'Company' }}</span>
        <strong>{{ dim.meta }}</strong>
      </div>
    </button>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  scores: { type: Object, default: () => ({ tech: 92, team: 85, finance: 78, market: 95 }) },
  detailsMap: { type: Object, default: () => ({}) },
  activeDim: { type: String, default: '' },
  lang: { type: String, default: 'zh' }
})

defineEmits(['dim-click'])

function normalize(value = '', fallback = '') {
  return String(value || fallback || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactSummary(detail = {}, fallback = '') {
  const source = detail.highlights?.[0] || detail.summary || fallback
  const text = normalize(source, fallback)
  return text.length > 34 ? `${text.slice(0, 34)}...` : text
}

function compactMeta(value = '') {
  const parts = normalize(value)
    .split(/\s+[\/路｜]\s+/)
    .map((item) => item.trim())
    .filter(Boolean)

  return parts[0] || '当前企业'
}

const dims = computed(() => [
  {
    key: 'tech',
    label: props.detailsMap.tech?.label || '技术维度',
    labelEn: 'Technology',
    score: props.detailsMap.tech?.score ?? props.scores.tech,
    color: '#00d4ff',
    color2: '#0080ff',
    desc: compactSummary(props.detailsMap.tech || {}, '聚焦专利质量、研发转化效率和关键技术可替代性。'),
    descEn: 'Patents, R&D conversion and tech moat.',
    meta: compactMeta(props.detailsMap.tech?.meta)
  },
  {
    key: 'team',
    label: props.detailsMap.team?.label || '团队维度',
    labelEn: 'Team',
    score: props.detailsMap.team?.score ?? props.scores.team,
    color: '#a855f7',
    color2: '#7c3aed',
    desc: compactSummary(props.detailsMap.team || {}, '聚焦核心成员稳定性、治理结构和组织延续性。'),
    descEn: 'Management stability and governance.',
    meta: compactMeta(props.detailsMap.team?.meta)
  },
  {
    key: 'finance',
    label: props.detailsMap.finance?.label || '财务维度',
    labelEn: 'Finance',
    score: props.detailsMap.finance?.score ?? props.scores.finance,
    color: '#10b981',
    color2: '#059669',
    desc: compactSummary(props.detailsMap.finance || {}, '聚焦营收质量、现金流表现与负债结构承压情况。'),
    descEn: 'Revenue, cash flow and debt pressure.',
    meta: compactMeta(props.detailsMap.finance?.meta)
  },
  {
    key: 'market',
    label: props.detailsMap.market?.label || '市场维度',
    labelEn: 'Market',
    score: props.detailsMap.market?.score ?? props.scores.market,
    color: '#f97316',
    color2: '#dc2626',
    desc: compactSummary(props.detailsMap.market || {}, '聚焦客户结构、市场验证和订单稳定性。'),
    descEn: 'Customers, validation and order stability.',
    meta: compactMeta(props.detailsMap.market?.meta)
  }
])
</script>

<style scoped>
.cards-wrap {
  position: fixed;
  top: 82px;
  left: 12px;
  z-index: 28;
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: calc(100vh - 108px);
  overflow-y: auto;
  padding-right: 6px;
}

.cards-wrap::-webkit-scrollbar {
  width: 4px;
}

.cards-wrap::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.28);
  border-radius: 999px;
}

.dim-card {
  width: 272px;
  min-height: 164px;
  padding: 16px 16px 14px;
  border: 1px solid color-mix(in srgb, var(--accent) 34%, rgba(255, 255, 255, 0.08));
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(11, 23, 46, 0.9), rgba(7, 14, 28, 0.92));
  backdrop-filter: blur(18px);
  color: #e2e8f0;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.dim-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 34px color-mix(in srgb, var(--accent) 24%, transparent);
}

.dim-card.active {
  border-color: color-mix(in srgb, var(--accent) 72%, rgba(255, 255, 255, 0.12));
  box-shadow:
    0 0 0 1px color-mix(in srgb, var(--accent) 48%, transparent),
    0 16px 36px color-mix(in srgb, var(--accent) 26%, transparent);
}

.card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.card-title-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.card-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
}

.card-title {
  min-width: 0;
  font-size: 14px;
  font-weight: 700;
  color: #d9ecff;
}

.card-score {
  flex: 0 0 auto;
  color: var(--accent);
  font-size: 22px;
  font-weight: 800;
  line-height: 1;
}

.card-bar {
  height: 4px;
  margin: 12px 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.card-bar-fill {
  height: 100%;
  border-radius: inherit;
}

.card-summary-label {
  margin-bottom: 6px;
  color: #6f86a4;
  font-size: 11px;
  letter-spacing: 1px;
}

.card-desc {
  display: -webkit-box;
  overflow: hidden;
  min-height: 48px;
  color: #a9bdd4;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.card-meta span {
  color: #6f86a4;
  font-size: 11px;
  letter-spacing: 1px;
}

.card-meta strong {
  display: -webkit-box;
  overflow: hidden;
  color: #d5e3f3;
  font-size: 12px;
  line-height: 1.5;
  word-break: break-word;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

@media (max-width: 900px) {
  .cards-wrap {
    top: auto;
    bottom: 14px;
    left: 12px;
    right: 12px;
    max-height: none;
    flex-direction: row;
    overflow-x: auto;
    overflow-y: hidden;
    padding-bottom: 6px;
  }

  .dim-card {
    flex: 0 0 216px;
    width: 216px;
    min-height: 152px;
  }
}
</style>
