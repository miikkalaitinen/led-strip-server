import { defineStore } from 'pinia'
import api from '@/api/controllersApi'
import type { Controller } from '@/types'

interface ControllersState {
  controllers: Controller[]
  activeControllerId: string | null
  loading: boolean
  error: string | null
}

export const useControllersStore = defineStore('controllers', {
  state: (): ControllersState => ({
    controllers: [],
    activeControllerId: null,
    loading: false,
    error: null
  }),

  getters: {
    activeController: (state): Controller | undefined =>
      state.controllers.find(c => c.id === state.activeControllerId)
  },

  actions: {
    async fetchControllers() {
      this.loading = true
      try {
        const { data } = await api.getControllers()
        this.controllers = data
        this.error = null
      } catch {
        this.error = 'Failed to load controllers'
      } finally {
        this.loading = false
      }
    },

    selectController(id: string) {
      this.activeControllerId = id
    },

    goHome() {
      this.activeControllerId = null
    }
  }
})