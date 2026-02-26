<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { debounce } from 'lodash-es'
import { useControllersStore } from '@/stores/controllersStore'
import api from '@/api/controllersApi'
import type { LedState } from '@/types'
import SavedColors from './SavedColors.vue'
import ControllerConfig from './ControllerConfig.vue'

const store = useControllersStore()
const controller = computed(() => store.activeController)
const id = computed(() => controller.value?.id ?? '')

const state = ref<LedState | null>(null)
const error = ref<string | null>(null)

onMounted(async () => {
  if (!id.value) return
  try {
    const { data } = await api.getControllerStatus(id.value)
    state.value = data
  } catch {
    error.value = 'Device offline'
  }
})

const sendUpdate = debounce(async () => {
  if (!state.value) return
  await api.setControllerState(id.value, state.value)
}, 150)

watch(state, sendUpdate, { deep: true })
</script>

<template>
  <div v-if="state">
    <h2>{{ controller?.ui_name }}</h2>

    <label>
      Power
      <input type="checkbox" v-model="state.on" />
    </label>

    <div v-for="color in ['r','g','b','w']" :key="color">
      <label>{{ color.toUpperCase() }}</label>
      <input
        type="range"
        min="0"
        max="255"
        v-model="state[color]"
      />
    </div>

    <div>
      <label>Brightness</label>
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        v-model="state.br"
      />
    </div>

    <SavedColors
      :controllerId="id"
      :currentState="state"
    />

    <ControllerConfig :controllerId="id" />
  </div>

  <div v-else>{{ error }}</div>
</template>