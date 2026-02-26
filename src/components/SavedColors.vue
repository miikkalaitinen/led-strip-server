<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/controllersApi'
import type { LedState, Preset } from '@/types'

const props = defineProps<{
  controllerId: string
  currentState: LedState
  presets: Preset[]
}>()

const emit = defineEmits<{
  changed: []
  apply: [state: LedState]
}>()

const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function startPress(preset: Preset, event?: MouseEvent | TouchEvent) {
  // Only react to left clicks for mouse events
  if (event instanceof MouseEvent && event.button !== 0) return

  if (longPressTimer.value) clearTimeout(longPressTimer.value)

  longPressTimer.value = setTimeout(() => {
    longPressTimer.value = null
    if (confirm(`Delete this color ${preset.name}?`)) {
      remove(preset.id)
    }
  }, 600)
}

function endPress(preset: Preset, event?: MouseEvent | TouchEvent) {
  if (event instanceof MouseEvent && event.button !== 0) return

  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
    apply(preset)
  }
}

function cancelPress() {
  if (longPressTimer.value) {
    clearTimeout(longPressTimer.value)
    longPressTimer.value = null
  }
}

async function save() {
  const name = prompt('Preset name')
  if (!name) return

  await api.savePreset(props.controllerId, {
    name,
    state: {
      on: props.currentState.on,
      r: props.currentState.r,
      g: props.currentState.g,
      b: props.currentState.b,
      w: props.currentState.w,
      br: props.currentState.br,
    },
  })

  emit('changed')
}

function apply(preset: Preset) {
  emit('apply', preset.state)
}

async function remove(id: number) {
  await api.deletePreset(props.controllerId, id)
  emit('changed')
}
</script>

<template>
  <section class="presets">
    <h3>Saved Colors</h3>
    <p class="hint">Tap to apply, long press to delete</p>

    <div
      v-for="preset in presets"
      :key="preset.id"
      class="preset-row interactive"
      @mousedown="startPress(preset, $event)"
      @mouseup="endPress(preset, $event)"
      @mouseleave="cancelPress"
      @touchstart="startPress(preset, $event)"
      @touchend="endPress(preset, $event)"
      @touchmove="cancelPress"
      @touchcancel="cancelPress"
      @contextmenu.prevent
    >
      <span
        class="preview"
        :style="{ background: `rgb(${preset.state.r},${preset.state.g},${preset.state.b})` }"
      />
      <span class="name">{{ preset.name }}</span>
    </div>

    <div class="save-action">
      <button class="save-btn" @click="save">Save Current Color</button>
    </div>
  </section>
</template>

<style scoped>
.presets {
  border-radius: 20px;
  padding: 1.25rem;
  background: var(--surface-1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
}

h3 {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.hint {
  margin: 0 0 1rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}

.save-action {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border);
}

.save-btn {
  width: 100%;
  background: var(--surface-3);
}

.save-btn:active {
  background: var(--surface-2);
}

.preset-row {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 16px;
  background: var(--surface-2);
  margin-bottom: 0.5rem;
}

.preset-row.interactive {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition:
    background 0.2s,
    transform 0.1s;
}

.preset-row.interactive:active {
  background: var(--surface-3);
  transform: scale(0.98);
}

.preview {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-block;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
}

.name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  font-size: 0.95rem;
}
</style>
