<script setup lang="ts">
import type { Controller } from '@/types'
import ControllerCard from './ControllerCard.vue'

defineProps<{
  controllers: Controller[]
  loading: boolean
  error: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  openSettings: []
}>()
</script>

<template>
  <section class="panel">
    <div class="heading">
      <div class="heading-row">
        <h2>Controllers</h2>
        <button class="settings-btn" @click="emit('openSettings')">Settings</button>
      </div>
      <p>Tap a controller to open controls</p>
    </div>

    <div v-if="loading" class="state">Loading controllers...</div>
    <div v-if="error" class="state error">{{ error }}</div>

    <div class="grid">
      <ControllerCard
        v-for="c in controllers"
        :key="c.id"
        :controller="c"
        @open="emit('select', $event)"
      />
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.heading {
  margin-bottom: 0.5rem;
  padding: 0 0.5rem;
}

.heading-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
}

.settings-btn {
  min-height: 40px;
  padding: 0.25rem 1rem;
  font-size: 0.9rem;
  border-radius: 12px;
  background: var(--surface-2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--border);
}

p {
  margin: 0.25rem 0 0;
  color: var(--text-secondary);
  font-size: 1rem;
}

.state {
  margin-bottom: 1rem;
  color: var(--text-secondary);
  padding: 0 0.5rem;
}

.state.error {
  color: var(--danger);
}

.grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
</style>
