<template>
  <section class="product-deck" :key="activeDimension">
    <div class="deck-head">
      <div>
        <span class="deck-kicker">适配产品</span>
        <h3>基于当前画像的产品建议</h3>
      </div>
      <span class="deck-note">按 {{ activeLabel }} 维度匹配度排序</span>
    </div>

    <div class="deck-grid">
      <article
        v-for="product in rankedProducts"
        :key="product.id"
        class="product-card"
        :style="{ '--accent': product.color }"
      >
        <div class="product-head">
          <div>
            <strong>{{ product.name }}</strong>
            <div class="product-meta-line">
              <span>{{ product.amount }} 万</span>
              <span>{{ product.rate }}</span>
            </div>
          </div>
          <div class="head-side">
            <div class="type-pill">{{ product.category === 'wealth' ? '理财' : '授信' }}</div>
            <div class="match-pill">{{ Math.round(product.currentMatch * 100) }}%</div>
          </div>
        </div>

        <div class="fit-bar">
          <div class="fit-bar-fill" :style="{ width: `${Math.round(product.currentMatch * 100)}%` }"></div>
        </div>

        <p>{{ product.reason }}</p>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  products: {
    type: Array,
    default: () => []
  },
  activeDimension: {
    type: String,
    default: 'tech'
  },
  dimensionLabelMap: {
    type: Object,
    default: () => ({})
  }
})

const activeLabel = computed(() => props.dimensionLabelMap?.[props.activeDimension] || '当前')

const rankedProducts = computed(() => {
  return [...props.products]
    .map((product) => ({
      ...product,
      currentMatch: Number(product.fit?.[props.activeDimension] ?? product.baseMatch ?? 0)
    }))
    .sort((a, b) => b.currentMatch - a.currentMatch)
})
</script>

<style scoped>
.product-deck {
  display: flex;
  flex-direction: column;
  gap: 14px;
  height: 100%;
}

.deck-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

.deck-kicker {
  color: #8ca4bf;
  font-size: 12px;
  letter-spacing: 1px;
}

.deck-head h3 {
  margin: 6px 0 0;
  color: #f8fbff;
  font-size: 22px;
}

.deck-note {
  color: #9fb3ca;
  font-size: 13px;
}

.deck-grid {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
  flex: 1;
  min-height: 0;
}

.product-card {
  flex: 0 0 auto;
  width: 280px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid color-mix(in srgb, var(--accent) 24%, rgba(255, 255, 255, 0.1));
  background: linear-gradient(180deg, rgba(10, 20, 40, 0.92), rgba(6, 12, 24, 0.94));
}

.product-card > p {
  margin: 0;
  color: #9fb3ca;
  font-size: 13px;
  line-height: 1.6;
}

.deck-grid::-webkit-scrollbar {
  height: 6px;
}

.deck-grid::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.22);
  border-radius: 999px;
}

.product-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.product-head strong {
  display: block;
  color: #f8fbff;
  font-size: 16px;
  line-height: 1.4;
}

.product-meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 6px;
  color: #8ca4bf;
  font-size: 12px;
}

.head-side {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: end;
}

.type-pill,
.match-pill {
  padding: 7px 11px;
  border-radius: 999px;
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
}

.type-pill {
  background: rgba(255, 255, 255, 0.08);
}

.match-pill {
  background: color-mix(in srgb, var(--accent) 16%, rgba(255, 255, 255, 0.05));
}

.fit-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.fit-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in srgb, var(--accent) 70%, white), var(--accent));
  transition: width 0.8s cubic-bezier(0.25, 1, 0.5, 1);
}

.product-card p {
  margin: 0;
  color: #d7e6f5;
  line-height: 1.65;
}
</style>
