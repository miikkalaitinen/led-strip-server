import axios, { AxiosResponse } from 'axios'
import type { Controller, LedState, SavedColor } from '@/types'

const client = axios.create({
  baseURL: '/api',
  timeout: 5000
})

export default {
  getControllers(): Promise<AxiosResponse<Controller[]>> {
    return client.get('/controllers')
  },

  getControllerStatus(id: string): Promise<AxiosResponse<LedState>> {
    return client.get(`/controllers/${id}/status`)
  },

  setControllerState(id: string, payload: LedState) {
    return client.post(`/controllers/${id}/set`, payload)
  },

  saveColor(id: string, payload: Omit<SavedColor, 'id'>) {
    return client.post(`/controllers/${id}/colors`, payload)
  },

  deleteColor(id: string, colorId: string) {
    return client.delete(`/controllers/${id}/colors/${colorId}`)
  },

  updateConfig(
    id: string,
    payload: { ui_name: string; ssid: string; pass: string }
  ) {
    return client.post(`/controllers/${id}/config`, payload)
  }
}