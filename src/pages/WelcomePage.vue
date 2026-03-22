<template>
  <div class="welcome-shell">
    <div class="welcome-noise"></div>

    <div class="welcome-grid">
      <section class="hero-copy">
        <span class="hero-kicker">SCI-TECH CREDIT AI</span>
        <h1>科创金融信贷平台智能体</h1>

        <div class="prompt-console">
          <div class="console-line">
            <span class="console-prefix">&gt;</span>
            <span class="console-text">{{ displayedPrompt }}</span>
            <span class="console-cursor"></span>
          </div>
        </div>

        <div class="entry-grid">
          <button type="button" class="entry-card entry-card--primary" @click="router.push('/ai')">
            <span class="entry-kicker">主要入口 01</span>
            <strong>进入 AI 工作台</strong>
            <p>围绕对话、文件理解、联网搜索和文档输出开展企业分析与协作。</p>
          </button>

          <button type="button" class="entry-card entry-card--secondary" @click="router.push('/scene')">
            <span class="entry-kicker">主要入口 02</span>
            <strong>进入 3D 场景</strong>
            <p>查看小型模型构建、维度抽离与空间化表达，快速切换到建模视角。</p>
          </button>
        </div>
      </section>

      <section class="hero-visual" aria-hidden="true">
        <div class="visual-stage">
          <div class="stage-grid"></div>
          <div class="stage-glow"></div>
          <div class="assembly-beam"></div>
          <div class="assembly-ring ring-a"></div>
          <div class="assembly-ring ring-b"></div>

          <div
            v-for="particle in particles"
            :key="particle.id"
            class="build-particle"
            :style="{
              '--x': `${particle.x}%`,
              '--y': `${particle.y}%`,
              '--delay': `${particle.delay}s`,
              '--duration': `${particle.duration}s`,
              '--size': `${particle.size}px`,
              '--alpha': particle.alpha
            }"
          ></div>

          <div class="mini-model">
            <div class="pyramid-core"></div>
            <div class="pyramid-layer layer-base"></div>
            <div class="pyramid-layer layer-mid"></div>
            <div class="pyramid-layer layer-upper"></div>
            <div class="pyramid-layer layer-tip"></div>
            <div class="scan-line"></div>
          </div>

          <div class="status-pill">粒子构建中</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const prompts = [
  '今天先分析哪家企业？',
  '要不要先上传资料，我来自动提炼摘要？',
  '需要直接切到三维场景查看维度抽离结果吗？'
]

const particles = Array.from({ length: 46 }, (_, index) => {
  const column = index % 8
  const row = Math.floor(index / 8)

  return {
    id: index,
    x: 8 + column * 11 + (row % 2) * 3,
    y: 10 + row * 11,
    delay: (index % 7) * 0.22,
    duration: 3.2 + (index % 5) * 0.45,
    size: 3 + (index % 3),
    alpha: 0.32 + (index % 4) * 0.14
  }
})

const promptIndex = ref(0)
const charIndex = ref(0)
const deleting = ref(false)
let typingTimer = null

const displayedPrompt = computed(() => {
  const prompt = prompts[promptIndex.value] || ''
  return prompt.slice(0, charIndex.value)
})

function tickPrompt() {
  const prompt = prompts[promptIndex.value] || ''

  if (!deleting.value) {
    if (charIndex.value < prompt.length) {
      charIndex.value += 1
      return
    }

    deleting.value = true
    return
  }

  if (charIndex.value > 0) {
    charIndex.value -= 1
    return
  }

  deleting.value = false
  promptIndex.value = (promptIndex.value + 1) % prompts.length
}

onMounted(() => {
  typingTimer = window.setInterval(tickPrompt, 95)
})

onUnmounted(() => {
  if (typingTimer) window.clearInterval(typingTimer)
})
</script>

<style scoped>
.welcome-shell {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background:
    radial-gradient(circle at 14% 22%, rgba(22, 163, 184, 0.2), transparent 24%),
    radial-gradient(circle at 84% 20%, rgba(15, 118, 110, 0.14), transparent 28%),
    radial-gradient(circle at 50% 76%, rgba(37, 99, 235, 0.14), transparent 28%),
    linear-gradient(180deg, #030917 0%, #07111f 45%, #050b17 100%);
  color: #e7f0fb;
}

.welcome-noise {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.04) 1px, transparent 1px);
  background-size: 32px 32px;
  mask-image: radial-gradient(circle at center, black 42%, transparent 90%);
  opacity: 0.26;
  pointer-events: none;
}

.welcome-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
  gap: 40px;
  min-height: 100vh;
  padding: 64px;
  align-items: center;
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.hero-kicker {
  width: fit-content;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(110, 231, 255, 0.18);
  background: rgba(7, 18, 34, 0.64);
  color: #8be9ff;
  font-size: 12px;
  letter-spacing: 2px;
}

.hero-copy h1 {
  margin: 0;
  max-width: 760px;
  font-size: clamp(42px, 5vw, 72px);
  line-height: 1.05;
  letter-spacing: -0.04em;
  font-weight: 800;
}

.prompt-console {
  width: min(760px, 100%);
  padding: 18px 20px;
  border-radius: 22px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(6, 15, 29, 0.7);
  box-shadow: inset 0 0 24px rgba(59, 130, 246, 0.08);
}

.console-line {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 34px;
  color: #f8fbff;
  font-size: 18px;
  line-height: 1.7;
}

.console-prefix {
  color: #6ee7ff;
}

.console-text {
  min-height: 1em;
}

.console-cursor {
  width: 10px;
  height: 22px;
  border-radius: 3px;
  background: #6ee7ff;
  animation: blink 1s step-end infinite;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: min(780px, 100%);
}

.entry-card {
  position: relative;
  padding: 22px;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  text-align: left;
  font: inherit;
  cursor: pointer;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.entry-card:hover {
  transform: translateY(-4px);
}

.entry-card--primary {
  color: #f7fbff;
  background: linear-gradient(160deg, rgba(14, 133, 151, 0.88), rgba(20, 108, 148, 0.72));
  box-shadow: 0 18px 40px rgba(10, 91, 123, 0.28);
}

.entry-card--secondary {
  color: #e8f2ff;
  background: rgba(8, 18, 33, 0.78);
  box-shadow: inset 0 0 20px rgba(111, 92, 255, 0.08);
}

.entry-kicker {
  display: inline-flex;
  margin-bottom: 12px;
  color: rgba(255, 255, 255, 0.68);
  font-size: 12px;
  letter-spacing: 1.5px;
}

.entry-card strong {
  display: block;
  margin-bottom: 10px;
  font-size: 26px;
}

.entry-card p {
  margin: 0;
  color: rgba(231, 240, 251, 0.8);
  line-height: 1.75;
}

.hero-visual {
  display: flex;
  justify-content: center;
}

.visual-stage {
  position: relative;
  width: min(540px, 100%);
  aspect-ratio: 1 / 1.04;
  border-radius: 36px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background:
    radial-gradient(circle at 50% 44%, rgba(56, 189, 248, 0.14), transparent 22%),
    linear-gradient(180deg, rgba(6, 15, 29, 0.96), rgba(4, 11, 24, 0.88));
  overflow: hidden;
  box-shadow: 0 28px 80px rgba(0, 0, 0, 0.34);
}

.stage-grid {
  position: absolute;
  inset: auto 0 0;
  height: 46%;
  background-image:
    linear-gradient(rgba(112, 226, 255, 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgba(112, 226, 255, 0.12) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: linear-gradient(180deg, transparent 8%, rgba(0, 0, 0, 0.94) 40%, rgba(0, 0, 0, 1) 100%);
  transform: perspective(420px) rotateX(72deg) translateY(28%);
  transform-origin: center bottom;
}

.stage-glow {
  position: absolute;
  inset: 24% 22% 26%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(110, 231, 255, 0.28), rgba(6, 14, 29, 0));
  filter: blur(30px);
}

.assembly-beam {
  position: absolute;
  left: 50%;
  top: 20%;
  width: 2px;
  height: 48%;
  transform: translateX(-50%);
  background: linear-gradient(180deg, rgba(110, 231, 255, 0), rgba(110, 231, 255, 0.9), rgba(110, 231, 255, 0));
  box-shadow: 0 0 20px rgba(110, 231, 255, 0.45);
}

.assembly-ring {
  position: absolute;
  left: 50%;
  top: 44%;
  border: 1px solid rgba(110, 231, 255, 0.18);
  border-radius: 50%;
  transform-style: preserve-3d;
}

.ring-a {
  width: 270px;
  height: 118px;
  transform: translate(-50%, -50%) rotateX(76deg);
  animation: slow-spin 9s linear infinite;
}

.ring-b {
  width: 190px;
  height: 86px;
  transform: translate(-50%, -50%) rotateX(76deg) rotateZ(22deg);
  animation: slow-spin-reverse 7s linear infinite;
}

.build-particle {
  position: absolute;
  left: var(--x);
  top: var(--y);
  width: var(--size);
  height: var(--size);
  border-radius: 999px;
  background: rgba(132, 244, 255, var(--alpha));
  box-shadow: 0 0 12px rgba(132, 244, 255, 0.55);
  animation: gather var(--duration) ease-in-out infinite;
  animation-delay: var(--delay);
}

.mini-model {
  position: absolute;
  left: 50%;
  bottom: 18%;
  width: 250px;
  height: 230px;
  transform: translateX(-50%);
}

.pyramid-core {
  position: absolute;
  left: 50%;
  bottom: 28px;
  width: 12px;
  height: 124px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(110, 231, 255, 0.04), rgba(110, 231, 255, 0.94), rgba(110, 231, 255, 0.04));
  box-shadow: 0 0 18px rgba(110, 231, 255, 0.48);
}

.pyramid-layer {
  position: absolute;
  left: 50%;
  transform: translateX(-50%) perspective(340px) rotateX(72deg);
  clip-path: polygon(14% 100%, 86% 100%, 74% 0%, 26% 0%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(180deg, rgba(8, 24, 42, 0.86), rgba(3, 11, 23, 0.94));
  box-shadow: 0 0 18px rgba(255, 255, 255, 0.08);
}

.layer-base {
  bottom: 28px;
  width: 220px;
  height: 48px;
  border-color: rgba(110, 231, 255, 0.42);
}

.layer-mid {
  bottom: 66px;
  width: 176px;
  height: 42px;
  border-color: rgba(155, 92, 255, 0.4);
}

.layer-upper {
  bottom: 100px;
  width: 128px;
  height: 38px;
  border-color: rgba(24, 209, 143, 0.42);
}

.layer-tip {
  bottom: 132px;
  width: 84px;
  height: 34px;
  border-color: rgba(255, 140, 58, 0.42);
}

.scan-line {
  position: absolute;
  left: 50%;
  bottom: 42px;
  width: 228px;
  height: 2px;
  transform: translateX(-50%);
  background: linear-gradient(90deg, transparent, rgba(110, 231, 255, 0.92), transparent);
  box-shadow: 0 0 12px rgba(110, 231, 255, 0.42);
  animation: scan 3.6s ease-in-out infinite;
}

.status-pill {
  position: absolute;
  top: 18px;
  right: 18px;
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(7, 18, 34, 0.7);
  color: #d9ecff;
  font-size: 12px;
  letter-spacing: 1.2px;
}

@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}

@keyframes gather {
  0%,
  100% {
    transform: translate3d(0, 0, 0) scale(0.8);
    opacity: 0.35;
  }
  50% {
    transform: translate3d(calc(50% - var(--x)), calc(44% - var(--y)), 0) scale(1.35);
    opacity: 1;
  }
}

@keyframes slow-spin {
  from {
    transform: translate(-50%, -50%) rotateX(76deg) rotateZ(0deg);
  }
  to {
    transform: translate(-50%, -50%) rotateX(76deg) rotateZ(360deg);
  }
}

@keyframes slow-spin-reverse {
  from {
    transform: translate(-50%, -50%) rotateX(76deg) rotateZ(22deg);
  }
  to {
    transform: translate(-50%, -50%) rotateX(76deg) rotateZ(-338deg);
  }
}

@keyframes scan {
  0%,
  100% {
    bottom: 42px;
    opacity: 0.25;
  }
  50% {
    bottom: 154px;
    opacity: 1;
  }
}

@media (max-width: 1120px) {
  .welcome-grid {
    grid-template-columns: 1fr;
    padding: 40px 24px 56px;
  }

  .hero-copy h1 {
    max-width: 100%;
  }

  .entry-grid {
    grid-template-columns: 1fr;
  }

  .hero-visual {
    order: -1;
  }

  .visual-stage {
    width: min(420px, 100%);
  }
}

@media (max-width: 720px) {
  .welcome-grid {
    gap: 28px;
    padding: 24px 18px 44px;
  }

  .hero-copy h1 {
    font-size: 38px;
  }

  .hero-summary,
  .console-line {
    font-size: 16px;
  }

  .visual-stage {
    aspect-ratio: 1 / 1.08;
    border-radius: 28px;
  }

  .mini-model {
    width: 210px;
    height: 196px;
  }

  .layer-base {
    width: 184px;
  }

  .layer-mid {
    width: 148px;
  }

  .layer-upper {
    width: 108px;
  }

  .layer-tip {
    width: 70px;
  }

  .scan-line {
    width: 188px;
  }
}
</style>
