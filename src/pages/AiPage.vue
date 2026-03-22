<template>
  <div class="ai-page">
    <div class="page-nav">
      <button type="button" class="nav-pill" @click="router.push('/')">首页</button>
      <button type="button" class="nav-pill nav-pill--ghost" @click="router.push('/scene')">3D 场景</button>
    </div>

    <AiWorkbench />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AiWorkbench from '../components/AiWorkbench.vue'

const router = useRouter()
</script>

<style scoped>
.ai-page {
  min-height: 100vh;
}

.page-nav {
  position: fixed;
  top: 18px;
  left: 18px;
  z-index: 1400;
  display: flex;
  gap: 10px;
}

.nav-pill {
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding: 11px 16px;
  font: inherit;
  color: #ffffff;
  background: linear-gradient(135deg, #0f8b8d, #146c94);
  box-shadow: 0 12px 24px rgba(20, 108, 148, 0.22);
  cursor: pointer;
}

.nav-pill--ghost {
  color: #d9ecff;
  background: rgba(5, 12, 28, 0.74);
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.18);
}
</style>
