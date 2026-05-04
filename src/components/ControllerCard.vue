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

function previewStyle(current: DeviceStatus) {
  const glow = Math.min(0.6, 0.15 + current.br * 0.45)
  return {
    background: `rgb(${current.r},${current.g},${current.b})`,
    boxShadow: `0 0 0 2px rgba(255, 255, 255, 0.1), 0 0 18px rgba(${current.r}, ${current.g}, ${current.b}, ${glow})`,
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
      <div class="preview" :style="previewStyle(status)" />
      <div class="details">
        <div class="meta-row">
          <span class="chip chip-r">R {{ status.r }}</span>
          <span class="chip chip-g">G {{ status.g }}</span>
          <span class="chip chip-b">B {{ status.b }}</span>
          <span class="chip chip-w">W {{ status.w }}</span>
          <span class="chip chip-br">Br {{ Math.round(status.br * 100) }}%</span>
        </div>
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
  gap: 0.35rem;
}

.meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.chip {
  font-size: 0.7rem;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--surface-3);
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 0.02em;
}

.chip-r {
  background: rgba(255, 70, 70, 0.15);
  border-color: rgba(255, 70, 70, 0.3);
  color: #ff8a8a;
}

.chip-g {
  background: rgba(70, 220, 120, 0.15);
  border-color: rgba(70, 220, 120, 0.3);
  color: #9fffc3;
}

.chip-b {
  background: rgba(80, 140, 255, 0.15);
  border-color: rgba(80, 140, 255, 0.3);
  color: #9db8ff;
}

.chip-w {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.85);
}

.chip-br {
  background: rgba(255, 200, 120, 0.15);
  border-color: rgba(255, 200, 120, 0.3);
  color: #ffd8a0;
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
