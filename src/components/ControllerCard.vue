<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/controllersApi'
import type { Controller, DeviceStatus } from '@/types'

const props = defineProps<{
  controller: Controller
}>()

const emit = defineEmits<{
  open: [id: string]
}>()

const status = ref<DeviceStatus | null>(null)
const error = ref<string | null>(null)
const toggling = ref(false)

onMounted(async () => {
  try {
    const { data } = await api.getControllerStatus(props.controller.id)
    status.value = data
  } catch {
    error.value = 'Offline'
  }
})

function open() {
  emit('open', props.controller.id)
}

async function togglePower(event: MouseEvent) {
  event.stopPropagation()

  if (!status.value || toggling.value) return

  toggling.value = true
  error.value = null

  try {
    const nextState = {
      on: !status.value.on,
      r: status.value.r,
      g: status.value.g,
      b: status.value.b,
      w: status.value.w,
      br: status.value.br,
    }

    await api.setControllerState(props.controller.id, nextState)
    status.value = { ...status.value, on: nextState.on }
  } catch {
    error.value = 'Failed to toggle power'
  } finally {
    toggling.value = false
  }
}
</script>

<template>
  <div class="card" @click="open">
    <div class="header-row">
      <h3 class="title">{{ status?.ui_name || `${controller.ip}:${controller.port}` }}</h3>
      <p v-if="status" class="power-state" :class="status.on ? 'on' : 'off'">
        {{ status.on ? 'ON' : 'OFF' }}
      </p>
    </div>

    <div v-if="status" class="status-wrap">
      <div class="preview" :style="{ background: `rgb(${status.r},${status.g},${status.b})` }" />
      <div class="details">
        <p class="meta">Brightness: {{ Math.round(status.br * 100) }}%</p>
        <p class="meta-rgb">RGBW: {{ status.r }}, {{ status.g }}, {{ status.b }}, {{ status.w }}</p>
      </div>
      <button class="power-btn" :disabled="toggling" @click="togglePower">
        {{ status.on ? 'Turn Off' : 'Turn On' }}
      </button>
    </div>

    <div v-else-if="error" class="offline">⚠ {{ error }}</div>
  </div>
</template>

<style scoped>
.card {
  background: var(--surface-1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  border-radius: 20px;
  padding: 1.25rem;
  cursor: pointer;
  transition:
    transform 0.15s ease,
    background 0.2s ease;
}

.card:active {
  transform: scale(0.98);
  background: var(--surface-2);
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
}

.status-wrap {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.75rem 1rem;
  align-items: center;
}

.preview {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
}

.details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.95rem;
}

.meta-rgb {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.8rem;
  opacity: 0.8;
}

.power-state {
  margin: 0;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.power-state.on {
  background: rgba(50, 215, 75, 0.15);
  color: #32d74b;
}

.power-state.off {
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
}

.offline {
  color: var(--danger);
  font-weight: 500;
  padding: 0.5rem 0;
}

.power-btn {
  margin-top: 0.5rem;
  grid-column: 1 / -1;
  background: var(--surface-3);
}

.power-btn:active {
  background: var(--surface-2);
}
</style>
