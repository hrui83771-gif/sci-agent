<template>
  <div class="portrait-shell">
    <div class="scene-backdrop"></div>

    <header class="topbar">
      <div class="brand-copy">
        <span class="brand-kicker">3D 客户画像</span>
        <h1>{{ enterprise.name }}</h1>
        <p>{{ enterprise.industry }} · 贷款额度 {{ enterprise.loanDemand.amount }} · 期限 {{ enterprise.loanDemand.term }}</p>
      </div>

      <div class="topbar-actions">
        <button type="button" class="action-button action-button--ghost" @click="router.push('/')">
          返回首页
        </button>
        <button type="button" class="action-button action-button--primary" @click="router.push('/ai')">
          AI 工作台
        </button>
      </div>
    </header>

    <section class="demand-banner panel-surface">
      <div class="banner-copy">
        <span class="section-kicker">客户贷款需求</span>
        <strong>{{ enterprise.loanDemand.summary }}</strong>
        <p>用途：{{ enterprise.loanDemand.purpose }}</p>
      </div>

      <div class="banner-tags">
        <span class="banner-pill">额度 {{ enterprise.loanDemand.amount }}</span>
        <span class="banner-pill">期限 {{ enterprise.loanDemand.term }}</span>
        <span class="banner-pill">阶段 {{ lifecycleLabel }}</span>
      </div>
    </section>

    <section class="portrait-layout">
      <div class="cube-column panel-surface">
        <div class="panel-header">
          <div>
            <h2>3D客户画像</h2>
          </div>
          <span class="panel-note">点击立方体仅切换左侧聚焦</span>
        </div>

        <EnterpriseCubePortrait
          :enterprise="enterprise"
          :active-dimension="activeDimension"
          :dimension-color-map="dimensionColorMap"
          @select-dimension="setActiveDimension"
        />
      </div>

      <div class="detail-column panel-surface">
        <div class="panel-header">
          <div>
            <h2>AI智能产品专家匹配</h2>
          </div>
          <div class="header-actions">
            <button type="button" class="nav-button nav-button--hero" @click="showPrevProduct">← 上一张</button>
            <button type="button" class="nav-button nav-button--hero" @click="showNextProduct">下一张 →</button>
          </div>
        </div>

        <div class="product-toolbar">
          <div class="stage-field">
            <span>企业阶段判断</span>
            <strong class="stage-value">{{ lifecycleLabel }}</strong>
          </div>
          <div class="selection-pill">已勾选 {{ selectedProducts.length }} / {{ productCatalog.length }}</div>
        </div>

        <section class="advisor-card" :class="{ matched: !!currentSuggestion }">
          <div class="advisor-head">
            <div>
              <span class="card-kicker">产品 {{ currentProductIndex + 1 }} / {{ productCatalog.length }}</span>
              <h3>{{ currentProduct.name }}</h3>
              <p class="product-meta">{{ currentProduct.shortMeta }}</p>
            </div>

            <div class="advisor-actions">
              <label class="select-box">
                <input v-model="selectedProductIds" type="checkbox" :value="currentProduct.id" />
                <span class="fake-check"></span>
                <span>勾选</span>
              </label>
              <span v-if="currentSuggestion" class="match-pill">匹配度 {{ currentSuggestion.matchPercent }}%</span>
            </div>
          </div>

          <div class="advisor-body">
            <div class="content-block">
              <span class="block-title">产品说明</span>
              <p>{{ currentProduct.description }}</p>
            </div>

            <div class="content-block ai-block">
              <span class="block-title">AI专家建议</span>
              <template v-if="currentSuggestion">
                <strong>{{ currentSuggestion.reason }}</strong>
                <p>{{ currentSuggestion.advice }}</p>
              </template>
              <template v-else>
                <strong>当前阶段不是优先推荐产品</strong>
                <p>该产品不在 {{ lifecycleLabel }} 的默认推荐池中，如需保留可以继续勾选作为人工备选。</p>
              </template>
            </div>
          </div>

          <div class="advisor-footer">
            <div class="product-tabs">
              <button
                v-for="(product, index) in productCatalog"
                :key="product.id"
                type="button"
                class="product-tab"
                :class="{
                  active: index === currentProductIndex,
                  checked: selectedProductIds.includes(product.id)
                }"
                @click="currentProductIndex = index"
              >
                {{ product.name }}
              </button>
            </div>
          </div>
        </section>

      </div>
    </section>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import EnterpriseCubePortrait from './portrait/EnterpriseCubePortrait.vue'
import { useEnterpriseStore } from '../stores/enterprise.js'

defineEmits(['enter-ai'])

const router = useRouter()
const enterpriseStore = useEnterpriseStore()

const enterprise = {
  id: 'ZJ-JQZN-001',
  name: '浙江机器智能公司',
  industry: '智能制造 / 机器视觉',
  city: '浙江',
  founded: '2019',
  lifecycleStage: 'startup',
  loanDemand: {
    amount: '450万',
    term: '1年',
    purpose: '流动资金周转',
    summary: '贷款额度450万，期限1年，用于流动资金周转。'
  },
  scores: {
    team: 89,
    tech: 92,
    finance: 84,
    market: 76,
    total: 85.3
  },
  dimensions: {
    team: {
      label: '团队维度',
      score: 89,
      facts: ['C类人才2人', 'D类人才3人', '研发团队28人', '核心团队稳定']
    },
    tech: {
      label: '技术维度',
      score: 92,
      facts: ['专利16项', '发明专利7项', '研发占比37%', '小米生态链', '机器换人试点']
    },
    finance: {
      label: '财务维度',
      score: 84,
      facts: ['营收1400万', '技术合同510万', '应收周转2.8', '净利利率24%', '确权余额72%']
    },
    market: {
      label: '市场维度',
      score: 76,
      facts: ['竞争趋于激烈', '产品竞争力强', '客户集中度高', '订单确权82%']
    }
  }
}

const productCatalog = [
  {
    id: 'talent_loan',
    name: '人才贷',
    shortMeta: '最高500万元 · 期限一般不超过36个月 · 利率2.2%-2.8%',
    description: '面向县级以上政府职能部门、组织认定的各类人才发放，纯信用、免担保、最高额度500万元，贷款期限一般不超过36个月。利率2.2%-2.8%。'
  },
  {
    id: 'rd_loan',
    name: '研发贷',
    shortMeta: '最高2000万元 · 期限一般不超过36个月 · 利率3.0%-3.6%',
    description: '适用于获得投资机构投资的企业、拥有高技术含量知识产权的企业，支持企业研发创新，促进企业科技成果转化。最高额度2000万元，贷款期限一般不超过36个月。3.0%-3.6%。'
  },
  {
    id: 'ip_pledge_loan',
    name: '知识产权质押贷',
    shortMeta: '最高2000万元 · 期限一般不超过3年 · 利率2%-2.6%',
    description: '以知识产权作为质押担保，额度根据知识产权评估价值确定，最高额度不超过2000万元，贷款期限一般不超过3年。2%-2.6%。'
  },
  {
    id: 'co_creation_loan',
    name: '共创贷',
    shortMeta: '最高2000万元 · 期限一般不超过36个月 · 利率2.55%-3.5%',
    description: '面向科技企业提供“银行债权+认股期权”相结合的融资模式，最高额度2000万元，贷款期限一般不超过36个月。2.55%-3.5%。'
  },
  {
    id: 'bank_invest_loan',
    name: '银投联贷',
    shortMeta: '最高3000万元 · 期限一般不超过12个月 · 利率2.55%-3.5%',
    description: '面向获得优质创投机构投资、或者具有一定发展潜力和市场竞争能力的企业，提供“投前贷后”“贷前投后”两种模式，以投定贷，以贷促投。最高额度3000万元，贷款期限一般不超过12个月。2.55%-3.5%。'
  },
  {
    id: 'equity_incentive_loan',
    name: '股权激励贷',
    shortMeta: '最高3000万元 · 期限一般不超过60个月 · 利率2.55%-3.5%',
    description: '适用于企业实施员工持股计划、股权激励的贷款，最高额度3000万元，贷款期限一般不超过60个月。2.55%-3.5%。'
  },
  {
    id: 'ma_loan',
    name: '并购贷',
    shortMeta: '最高3000万元 · 期限一般不超过84个月 · 利率2.55%-4.0%',
    description: '适用于科创企业支付并购交易价款和费用的贷款，额度一般不超过并购交易价款的70%，最高不超过3000万元，贷款期限一般不超过84个月。2.55%-4.0%。'
  }
]

const dimensionColorMap = {
  team: '#8b5cf6',
  tech: '#00d4ff',
  finance: '#22c55e',
  market: '#f97316'
}

const lifecycleMap = {
  seed: { label: '种子期', products: ['talent_loan', 'ip_pledge_loan', 'rd_loan'] },
  startup: { label: '初创期', products: ['talent_loan', 'ip_pledge_loan', 'co_creation_loan', 'bank_invest_loan'] },
  growth: { label: '成长期', products: ['co_creation_loan', 'bank_invest_loan'] },
  mature: { label: '成熟期', products: ['equity_incentive_loan', 'ma_loan'] }
}

const adviceByProduct = {
  talent_loan: {
    percent: 84,
    reason: '团队稳定、有人才标签，可承接纯信用方案。',
    advice: '若进一步补强人才认定材料，人才贷可以作为低成本信用方案。'
  },
  rd_loan: {
    percent: 87,
    reason: '研发占比高、专利储备较好，适合研发创新场景。',
    advice: '适合支撑研发投入与成果转化，但与本次流动资金周转诉求相比不是最优先。'
  },
  ip_pledge_loan: {
    percent: 86,
    reason: '知识产权基础较扎实，可作为有效授信抓手。',
    advice: '建议作为备选方案，当需要增强增信结构时优先考虑。'
  },
  co_creation_loan: {
    percent: 91,
    reason: '企业处于成长期，技术与市场能力兼具，契合成长型融资结构。',
    advice: '建议作为主推荐方案之一，兼顾企业当前周转需求和后续成长空间。'
  },
  bank_invest_loan: {
    percent: 88,
    reason: '期限1年，与该产品期限适配度高，且企业具备成长潜力。',
    advice: '建议作为本次450万、1年期流动资金周转需求的重点推荐产品。'
  },
  equity_incentive_loan: {
    percent: 63,
    reason: '当前并未体现员工持股或股权激励诉求。',
    advice: '现阶段不建议优先匹配，更适合成熟阶段的股权安排。'
  },
  ma_loan: {
    percent: 58,
    reason: '当前贷款需求并非并购支付场景。',
    advice: '现阶段不建议优先匹配，除非后续出现并购交易需求。'
  }
}

const activeDimension = ref('team')
const currentProductIndex = ref(0)
const selectedProductIds = ref(['co_creation_loan', 'bank_invest_loan'])

const lifecycleStage = enterprise.lifecycleStage
const lifecycleLabel = computed(() => lifecycleMap[lifecycleStage]?.label || '初创期')
const selectedProducts = computed(() => productCatalog.filter((item) => selectedProductIds.value.includes(item.id)))
const currentProduct = computed(() => productCatalog[currentProductIndex.value] || productCatalog[0])
const currentSuggestion = computed(() => {
  const advice = adviceByProduct[currentProduct.value.id]
  return advice
    ? {
        ...advice,
        matchPercent: advice.percent
      }
    : null
})

function setActiveDimension(key) {
  activeDimension.value = key
}

function showPrevProduct() {
  currentProductIndex.value = (currentProductIndex.value - 1 + productCatalog.length) % productCatalog.length
}

function showNextProduct() {
  currentProductIndex.value = (currentProductIndex.value + 1) % productCatalog.length
}

watch(
  () => enterprise,
  (current) => {
    enterpriseStore.setMock({
      id: current.id,
      name: current.name,
      industry: current.industry,
      founded: current.founded,
      scores: current.scores
    })
  },
  { immediate: true }
)
</script>

<style scoped>
.portrait-shell {
  position: relative;
  box-sizing: border-box;
  min-height: 100vh;
  padding: 16px 16px 14px;
  overflow-x: hidden;
  overflow-y: auto;
  background:
    radial-gradient(circle at 50% 20%, rgba(0, 212, 255, 0.12), transparent 20%),
    radial-gradient(circle at 18% 78%, rgba(139, 92, 246, 0.1), transparent 24%),
    linear-gradient(180deg, #030917 0%, #040d1f 52%, #050b17 100%);
  color: #e8f1fb;
}

.scene-backdrop {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 34px 34px;
  mask-image: radial-gradient(circle at center, black 42%, transparent 92%);
  opacity: 0.22;
  pointer-events: none;
}

.topbar,
.portrait-layout,
.demand-banner {
  position: relative;
  z-index: 1;
}

.topbar {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 10px;
}

.brand-kicker,
.card-kicker,
.block-title {
  color: #8be9ff;
  font-size: 12px;
  letter-spacing: 2px;
}

.brand-copy h1,
.panel-header h2 {
  margin: 6px 0 4px;
  font-size: clamp(24px, 2.2vw, 34px);
  line-height: 1.08;
}

.brand-copy p,
.panel-note,
.banner-copy p,
.product-meta,
.product-description,
.logic-card p,
.advisor-body p {
  margin: 0;
  color: #9fb3ca;
  line-height: 1.6;
}

.topbar-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.action-button {
  min-width: 118px;
  padding: 12px 18px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
  backdrop-filter: blur(18px);
}

.action-button--primary {
  color: #ffffff;
  background: linear-gradient(135deg, #00d4ff, #1570ef);
  box-shadow: 0 12px 28px rgba(0, 212, 255, 0.24);
}

.action-button--ghost {
  color: #e8f4ff;
  background: rgba(7, 17, 36, 0.84);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.24);
}

.panel-surface {
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(7, 15, 29, 0.84);
  backdrop-filter: blur(16px);
  box-shadow: 0 18px 36px rgba(0, 0, 0, 0.18);
}

.demand-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  padding: 14px 16px;
  margin-bottom: 10px;
}

.banner-copy {
  display: grid;
  gap: 4px;
}

.banner-copy strong {
  color: #f7fbff;
  font-size: 18px;
}

.banner-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.banner-pill,
.selection-pill,
.match-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #f8fbff;
  font-size: 12px;
  font-weight: 700;
}

.portrait-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(420px, 0.98fr);
  gap: 10px;
  align-items: stretch;
  min-height: calc(100vh - 250px);
}

.cube-column {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  padding: 14px;
  min-height: 0;
}

.detail-column {
  display: grid;
  gap: 10px;
  padding: 14px;
  align-content: start;
}

.panel-header {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 2px;
}

.panel-header h2 {
  margin: 6px 0 0;
  color: #f8fbff;
  font-size: 22px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.product-toolbar {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 10px;
}

.stage-field {
  display: grid;
  gap: 8px;
}

.stage-field span {
  color: #8ca4bf;
  font-size: 12px;
}

.stage-value {
  color: #f8fbff;
  font-size: 16px;
}

.advisor-card {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.03));
}

.advisor-card.matched {
  border-color: rgba(0, 212, 255, 0.28);
  box-shadow: inset 0 0 26px rgba(0, 212, 255, 0.05);
}

.advisor-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 12px;
}

.advisor-head h3 {
  margin: 4px 0 6px;
  color: #f8fbff;
  font-size: 24px;
}

.advisor-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: flex-end;
}

.select-box {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #dce8f7;
  cursor: pointer;
  font-size: 14px;
}

.select-box input {
  position: absolute;
  opacity: 0;
}

.fake-check {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid rgba(111, 224, 255, 0.6);
  background: rgba(5, 12, 24, 0.9);
}

.select-box input:checked + .fake-check {
  background: linear-gradient(135deg, #00d4ff, #1570ef);
  box-shadow: 0 0 12px rgba(0, 212, 255, 0.35);
}

.advisor-body {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.content-block {
  min-width: 0;
  padding: 12px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.08);
}

.content-block strong {
  display: block;
  margin: 6px 0 8px;
  color: #f8fbff;
  font-size: 15px;
  line-height: 1.5;
}

.advisor-footer {
  display: block;
}

.nav-button {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: #dce8f7;
  font: inherit;
  cursor: pointer;
}

.nav-button--hero {
  border-color: rgba(0, 212, 255, 0.24);
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.14), rgba(21, 112, 239, 0.14));
  color: #f7fbff;
  font-weight: 700;
}

.product-tabs {
  display: flex;
  flex-wrap: nowrap;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.product-tabs::-webkit-scrollbar {
  height: 6px;
}

.product-tabs::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.22);
  border-radius: 999px;
}

.product-tab {
  flex: 0 0 auto;
  padding: 8px 11px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(255, 255, 255, 0.03);
  color: #cddbeb;
  font: inherit;
  cursor: pointer;
}

.product-tab.active {
  border-color: rgba(0, 212, 255, 0.28);
  background: rgba(0, 212, 255, 0.1);
  color: #f8fbff;
}

.product-tab.checked {
  box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.4);
}

@media (max-width: 1180px) {
  .portrait-layout {
    grid-template-columns: 1fr;
    min-height: auto;
  }
}

@media (max-width: 860px) {
  .portrait-shell {
    padding: 14px;
  }

  .topbar,
  .demand-banner,
  .panel-header,
  .product-toolbar,
  .advisor-head,
  .advisor-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: stretch;
  }

  .advisor-body {
    grid-template-columns: 1fr;
  }
}
</style>
