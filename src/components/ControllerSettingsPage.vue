<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Controller } from '@/types'

const props = defineProps<{
  controllers: Controller[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  addController: [payload: { ip: string; port: number }]
  updateController: [payload: { id: string; ip: string; port: number }]
  deleteController: [id: string]
  refresh: []
  back: []
}>()

const rows = ref<Controller[]>([])
const newIp = ref('')
const newPort = ref(80)

watch(
  () => props.controllers,
  (controllers) => {
    rows.value = controllers.map((controller) => ({ ...controller }))
  },
  { immediate: true, deep: true },
)

function addController() {
  if (!newIp.value.trim()) return

  emit('addController', {
    ip: newIp.value.trim(),
    port: Number(newPort.value),
  })

  newIp.value = ''
  newPort.value = 80
}

function saveRow(controller: Controller) {
  emit('updateController', {
    id: controller.id,
    ip: controller.ip.trim(),
    port: Number(controller.port),
  })
}

function removeRow(id: string) {
  emit('deleteController', id)
}
</script>

<template>
  <section class="settings-panel">
    <div class="heading-row">
      <button class="back-btn" @click="emit('back')">Back</button>
    </div>

    <h2>Controller Settings</h2>
    <p class="subtitle">Manage controller IP addresses and ports</p>

    <div class="toolbar card">
      <input v-model="newIp" placeholder="Controller IP" />
      <input v-model.number="newPort" type="number" min="1" max="65535" placeholder="Port" />
      <button @click="addController">Add</button>
      <button @click="emit('refresh')">Refresh</button>
    </div>

    <div v-if="loading" class="state">Loading...</div>
    <div v-if="error" class="state error">{{ error }}</div>

    <div v-for="controller in rows" :key="controller.id" class="row card">
      <input v-model="controller.ip" placeholder="IP" />
      <input
        v-model.number="controller.port"
        type="number"
        min="1"
        max="65535"
        placeholder="Port"
      />
      <button class="save" @click="saveRow(controller)">Save</button>
      <button class="delete" @click="removeRow(controller.id)">Delete</button>
    </div>
  </section>
</template>

<style scoped>
.settings-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.heading-row {
  display: flex;
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
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

h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  padding: 0 0.5rem;
}

.subtitle {
  margin: 0.25rem 0 0.5rem;
  color: var(--text-secondary);
  font-size: 1rem;
  padding: 0 0.5rem;
}

.card {
  border-radius: 20px;
  background: var(--surface-1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 1.25rem;
}

.toolbar,
.row {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: 1fr 0.65fr auto auto;
  margin-bottom: 1rem;
}

.row {
  margin-bottom: 1rem;
}

.state {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  padding: 0 0.5rem;
}

.state.error {
  color: var(--danger);
}

.save {
  background: var(--surface-3);
}

.save:active {
  background: var(--surface-2);
}

.delete {
  background: rgba(255, 69, 58, 0.15);
  color: #ff453a;
}

.delete:active {
  background: rgba(255, 69, 58, 0.25);
}

@media (max-width: 640px) {
  .toolbar,
  .row {
    grid-template-columns: 1fr 1fr;
  }

  .toolbar button,
  .row button {
    grid-column: span 1;
  }
}
</style>
