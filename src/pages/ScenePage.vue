<template>
  <div class="scene-page">
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
</style>
