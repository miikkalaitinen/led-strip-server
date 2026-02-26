<script setup lang="ts">
import { ref } from 'vue'
import api from '@/api/controllersApi'

const props = defineProps<{
  controllerId: string
}>()

const ui_name = ref('')
const ssid = ref('')
const pass = ref('')
const message = ref<string | null>(null)

async function save() {
  await api.updateConfig(props.controllerId, {
    ui_name: ui_name.value,
    ssid: ssid.value,
    pass: pass.value
  })

  message.value = 'Saved. Device rebooting...'
}
</script>

<template>
  <h3>Controller Settings</h3>

  <input v-model="ui_name" placeholder="UI Name" />
  <input v-model="ssid" placeholder="SSID" />
  <input v-model="pass" type="password" placeholder="Password" />

  <button @click="save">Save</button>

  <p v-if="message">{{ message }}</p>
</template>