<template>
  <div class="scene-page">
    <button type="button" class="nav-pill" @click="router.push('/')">返回首页</button>
    <ThreeDHome @enter-ai="router.push('/ai')" />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import ThreeDHome from '../components/ThreeDHome.vue'

const router = useRouter()
</script>

<style scoped>
.scene-page {
  min-height: 100vh;
}

.nav-pill {
  position: fixed;
  top: 18px;
  left: 18px;
  z-index: 1400;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;
  padding: 11px 16px;
  font: inherit;
  color: #e2f2ff;
  background: rgba(5, 12, 28, 0.72);
  backdrop-filter: blur(18px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.26);
  cursor: pointer;
}
</style>
