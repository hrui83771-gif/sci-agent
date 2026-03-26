<template>
  <div ref="containerRef" class="scene-container">
    <canvas
      ref="canvasRef"
      class="scene-canvas"
      @mousemove="onMouseMove"
      @mousedown="onMouseDown"
      @mouseup="onMouseUp"
      @wheel="onWheel"
      @click="onClick"
    />
    <div class="detail-dock" :class="{ active: !!popup }">
    <HoloDetailPanel
      :popup="popup"
      :typewriter-text="typewriterText"
      :is-typing="isTyping"
      :chat-entries="sceneChatEntries"
      :chat-input="sceneChatInput"
      :chat-loading="sceneChatLoading"
      :chat-context-label="sceneChatContextLabel"
      @back="exitDetailMode"
      @update:chatInput="emit('update:scene-chat-input', $event)"
      @submit-chat="emit('submit-scene-chat')"
    />
    </div>
    
    <!-- Holographic Data Panel (CSS3D overlay) -->
    <div v-if="false" ref="holoPanelRef" class="holo-panel" :style="{ borderColor: popup?.color || '#00ffff', boxShadow: `0 0 20px ${popup?.color || '#00ffff'}40 inset` }">
      <div class="holo-header">
        <span class="holo-title" :style="{ color: popup?.color || '#00ffff' }">{{ popup?.label || '维度分析' }}</span>
        <div class="holo-header-right">
          <span class="holo-score">{{ popup?.score || '90' }}<span>pts</span></span>
          <button type="button" class="holo-back" @click.stop="exitDetailMode">返回总览</button>
        </div>
      </div>
      <div class="holo-line" :style="{ background: popup?.color }"></div>

      <div v-if="popup?.meta" class="holo-meta">
        {{ popup.meta }}
      </div>
      
      <!-- Typewriter effect content -->
      <div class="holo-content">
        <div class="typewriter-text">{{ typewriterText }}</div>
        <span v-if="isTyping" class="cursor" :style="{ background: popup?.color }"></span>
      </div>

      <div class="detail-layout">
        <section v-if="popup?.highlights?.length" class="detail-section">
          <span class="detail-kicker">关键要点</span>
          <div class="holo-highlights">
            <article v-for="item in popup.highlights" :key="item" class="highlight-chip">
              {{ item }}
            </article>
          </div>
        </section>

        <section v-if="popup?.metrics?.length" class="detail-section">
          <span class="detail-kicker">子指标</span>
          <div class="metric-grid">
            <article v-for="metric in popup.metrics" :key="metric.label" class="metric-card">
              <strong>{{ metric.label }}</strong>
              <span>{{ metric.value }}</span>
              <small>{{ metric.tone }}</small>
            </article>
          </div>
        </section>

        <section v-if="popup?.evidence?.length" class="detail-section">
          <span class="detail-kicker">证据线索</span>
          <div class="evidence-grid">
            <article v-for="item in popup.evidence" :key="item.title" class="evidence-card">
              <strong>{{ item.title }}</strong>
              <small>{{ item.state }}</small>
              <p>{{ item.excerpt }}</p>
            </article>
          </div>
        </section>
      </div>

      <div class="holo-footer-glow">
        <div class="footer-line" :style="{ background: popup?.color || '#00ffff' }"></div>
        <div class="footer-line dim"></div>
      </div>
      <div class="holo-bg-grid"></div>
    </div>
  </div>

  <div class="scene-aura"></div>
  <div class="scene-vignette"></div>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import gsap from 'gsap'
import HoloDetailPanel from './scene3d/HoloDetailPanel.vue'
import { DEFAULT_SCENE_ANALYSIS, SCENE_DIMS } from './scene3d/sceneMeta.js'

const props = defineProps({
  scores: {
    type: Object,
    default: () => ({ tech: 80, team: 80, finance: 80, market: 80 })
  },
  details: {
    type: Object,
    default: () => ({})
  },
  sceneChatEntries: {
    type: Array,
    default: () => []
  },
  sceneChatInput: {
    type: String,
    default: ''
  },
  sceneChatLoading: {
    type: Boolean,
    default: false
  },
  sceneChatContextLabel: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['dim-click', 'focus-change', 'update:scene-chat-input', 'submit-scene-chat'])

defineExpose({
  focusDimension: toggleLayer,
  exitDetailMode
})

const DIMS = SCENE_DIMS

const LEGACY_DIMS = [
  { key: 'tech', label: '技术维度', color: '#00d4ff', color3: 0x00d4ff, desc: '专利储备、研发效率与技术壁垒的综合表现。' },
  { key: 'team', label: '团队维度', color: '#9b5cff', color3: 0x9b5cff, desc: '核心团队稳定性、管理能力与组织韧性。' },
  { key: 'finance', label: '财务维度', color: '#18d18f', color3: 0x18d18f, desc: '营收质量、现金流压力与负债结构情况。' },
  { key: 'market', label: '市场维度', color: '#ff8c3a', color3: 0xff8c3a, desc: '市场占位、增长潜力与客户结构质量。' }
]

const canvasRef = ref(null)
const containerRef = ref(null)
const holoPanelRef = ref(null)
const activeLayers = ref(DIMS.map((d) => d.key))
const soloLayer = ref(null)
const popup = ref(null)
const focusDim = ref(null)
const sceneMode = ref('overview')

// Typewriter state
const typewriterText = ref('')
const isTyping = ref(false)
let typingTimer = null

// Mock analysis data for each dimension
const mockAnalysis = DEFAULT_SCENE_ANALYSIS

const LEGACY_ANALYSIS = {
  tech: ">> 正在扫描技术专利库...\n>> 发现核心算法专利 12 项\n>> 研发效能评级：A+\n>> 技术壁垒构建完成，未发现明显技术债。建议持续关注同行业开源替代方案的冲击。",
  team: ">> 正在评估团队稳定性...\n>> 核心团队合作时长 > 5年\n>> 股权结构健康，无重大期权纠纷\n>> 建议：需补充高级市场合伙人以平衡产研偏科问题。",
  finance: ">> 正在穿透财务报表...\n>> 现金流健康度：良好 (Runway > 18个月)\n>> 负债率低于行业平均水平\n>> 警告：近期研发支出激增，建议关注下一轮融资的时间节点。",
  market: ">> 正在接入市场反馈节点...\n>> 客户留存率：92%\n>> 市场占有率环比增长 15%\n>> 结论：产品已达到 PMF (Product-Market Fit)，建议加大营销投放以抢占增量市场。"
}

const activeDetail = computed(() => {
  if (!focusDim.value) return null
  return props.details?.[focusDim.value] || null
})

function startTypewriter(text) {
  if (typingTimer) clearInterval(typingTimer)
  typewriterText.value = ''
  isTyping.value = true
  
  let i = 0
  typingTimer = setInterval(() => {
    if (i < text.length) {
      typewriterText.value += text.charAt(i)
      i++
    } else {
      clearInterval(typingTimer)
      isTyping.value = false
    }
  }, 30) // speed of typing
}

let renderer
let scene
let camera
let clock
let animId
let composer; // EffectComposer for post-processing
let customEnvMap; // Generated environment map for reflections
let envRenderTarget
let rootGroup
let coreGroup
let haloRings = []
let beamColumns = []
let streamField
let starField
let pulseMeshes = []
let hoveredObj = null
let isDragging = false
let prevMouse = { x: 0, y: 0 }
let autoRotate = false // Controlled by GSAP now
let assemblyProgress = -16.0 // Extended Lorenz phase duration
let clickableObjects = []

const dimLayers = {}
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
// Adjust phi to Math.PI / 2.2 (about 81 degrees) for a slight downward look, 
// rather than 1.05 (60 degrees) which makes it look from above too much,
// or > Math.PI/2 which makes it look from below.
// For a solid frontal/slightly elevated view: phi = 1.35
let spherical = new THREE.Spherical(14, 1.35, Math.PI / 4)
let cameraTarget = new THREE.Vector3(0, 0, 0)
const tmpVec3A = new THREE.Vector3()
const tmpVec3B = new THREE.Vector3()
const tmpVec3C = new THREE.Vector3()

const PART_KEYS = ['tech', 'team', 'finance', 'market']
const CHAOS_A = new THREE.Color(0xff007f)
const CHAOS_B = new THREE.Color(0x00f3ff)

let floorDiscGroup
let floorDiscBaseParticles
const FLOOR_PARTICLE_COUNT = 400

function getScores() {
  return {
    tech: (props.scores.tech ?? 0) / 100,
    team: (props.scores.team ?? 0) / 100,
    finance: (props.scores.finance ?? 0) / 100,
    market: (props.scores.market ?? 0) / 100
  }
}

function init(canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(containerRef.value.clientWidth, containerRef.value.clientHeight)
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.3

  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x030918, 0.028)
  camera = new THREE.PerspectiveCamera(50, containerRef.value.clientWidth / containerRef.value.clientHeight, 0.1, 200)
  clock = new THREE.Clock()

  // Configure Bloom Post-Processing
  const renderScene = new RenderPass(scene, camera)
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(containerRef.value.clientWidth, containerRef.value.clientHeight),
    0.8,  // strength (drastically decreased to fix white glare)
    0.1,  // radius (narrowed)
    0.95  // threshold (raised very high so only bright particles glow)
  )
  composer = new EffectComposer(renderer)
  composer.addPass(renderScene)
  composer.addPass(bloomPass)

  buildLights()
  buildBackground()
  buildEnvMap() // Build environment map for reflections
  buildRoot()
  rebuildDimLayers()
}
function buildLights() {
  scene.add(new THREE.AmbientLight(0x0b1830, 2.2))

  const hemi = new THREE.HemisphereLight(0x40d9ff, 0x08101f, 1.8)
  scene.add(hemi)

  const topLight = new THREE.PointLight(0x6dd8ff, 7, 28, 2.1)
  topLight.position.set(0, 6, 0)
  scene.add(topLight)

  const sideLight = new THREE.PointLight(0x6f5cff, 3.4, 20, 2.0)
  sideLight.position.set(-6, 2.4, 5)
  scene.add(sideLight)

  const warmLight = new THREE.PointLight(0xff8c3a, 2.8, 18, 2.2)
  warmLight.position.set(5, -1, -4)
  scene.add(warmLight)
}

function buildBackground() {
  const starGeo = new THREE.BufferGeometry()
  const starCount = 5000 // Increased star count for cosmic feel
  const positions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    // Spread stars out much further to create depth
    positions[i * 3] = (Math.random() - 0.5) * 400
    positions[i * 3 + 1] = (Math.random() - 0.5) * 400
    positions[i * 3 + 2] = (Math.random() - 0.5) * 400
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  starField = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true
    })
  )
  scene.add(starField)

  const fieldGeo = new THREE.BufferGeometry()
  const fieldCount = 900
  const fieldPositions = new Float32Array(fieldCount * 3)
  const data = []
  for (let i = 0; i < fieldCount; i++) {
    const radius = 1.2 + Math.random() * 1.6
    const angle = Math.random() * Math.PI * 2
    const y = -1.2 + Math.random() * 3.8
    fieldPositions[i * 3] = Math.cos(angle) * radius
    fieldPositions[i * 3 + 1] = y
    fieldPositions[i * 3 + 2] = Math.sin(angle) * radius
    data.push({ angle, radius, y, speed: 0.32 + Math.random() * 0.45 })
  }
  fieldGeo.setAttribute('position', new THREE.BufferAttribute(fieldPositions, 3))
  streamField = new THREE.Points(
    fieldGeo,
    new THREE.PointsMaterial({
      color: 0x6bddff,
      size: 0.05,
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending
    })
  )
  streamField.userData.points = data
  scene.add(streamField)
}

function buildEnvMap() {
  // Creating a simple procedural environment map to avoid any external loading issues (403 Forbidden)
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  
  // Create a basic scene to generate environment map from
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x050a15);
  
  // Add some glowing spheres to simulate neon lights in the environment
  const light1 = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x00d4ff })
  );
  light1.position.set(5, 5, -5);
  envScene.add(light1);
  
  const light2 = new THREE.Mesh(
    new THREE.SphereGeometry(1, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0x9b5cff })
  );
  light2.position.set(-5, 0, 5);
  envScene.add(light2);

  // Generate the render target
  envRenderTarget = pmremGenerator.fromScene(envScene);
  customEnvMap = envRenderTarget.texture;
  
  // Clean up generator
  pmremGenerator.dispose();
}

// Global Pyramid Variables
const pyramidParticleCount = 16000;
const housePositions = new Float32Array(pyramidParticleCount * 3);
const houseBasePositions = new Float32Array(pyramidParticleCount * 3);
const houseInitPositions = new Float32Array(pyramidParticleCount * 3);
const screenTargetPositions = new Float32Array(pyramidParticleCount * 3); // Precomputed positions for the HoloScreen
const houseColors = new Float32Array(pyramidParticleCount * 3);
const houseBaseColors = new Float32Array(pyramidParticleCount * 3);
const particleBlockIndices = new Float32Array(pyramidParticleCount); 
const lorenzPoints = new Float32Array(pyramidParticleCount * 3); // Precomputed Lorenz Attractor points
const explodeSeeds = new Float32Array(pyramidParticleCount * 3)

// Screen parameters
const screenWidth = 8.0;
const screenHeight = 5.0;

// Screen transition state
let screenFormationProgress = 0.0; // 0 to 1
let lastFocusedDim = null;

let houseParticles;

let pyramidGroup;
let pyramidBlocks = {}; // Solid blocks that appear after assembly
let dataTethers = {}; // Lines connecting extracted blocks to base
let dataCompass; // Bottom rune circle
let volatilitySurface;

let petGroup;
let petTarget = new THREE.Vector3();
let petWanderTarget = new THREE.Vector3();
let petState = 'building'; // building, idle, scanning

function buildRoot() {
  rootGroup = new THREE.Group()
  
  // Move everything down slightly to balance the scene, but not too much
  // previously -1.0, changing to -1.5 to center the pyramid better with frontal view
  rootGroup.position.y = -1.5;
  
  scene.add(rootGroup)

  pyramidGroup = new THREE.Group()
  rootGroup.add(pyramidGroup)

  buildDataCompass()
  buildVolatilitySurface()
  buildPyramid()
  buildPet()
  buildFloorDisc()
}

function buildDataCompass() {
  // Create a complex holographic compass at the base
  dataCompass = new THREE.Group();
  
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(5.0, 5.2, 64),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide })
  );
  outerRing.rotation.x = -Math.PI / 2;
  dataCompass.add(outerRing);

  const innerRing = new THREE.Mesh(
    new THREE.RingGeometry(4.0, 4.8, 8, 1), // Octagon
    new THREE.MeshBasicMaterial({ color: 0x18d18f, transparent: true, opacity: 0.2, side: THREE.DoubleSide, wireframe: true })
  );
  innerRing.rotation.x = -Math.PI / 2;
  dataCompass.add(innerRing);

  dataCompass.position.y = -0.1; // Just above volatility surface
  pyramidGroup.add(dataCompass);
}

function buildVolatilitySurface() {
  // A glowing plane representing the volatility surface
  const geo = new THREE.PlaneGeometry(16, 16, 64, 64);
  const mat = new THREE.PointsMaterial({
    color: 0x00d4ff,
    size: 0.03,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending
  });
  volatilitySurface = new THREE.Points(geo, mat);
  volatilitySurface.geometry.attributes.position.setUsage(THREE.DynamicDrawUsage)
  volatilitySurface.rotation.x = -Math.PI / 2;
  volatilitySurface.position.y = -1.2;
  rootGroup.add(volatilitySurface);
}

function buildPyramid() {
  const geo = new THREE.BufferGeometry();
  
  // Create 4 solid pyramid layers (bottom to top)
  const size = 4.0;
  const height = 4.0;

  // Enhance material with better gloss, inner glow and tech lines
  const buildTechMaterial = (color) => {
    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.0,
      metalness: 0.8,
      roughness: 0.15,
      transmission: 0.95, // stronger glass effect
      ior: 1.6,
      thickness: 2.0,
      envMap: customEnvMap,
      envMapIntensity: 2.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1
    });

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.fresnelColor = { value: new THREE.Color(color) };
      shader.uniforms.fresnelPower = { value: 2.5 }; // Softer edge
      shader.uniforms.fresnelIntensity = { value: 2.0 }; // Brighter edge

      shader.vertexShader = `
        varying vec3 vViewPositionFresnel;
        varying vec3 vNormalFresnel;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        `#include <project_vertex>`,
        `
        #include <project_vertex>
        vec4 mvPositionFresnel = modelViewMatrix * vec4(position, 1.0);
        vViewPositionFresnel = -mvPositionFresnel.xyz;
        vNormalFresnel = normalize(normalMatrix * normal);
        `
      );

      shader.fragmentShader = `
        uniform vec3 fresnelColor;
        uniform float fresnelPower;
        uniform float fresnelIntensity;
        varying vec3 vViewPositionFresnel;
        varying vec3 vNormalFresnel;
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        `#include <dithering_fragment>`,
        `
        #include <dithering_fragment>
        vec3 viewDir = normalize(vViewPositionFresnel);
        float f = dot(viewDir, vNormalFresnel);
        f = clamp(1.0 - f, 0.0, 1.0);
        f = pow(f, fresnelPower);
        
        // Add subtle grid scanline effect
        float scanline = sin(vViewPositionFresnel.y * 20.0) * 0.05;
        
        gl_FragColor.rgb += fresnelColor * f * fresnelIntensity * gl_FragColor.a + scanline;
        `
      );
    };
    return mat;
  };

  // Precompute Lorenz Attractor for Chaos Theory phase
  let lx = 0.1, ly = 0.0, lz = 0.0;
  const dt = 0.005;
  const sigma = 10, rho = 28, beta = 8 / 3;
  // Run an initial warm-up loop to skip the initial drop-in line
  for(let w = 0; w < 1000; w++) {
    const dx = sigma * (ly - lx) * dt;
    const dy = (lx * (rho - lz) - ly) * dt;
    const dz = (lx * ly - beta * lz) * dt;
    lx += dx; ly += dy; lz += dz;
  }
  
  for(let i=0; i<pyramidParticleCount; i++) {
    const dx = sigma * (ly - lx) * dt;
    const dy = (lx * (rho - lz) - ly) * dt;
    const dz = (lx * ly - beta * lz) * dt;
    lx += dx;
    ly += dy;
    lz += dz;
    
    // Scale up the attractor slightly to spread it out more in space
    const scale = 0.25;
    lorenzPoints[i*3] = lx * scale;
    lorenzPoints[i*3+1] = ly * scale;
    lorenzPoints[i*3+2] = (lz - 24) * scale;
  }
  
  // Dimensions order (layers from bottom to top)
  // layer 0 is base, layer 3 is tip
  const parts = [
    { key: 'tech', color: 0x00d4ff, yStart: 0.0, yEnd: 1.0, idx: 0 },
    { key: 'team', color: 0x9b5cff, yStart: 1.0, yEnd: 2.0, idx: 1 },
    { key: 'finance', color: 0x18d18f, yStart: 2.0, yEnd: 3.0, idx: 2 },
    { key: 'market', color: 0xff8c3a, yStart: 3.0, yEnd: 4.0, idx: 3 }
  ];

  parts.forEach((p) => {
    const dimMeta = DIMS.find((item) => item.key === p.key) || {}
    // Make it a perfect cube slice
    const partGeo = new THREE.BoxGeometry(size, p.yEnd - p.yStart, size);
    partGeo.translate(0, (p.yStart + p.yEnd) / 2, 0);
    
    partGeo.computeVertexNormals();
    
    const mat = buildTechMaterial(p.color);
    
    const mesh = new THREE.Mesh(partGeo, mat);
    
    // Calculate center for explosion (move out along X or Z based on layer to avoid colliding)
    // We can alternate explosion directions for different layers
    const dirs = [
      new THREE.Vector3(-1, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(0, 0, 1)
    ]
    
    mesh.userData = { 
      key: p.key, 
      basePos: new THREE.Vector3(0,0,0),
      dir: dirs[p.idx].normalize(),
      dim: p.key,
      label: dimMeta.label || p.key,
      score: props.scores?.[p.key] ?? 0,
      desc: dimMeta.desc || '',
      color: dimMeta.color || '#00ffff'
    };
    
    // Add wireframe edge for tech look
    const edges = new THREE.EdgesGeometry(partGeo);
    const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.0 }));
    mesh.add(line);
    mesh.userData.line = line;

    // Add Tether Line (Data Connection)
    // Create a line with 2 points, initially at origin
    const tetherGeo = new THREE.BufferGeometry().setFromPoints([tmpVec3A.set(0, 0, 0), tmpVec3B.set(0, 0, 0)])
    tetherGeo.attributes.position.setUsage(THREE.DynamicDrawUsage)
    const tetherMat = new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.0, linewidth: 2 })
    const tether = new THREE.Line(tetherGeo, tetherMat)
    tether.userData.baseY = (p.yStart + p.yEnd) / 2
    pyramidGroup.add(tether)
    dataTethers[p.key] = tether
    
    mesh.userData.yStart = p.yStart;
    mesh.userData.yEnd = p.yEnd;

    pyramidGroup.add(mesh);
    pyramidBlocks[p.key] = mesh;
  });

  // Build Particles for Assembly Phase
  for(let i=0; i<pyramidParticleCount; i++) {
    // Choose a part (layer)
    const partIdx = Math.floor(Math.random() * 4);
    const p = parts[partIdx];
    particleBlockIndices[i] = partIdx;
    
    let x, y, z;
    while(true) {
      y = p.yStart + Math.random() * (p.yEnd - p.yStart);
      const widthAtY = size / 2; // It's a cube now, width is constant
      x = (Math.random() - 0.5) * widthAtY * 2;
      z = (Math.random() - 0.5) * widthAtY * 2;
      
      // Check if inside pyramid bounds (simple square base check is fine since we generated within widthAtY)
      break;
    }
    
    housePositions[i*3] = x;
    housePositions[i*3+1] = y;
    housePositions[i*3+2] = z;
    
    houseBasePositions[i*3] = x;
    houseBasePositions[i*3+1] = y;
    houseBasePositions[i*3+2] = z;
    
    // Initial position: deep underground, scattered
    const spread = 20;
    houseInitPositions[i*3] = x + (Math.random() - 0.5) * spread;
    houseInitPositions[i*3+1] = -5.0 - Math.random() * 10.0;
    houseInitPositions[i*3+2] = z + (Math.random() - 0.5) * spread;
    
    // Screen target position (a flat 2D grid/plane slightly bent or randomized)
    const screenX = (Math.random() - 0.5) * screenWidth;
    const screenY = (Math.random() - 0.5) * screenHeight;
    const screenZ = (Math.random() - 0.5) * 0.2; // slight depth
    screenTargetPositions[i*3] = screenX;
    screenTargetPositions[i*3+1] = screenY;
    screenTargetPositions[i*3+2] = screenZ;
    
    const color = new THREE.Color(p.color);
    // Darker at bottom of the entire pyramid
    color.lerp(new THREE.Color(0x020818), 1 - (y / height));
    
    houseColors[i*3] = color.r;
    houseColors[i*3+1] = color.g;
    houseColors[i*3+2] = color.b;
    houseBaseColors[i*3] = color.r;
    houseBaseColors[i*3+1] = color.g;
    houseBaseColors[i*3+2] = color.b;

    explodeSeeds[i*3] = Math.random();
    explodeSeeds[i*3+1] = Math.random();
    explodeSeeds[i*3+2] = Math.random();
  }
  
  geo.setAttribute('position', new THREE.BufferAttribute(housePositions, 3));
  geo.setAttribute('basePosition', new THREE.BufferAttribute(houseBasePositions, 3));
  geo.setAttribute('initPosition', new THREE.BufferAttribute(houseInitPositions, 3));
  geo.setAttribute('screenPosition', new THREE.BufferAttribute(screenTargetPositions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(houseColors, 3));
  geo.attributes.position.setUsage(THREE.DynamicDrawUsage)
  geo.attributes.color.setUsage(THREE.DynamicDrawUsage)
  
  const mat = new THREE.PointsMaterial({
    size: 0.05,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending
  });
  
  houseParticles = new THREE.Points(geo, mat);
  pyramidGroup.add(houseParticles);
}

function buildPet() {
  petGroup = new THREE.Group();
  
  // High Contrast Glass Dome (More opaque, higher reflection)
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshPhysicalMaterial({
      color: 0xffffff, transparent: true, opacity: 0.6, 
      roughness: 0.05, transmission: 0.5, thickness: 0.2,
      clearcoat: 1.0, clearcoatRoughness: 0.1
    })
  );
  petGroup.add(dome);
  
  // Neon Data Core (Much brighter)
  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.08, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffffff, emissive: 0x00ffff, emissiveIntensity: 5.0
    })
  );
  core.name = "petCore";
  petGroup.add(core);
  
  // High Contrast White Base
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.15, 0.1, 32),
    new THREE.MeshStandardMaterial({ 
      color: 0xffffff, metalness: 0.1, roughness: 0.1,
      emissive: 0x222222 // slight self-glow so it doesn't get lost in dark
    })
  );
  base.position.y = -0.05;
  petGroup.add(base);
  
  // Thicker Thruster Ring
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.14, 0.03, 16, 32),
    new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.9 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = -0.15;
  ring.name = "petRing";
  petGroup.add(ring);
  
  // Floating White Ears
  const earGeo = new THREE.BoxGeometry(0.04, 0.15, 0.08);
  const earMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.1 });
  const leftEar = new THREE.Mesh(earGeo, earMat);
  leftEar.position.set(-0.25, 0.05, 0);
  leftEar.name = "leftEar";
  const rightEar = new THREE.Mesh(earGeo, earMat);
  rightEar.position.set(0.25, 0.05, 0);
  rightEar.name = "rightEar";
  petGroup.add(leftEar);
  petGroup.add(rightEar);
  
  // Create a minimal glowing core for the pet
  const coreGlowGeo = new THREE.SphereGeometry(0.1, 16, 16);
  const coreGlowMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.8 });
  const coreGlow = new THREE.Mesh(coreGlowGeo, coreGlowMat);
  petGroup.add(coreGlow);
  
  petGroup.position.set(0, 2, 0);
  scene.add(petGroup);
}

function buildHaloRings() {
  const defs = [
    { radius: 2.3, color: 0x1fb8ff, opacity: 0.12 },
    { radius: 3.1, color: 0x61e1ff, opacity: 0.08 },
    { radius: 4.2, color: 0x7b5cff, opacity: 0.06 }
  ]
  defs.forEach((cfg, index) => {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(cfg.radius - 0.03, cfg.radius + 0.03, 160),
      new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: cfg.opacity,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      })
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.y = -1.15 + index * 0.02
    haloRings.push(ring)
    rootGroup.add(ring)
  })
}

function buildBeamColumns() {
  const beamDefs = [
    { angle: 0.25, height: 2.7, color: 0x00d4ff },
    { angle: 1.4, height: 2.2, color: 0x6f5cff },
    { angle: 2.55, height: 3.0, color: 0x19d18f },
    { angle: 3.65, height: 2.4, color: 0xff8c3a },
    { angle: 4.8, height: 2.8, color: 0x8cecff }
  ]

  beamDefs.forEach((cfg, index) => {
    const group = new THREE.Group()
    const x = Math.cos(cfg.angle) * 2.2
    const z = Math.sin(cfg.angle) * 2.2
    group.position.set(x, -0.55, z)

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, cfg.height, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending
      })
    )
    beam.position.y = cfg.height / 2
    group.add(beam)

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 18, 18),
      new THREE.MeshBasicMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.86,
        blending: THREE.AdditiveBlending
      })
    )
    cap.position.y = cfg.height
    group.add(cap)

    group.userData = { baseHeight: cfg.height, phase: index * 1.2 }
    beamColumns.push(group)
    rootGroup.add(group)
  })
}

function buildFloorDisc() {
  const baseGroup = new THREE.Group();
  baseGroup.name = "floorDisc"; // Named so we can hide it during intro

  const base = new THREE.Mesh(
    new THREE.CircleGeometry(5.4, 120),
    new THREE.MeshBasicMaterial({
      color: 0x081a33,
      transparent: true,
      opacity: 0.14,
      side: THREE.DoubleSide
    })
  )
  base.rotation.x = -Math.PI / 2
  base.position.y = -1.18
  baseGroup.add(base)

  const grid = new THREE.GridHelper(12, 24, 0x00d4ff, 0x00d4ff)
  grid.material.transparent = true
  grid.material.opacity = 0.055
  grid.position.y = -1.16
  baseGroup.add(grid)
  
  // Add base particle emissions (glowing dust at the bottom)
  const baseParticlesGeo = new THREE.BufferGeometry()
  const basePartCount = 400
  const basePartPos = new Float32Array(basePartCount * 3)
  const basePartSpeeds = new Float32Array(basePartCount)
  for(let i=0; i<basePartCount; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = 2 + Math.random() * 3.4
    basePartPos[i*3] = Math.cos(angle) * radius
    basePartPos[i*3+1] = -1.0 + Math.random() * 0.5
    basePartPos[i*3+2] = Math.sin(angle) * radius
    basePartSpeeds[i] = 0.01 + Math.random() * 0.02
  }
  baseParticlesGeo.setAttribute('position', new THREE.BufferAttribute(basePartPos, 3))
  baseParticlesGeo.setAttribute('speed', new THREE.BufferAttribute(basePartSpeeds, 1))
  baseParticlesGeo.attributes.position.setUsage(THREE.DynamicDrawUsage)
  
  const basePartMat = new THREE.PointsMaterial({
    color: 0x00ffff,
    size: 0.06,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  })
  const baseParticles = new THREE.Points(baseParticlesGeo, basePartMat)
  baseParticles.name = "baseParticles"
  baseGroup.add(baseParticles)
  
  rootGroup.add(baseGroup);
  floorDiscGroup = baseGroup
  floorDiscBaseParticles = baseParticles
}

function rebuildDimLayers() {
  // Clear old objects
  clickableObjects = clickableObjects.filter(obj => obj.userData.dim === undefined);
  DIMS.forEach((d) => {
    const old = dimLayers[d.key]
    if (old?.group) rootGroup.remove(old.group)
    delete dimLayers[d.key]
  })
  
  // Create empty dummy layers to avoid undefined errors in animation
  DIMS.forEach((dim) => {
    dimLayers[dim.key] = { group: { visible: false, scale: { lerp:()=>{} }, rotation: { y:0 }, userData: { speed: 0, materials: [] } } };
  });
}

function applyLayerVisibility() {
  DIMS.forEach((d) => {
    const layer = dimLayers[d.key]
    if (!layer) return
    layer.group.visible = activeLayers.value.includes(d.key)
  })
}

function toggleLayer(key) {
  if (focusDim.value === key && sceneMode.value === 'dimension_detail') {
    exitDetailMode()
    return
  }

  enterDetailMode(key)
}

function soloToggle(key) {
  toggleLayer(key);
}

function resetLayers() {
  exitDetailMode()
}

// CSS3D Reset on outside click
function resetFocus() {
  if (focusDim.value) {
    exitDetailMode()
  }
}

function emitFocusChange() {
  emit('focus-change', {
    mode: sceneMode.value,
    activeDim: focusDim.value
  })
}

function buildPopupPayload(dim) {
  const dimMeta = DIMS.find((item) => item.key === dim) || {}
  const detail = props.details?.[dim] || {}
  const summary = detail.summary || mockAnalysis[dim] || '系统正在整理当前维度分析。'

  return {
    dim,
    label: detail.label || dimMeta.label || dim,
    score: detail.score ?? props.scores?.[dim] ?? 0,
    desc: summary,
    color: detail.color || dimMeta.color || '#00ffff',
    meta: detail.meta || '',
    highlights: Array.isArray(detail.highlights) ? detail.highlights.filter(Boolean).slice(0, 4) : [],
    metrics: Array.isArray(detail.metrics) ? detail.metrics.filter(Boolean).slice(0, 4) : [],
    evidence: Array.isArray(detail.evidence) ? detail.evidence.filter(Boolean).slice(0, 3) : []
  }
}

function enterDetailMode(dim) {
  focusDim.value = dim
  sceneMode.value = 'dimension_detail'
  popup.value = buildPopupPayload(dim)
  setTimeout(() => {
    startTypewriter(popup.value?.desc || mockAnalysis[dim] || '系统正在整理当前维度分析。')
  }, 250)

  spawnPulse(dim)
  emit('dim-click', { dim, score: popup.value?.score ?? props.scores?.[dim] ?? 0 })
  emitFocusChange()
}

function exitDetailMode() {
  focusDim.value = null
  sceneMode.value = 'overview'
  popup.value = null
  if (typingTimer) clearInterval(typingTimer)
  emitFocusChange()
}

function onMouseDown(e) {
  prevMouse = { x: e.clientX, y: e.clientY }
  isDragging = false
}

function onMouseUp(e) {
  const dx = Math.abs(e.clientX - prevMouse.x)
  const dy = Math.abs(e.clientY - prevMouse.y)
  if (dx > 3 || dy > 3) {
    autoRotate = false
  }
  isDragging = false
}

function updateMouse(e) {
  const rect = canvasRef.value.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

function onMouseMove(e) {
  const dx = e.clientX - prevMouse.x
  const dy = e.clientY - prevMouse.y

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    isDragging = true
    // If focused, don't allow auto-rotate to be disabled by accidental drag
    if (!focusDim.value) {
      autoRotate = false
    }
    // Only allow camera rotation if not focused on the screen
    if (!focusDim.value || screenFormationProgress < 0.5) {
      spherical.theta -= dx * 0.0043
      spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi + dy * 0.0043))
    }
    prevMouse = { x: e.clientX, y: e.clientY }
  }

  updateMouse(e)
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObjects(clickableObjects.filter((obj) => obj.parent?.visible !== false))
  if (hits.length > 0) {
    const current = hits[0].object
    canvasRef.value.style.cursor = 'pointer'
    if (hoveredObj && hoveredObj !== current) hoveredObj.scale.setScalar(1)
    hoveredObj = current
  } else {
    canvasRef.value.style.cursor = 'default'
    if (hoveredObj) hoveredObj.scale.setScalar(1)
    hoveredObj = null
  }
}

function onClick(e) {
  if (isDragging) return

  updateMouse(e)
  raycaster.setFromCamera(mouse, camera)
  
  // Intersect with clickable pyramid blocks
  const blocks = Object.values(pyramidBlocks)
  const hits = raycaster.intersectObjects(blocks, true)

  if (hits.length > 0) {
    const target = hits[0].object
    // Find the parent block if a line or inner mesh was clicked
    let blockMesh = target;
    while (blockMesh.parent && !blockMesh.userData.dim) {
      blockMesh = blockMesh.parent;
    }
    
    // Safety check in case it hits a line that doesn't belong to a block
    if (!blockMesh || !blockMesh.userData || !blockMesh.userData.dim) {
        resetFocus();
        return;
    }
    
    if (blockMesh.userData.dim) {
      const { dim, label, score, desc, color } = blockMesh.userData
      
      if (focusDim.value === dim && sceneMode.value === 'dimension_detail') {
        resetFocus();
      } else {
        enterDetailMode(dim)
      }
    }
  } else {
    // Clicked outside, reset focus
    resetFocus();
  }
}

function onWheel(e) {
  spherical.radius = Math.max(4.8, Math.min(16, spherical.radius + e.deltaY * 0.008))
}

function spawnPulse(key) {
  const block = pyramidBlocks[key]
  if (!block) return
  
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(0.8, 0.05, 8, 32),
    new THREE.MeshBasicMaterial({
      color: block.material?.color ?? 0xffffff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    })
  )
  
  block.getWorldPosition(tmpVec3A)
  tmpVec3A.y += 0.6
  mesh.position.copy(tmpVec3A)
  mesh.rotation.x = Math.PI / 2;
  mesh.userData = { life: 0, key }
  rootGroup.add(mesh)
  pulseMeshes.push(mesh)
}

function animateStreamField(t) {
  if (!streamField) return
  const attr = streamField.geometry.attributes.position
  const points = streamField.userData.points
  for (let i = 0; i < points.length; i++) {
    const p = points[i]
    p.y += p.speed * 0.012
    if (p.y > 3.2) p.y = -1.4
    p.angle += 0.003 + p.speed * 0.001
    attr.array[i * 3] = Math.cos(p.angle) * p.radius
    attr.array[i * 3 + 1] = p.y
    attr.array[i * 3 + 2] = Math.sin(p.angle) * p.radius
  }
  attr.needsUpdate = true
  streamField.rotation.y = t * 0.06
}

function animateLayers(t) {
  // We need the layer index to check if it's assembled yet
  const keys = ['tech', 'team', 'finance', 'market'];
  
  if (dataCompass) {
    if (assemblyProgress < 0) {
      // Hide compass completely during intro curve
      dataCompass.visible = false;
    } else {
      dataCompass.visible = true;
      // Compass spins faster if a layer is focused
      const spinSpeed = focusDim.value ? 1.5 : 0.2;
      dataCompass.rotation.y -= spinSpeed * 0.01;
      // Outer ring counter-rotate
      dataCompass.children[0].rotation.z += spinSpeed * 0.005;
      
      // Fade in compass during early assembly
      const compassOpacity = Math.min(1.0, assemblyProgress);
      dataCompass.children.forEach(child => {
        if (child.material) {
          // Store original opacity if not already done
          if (child.userData.origOpacity === undefined) {
            child.userData.origOpacity = child.material.opacity;
          }
          child.material.opacity = child.userData.origOpacity * compassOpacity;
        }
      });
    }
  }

  // Handle Volatility Surface visibility
  if (volatilitySurface) {
    if (assemblyProgress < 0) {
      volatilitySurface.visible = false;
    } else {
      volatilitySurface.visible = true;
      // Fade in surface
      const surfaceOpacity = Math.min(1.0, assemblyProgress);
      if (volatilitySurface.userData.origOpacity === undefined) {
        volatilitySurface.userData.origOpacity = volatilitySurface.material.opacity;
      }
      volatilitySurface.material.opacity = volatilitySurface.userData.origOpacity * surfaceOpacity;
    }
  }

  // Handle Floor Disc visibility & particles
  const floorDisc = floorDiscGroup
  if (floorDisc) {
    if (assemblyProgress < 0) {
      floorDisc.visible = false;
    } else {
      floorDisc.visible = true;
      const floorOpacity = Math.min(1.0, assemblyProgress);
      floorDisc.children.forEach(child => {
        if (child.material) {
          if (child.userData.origOpacity === undefined) {
            child.userData.origOpacity = child.material.opacity;
          }
          child.material.opacity = child.userData.origOpacity * floorOpacity;
        }
      });
      
      // Animate base glowing particles
      const baseParts = floorDiscBaseParticles
      if (baseParts) {
        baseParts.rotation.y = t * 0.1;
        const positions = baseParts.geometry.attributes.position.array;
        const speeds = baseParts.geometry.attributes.speed.array;
        for(let i=0; i<FLOOR_PARTICLE_COUNT; i++) {
          positions[i*3+1] += speeds[i];
          // Reset if they float too high
          if (positions[i*3+1] > 2.0) {
            positions[i*3+1] = -1.0;
          }
        }
        baseParts.geometry.attributes.position.needsUpdate = true;
      }
    }
  }

  // Animate solid blocks based on focus
  Object.keys(pyramidBlocks).forEach((key) => {
    const block = pyramidBlocks[key];
    const isFocused = focusDim.value === key;
    const idx = keys.indexOf(key);
    
    const isAssembled = assemblyProgress >= (idx + 1);
    const isAssembling = assemblyProgress >= idx && assemblyProgress < (idx + 1);
    
    if (isAssembled) {
      const targetOpacity = isFocused ? 0.9 : (focusDim.value ? 0.3 : 0.8);
      block.material.opacity += (targetOpacity - block.material.opacity) * 0.05;
      
      if (block.userData.line) {
         const lineOpacity = isFocused ? 0.8 : (focusDim.value ? 0.1 : 0.4);
         block.userData.line.material.opacity += (lineOpacity - block.userData.line.material.opacity) * 0.05;
      }
    } else if (isAssembling) {
      // Fade in the wireframe as the particles assemble the layer
      // Ensure localProg is clamped to avoid negative values
      const localProg = Math.max(0, assemblyProgress - idx);
      if (block.userData.line) {
        block.userData.line.material.opacity = localProg * 0.4;
      }
      block.material.opacity = 0;
    } else {
      block.material.opacity = 0;
      if (block.userData.line) block.userData.line.material.opacity = 0;
    }

    const targetPos = tmpVec3A.copy(block.userData.basePos);
    let targetRotationX = 0;
    let targetRotationZ = 0;
    
    if (isFocused) {
       // Hide the solid block when it becomes the screen
       block.material.opacity = 0;
       if (block.userData.line) block.userData.line.material.opacity = 0;
    } else {
       block.position.lerp(targetPos, 0.08);
       block.rotation.x += (targetRotationX - block.rotation.x) * 0.1;
       block.rotation.z += (targetRotationZ - block.rotation.z) * 0.1;
    }

    // Animate Tether Line
    const tether = dataTethers[key];
    if (tether) {
       if (isFocused && isAssembled) {
          tether.material.opacity = 0.6 + Math.sin(t * 10) * 0.3; // Pulsating opacity
          const baseY = tether.userData.baseY ?? 0
          const arr = tether.geometry.attributes.position.array
          arr[0] = 0
          arr[1] = baseY
          arr[2] = 0
          arr[3] = block.position.x
          arr[4] = block.position.y + baseY
          arr[5] = block.position.z
          tether.geometry.attributes.position.needsUpdate = true
       } else {
          tether.material.opacity = 0;
       }
    }
  });
}

function animatePulses() {
  pulseMeshes = pulseMeshes.filter((mesh) => {
    mesh.userData.life += 0.02
    mesh.scale.setScalar(1 + mesh.userData.life * 1.7)
    mesh.material.opacity = Math.max(0, 0.56 - mesh.userData.life * 0.72)
    if (mesh.userData.life >= 1) {
      rootGroup.remove(mesh)
      mesh.geometry.dispose()
      mesh.material.dispose()
      return false
    }
    return true
  })
}

function animate() {
  animId = requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // Process Gesture States
  const gState = window.gestureState || { scale: 1.0, explode: false, collapse: false, rotateSpeed: 0, pointer: null };

  if (focusDim.value) {
    if (screenFormationProgress < 1.0) {
      screenFormationProgress += 0.02;
    }
  } else {
    if (screenFormationProgress > 0.0) {
      screenFormationProgress -= 0.02;
    }
  }
  const screenEased = Math.pow(screenFormationProgress, 2); // Ease in out

  if (autoRotate) {
    // Stop rotating if focused
    if (!focusDim.value) spherical.theta += 0.0016;
  } else {
    // If we are focused on the screen, lock theta to PI/2 so we look straight at the screen
    if (focusDim.value && screenFormationProgress > 0.5) {
      // Look from a slight angle so it's clearly a 3D cube
      spherical.theta += (Math.PI / 6 - spherical.theta) * 0.1;
      spherical.phi += (Math.PI / 2.4 - spherical.phi) * 0.1;
    }
  }
  // Gesture manual rotation
  if (gState.rotateSpeed) {
    spherical.theta += gState.rotateSpeed * 0.05;
  }

  // Camera positioning based on spherical coordinates
  camera.position.set(
    spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta),
    spherical.radius * Math.cos(spherical.phi),
    spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta)
  );

  // Cinematic Camera Target Logic
  if (focusDim.value && pyramidBlocks[focusDim.value]) {
    // When focused, we want to look EXACTLY at the screen center to make it the absolute focal point
    cameraTarget.lerp(tmpVec3B.set(0, 0, 0), 0.05); // Look at origin where screen will be
    
    // Zoom in drastically so the screen fills the view
    spherical.radius += (8 - spherical.radius) * 0.05;
    
    // Lock the camera angle to show the 3D cube structure
    spherical.theta += (Math.PI / 6 - spherical.theta) * 0.05;
    spherical.phi += (Math.PI / 2.4 - spherical.phi) * 0.05; 
    
    // Move the ENTIRE pyramid (including base) further LEFT so it's just a background element
    // We use Math.PI / 2.0 as our viewing angle. X is left/right. Negative X is left.
    rootGroup.position.x += (-8.0 - rootGroup.position.x) * 0.1; // Increased lerp speed
    rootGroup.position.y += (-2.0 - rootGroup.position.y) * 0.1;
    rootGroup.position.z += (-2.0 - rootGroup.position.z) * 0.1;
    
  } else {
    // Return to center
    cameraTarget.lerp(tmpVec3B.set(0, 0, 0), 0.1);
    
    // Return pyramid to origin
    rootGroup.position.x += (0.0 - rootGroup.position.x) * 0.1;
    rootGroup.position.y += (0.0 - rootGroup.position.y) * 0.1;
    rootGroup.position.z += (0.0 - rootGroup.position.z) * 0.1;
    
    // Also reset progress and panel if clicked outside
    if (!focusDim.value && screenFormationProgress === 0) {
      popup.value = null;
    }
    if (assemblyProgress >= 4.0) {
      spherical.radius += (16 - spherical.radius) * 0.05;
    }
  }
  
  camera.lookAt(cameraTarget);

  if (hoveredObj) {
    const pulse = 1.08 + Math.sin(t * 5) * 0.04
    hoveredObj.scale.setScalar(pulse)
  }

  // Initial Assembly Progress (-6 to 4)
  if (assemblyProgress < 4.0) {
    // Variable assembly speed: faster at start, slowing down as it completes
    const speed = assemblyProgress < 0 ? 0.015 : 0.006 + (4.0 - assemblyProgress) * 0.002;
    assemblyProgress += speed; 
    if (assemblyProgress > 4.0) assemblyProgress = 4.0;
  }
  
  // Layer progress 0.0 to 1.0 for each layer
  const layerProg = [
    Math.min(1, Math.max(0, assemblyProgress - 0)),
    Math.min(1, Math.max(0, assemblyProgress - 1)),
    Math.min(1, Math.max(0, assemblyProgress - 2)),
    Math.min(1, Math.max(0, assemblyProgress - 3))
  ];
  
  // Volatility Surface Animation
  if (volatilitySurface) {
    const positions = volatilitySurface.geometry.attributes.position.array;
    const scores = getScores();
    // Invert score for volatility (low score = high risk/volatility)
    const risk = 1.0 - (scores.tech + scores.team + scores.finance + scores.market) / 4;
    const volAmp = 0.2 + risk * 1.5; 
    const speed = t * (0.5 + risk * 2.0);
    
    for(let i=0; i<65; i++) {
      for(let j=0; j<65; j++) {
        const idx = (i * 65 + j) * 3;
        const x = positions[idx];
        const y = positions[idx+1];
        // Calculate Z (height) based on sine waves and noise
        positions[idx+2] = Math.sin(x * 1.5 + speed) * Math.cos(y * 1.5 + speed) * volAmp;
      }
    }
    volatilitySurface.geometry.attributes.position.needsUpdate = true;
  }

  if (houseParticles) {
    pyramidGroup.rotation.y = t * 0.15;
    
    const positions = houseParticles.geometry.attributes.position.array;
    const initPos = houseParticles.geometry.attributes.initPosition.array;
    const screenPos = houseParticles.geometry.attributes.screenPosition.array;
    const colors = houseParticles.geometry.attributes.color.array;
    const scores = getScores();
    const totalScore = (scores.tech + scores.team + scores.finance + scores.market) / 4;
    
    const currentScale = gState.scale || 1.0;
    const explodeForce = gState.explode ? 4.0 : 0.0;
    const collapseForce = gState.collapse ? 0.9 : 0.0;
    
    // Remember the last focused dim for transition out
    if (focusDim.value) {
      lastFocusedDim = focusDim.value;
    }
    const transitionKey = focusDim.value || lastFocusedDim;
    
    // Fixed global screen center in front of the camera
    const screenWorldPos = new THREE.Vector3(0, 0, 0); 
    
    for(let i=0; i<pyramidParticleCount; i++) {
      const bx = houseBasePositions[i*3];
      const by = houseBasePositions[i*3+1];
      const bz = houseBasePositions[i*3+2];
      
      const ix = initPos[i*3];
      const iy = initPos[i*3+1];
      const iz = initPos[i*3+2];
      
      const partIdx = particleBlockIndices[i];
      const pKey = PART_KEYS[partIdx];
      const isFocused = focusDim.value === pKey;
      
      // Get the ease progress specific to this layer
      const lProg = layerProg[partIdx];
      const easeProgress = 1 - Math.pow(1 - lProg, 4);
      
      // Calculate specific target based on block explosion
      let targetX = bx;
      let targetY = by;
      let targetZ = bz;
      
      if (pyramidBlocks[pKey]) {
        // Add the block's current world offset to the particle's base position
        const blockOffset = pyramidBlocks[pKey].position;
        targetX += blockOffset.x;
        targetY += blockOffset.y;
        targetZ += blockOffset.z;
      }

    // Mathematical Curve Phase (Intro) - Lorenz Attractor (Market Chaos Theory)
    let currentIx = ix;
    let currentIy = iy;
    let currentIz = iz;
    
    // Default color logic
    let targetR = houseBaseColors[i*3]
    let targetG = houseBaseColors[i*3+1]
    let targetB = houseBaseColors[i*3+2]

    if (assemblyProgress < 0) {
      // Intro factor: 1.0 when assemblyProgress <= -1, then lerps to 0 between -1 and 0.
      const introFactor = Math.min(1, Math.max(0, -assemblyProgress));
      
      if (introFactor > 0) {
        // Flowing animation index - particles rush along the attractor
        // Decrease flow speed to make it observable and use a stable offset per particle
        const flowSpeed = 200;
        // Space particles out along the attractor length based on their ID, plus time offset
        const pIdx = Math.floor((i * 3.5 + t * flowSpeed)) % pyramidParticleCount;
        
        // Seed for thickness - dramatically reduce to make the core line sharp and thin
        // Only add a very slight scatter to make it look like a focused beam of data
        const scatter = 0.15;
        const seedX = (Math.sin(ix * 10) * scatter); 
        const seedY = (Math.cos(iy * 10) * scatter);
        const seedZ = (Math.sin(iz * 10) * scatter);
        
        const lpx = lorenzPoints[pIdx * 3];
        const lpy = lorenzPoints[pIdx * 3 + 1];
        const lpz = lorenzPoints[pIdx * 3 + 2];
        
        // Rotate the entire attractor slowly to show its 3D beauty
        const cosT = Math.cos(t * 0.5);
        const sinT = Math.sin(t * 0.5);
        
        const mathX = (lpx * cosT - lpz * sinT) + seedX;
        const mathY = lpy + seedY + 4.0; // elevated
        const mathZ = (lpx * sinT + lpz * cosT) + seedZ;
        
        currentIx = ix + (mathX - ix) * introFactor;
        currentIy = iy + (mathY - iy) * introFactor;
        currentIz = iz + (mathZ - iz) * introFactor;
        
        // Enhance color during attractor phase (Hot Pink/Neon Blue high contrast)
        // Make it very aggressive and eye-catching
        const normalizedY = Math.max(0, Math.min(1, (lpy + 10) / 30))
        const chaosR = CHAOS_A.r + (CHAOS_B.r - CHAOS_A.r) * normalizedY
        const chaosG = CHAOS_A.g + (CHAOS_B.g - CHAOS_A.g) * normalizedY
        const chaosB = CHAOS_A.b + (CHAOS_B.b - CHAOS_A.b) * normalizedY
        
        // Add a pulsing intensity based on time and position
        const intensity = 1.0 + Math.sin(t * 8.0 + pIdx * 0.001) * 0.5;
        
        targetR = targetR * (1 - introFactor) + Math.min(1, chaosR * intensity) * introFactor;
        targetG = targetG * (1 - introFactor) + Math.min(1, chaosG * intensity) * introFactor;
        targetB = targetB * (1 - introFactor) + Math.min(1, chaosB * intensity) * introFactor;
      }
    }

      // Lerp from current initial state to base position
      let tx = currentIx + (targetX - currentIx) * easeProgress;
      let ty = currentIy + (targetY - currentIy) * easeProgress;
      let tz = currentIz + (targetZ - currentIz) * easeProgress;
      
      // Explode overrides
      if (explodeForce > 0) {
         tx += Math.sign(tx) * explodeForce * (explodeSeeds[i*3] * 0.5 + 0.5);
         ty += Math.sign(ty) * explodeForce * (explodeSeeds[i*3+1] * 0.5 + 0.5);
         tz += Math.sign(tz) * explodeForce * (explodeSeeds[i*3+2] * 0.5 + 0.5);
      }
      
      // Collapse overrides
      if (collapseForce > 0) {
         tx *= (1.0 - collapseForce);
         ty *= (1.0 - collapseForce);
         tz *= (1.0 - collapseForce);
      }
      
      const wave = Math.sin(t * 2 + targetY * 5) * 0.05 * totalScore;
      const diffuse = (currentScale - 1.0) * 1.5;
      
      positions[i*3] = tx * currentScale + Math.sign(tx) * diffuse + wave;
      positions[i*3+1] = ty * currentScale + wave;
      positions[i*3+2] = tz * currentScale + Math.sign(tz) * diffuse + wave;
      
      // Particle fading and screen formation logic
      const isTransitioning = pKey === transitionKey;
      
      if (isTransitioning && screenEased > 0) {
        // Since we removed the particle screen, just fade them out completely
        // Move them instantly out of the camera's way or scale them to 0
        positions[i*3] = bx;
        positions[i*3+1] = by - 999; // hide deep underground
        positions[i*3+2] = bz;
        
        colors[i*3] = 0;
        colors[i*3+1] = 0;
        colors[i*3+2] = 0;
        
      } else if (isFocused) {
        // Particles stay at original base position (ghost) before flying to screen
        tx = ix + (bx - ix) * easeProgress;
        ty = iy + (by - iy) * easeProgress;
        tz = iz + (bz - iz) * easeProgress;
        
        // Add ghost pulse/breathing effect based on time
        const ghostPulse = 1.0 + Math.sin(t * 5 + ty) * 0.1;
        
        positions[i*3] = tx * currentScale * ghostPulse + Math.sign(tx) * diffuse + wave;
        positions[i*3+1] = ty * currentScale * ghostPulse + wave;
        positions[i*3+2] = tz * currentScale * ghostPulse + Math.sign(tz) * diffuse + wave;
        
        // Ghost color (semi-transparent, maybe pulsating)
        const ghostColor = pyramidBlocks[pKey].material.color
        colors[i*3] = ghostColor.r * 0.8;
        colors[i*3+1] = ghostColor.g * 0.8;
        colors[i*3+2] = ghostColor.b * 0.8;
      } else {
        // Normal color fade out
        if (lProg >= 1.0) {
           // Fade out particles when THIS layer's solid is fully formed
           // But if another block is focused, we fade these out even faster
           const decayRate = focusDim.value ? 0.85 : 0.95;
           colors[i*3] *= decayRate;
           colors[i*3+1] *= decayRate;
           colors[i*3+2] *= decayRate;
        } else {
           // Use dynamic target color calculated above (Base or Chaos Curve Color)
           colors[i*3] = targetR;
           colors[i*3+1] = targetG;
           colors[i*3+2] = targetB;
        }
      }
    }
    houseParticles.geometry.attributes.position.needsUpdate = true;
    houseParticles.geometry.attributes.color.needsUpdate = true;
  }

  if (petGroup) {
    // Determine pet state
    if (assemblyProgress < 4.0) {
      petState = 'building';
    } else if (focusDim.value) {
      petState = 'scanning';
    } else {
      petState = 'idle';
    }

    // Hovering Animation
    petGroup.position.y += Math.sin(t * 3) * 0.005;
    
    const ring = petGroup.getObjectByName("petRing");
    const leftEar = petGroup.getObjectByName("leftEar");
    const rightEar = petGroup.getObjectByName("rightEar");
    const core = petGroup.getObjectByName("petCore");

    // State-based animations
    if (petState === 'building') {
      if (ring) ring.rotation.z += 0.1; // Fast rotation
      if (core) {
        core.rotation.y += 0.1;
        core.scale.setScalar(1 + Math.sin(t * 15) * 0.2); // Rapid pulse
      }
      if (leftEar) leftEar.rotation.z = Math.sin(t * 10) * 0.2;
      if (rightEar) rightEar.rotation.z = -Math.sin(t * 10) * 0.2;
      
      // Circle around the pyramid while building
      const buildRadius = 8;
      const buildSpeed = t * 1.5;
      const clampedProg = Math.max(0, assemblyProgress);
      const currentBuildY = (clampedProg / 4) * 8 - 1; // Approximate height of current build
      petTarget.set(
        Math.cos(buildSpeed) * buildRadius,
        currentBuildY + 2.0 + Math.sin(t * 5) * 0.5,
        Math.sin(buildSpeed) * buildRadius
      );
    } 
    else if (petState === 'scanning') {
      if (ring) {
        ring.rotation.z += 0.05;
        ring.rotation.x = Math.sin(t * 4) * 0.5; // Scanning tilt
      }
      if (core) {
        core.rotation.y += 0.05;
        core.scale.setScalar(1 + Math.sin(t * 5) * 0.1);
      }
      if (leftEar) leftEar.rotation.z = 0.2; // Ears perked up
      if (rightEar) rightEar.rotation.z = -0.2;
      
      // Follow Logic (Gesture Pointer > Dimension Focus)
      if (gState.pointer) {
         tmpVec3A.set(gState.pointer.x, gState.pointer.y, 0.5)
         tmpVec3A.unproject(camera)
         tmpVec3B.copy(tmpVec3A).sub(camera.position).normalize()
         const distance = -camera.position.z / tmpVec3B.z;
         if (isFinite(distance) && distance > 0) {
           tmpVec3C.copy(camera.position).add(tmpVec3B.multiplyScalar(distance * 0.5))
           petTarget.copy(tmpVec3C);
         }
      } else if (pyramidBlocks[focusDim.value]) {
        // Pet orbits the focused pyramid block closely or helps build the screen
        const block = pyramidBlocks[focusDim.value];
        block.getWorldPosition(tmpVec3A)
        
        if (screenFormationProgress > 0.1) {
            // Pet moves to the screen to act as the "builder/projector"
            const screenWorldPos = new THREE.Vector3(0, 0, 0); 
            
            // Hover above the screen
            tmpVec3A.copy(screenWorldPos);
            tmpVec3A.y += 2.0 + Math.sin(t * 3) * 0.2;
            tmpVec3A.z += 1.0; // slightly in front
         } else {
           // Initial extraction orbit
           const orbitRadius = 1.5;
           const orbitSpeed = t * 1.5;
           tmpVec3A.x += Math.cos(orbitSpeed) * orbitRadius;
           tmpVec3A.z += Math.sin(orbitSpeed) * orbitRadius;
           tmpVec3A.y += 2.5 + Math.sin(t * 3) * 0.2; // Hover significantly above block
        }
        
        petTarget.copy(tmpVec3A);
      }
    } 
    else { // idle
      if (ring) {
        ring.rotation.z += 0.01;
        ring.rotation.x = 0; // Reset tilt
      }
      if (core) {
        core.rotation.y += 0.02;
        core.scale.setScalar(1 + Math.sin(t * 2) * 0.05); // Slow pulse
      }
      if (leftEar) leftEar.rotation.z = Math.sin(t * 1.5) * 0.1; // Relaxed ears
      if (rightEar) rightEar.rotation.z = -Math.sin(t * 1.5 + Math.PI) * 0.1;
      
      // Wander around the base
      if (Math.random() < 0.02) {
        const wanderAngle = Math.random() * Math.PI * 2;
        const wanderRadius = 6 + Math.random() * 4;
        petWanderTarget.set(
          Math.cos(wanderAngle) * wanderRadius,
          1.5 + Math.random() * 3,
          Math.sin(wanderAngle) * wanderRadius
        );
      }
      petTarget.copy(petWanderTarget);
    }
    
    // Smooth movement
    const lerpFactor = petState === 'scanning' ? 0.06 : 0.04; // Smoother pet movement
    petGroup.position.lerp(petTarget, lerpFactor);
    
    // Look at target
    if (petState === 'scanning' && focusDim.value && pyramidBlocks[focusDim.value]) {
      if (screenFormationProgress > 0.1) {
         // Look at screen center
         const screenWorldPos = new THREE.Vector3(0, 0, 0); 
         petGroup.lookAt(screenWorldPos);
      } else {
         // Look at the block being scanned
         pyramidBlocks[focusDim.value].getWorldPosition(tmpVec3A)
         petGroup.lookAt(tmpVec3A);
      }
    } else {
      // Look at camera or movement direction
      petGroup.lookAt(camera.position);
    }
  }

  haloRings.forEach((ring, index) => {
    ring.rotation.z = t * (0.08 + index * 0.03)
    ring.material.opacity = 0.05 + Math.sin(t * 1.8 + index) * 0.02
  })

  beamColumns.forEach((beam, index) => {
    const heightWave = 1 + Math.sin(t * 2.1 + beam.userData.phase) * 0.08
    beam.scale.y = heightWave
    beam.children[1].scale.setScalar(1 + Math.sin(t * 3 + index) * 0.15)
  })

  if (starField) {
    starField.rotation.y = t * 0.002
    starField.rotation.x = Math.sin(t * 0.05) * 0.02
  }

  animateStreamField(t)
  animateLayers(t)
  animatePulses()
  
  // Use Composer for Bloom
  composer.render()
}

function onResize() {
  if (!renderer || !canvasRef.value) return
  const w = canvasRef.value.clientWidth
  const h = canvasRef.value.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  composer?.setSize(w, h)
}

watch(
  () => props.scores,
  () => {
    rebuildDimLayers()
  },
  { deep: true }
)

watch(
  activeDetail,
  (detail) => {
    if (!detail || !focusDim.value || sceneMode.value !== 'dimension_detail') return
    popup.value = buildPopupPayload(focusDim.value)
    startTypewriter(popup.value?.desc || '')
  },
  { deep: true }
)

function onWindowKeydown(event) {
  if (event.key === 'Escape' && sceneMode.value === 'dimension_detail') {
    exitDetailMode()
  }
}

function setupCinematicIntro() {
  // Initial state: Deep inside the curve
  spherical.radius = 2.5;
  spherical.phi = 1.7;
  spherical.theta = -Math.PI / 2;
  
  // Dynamic FOV for warp speed effect
  camera.fov = 90;
  camera.updateProjectionMatrix();
  
  // Create a GSAP timeline for richer, multi-stage camera movement
  const tl = gsap.timeline();

  // Stage 1: Fast rotation deep inside the curve (Feeling the chaos)
  // Extended duration to match the lengthened assemblyProgress
  tl.to(spherical, {
    theta: Math.PI / 4,
    phi: 1.6,
    radius: 4.5,
    duration: 5.5, // Lengthened from 2.5
    ease: 'power3.in'
  })
  .to(camera, {
    fov: 50,
    duration: 6, // Lengthened from 3
    ease: 'power2.out',
    onUpdate: () => camera.updateProjectionMatrix()
  }, "<")
  
  // Stage 2: Sharp pull back and snap to orbit (Escaping the nebula)
  .to(spherical, {
    radius: 14,
    theta: Math.PI * 1.25,
    phi: 1.35,
    duration: 4.5, // Lengthened
    ease: 'expo.out'
  }, ">-0.5")
  
  // Stage 3: The Assembly Orbit (Grand structural view)
  .to(spherical, {
    theta: Math.PI * 2.25,
    phi: 1.35,
    radius: 15,
    duration: 8,
    ease: 'sine.inOut',
    onComplete: () => {
      autoRotate = true;
    }
  }, ">-1.0");
}

onMounted(() => {
  init(canvasRef.value)
  setupCinematicIntro()
  animate()
  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', onWindowKeydown)
})

onUnmounted(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', onWindowKeydown)
  if (scene) {
    scene.traverse((obj) => {
      if (obj.geometry?.dispose) obj.geometry.dispose()
      if (obj.material) {
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material]
        materials.forEach((m) => {
          if (!m) return
          Object.keys(m).forEach((k) => {
            const v = m[k]
            if (v?.isTexture && v.dispose) v.dispose()
          })
          if (m.dispose) m.dispose()
        })
      }
      if (obj.isCSS2DObject && obj.element?.parentNode) obj.element.parentNode.removeChild(obj.element)
    })
    scene.clear()
  }
  composer?.dispose?.()
  envRenderTarget?.dispose?.()
  renderer?.dispose()
})
</script>

<style scoped>
.scene-container {
  position: relative;
  width: 100vw;
  height: 100vh;
}
.scene-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}
.detail-dock {
  position: fixed;
  top: 92px;
  right: 24px;
  bottom: 20px;
  z-index: 220;
  width: min(860px, calc(100vw - 360px));
  opacity: 0;
  transform: translate3d(38px, 0, 0) scale(0.96);
  transform-origin: right center;
  pointer-events: none;
  transition: opacity 0.28s ease, transform 0.36s ease;
}

.detail-dock.active {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1);
  pointer-events: auto;
}
/* This needs to be unscoped or use :deep to style dynamically created elements */
:deep(.dim-label) {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 14px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 2px;
  text-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
  opacity: 0.8;
  pointer-events: none;
  background: rgba(0,0,0,0.4);
  padding: 4px 12px;
  border-radius: 4px;
  border: 1px solid currentColor;
  backdrop-filter: blur(4px);
}

.scene-aura,
.scene-vignette {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
}

.scene-aura {
  background:
    radial-gradient(circle at 50% 42%, rgba(0, 212, 255, 0.18), transparent 26%),
    radial-gradient(circle at 40% 55%, rgba(123, 92, 255, 0.14), transparent 22%),
    radial-gradient(circle at 58% 62%, rgba(255, 140, 58, 0.1), transparent 18%);
  filter: blur(36px);
  animation: aura-drift 16s ease-in-out infinite alternate;
}

@keyframes aura-drift {
  from { transform: translate3d(-1.5%, 0, 0) scale(1); }
  to { transform: translate3d(1.2%, -1.4%, 0) scale(1.04); }
}

.scene-vignette {
  background:
    radial-gradient(circle at center, transparent 40%, rgba(1, 5, 14, 0.55) 100%),
    linear-gradient(180deg, rgba(1, 7, 19, 0.2), rgba(1, 7, 19, 0.75));
}

/* Holographic Data Panel Styles */
.holo-panel {
  width: 720px;
  min-height: 500px;
  background: rgba(6, 15, 30, 0.95);
  border: 2px solid;
  border-radius: 12px;
  padding: 32px;
  pointer-events: auto;
  overflow: hidden;
  box-shadow: 0 0 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0, 212, 255, 0.2);
  display: none; /* Initially hidden, controlled by JS */
  flex-direction: column;
  animation: holo-fade-in 0.5s ease forwards;
}

@keyframes holo-fade-in {
  0% { opacity: 0; filter: blur(5px); transform: scale(0.95); }
  100% { opacity: 1; filter: blur(0); transform: scale(1); }
}

.holo-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 20px;
}

.holo-header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.holo-title {
  font-size: 36px;
  font-weight: 800;
  letter-spacing: 4px;
  text-shadow: 0 0 15px currentColor;
}

.holo-score {
  font-size: 48px;
  font-weight: 900;
  color: #fff;
  line-height: 1;
  text-shadow: 0 0 20px rgba(255,255,255,0.5);
}

.holo-score span {
  font-size: 18px;
  color: #8ca4bf;
  margin-left: 8px;
  font-weight: normal;
}

.holo-back {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.14);
  background: rgba(255,255,255,0.08);
  color: #d9ecff;
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.holo-line {
  height: 3px;
  width: 100%;
  margin-bottom: 24px;
  box-shadow: 0 0 15px currentColor;
}

.holo-meta {
  margin-bottom: 14px;
  color: #8ea2bc;
  font-size: 13px;
  line-height: 1.6;
}

.holo-content {
  position: relative;
  min-height: 120px;
  padding: 18px 20px;
  margin-bottom: 18px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(11, 22, 43, 0.88), rgba(6, 14, 29, 0.72));
  font-family: 'Microsoft YaHei', 'PingFang SC', 'Segoe UI', sans-serif;
  font-size: 18px;
  line-height: 1.8;
  color: #e2e8f0;
  text-shadow: 0 0 5px rgba(255,255,255,0.2);
}

.holo-highlights {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.highlight-chip {
  padding: 8px 12px;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.72);
  color: #d9ecff;
  font-size: 12px;
  line-height: 1.5;
}

.typewriter-text {
  white-space: pre-wrap;
}

.cursor {
  display: inline-block;
  width: 10px;
  height: 20px;
  vertical-align: middle;
  animation: blink 1s step-end infinite;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.detail-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
  gap: 14px;
  align-content: start;
}

.detail-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 132px;
  padding: 18px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: linear-gradient(180deg, rgba(8, 18, 37, 0.92), rgba(5, 11, 24, 0.8));
  box-shadow: inset 0 0 24px rgba(0, 212, 255, 0.05);
}

.detail-section:last-child {
  grid-column: 1 / -1;
}

.detail-kicker {
  font-size: 11px;
  letter-spacing: 2px;
  color: #7f94ad;
  text-transform: uppercase;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric-card {
  padding: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(148, 163, 184, 0.1);
  min-height: 92px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric-card strong {
  color: #d9ecff;
  font-size: 13px;
  font-weight: 700;
}

.metric-card span {
  color: #ffffff;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
}

.metric-card small {
  color: #8ea2bc;
  font-size: 12px;
  line-height: 1.5;
}

.evidence-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.evidence-card {
  padding: 14px;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.1);
  background: rgba(255, 255, 255, 0.035);
  min-height: 110px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.evidence-card strong {
  color: #f8fafc;
  font-size: 13px;
  line-height: 1.5;
}

.evidence-card small {
  color: #67e8f9;
  font-size: 11px;
  letter-spacing: 1px;
}

.evidence-card p {
  margin: 0;
  color: #8ea2bc;
  font-size: 12px;
  line-height: 1.6;
}

.holo-footer-glow {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
}

.footer-line {
  flex: 1;
  height: 2px;
  border-radius: 999px;
  box-shadow: 0 0 16px currentColor;
}

.footer-line.dim {
  flex: 0 0 120px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.2), rgba(148, 163, 184, 0));
  box-shadow: none;
}

.holo-bg-grid {
  position: absolute;
  inset: 0;
  background-image: 
    linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 30px 30px;
  pointer-events: none;
  z-index: -1;
}

.layer-controls {
  position: fixed;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 110;
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(4, 11, 25, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(18px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.25);
}

.layer-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #9fb0c6;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.layer-btn:hover {
  color: var(--c, #00d4ff);
  border-color: var(--c, #00d4ff);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--c) 35%, transparent);
}

.layer-btn.active {
  color: var(--c);
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 12%, rgba(255, 255, 255, 0.03));
}

.layer-btn.solo {
  color: #fff;
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 22%, rgba(255, 255, 255, 0.03));
  box-shadow: 0 0 18px color-mix(in srgb, var(--c) 32%, transparent);
}

.layer-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c, #9fb0c6);
  box-shadow: 0 0 10px var(--c, #9fb0c6);
}

.reset-btn {
  --c: #c1d2e6;
}

.dim-popup {
  position: fixed;
  z-index: 600;
  min-width: 220px;
  padding: 16px 18px 14px;
  border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--c) 80%, transparent);
  background: rgba(3, 10, 22, 0.92);
  backdrop-filter: blur(18px);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.28), 0 0 24px color-mix(in srgb, var(--c) 28%, transparent);
  animation: pop-in 0.22s ease;
}

@keyframes pop-in {
  from {
    transform: translateY(10px) scale(0.92);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}

.popup-kicker {
  margin-bottom: 6px;
  font-size: 11px;
  letter-spacing: 2px;
  color: #7f94ad;
}

.popup-title {
  color: var(--c);
  font-size: 16px;
  font-weight: 700;
}

.popup-score {
  margin-top: 6px;
  color: #fff;
  font-size: 40px;
  font-weight: 900;
  line-height: 1;
}

.popup-score span {
  margin-left: 4px;
  font-size: 14px;
  color: #86a3c5;
}

.popup-bar {
  height: 4px;
  margin: 12px 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.popup-bar-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 65%, white), var(--c));
  box-shadow: 0 0 18px color-mix(in srgb, var(--c) 55%, transparent);
  transition: width 0.5s ease;
}

.popup-desc {
  font-size: 12px;
  line-height: 1.7;
  color: #9db0c7;
}

.popup-close {
  position: absolute;
  top: 8px;
  right: 10px;
  border: none;
  background: none;
  color: #8ca4bf;
  font-size: 16px;
  cursor: pointer;
}

@media (max-width: 1200px) {
  .detail-dock {
    right: 18px;
    width: min(760px, calc(100vw - 330px));
  }
}

@media (max-width: 900px) {
  .detail-dock {
    top: auto;
    left: 14px;
    right: 14px;
    bottom: 18px;
    width: auto;
    max-height: calc(100vh - 132px);
    transform: translate3d(0, 24px, 0) scale(0.98);
    transform-origin: center bottom;
  }
}
</style>
