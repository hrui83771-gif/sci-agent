<template>
  <div class="radar-wrap">
    <div class="radar-title">{{ lang === 'zh' ? '风险雷达' : 'Risk Radar' }}</div>
    <canvas ref="canvasRef" width="220" height="220" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'

const props = defineProps({
  risks: {
    type: Array,
    default: () => [
      { label: '信用风险', value: 0.3 },
      { label: '市场风险', value: 0.5 },
      { label: '操作风险', value: 0.2 },
      { label: '流动性', value: 0.65 },
      { label: '合规风险', value: 0.15 },
      { label: '技术风险', value: 0.25 }
    ]
  },
  lang: { type: String, default: 'zh' }
})

const canvasRef = ref(null)
let animId
let t = 0

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const cx = 110
  const cy = 110
  const maxR = 85
  const n = props.risks.length

  ctx.clearRect(0, 0, 220, 220)

  for (let r = 1; r <= 4; r++) {
    ctx.beginPath()
    for (let i = 0; i < n; i++) {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2
      const x = cx + Math.cos(angle) * (maxR * r / 4)
      const y = cy + Math.sin(angle) * (maxR * r / 4)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.strokeStyle = 'rgba(0,212,255,0.15)'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR)
    ctx.strokeStyle = 'rgba(0,212,255,0.2)'
    ctx.stroke()
  }

  ctx.beginPath()
  props.risks.forEach((risk, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const pulse = 1 + Math.sin(t * 3 + i) * (risk.value > 0.5 ? 0.08 : 0.02)
    const radius = maxR * risk.value * pulse
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fillStyle = 'rgba(0,212,255,0.12)'
  ctx.fill()
  ctx.strokeStyle = '#00d4ff'
  ctx.lineWidth = 1.5
  ctx.stroke()

  props.risks.forEach((risk, i) => {
    const angle = (i / n) * Math.PI * 2 - Math.PI / 2
    const pulse = 1 + Math.sin(t * 3 + i) * (risk.value > 0.5 ? 0.08 : 0.02)
    const radius = maxR * risk.value * pulse
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    const color = risk.value > 0.5 ? '#f97316' : '#10b981'
    ctx.beginPath()
    ctx.arc(x, y, 4, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()
    if (risk.value > 0.5) {
      ctx.beginPath()
      ctx.arc(x, y, 6 + Math.sin(t * 5 + i) * 2, 0, Math.PI * 2)
      ctx.strokeStyle = color
      ctx.globalAlpha = 0.35
      ctx.stroke()
      ctx.globalAlpha = 1
    }

    const lx = cx + Math.cos(angle) * (maxR + 16)
    const ly = cy + Math.sin(angle) * (maxR + 16)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(risk.label, lx, ly + 3)
  })
}

function loop() {
  t += 0.016
  draw()
  animId = requestAnimationFrame(loop)
}

onMounted(() => loop())
onUnmounted(() => cancelAnimationFrame(animId))
watch(() => props.risks, draw, { deep: true })
</script>

<style scoped>
.radar-wrap {
  position: fixed;
  right: 16px;
  bottom: 36px;
  z-index: 100;
  padding: 10px;
  text-align: center;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
}

.radar-title {
  margin-bottom: 6px;
  font-size: 11px;
  letter-spacing: 1px;
  color: #94a3b8;
}
</style>
