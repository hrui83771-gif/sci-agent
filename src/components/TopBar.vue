<template>
  <div class="topbar">
    <div class="topbar-title">
      {{ lang === 'zh' ? '企业金融风险数字孪生智能体' : '3D Enterprise Risk Twin Agent' }}
    </div>

    <div class="topbar-center">
      <ModelSwitcher :models="agentStore.models" v-model:current="agentStore.currentModel" :lang="lang" />
    </div>

    <div class="topbar-right">
      <button class="ctrl-btn" @click="$emit('diagnose')">{{ lang === 'zh' ? '一键诊断' : 'Diagnose' }}</button>
      <button class="ctrl-btn" @click="$emit('timeline')">{{ lang === 'zh' ? '时间轴' : 'Timeline' }}</button>
      <button class="ctrl-btn" @click="$emit('report')">{{ lang === 'zh' ? '生成报告' : 'Report' }}</button>
      <DataImport :lang="lang" @import="$emit('import', $event)" />
      <div class="lang-toggle">
        <button :class="['lang-btn', { active: lang === 'zh' }]" @click="$emit('update:lang', 'zh')">中文</button>
        <button :class="['lang-btn', { active: lang === 'en' }]" @click="$emit('update:lang', 'en')">EN</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import ModelSwitcher from './ModelSwitcher.vue'
import DataImport from './DataImport.vue'
import { useAgentStore } from '../stores/agent.js'

const agentStore = useAgentStore()

defineProps({
  lang: { type: String, default: 'zh' }
})

defineEmits(['diagnose', 'timeline', 'report', 'import', 'update:lang'])
</script>

<style scoped>
.topbar {
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 18px;
  background: rgba(2, 8, 24, 0.82);
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  backdrop-filter: blur(16px);
}

.topbar-title {
  font-size: 15px;
  font-weight: 800;
  white-space: nowrap;
  background: linear-gradient(90deg, #6ce9ff, #ffffff 40%, #8e6fff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  text-shadow: 0 0 18px rgba(0, 212, 255, 0.12);
}

.topbar-center {
  display: flex;
  align-items: center;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ctrl-btn,
.lang-btn {
  padding: 6px 12px;
  color: #d7e4f4;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  cursor: pointer;
  transition: all .2s ease;
}

.ctrl-btn {
  font-size: 12px;
}

.ctrl-btn:hover,
.lang-btn:hover {
  color: #00d4ff;
  border-color: #00d4ff;
  box-shadow: 0 0 14px rgba(0, 212, 255, 0.12);
}

.lang-toggle {
  display: flex;
  gap: 4px;
}

.lang-btn {
  font-size: 11px;
}

.lang-btn.active {
  color: #00d4ff;
  background: rgba(0, 212, 255, 0.12);
  border-color: rgba(0, 212, 255, 0.35);
}
</style>
