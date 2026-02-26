<script setup lang="ts">
import { computed, ref, onMounted, watch } from 'vue'
import api from '@/api/controllersApi'
import type { Controller, DeviceStatus, LedState, Preset } from '@/types'
import ColorWheel from './ColorWheel.vue'
import SavedColors from './SavedColors.vue'
import ControllerConfig from './ControllerConfig.vue'

const props = defineProps<{
  controller: Controller
  presets: Preset[]
}>()

const emit = defineEmits<{
  presetsChanged: []
  back: []
}>()

const state = ref<LedState | null>(null)
const uiName = ref('')
const error = ref<string | null>(null)
const powerBusy = ref(false)
const rawR = ref(0)
const rawG = ref(0)
const rawB = ref(0)
const rawW = ref(0)

let sendUpdateTimeout: number | undefined
let skipNextAutoSend = false

const brightnessPercent = computed(() => (state.value ? Math.round(state.value.br * 100) : 0))

const whitePercent = computed(() => (state.value ? Math.round((state.value.w / 255) * 100) : 0))

const powerLabel = computed(() => (state.value?.on ? 'ON' : 'OFF'))

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

async function loadStatus() {
  try {
    const { data } = await api.getControllerStatus(props.controller.id)
    const status: DeviceStatus = data
    uiName.value = status.ui_name
    state.value = {
      on: status.on,
      r: status.r,
      g: status.g,
      b: status.b,
      w: status.w,
      br: status.br,
    }
    error.value = null
  } catch {
    error.value = 'Device offline'
  }
}

onMounted(loadStatus)

watch(
  () => props.controller.id,
  () => {
    loadStatus()
  },
)

function sendUpdate() {
  if (sendUpdateTimeout) {
    clearTimeout(sendUpdateTimeout)
  }

  sendUpdateTimeout = window.setTimeout(async () => {
    if (!state.value) return
    try {
      await api.setControllerState(props.controller.id, state.value)
    } catch {
      error.value = 'Failed to update device state'
    }
  }, 150)
}

watch(
  state,
  () => {
    if (skipNextAutoSend) {
      skipNextAutoSend = false
      return
    }
    sendUpdate()
  },
  { deep: true },
)

watch(
  state,
  (currentState) => {
    if (!currentState) return
    rawR.value = currentState.r
    rawG.value = currentState.g
    rawB.value = currentState.b
    rawW.value = currentState.w
  },
  { deep: true, immediate: true },
)

function updateRgb(color: { r: number; g: number; b: number }) {
  if (!state.value) return
  state.value.r = color.r
  state.value.g = color.g
  state.value.b = color.b
}

function applyRawValues() {
  if (!state.value) return
  state.value.r = clampChannel(rawR.value)
  state.value.g = clampChannel(rawG.value)
  state.value.b = clampChannel(rawB.value)
  state.value.w = clampChannel(rawW.value)
}

async function togglePower() {
  if (!state.value || powerBusy.value) return

  powerBusy.value = true
  error.value = null

  const next = !state.value.on
  const payload = {
    ...state.value,
    on: next,
  }

  try {
    await api.setControllerState(props.controller.id, payload)
    skipNextAutoSend = true
    state.value.on = next
  } catch {
    error.value = 'Failed to change power state'
  } finally {
    powerBusy.value = false
  }
}
</script>

<template>
  <section v-if="state" class="detail-panel">
    <div class="heading-row">
      <button class="back-btn" @click="emit('back')">Back</button>
    </div>

    <div class="top-row">
      <h2>{{ uiName || `${controller.ip}:${controller.port}` }}</h2>
      <div class="power-wrap">
        <span class="power-pill" :class="state.on ? 'on' : 'off'">{{ powerLabel }}</span>
        <button class="power-action" :disabled="powerBusy" @click="togglePower">
          {{ state.on ? 'Turn Off' : 'Turn On' }}
        </button>
      </div>
    </div>

    <div class="control-group color-group">
      <label class="group-label">Color</label>
      <ColorWheel :r="state.r" :g="state.g" :b="state.b" @change="updateRgb" />
    </div>

    <div class="control-group slider-group">
      <label class="group-label">White ({{ whitePercent }}%)</label>
      <input type="range" min="0" max="255" v-model="state.w" />
    </div>

    <div class="control-group slider-group">
      <label class="group-label">Brightness ({{ brightnessPercent }}%)</label>
      <input type="range" min="0" max="1" step="0.01" v-model="state.br" />
    </div>

    <details>
      <summary>Advanced: Raw RGBW</summary>

      <div class="raw-row">
        <label>R</label>
        <input v-model.number="rawR" type="number" min="0" max="255" />
      </div>
      <div class="raw-row">
        <label>G</label>
        <input v-model.number="rawG" type="number" min="0" max="255" />
      </div>
      <div class="raw-row">
        <label>B</label>
        <input v-model.number="rawB" type="number" min="0" max="255" />
      </div>
      <div class="raw-row">
        <label>W</label>
        <input v-model.number="rawW" type="number" min="0" max="255" />
      </div>

      <button @click="applyRawValues">Apply Raw RGBW</button>
    </details>

    <SavedColors
      :controllerId="controller.id"
      :currentState="state"
      :presets="presets"
      @changed="emit('presetsChanged')"
    />

    <details>
      <summary>Settings</summary>
      <ControllerConfig :controllerId="controller.id" :uiName="uiName" />
    </details>
  </section>

  <div v-else class="detail-error">{{ error }}</div>
</template>

<style scoped>
.detail-panel {
  display: grid;
  gap: 1rem;
}

.heading-row {
  display: flex;
  margin-bottom: 0.5rem;
}

.back-btn {
  min-height: 40px;
  padding: 0.25rem 1rem;
  font-size: 0.9rem;
  border-radius: 12px;
  background: var(--surface-2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
}

.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--surface-1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 1.25rem;
  border-radius: 20px;
}

h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.power-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.power-pill {
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.power-pill.on {
  color: #32d74b;
  background: rgba(50, 215, 75, 0.15);
}

.power-pill.off {
  color: #ff453a;
  background: rgba(255, 69, 58, 0.15);
}

.power-action {
  min-width: 120px;
  background: var(--surface-3);
}

.power-action:active {
  background: var(--surface-2);
}

.control-row,
.raw-row {
  display: grid;
  align-items: center;
  gap: 0.75rem;
  grid-template-columns: 1fr auto;
  margin-bottom: 0.5rem;
}

.power-row {
  padding: 0.2rem 0;
}

.control-group {
  display: grid;
  gap: 1rem;
  border-radius: 20px;
  background: var(--surface-1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 1.25rem;
}

.color-group {
  justify-items: center;
}

.group-label {
  color: var(--text-secondary);
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.detail-error {
  color: var(--danger);
  padding: 1rem;
  background: rgba(255, 69, 58, 0.1);
  border-radius: 16px;
  text-align: center;
}

@media (max-width: 540px) {
  .top-row {
    flex-direction: column;
    align-items: stretch;
  }

  .power-wrap {
    justify-content: space-between;
  }

  .power-action {
    flex: 1;
  }
}
</style>
