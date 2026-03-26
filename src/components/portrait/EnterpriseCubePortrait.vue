<template>
  <div
    ref="stageRef"
    class="portrait-stage"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
  >
    <div class="stage-halo"></div>
    <div class="stage-grid"></div>
    <div v-for="orbit in orbitLayers" :key="orbit.id" class="orbit" :class="orbit.className"></div>
    <div class="stage-tip">拖拽旋转立方体，点击任一维度面查看详情</div>

    <div class="cube-shell" :class="{ 'is-building': buildPhase }">
      <div class="cube-shadow"></div>
      <div class="cube" :style="cubeStyle">
        <button
          v-for="face in clickableFaces"
          :key="face.key"
          type="button"
          class="cube-face cube-face--dimension"
          :class="[`face-${face.face}`, { active: activeDimension === face.key }]"
          :style="{
            '--face-color': face.color,
            '--face-strength': face.glow
          }"
          @click.stop="$emit('select-dimension', face.key)"
        >
          <div class="face-frame"></div>
          <span class="face-label">{{ face.label }}</span>
          <strong class="face-score">{{ face.score }}</strong>
          <small class="face-state">{{ face.state }}</small>
          <div class="face-bar">
            <div class="face-bar-fill" :style="{ width: `${face.score}%` }"></div>
          </div>
        </button>

        <div class="cube-face cube-face--info face-top">
          <span class="info-kicker">企业名称</span>
          <strong>{{ enterprise.name }}</strong>
          <small>{{ enterprise.industry }}</small>
        </div>

        <div class="cube-face cube-face--info face-bottom">
          <span class="info-kicker">综合评分</span>
          <strong>{{ enterprise.scores.total }}</strong>
          <small>{{ enterprise.city }} · {{ enterprise.founded }}</small>
        </div>
      </div>

      <div class="core-spine"></div>
      <div class="pulse-ring"></div>
      <span
        v-for="particle in particles"
        :key="particle.id"
        class="detail-particle"
        :style="{
          '--x': `${particle.x}%`,
          '--y': `${particle.y}%`,
          '--delay': `${particle.delay}s`,
          '--size': `${particle.size}px`
        }"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'

const props = defineProps({
  enterprise: {
    type: Object,
    required: true
  },
  activeDimension: {
    type: String,
    default: 'tech'
  },
  dimensionColorMap: {
    type: Object,
    default: () => ({
      tech: '#00d4ff',
      team: '#8b5cf6',
      finance: '#22c55e',
      market: '#f97316'
    })
  }
})

defineEmits(['select-dimension'])

const stageRef = ref(null)
const rotationX = ref(-22)
const rotationY = ref(36)
const isDragging = ref(false)
const buildPhase = ref(false)
const pointerStart = ref({ x: 0, y: 0 })
let buildTimer = 0

const particles = Array.from({ length: 32 }, (_, index) => ({
  id: index,
  x: 18 + (index % 8) * 9,
  y: 16 + Math.floor(index / 8) * 14,
  delay: (index % 6) * 0.26,
  size: 2 + (index % 4)
}))

const totalScore = computed(() => Number(props.enterprise?.scores?.total || 80))

const cubeSize = computed(() => Math.max(210, Math.min(320, 220 + (totalScore.value - 60) * 3.1)))

const orbitLayers = computed(() => {
  const total = totalScore.value
  const count = total >= 90 ? 4 : total >= 82 ? 3 : total >= 72 ? 2 : 1

  return [
    { id: 'a', className: 'orbit-a' },
    { id: 'b', className: 'orbit-b' },
    { id: 'c', className: 'orbit-c' },
    { id: 'd', className: 'orbit-d' }
  ].slice(0, count)
})

function scoreState(score = 0) {
  if (score >= 88) return '强'
  if (score >= 75) return '稳'
  return '承压'
}

const clickableFaces = computed(() => {
  const mapping = [
    { key: 'tech', face: 'front' },
    { key: 'team', face: 'right' },
    { key: 'finance', face: 'back' },
    { key: 'market', face: 'left' }
  ]

  return mapping.map((item) => {
    const detail = props.enterprise?.dimensions?.[item.key] || {}
    const score = Number(detail.score ?? props.enterprise?.scores?.[item.key] ?? 0)
    return {
      ...item,
      label: detail.label || item.key,
      score,
      state: scoreState(score),
      color: props.dimensionColorMap?.[item.key] || '#00d4ff',
      glow: Math.max(0.18, Math.min(0.72, score / 100))
    }
  })
})

const cubeStyle = computed(() => ({
  '--cube-size': `${cubeSize.value}px`,
  '--cube-half': `${cubeSize.value / 2}px`,
  '--cube-brightness': `${0.82 + totalScore.value / 130}`,
  transform: `rotateX(${rotationX.value}deg) rotateY(${rotationY.value}deg)`,
  transition: isDragging.value ? 'transform 0.1s ease-out' : 'transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
}))

function triggerBuild() {
  buildPhase.value = true
  window.clearTimeout(buildTimer)
  buildTimer = window.setTimeout(() => {
    buildPhase.value = false
  }, 950)
}

function onPointerDown(event) {
  isDragging.value = true
  pointerStart.value = { x: event.clientX, y: event.clientY }
}

function onPointerMove(event) {
  if (!isDragging.value) return

  const dx = event.clientX - pointerStart.value.x
  const dy = event.clientY - pointerStart.value.y

  // Allow free rotation on Y axis, clamp X axis to avoid flipping upside down
  rotationY.value += dx * 0.25
  rotationX.value = Math.max(-80, Math.min(80, rotationX.value - dy * 0.25))

  pointerStart.value = { x: event.clientX, y: event.clientY }
}

function onPointerUp() {
  isDragging.value = false
}

watch(
  () => props.activeDimension,
  (newDim) => {
    if (isDragging.value) return // Don't auto-rotate if user is dragging

    const angleMap = {
      tech: 36,       // front face visible
      team: -54,      // right face visible (36 - 90)
      finance: -144,  // back face visible (-54 - 90)
      market: 126     // left face visible (36 + 90)
    }

    if (angleMap[newDim] !== undefined) {
      rotationY.value = angleMap[newDim]
      rotationX.value = -22 // Reset X to standard isometric angle
    }
  }
)

watch(
  () => props.enterprise?.id,
  () => {
    rotationX.value = -22
    rotationY.value = 36
    triggerBuild()
  },
  { immediate: true }
)

onMounted(() => {
  triggerBuild()
})

onUnmounted(() => {
  window.clearTimeout(buildTimer)
})
</script>

<style scoped>
.portrait-stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 28px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background:
    radial-gradient(circle at 50% 36%, rgba(45, 212, 191, 0.18), transparent 22%),
    linear-gradient(180deg, rgba(5, 12, 24, 0.98), rgba(3, 8, 20, 0.96));
  cursor: grab;
}

.portrait-stage:active {
  cursor: grabbing;
}

.stage-grid {
  position: absolute;
  inset: auto 0 -12% 0;
  height: 52%;
  background-image:
    linear-gradient(rgba(111, 224, 255, 0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(111, 224, 255, 0.1) 1px, transparent 1px);
  background-size: 34px 34px;
  transform: perspective(520px) rotateX(78deg);
  transform-origin: center bottom;
  opacity: 0.7;
}

.stage-halo {
  position: absolute;
  inset: 14% 20%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.22), rgba(0, 0, 0, 0));
  filter: blur(28px);
}

.orbit {
  position: absolute;
  border: 1px solid rgba(111, 224, 255, 0.14);
  border-radius: 50%;
}

.orbit-a {
  width: 320px;
  height: 132px;
  transform: rotateX(76deg);
  animation: spin 14s linear infinite;
}

.orbit-b {
  width: 420px;
  height: 168px;
  transform: rotateX(76deg) rotateZ(18deg);
  animation: spin-reverse 18s linear infinite;
}

.orbit-c {
  width: 500px;
  height: 198px;
  transform: rotateX(80deg) rotateZ(-14deg);
  animation: spin 22s linear infinite;
  opacity: 0.34;
}

.orbit-d {
  width: 560px;
  height: 220px;
  transform: rotateX(82deg) rotateZ(8deg);
  animation: spin-reverse 26s linear infinite;
  opacity: 0.22;
}

.stage-tip {
  position: absolute;
  top: 16px;
  left: 18px;
  z-index: 2;
  color: #8ca4bf;
  font-size: 12px;
  letter-spacing: 1px;
}

.cube-shell {
  position: relative;
  width: var(--cube-size, 260px);
  height: var(--cube-size, 260px);
  perspective: 1400px;
  perspective-origin: 50% 50%;
  transform-style: preserve-3d;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cube-shell.is-building {
  animation: build-shell 0.95s cubic-bezier(0.16, 1, 0.3, 1);
}

.cube-shell.is-building .cube-face--dimension {
  animation: build-face 0.85s ease;
}

.cube-shadow {
  position: absolute;
  width: calc(var(--cube-size, 260px) * 1.18);
  height: calc(var(--cube-size, 260px) * 0.32);
  border-radius: 50%;
  background: radial-gradient(circle, rgba(0, 212, 255, 0.32), rgba(0, 0, 0, 0));
  transform: translateY(calc(var(--cube-size, 260px) * 0.72));
  filter: blur(18px);
}

.cube {
  position: absolute;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

.cube-face {
  position: absolute;
  width: 100%;
  height: 100%;
  left: 0;
  top: 0;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  backface-visibility: visible;
  overflow: hidden;
}

.cube-face::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 20px;
  box-shadow: inset 0 0 20px rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.cube-face--dimension {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px;
  color: #f2f8ff;
  background:
    linear-gradient(135deg, color-mix(in srgb, var(--face-color) 18%, rgba(8, 17, 34, 0.98)), rgba(5, 10, 22, 0.96));
  box-shadow:
    inset 0 0 40px color-mix(in srgb, var(--face-color) 25%, transparent),
    0 0 25px color-mix(in srgb, var(--face-color) 20%, transparent);
  cursor: pointer;
  transition: box-shadow 0.3s ease, filter 0.3s ease;
}

.cube-face--dimension:hover {
  box-shadow:
    inset 0 0 50px color-mix(in srgb, var(--face-color) 35%, transparent),
    0 0 35px color-mix(in srgb, var(--face-color) 30%, transparent);
  filter: brightness(1.15);
}

.cube-face--dimension.active {
  box-shadow:
    inset 0 0 60px color-mix(in srgb, var(--face-color) 45%, transparent),
    0 0 45px color-mix(in srgb, var(--face-color) 40%, transparent);
  filter: brightness(1.25);
  border-color: color-mix(in srgb, var(--face-color) 60%, transparent);
}

.cube-face--info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  color: #f8fbff;
  background: linear-gradient(180deg, rgba(7, 18, 34, 0.96), rgba(4, 11, 23, 0.96));
  box-shadow: inset 0 0 28px rgba(56, 189, 248, 0.16);
}

.face-front {
  transform: rotateY(0deg) translateZ(var(--cube-half, 130px));
}

.face-right {
  transform: rotateY(90deg) translateZ(var(--cube-half, 130px));
}

.face-back {
  transform: rotateY(180deg) translateZ(var(--cube-half, 130px));
}

.face-left {
  transform: rotateY(-90deg) translateZ(var(--cube-half, 130px));
}

.face-top {
  transform: rotateX(90deg) translateZ(var(--cube-half, 130px));
}

.face-bottom {
  transform: rotateX(-90deg) translateZ(var(--cube-half, 130px));
  text-align: center;
}

.face-frame {
  position: absolute;
  inset: 14px;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  pointer-events: none;
}

.face-label {
  font-size: 18px;
  font-weight: 700;
}

.face-score {
  font-size: 52px;
  line-height: 1;
  font-weight: 800;
}

.face-state,
.info-kicker,
.cube-face--info small {
  color: #a9bdd4;
  font-size: 12px;
  letter-spacing: 1px;
}

.cube-face--info strong {
  font-size: 22px;
  line-height: 1.35;
}

.face-bar {
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.face-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in srgb, var(--face-color) 70%, white), var(--face-color));
}

.core-spine {
  position: absolute;
  width: 14px;
  height: calc(var(--cube-size, 260px) * 0.86);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(111, 224, 255, 0.92), rgba(255, 255, 255, 0.04));
  box-shadow: 0 0 18px rgba(111, 224, 255, 0.5);
}

.pulse-ring {
  position: absolute;
  width: calc(var(--cube-size, 260px) * 1.04);
  height: calc(var(--cube-size, 260px) * 0.36);
  border: 1px solid rgba(111, 224, 255, 0.16);
  border-radius: 50%;
  transform: rotateX(78deg);
  animation: spin-flat 14s linear infinite;
}

.detail-particle {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--size);
  height: var(--size);
  border-radius: 50%;
  background: rgba(111, 224, 255, 0.72);
  box-shadow: 0 0 10px rgba(111, 224, 255, 0.6);
  animation: drift 4s ease-in-out infinite;
  animation-delay: var(--delay);
}

@keyframes spin {
  from { transform: rotateX(76deg) rotateZ(0deg); }
  to { transform: rotateX(76deg) rotateZ(360deg); }
}

@keyframes spin-reverse {
  from { transform: rotateX(76deg) rotateZ(0deg); }
  to { transform: rotateX(76deg) rotateZ(-360deg); }
}

@keyframes spin-flat {
  from { transform: rotateX(78deg) rotateZ(0deg); }
  to { transform: rotateX(78deg) rotateZ(360deg); }
}

@keyframes drift {
  0%, 100% { transform: translate3d(0, 0, 0) scale(0.9); opacity: 0.42; }
  50% { transform: translate3d(10px, -12px, 0) scale(1.2); opacity: 1; }
}

@keyframes build-shell {
  0% { transform: scale(0.84) translateY(22px); }
  100% { transform: scale(1) translateY(0); }
}

@keyframes build-face {
  0% { opacity: 0; }
  100% { opacity: 1; }
}

@media (max-width: 900px) {
  .portrait-stage {
    min-height: 360px;
  }

  .cube-shell {
    transform: scale(0.82);
  }
}
</style>
