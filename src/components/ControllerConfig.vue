<script setup lang="ts">
import { ref, watch } from 'vue'
import api from '@/api/controllersApi'

const props = defineProps<{
  controllerId: string
  uiName: string
}>()

const ui_name = ref(props.uiName)
const ssid = ref('')
const pass = ref('')
const message = ref<string | null>(null)

watch(
  () => props.uiName,
  (newUiName) => {
    ui_name.value = newUiName
  },
)

async function save() {
  await api.updateConfig(props.controllerId, {
    ui_name: ui_name.value,
    ssid: ssid.value,
    pass: pass.value,
  })

  message.value = 'Saved. Device rebooting...'
}
</script>

<template>
  <div class="config-form">
    <h3>Controller Settings</h3>

    <input v-model="ui_name" placeholder="UI Name" />
    <input v-model="ssid" placeholder="SSID" />
    <input v-model="pass" type="password" placeholder="Password" />

    <button @click="save">Save</button>

    <p v-if="message" class="message">{{ message }}</p>
  </div>
</template>

<style scoped>
.config-form {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.5rem;
  border-radius: 16px;
  background: var(--surface-2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
  padding: 1rem;
}

h3 {
  margin: 0 0 0.5rem;
  font-size: 1.1rem;
  font-weight: 600;
}

.message {
  margin: 0.25rem 0 0;
  color: #32d74b;
  font-size: 0.95rem;
  font-weight: 500;
}
</style>
