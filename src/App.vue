<script setup lang="ts">
import { onMounted } from 'vue'
import { useControllersStore } from '@/stores/controllersStore'
import ControllersList from '@/components/ControllersList.vue'
import ControllerDetail from '@/components/ControllerDetail.vue'

const store = useControllersStore()

onMounted(() => {
  store.fetchControllers()
})
</script>

<template>
  <div class="app">
    <header>
      <h1 @click="store.goHome()">LED Strip Controller</h1>
      <button v-if="store.activeControllerId" @click="store.goHome()">
        ← Back
      </button>
    </header>

    <main>
      <ControllersList v-if="!store.activeControllerId" />
      <ControllerDetail v-else />
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, sans-serif;
  background: #121212;
  color: white;
}
header {
  padding: 1rem;
  background: #1e1e1e;
  display: flex;
  justify-content: space-between;
}
main {
  padding: 1rem;
}
</style>