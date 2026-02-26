<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useControllersStore } from '@/stores/controllersStore'
import api from '@/api/controllersApi'
import type { Controller, LedState } from '@/types'

const props = defineProps<{
  controller: Controller
}>()

const store = useControllersStore()

const status = ref<LedState | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  try {
    const { data } = await api.getControllerStatus(props.controller.id)
    status.value = data
  } catch {
    error.value = 'Offline'
  }
})

function open() {
  store.selectController(props.controller.id)
}
</script>

<template>
  <div class="card" @click="open">
    <h3>{{ controller.ui_name }}</h3>

    <div v-if="status">
      <div
        class="preview"
        :style="{ background: `rgb(${status.r},${status.g},${status.b})` }"
      />
      <p>Brightness: {{ Math.round(status.br * 100) }}%</p>
      <p>{{ status.on ? 'ON' : 'OFF' }}</p>
    </div>

    <div v-else-if="error" class="offline">
      ⚠ {{ error }}
    </div>
  </div>
</template>

<style scoped>
.card {
  padding: 1rem;
  background: #1e1e1e;
  border-radius: 8px;
  cursor: pointer;
}
.preview {
  width: 40px;
  height: 40px;
  border-radius: 50%;
}
.offline {
  color: red;
}
</style>