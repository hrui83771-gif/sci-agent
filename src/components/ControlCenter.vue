<template>
  <div class="control-center" :class="{ 'is-collapsed': collapsed }">
    <button class="toggle-btn" @click="collapsed = !collapsed">
      <span class="icon">{{ collapsed ? '⚙️' : '×' }}</span>
    </button>
    
    <div class="panel-content">
      <h3 class="panel-title">{{ lang === 'zh' ? '控制中心' : 'Control Center' }}</h3>
      
      <div class="control-group">
        <div class="group-header">{{ lang === 'zh' ? '交互设置' : 'Interaction' }}</div>
        <label class="cyber-checkbox">
          <input type="checkbox" :checked="cameraEnabled" @change="$emit('update:cameraEnabled', $event.target.checked)" />
          <span class="checkmark"></span>
          <span class="label-text">{{ lang === 'zh' ? '开启手势控制' : 'Gesture Control' }}</span>
        </label>
        <div class="gesture-hints" v-if="cameraEnabled">
          <div class="hint"><span>✊</span> 坍缩 (Fist)</div>
          <div class="hint"><span>🖐️</span> 爆炸 (Open Palm)</div>
          <div class="hint"><span>👆</span> 指引 (Pointer)</div>
          <div class="hint"><span>👐</span> 旋转 (Both Hands)</div>
        </div>
      </div>

      <div class="control-group">
        <div class="group-header">{{ lang === 'zh' ? '视觉主题' : 'Visual Theme' }}</div>
        
        <div class="theme-presets">
          <button 
            v-for="theme in themes" 
            :key="theme.name"
            class="theme-btn"
            :class="{ active: currentTheme === theme.name }"
            :style="{ '--theme-color': theme.color }"
            @click="setTheme(theme)"
          >
            {{ lang === 'zh' ? theme.nameZh : theme.name }}
          </button>
        </div>

        <div class="custom-color">
          <label>{{ lang === 'zh' ? '自定义粒子颜色' : 'Custom Color' }}</label>
          <div class="color-picker-wrapper">
            <input type="color" :value="particleColor" @input="onColorChange" />
            <span class="color-value">{{ particleColor.toUpperCase() }}</span>
          </div>
        </div>
      </div>
      
      <div class="control-group">
        <div class="group-header">{{ lang === 'zh' ? '主体形态' : 'Entity Form' }}</div>
        <div class="form-selector">
          <button 
            class="form-btn" 
            :class="{ active: entityForm === 'city' }"
            @click="setForm('city')"
          >
            🏙️ {{ lang === 'zh' ? '微缩城市' : 'Micro City' }}
          </button>
          <button 
            class="form-btn" 
            :class="{ active: entityForm === 'pyramid' }"
            @click="setForm('pyramid')"
          >
            🔺 {{ lang === 'zh' ? '数据金字塔' : 'Pyramid' }}
          </button>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  lang: { type: String, default: 'zh' },
  cameraEnabled: { type: Boolean, default: false },
  particleColor: { type: String, default: '#00d4ff' }
})

const emit = defineEmits(['update:cameraEnabled', 'update:particleColor', 'updateForm'])

const collapsed = ref(false)
const currentTheme = ref('Neon Blue')
const entityForm = ref('city')

const themes = [
  { name: 'Neon Blue', nameZh: '霓虹蓝', color: '#00d4ff' },
  { name: 'Matrix Green', nameZh: '矩阵绿', color: '#18d18f' },
  { name: 'Cyber Purple', nameZh: '赛博紫', color: '#9b5cff' },
  { name: 'Warning Orange', nameZh: '警戒橙', color: '#ff8c3a' }
]

function setTheme(theme) {
  currentTheme.value = theme.name
  emit('update:particleColor', theme.color)
  window.particleColorHex = theme.color // update global for Threejs
}

function onColorChange(e) {
  currentTheme.value = 'Custom'
  const color = e.target.value
  emit('update:particleColor', color)
  window.particleColorHex = color
}

function setForm(form) {
  entityForm.value = form;
  window.entityFormType = form; // Global for Threejs to rebuild
  emit('updateForm', form);
}
</script>

<style scoped>
.control-center {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 150;
  width: 280px;
  background: rgba(6, 15, 30, 0.85);
  border: 1px solid rgba(0, 212, 255, 0.3);
  border-radius: 16px;
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 20px rgba(0, 212, 255, 0.05);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  overflow: hidden;
}

.control-center.is-collapsed {
  width: 44px;
  height: 44px;
  border-radius: 22px;
  background: rgba(6, 15, 30, 0.95);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.4);
}

.control-center.is-collapsed .panel-content {
  opacity: 0;
  pointer-events: none;
}

.toggle-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: transparent;
  border: 1px solid rgba(0, 212, 255, 0.2);
  color: #00d4ff;
  cursor: pointer;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
}

.toggle-btn:hover {
  background: rgba(0, 212, 255, 0.1);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.3);
}

.panel-content {
  padding: 20px;
  transition: opacity 0.3s;
  max-height: 500px;
  overflow-y: auto;
}

.panel-title {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  text-transform: uppercase;
  letter-spacing: 1px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  padding-bottom: 8px;
}

.control-group {
  margin-bottom: 20px;
}

.group-header {
  font-size: 12px;
  color: #8cb4d8;
  margin-bottom: 10px;
}

/* Cyber Checkbox */
.cyber-checkbox {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
  padding-left: 30px;
  font-size: 13px;
  color: #e2e8f0;
  user-select: none;
}

.cyber-checkbox input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  height: 18px;
  width: 18px;
  background-color: rgba(0,0,0,0.5);
  border: 1px solid #00d4ff;
  border-radius: 4px;
  transition: all 0.2s;
}

.cyber-checkbox:hover input ~ .checkmark {
  background-color: rgba(0, 212, 255, 0.1);
}

.cyber-checkbox input:checked ~ .checkmark {
  background-color: #00d4ff;
  box-shadow: 0 0 10px #00d4ff;
}

.checkmark:after {
  content: "";
  position: absolute;
  display: none;
  left: 6px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid #020818;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.cyber-checkbox input:checked ~ .checkmark:after {
  display: block;
}

.gesture-hints {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-top: 12px;
  padding: 10px;
  background: rgba(0,0,0,0.3);
  border-radius: 8px;
  font-size: 11px;
  color: #94a3b8;
}

.theme-presets {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 12px;
}

.theme-btn {
  background: rgba(0,0,0,0.4);
  border: 1px solid var(--theme-color);
  color: var(--theme-color);
  padding: 6px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.theme-btn:hover {
  background: rgba(255,255,255,0.05);
}

.theme-btn.active {
  background: var(--theme-color);
  color: #020818;
  font-weight: bold;
  box-shadow: 0 0 10px var(--theme-color);
}

.custom-color {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
}

.color-picker-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0,0,0,0.4);
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.1);
}

.color-picker-wrapper input[type="color"] {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: none;
  cursor: pointer;
}

.color-value {
  font-family: monospace;
  font-size: 12px;
  color: #e2e8f0;
}

.form-selector {
  display: flex;
  gap: 10px;
}

.form-btn {
  flex: 1;
  background: rgba(0,0,0,0.4);
  border: 1px solid rgba(255,255,255,0.2);
  color: #e2e8f0;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.form-btn.active {
  background: rgba(0, 212, 255, 0.15);
  border-color: #00d4ff;
  color: #00d4ff;
  box-shadow: inset 0 0 10px rgba(0, 212, 255, 0.2);
}

::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-thumb { background: rgba(0,212,255,0.3); border-radius: 2px; }
</style>