<template>
  <div class="model-switcher">
    <span class="switcher-label">{{ lang === 'zh' ? '模型' : 'Model' }}</span>
    <button
      v-for="m in models" :key="m.id"
      class="model-btn"
      :class="{ active: current === m.id, unavailable: !m.available }"
      :title="m.available ? m.name : (lang === 'zh' ? '未配置API Key' : 'API Key not set')"
      @click="$emit('update:current', m.id)"
    >
      {{ m.name }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  models: { type: Array, default: () => [] },
  current: { type: String, default: '' },
  lang: { type: String, default: 'zh' }
})
defineEmits(['update:current'])
</script>

<style scoped>
.model-switcher {
  display: flex; align-items: center; gap: 6px;
}
.switcher-label { font-size: 11px; color: #94a3b8; }
.model-btn {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: #94a3b8; padding: 3px 10px; border-radius: 12px;
  cursor: pointer; font-size: 11px; transition: all .2s;
  white-space: nowrap;
}
.model-btn.active { background: rgba(0,212,255,0.15); border-color: #00d4ff; color: #00d4ff; }
.model-btn.unavailable { opacity: 0.4; cursor: not-allowed; }
.model-btn:not(.unavailable):hover { border-color: #00d4ff; color: #00d4ff; }
</style>
