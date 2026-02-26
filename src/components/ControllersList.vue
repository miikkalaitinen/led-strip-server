<script setup lang="ts">
import { useControllersStore } from '@/stores/controllersStore'
import ControllerCard from './ControllerCard.vue'

const store = useControllersStore()
</script>

<template>
  <div>
    <h2>Controllers</h2>

    <div v-if="store.loading">Loading...</div>
    <div v-if="store.error">{{ store.error }}</div>

    <div class="grid">
      <ControllerCard
        v-for="c in store.controllers"
        :key="c.id"
        :controller="c"
      />
    </div>
  </div>
</template>

<style scoped>
.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
}
</style>