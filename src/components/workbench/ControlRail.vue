<template>
  <aside class="control-rail">
    <section class="rail-card rail-summary">
      <span class="rail-kicker">Workspace</span>
      <h2>{{ currentAgent?.name || '未选择智能体' }}</h2>
      <p>{{ currentAgent?.summary || '请选择一个智能体进入对应工作模式。' }}</p>

      <div class="summary-grid">
        <article class="summary-item">
          <span>Session</span>
          <strong>{{ currentSession?.title || '未选择' }}</strong>
        </article>
        <article class="summary-item">
          <span>Workflow</span>
          <strong>{{ currentWorkflow?.label || '自由对话' }}</strong>
        </article>
        <article class="summary-item">
          <span>Status</span>
          <strong>{{ liveStatusLabel }}</strong>
        </article>
        <article class="summary-item">
          <span>Route</span>
          <strong>{{ liveRouteLabel }}</strong>
        </article>
      </div>
    </section>

    <section class="rail-card">
      <div class="section-head">
        <span class="section-title">Agents</span>
        <span class="section-meta">{{ agents.length }}</span>
      </div>

      <button
        v-for="agent in agents"
        :key="agent.id"
        type="button"
        class="rail-item"
        :class="{ active: agent.id === currentAgentId }"
        @click="$emit('select-agent', agent.id)"
      >
        <span class="rail-item-title">{{ agent.name }}</span>
        <span class="rail-item-body">{{ agent.role }}</span>
      </button>
    </section>

    <section class="rail-card">
      <div class="section-head">
        <span class="section-title">Sessions</span>
        <span class="section-meta">{{ sessions.length }}</span>
      </div>

      <button
        v-for="session in sessions"
        :key="session.id"
        type="button"
        class="rail-item"
        :class="{ active: session.id === currentSessionId }"
        @click="$emit('select-session', session.id)"
      >
        <span class="rail-item-title">{{ session.title }}</span>
        <span class="rail-item-body">{{ session.enterpriseName }}</span>
      </button>
    </section>

    <section class="rail-card">
      <div class="section-head">
        <span class="section-title">Workflows</span>
        <span class="section-meta">{{ workflows.length }}</span>
      </div>

      <button
        v-for="workflow in workflows"
        :key="workflow.id"
        type="button"
        class="rail-item"
        :class="{ active: workflow.id === currentWorkflowId }"
        @click="$emit('select-workflow', workflow.id)"
      >
        <span class="rail-item-title">{{ workflow.label }}</span>
        <span class="rail-item-body">{{ workflow.description }}</span>
      </button>
    </section>
  </aside>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  agents: { type: Array, default: () => [] },
  sessions: { type: Array, default: () => [] },
  workflows: { type: Array, default: () => [] },
  currentAgentId: { type: String, default: '' },
  currentSessionId: { type: String, default: '' },
  currentWorkflowId: { type: String, default: '' },
  liveStatus: { type: Object, default: () => ({ stage: 'idle', route: 'local' }) }
})

defineEmits(['select-agent', 'select-session', 'select-workflow'])

const currentAgent = computed(() => props.agents.find((item) => item.id === props.currentAgentId))
const currentSession = computed(() => props.sessions.find((item) => item.id === props.currentSessionId))
const currentWorkflow = computed(() => props.workflows.find((item) => item.id === props.currentWorkflowId))

const liveStatusLabel = computed(() => {
  const map = {
    idle: '待命',
    preparing: '准备中',
    streaming: '输出中',
    completed: '已完成',
    fallback: '已回退',
    error: '异常',
    web_search: '联网中',
    output_item: '编排中',
    content_part: '生成中'
  }

  return map[props.liveStatus.stage] || props.liveStatus.stage || '待命'
})

const liveRouteLabel = computed(() => {
  if (props.liveStatus.route === 'responses') return 'Ark Responses'
  if (props.liveStatus.route === 'chat') return 'Ark Chat'
  return 'Local Runtime'
})
</script>

<style scoped>
.control-rail {
  display: grid;
  gap: 14px;
}

.rail-card {
  padding: 16px;
  border: 1px solid rgba(22, 35, 52, 0.1);
  border-radius: 24px;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 18px 36px rgba(23, 43, 71, 0.08);
}

.rail-summary h2 {
  margin: 10px 0 6px;
  font-size: 24px;
  line-height: 1.1;
}

.rail-summary p {
  margin: 0;
  color: #667a90;
  line-height: 1.6;
}

.rail-kicker {
  display: inline-flex;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(15, 139, 141, 0.1);
  color: #0f8b8d;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.summary-item {
  padding: 12px;
  border-radius: 18px;
  background: rgba(243, 247, 249, 0.96);
}

.summary-item span {
  display: block;
  color: #6b7d90;
  font-size: 12px;
}

.summary-item strong {
  display: block;
  margin-top: 6px;
  font-size: 14px;
  color: #1d3045;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  font-size: 13px;
  font-weight: 700;
  color: #22344a;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.section-meta {
  color: #7c8da0;
  font-size: 12px;
}

.rail-item {
  width: 100%;
  display: grid;
  gap: 4px;
  margin-top: 8px;
  padding: 12px;
  border: 1px solid rgba(22, 35, 52, 0.08);
  border-radius: 18px;
  background: rgba(247, 250, 252, 0.96);
  text-align: left;
  cursor: pointer;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.rail-item:hover {
  transform: translateY(-1px);
  border-color: rgba(15, 139, 141, 0.3);
}

.rail-item.active {
  border-color: rgba(15, 139, 141, 0.45);
  background: rgba(15, 139, 141, 0.08);
}

.rail-item-title {
  color: #1d3045;
  font-size: 14px;
  font-weight: 700;
}

.rail-item-body {
  color: #667a90;
  font-size: 12px;
  line-height: 1.5;
}
</style>
