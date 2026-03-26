<template>
  <div class="camera-gesture" v-show="enabled">
    <video ref="videoRef" class="video-input" autoplay playsinline></video>
    <canvas ref="canvasRef" class="canvas-output"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands'
import { Camera } from '@mediapipe/camera_utils'
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils'

const props = defineProps({
  enabled: {
    type: Boolean,
    default: false
  }
})

const videoRef = ref(null)
const canvasRef = ref(null)

let hands = null
let camera = null
let active = false

window.gestureState = {
  scale: 1.0,
  explode: false,
  collapse: false,
  rotateSpeed: 0,
  pointer: null
};
window.gestureScale = 1.0; // fallback legacy

function initMediapipe() {
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    }
  })

  hands.setOptions({
    maxNumHands: 2,
    modelComplexity: 1,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  })

  hands.onResults(onResults)

  camera = new Camera(videoRef.value, {
    onFrame: async () => {
      if (active && hands) {
        await hands.send({ image: videoRef.value })
      }
    },
    width: 320,
    height: 240
  })
}

function startCamera() {
  active = true
  if (camera) camera.start()
}

function stopCamera() {
  active = false
  if (camera) camera.stop()
  window.gestureState = { scale: 1.0, explode: false, collapse: false, rotateSpeed: 0, pointer: null };
}

watch(() => props.enabled, (val) => {
  if (val) {
    if (!hands) initMediapipe()
    startCamera()
  } else {
    stopCamera()
  }
})

onMounted(() => {
  if (props.enabled) {
    initMediapipe()
    startCamera()
  }
})

onUnmounted(() => {
  stopCamera()
  if (hands) hands.close()
})

function onResults(results) {
  if (!canvasRef.value) return
  const canvasCtx = canvasRef.value.getContext('2d')
  canvasRef.value.width = 320
  canvasRef.value.height = 240

  canvasCtx.save()
  canvasCtx.clearRect(0, 0, canvasRef.value.width, canvasRef.value.height)
  canvasCtx.drawImage(results.image, 0, 0, canvasRef.value.width, canvasRef.value.height)

  let state = {
    scale: window.gestureState.scale,
    explode: false,
    collapse: false,
    rotateSpeed: 0,
    pointer: null
  };

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const handsLm = results.multiHandLandmarks;

    // Calculate open fingers for each hand
    const handFingers = handsLm.map(landmarks => {
      let open = 0;
      const isFingerOpen = (tip, pip) => {
        const distTip = Math.hypot(tip.x - landmarks[0].x, tip.y - landmarks[0].y);
        const distPip = Math.hypot(pip.x - landmarks[0].x, pip.y - landmarks[0].y);
        return distTip > distPip;
      };
      if (isFingerOpen(landmarks[4], landmarks[2])) open++; // Thumb
      if (isFingerOpen(landmarks[8], landmarks[6])) open++; // Index
      if (isFingerOpen(landmarks[12], landmarks[10])) open++; // Middle
      if (isFingerOpen(landmarks[16], landmarks[14])) open++; // Ring
      if (isFingerOpen(landmarks[20], landmarks[18])) open++; // Pinky
      return open;
    });

    if (handsLm.length === 2) {
      // 2 hands
      const p1 = handsLm[0][8];
      const p2 = handsLm[1][8];
      const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
      
      if (handFingers[0] <= 1 && handFingers[1] <= 1) {
        state.collapse = true; // Fist
      } else if (handFingers[0] >= 4 && handFingers[1] >= 4) {
        state.explode = true; // Open Palm
        state.scale = Math.min(3.0, state.scale + 0.1);
      } else {
        // Normal scale based on distance
        let targetScale = dist * 2.5;
        state.scale += (Math.max(0.2, Math.min(targetScale, 3.0)) - state.scale) * 0.1;
      }
      
      // Rotation based on height difference
      const wrist1 = handsLm[0][0];
      const wrist2 = handsLm[1][0];
      const heightDiff = wrist1.y - wrist2.y;
      state.rotateSpeed = heightDiff * 2.0;

    } else if (handsLm.length === 1) {
      const landmarks = handsLm[0];
      const open = handFingers[0];
      
      if (open <= 1) {
        // Check if index is the only one open
        const indexOpen = Math.hypot(landmarks[8].x - landmarks[0].x, landmarks[8].y - landmarks[0].y) > 
                          Math.hypot(landmarks[6].x - landmarks[0].x, landmarks[6].y - landmarks[0].y);
        if (indexOpen) {
          // Pointer mapped to normalized coordinates (-1 to 1)
          state.pointer = { x: (landmarks[8].x - 0.5) * 2, y: -(landmarks[8].y - 0.5) * 2 };
        } else {
          state.collapse = true;
        }
      } else if (open >= 4) {
         state.explode = true;
      } else {
        // Pinch to scale
        const p1 = landmarks[8];
        const p2 = landmarks[4];
        const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);
        let targetScale = (dist - 0.05) * 5 + 0.5;
        state.scale += (Math.max(0.2, Math.min(targetScale, 2.0)) - state.scale) * 0.1;
      }
    }

    for (const landmarks of handsLm) {
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 })
      drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 2 })
    }
  } else {
    // Return to default gracefully
    state.scale += (1.0 - state.scale) * 0.05;
  }
  
  window.gestureState = state;
  window.gestureScale = state.scale; // sync legacy

  canvasCtx.restore()
}
</script>

<style scoped>
.camera-gesture {
  position: absolute;
  bottom: 20px;
  right: 20px;
  width: 160px;
  height: 120px;
  z-index: 1000;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid rgba(0, 212, 255, 0.4);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.2);
}

.video-input {
  display: none;
}

.canvas-output {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}
</style>