<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import api from '@/api/controllersApi'
import type { Controller, Preset } from '@/types'
import ControllersList from '@/components/ControllersList.vue'
import ControllerDetail from '@/components/ControllerDetail.vue'
import ControllerSettingsPage from '@/components/ControllerSettingsPage.vue'

const controllers = ref<Controller[]>([])
const presets = ref<Record<string, Preset[]>>({})
const activeControllerId = ref<string | null>(null)
const currentView = ref<'home' | 'detail' | 'settings'>('home')
const loading = ref(false)
const error = ref<string | null>(null)

const activeController = computed(() =>
  controllers.value.find((controller) => controller.id === activeControllerId.value),
)

async function fetchInitData() {
  loading.value = true
  error.value = null

  try {
    const { data } = await api.getInitData()
    controllers.value = data.controllers
    presets.value = data.presets
  } catch {
    error.value = 'Failed to load controllers'
  } finally {
    loading.value = false
  }
}

function goHome() {
  activeControllerId.value = null
  currentView.value = 'home'
}

function selectController(id: string) {
  activeControllerId.value = id
  currentView.value = 'detail'
}

function openSettings() {
  activeControllerId.value = null
  currentView.value = 'settings'
}

async function addController(payload: { ip: string; port: number }) {
  try {
    await api.saveController(payload)
    await fetchInitData()
  } catch {
    error.value = 'Failed to save controller'
  }
}

async function updateController(payload: { id: string; ip: string; port: number }) {
  try {
    await api.updateController(payload.id, {
      ip: payload.ip,
      port: payload.port,
    })
    await fetchInitData()
  } catch {
    error.value = 'Failed to update controller'
  }
}

async function deleteController(id: string) {
  try {
    await api.deleteController(id)
    await fetchInitData()
  } catch {
    error.value = 'Failed to delete controller'
  }
}

onMounted(() => {
  fetchInitData()
})
</script>

<template>
  <div class="app">
    <main class="app-main">
      <ControllersList
        v-if="currentView === 'home'"
        :controllers="controllers"
        :loading="loading"
        :error="error"
        @select="selectController"
        @open-settings="openSettings"
      />
      <ControllerDetail
        v-else-if="currentView === 'detail' && activeController"
        :controller="activeController"
        :presets="presets[activeController.id] ?? []"
        @presets-changed="fetchInitData"
        @back="goHome"
      />
      <ControllerSettingsPage
        v-else-if="currentView === 'settings'"
        :controllers="controllers"
        :loading="loading"
        :error="error"
        @add-controller="addController"
        @update-controller="updateController"
        @delete-controller="deleteController"
        @refresh="fetchInitData"
        @back="goHome"
      />
    </main>
  </div>
</template>

<style>
@import '../node_modules/@fontsource/roboto/index.css';

.app {
  min-height: 100vh;
}

.app-main {
  margin-top: 0;
}
</style>
