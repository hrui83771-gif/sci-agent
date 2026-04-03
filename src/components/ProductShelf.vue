<template>
  <div class="shelf-wrap">
    <div class="shelf-title">{{ lang === 'zh' ? '金融产品匹配' : 'Product Matching' }}</div>
    <div class="shelf-items">
      <div
        v-for="p in products"
        :key="p.id"
        class="shelf-item"
        :class="{ selected: selected === p.id }"
        @click="select(p)"
      >
        <div class="shelf-cube" :style="{ '--color': p.color, '--match': p.match, '--size': `${24 + p.match * 16}px` }"></div>
        <div class="shelf-info">
          <div class="shelf-name">{{ lang === 'zh' ? p.name : p.name_en }}</div>
          <div class="shelf-sub">{{ p.amount }} 万 · {{ p.rate }}</div>
        </div>
        <div class="shelf-match" :style="{ color: p.color }">{{ Math.round(p.match * 100) }}%</div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="detail" class="product-modal" @click.self="detail = null">
        <div class="product-modal-inner" :style="{ '--color': detail.color }">
          <button class="modal-close" @click="detail = null">×</button>
          <h3>{{ lang === 'zh' ? detail.name : detail.name_en }}</h3>
          <div class="modal-row"><span>{{ lang === 'zh' ? '授信额度' : 'Credit Limit' }}</span><span>{{ detail.amount }} 万元</span></div>
          <div class="modal-row"><span>{{ lang === 'zh' ? '参考利率' : 'Rate' }}</span><span>{{ detail.rate }}</span></div>
          <div class="modal-row"><span>{{ lang === 'zh' ? '匹配度' : 'Match' }}</span><span>{{ Math.round(detail.match * 100) }}%</span></div>
          <div class="modal-row"><span>{{ lang === 'zh' ? '产品类型' : 'Type' }}</span><span>{{ lang === 'zh' ? '科创专项' : 'Tech Specialty' }}</span></div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  products: { type: Array, default: () => [] },
  lang: { type: String, default: 'zh' }
})

const selected = ref(null)
const detail = ref(null)

function select(product) {
  selected.value = product.id
  detail.value = product
}
</script>

<style scoped>
.shelf-wrap {
  position: fixed;
  top: 72px;
  right: 18px;
  z-index: 100;
  width: 230px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  background: rgba(6, 16, 32, 0.76);
  backdrop-filter: blur(18px);
}

.shelf-title {
  margin-bottom: 8px;
  font-size: 11px;
  letter-spacing: 1px;
  color: #94a3b8;
}

.shelf-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shelf-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 8px;
  border: 1px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: all .2s;
}

.shelf-item:hover,
.shelf-item.selected {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.14);
}

.shelf-cube {
  width: var(--size);
  height: var(--size);
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--color);
  opacity: calc(0.4 + var(--match) * 0.6);
  box-shadow: 0 0 16px var(--color);
  animation: float-cube 3s ease-in-out infinite;
}

@keyframes float-cube {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-3px) rotate(5deg); }
}

.shelf-info {
  flex: 1;
  min-width: 0;
}

.shelf-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: #e2e8f0;
}

.shelf-sub {
  font-size: 11px;
  color: #94a3b8;
}

.shelf-match {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 800;
}

.product-modal {
  position: fixed;
  inset: 0;
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(2, 8, 24, 0.72);
  backdrop-filter: blur(8px);
}

.product-modal-inner {
  position: relative;
  width: 300px;
  padding: 24px;
  border: 1px solid var(--color);
  border-radius: 20px;
  background: rgba(10, 20, 50, 0.95);
  box-shadow: 0 0 40px color-mix(in srgb, var(--color) 28%, transparent);
}

.modal-close {
  position: absolute;
  top: 12px;
  right: 14px;
  border: none;
  background: none;
  color: #94a3b8;
  font-size: 18px;
  cursor: pointer;
}

.product-modal-inner h3 {
  margin-bottom: 14px;
  font-size: 16px;
  color: var(--color);
}

.modal-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 13px;
  color: #e2e8f0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-row:last-child {
  border-bottom: none;
}
</style>
