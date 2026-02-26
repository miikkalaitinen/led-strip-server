<script setup lang="ts">
import api from '@/api/controllersApi'
import type { LedState, Preset } from '@/types'

const props = defineProps<{
  controllerId: string
  currentState: LedState
  presets: Preset[]
}>()

const emit = defineEmits<{
  changed: []
}>()

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
  Object.assign(props.currentState, preset.state)
}

async function remove(id: number) {
  await api.deletePreset(props.controllerId, id)
  emit('changed')
}
</script>

<template>
  <section class="presets">
    <h3>Saved Colors</h3>

    <div v-for="preset in presets" :key="preset.id" class="preset-row">
      <span
        class="preview"
        :style="{ background: `rgb(${preset.state.r},${preset.state.g},${preset.state.b})` }"
      />
      <span class="name">{{ preset.name }}</span>
      <button @click="apply(preset)">Apply</button>
      <button @click="remove(preset.id)">Delete</button>
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
  margin: 0 0 1rem;
  font-size: 1.1rem;
  font-weight: 600;
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
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 16px;
  background: var(--surface-2);
  margin-bottom: 0.5rem;
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

.preset-row button {
  min-height: 36px;
  padding: 0.25rem 0.75rem;
  font-size: 0.85rem;
  border-radius: 10px;
  background: var(--surface-3);
}

.preset-row button:active {
  background: var(--surface-1);
}

@media (max-width: 540px) {
  .preset-row {
    grid-template-columns: auto 1fr;
  }

  .preset-row button {
    grid-column: 1 / -1;
  }
}
</style>
