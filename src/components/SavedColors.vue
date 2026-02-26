<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api/controllersApi'
import type { SavedColor, LedState } from '@/types'

const props = defineProps<{
  controllerId: string
  currentState: LedState
}>()

const colors = ref<SavedColor[]>([])

async function load() {
  const { data } = await api.getControllers()
  const controller = data.find(c => c.id === props.controllerId)
  colors.value = controller?.savedColors ?? []
}

onMounted(load)

async function save() {
  const label = prompt('Color name')
  if (!label) return

  await api.saveColor(props.controllerId, {
    label,
    r: props.currentState.r,
    g: props.currentState.g,
    b: props.currentState.b,
    w: props.currentState.w,
    br: props.currentState.br
  })

  load()
}

function apply(color: SavedColor) {
  Object.assign(props.currentState, color)
}

async function remove(id: string) {
  await api.deleteColor(props.controllerId, id)
  load()
}
</script>

<template>
  <h3>Saved Colors</h3>

  <button @click="save">Save Current</button>

  <div v-for="c in colors" :key="c.id">
    <span
      class="preview"
      :style="{ background: `rgb(${c.r},${c.g},${c.b})` }"
    />
    {{ c.label }}
    <button @click="apply(c)">Apply</button>
    <button @click="remove(c.id)">Delete</button>
  </div>
</template>

<style scoped>
.preview {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: inline-block;
}
</style>