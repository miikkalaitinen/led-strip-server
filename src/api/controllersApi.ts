import axios, { AxiosResponse } from 'axios'
import type { DeviceStatus, InitResponse, LedState } from '@/types'

const client = axios.create({
  baseURL: '/api',
  timeout: 5000,
})

export default {
  getInitData(): Promise<AxiosResponse<InitResponse>> {
    return client.get('/init')
  },

  saveController(payload: { ip: string; port: number }) {
    return client.post('/controllers', payload)
  },

  updateController(id: string, payload: { ip: string; port: number }) {
    return client.put(`/controllers/${id}`, payload)
  },

  deleteController(id: string) {
    return client.delete(`/controllers/${id}`)
  },

  getControllerStatus(id: string): Promise<AxiosResponse<DeviceStatus>> {
    return client.get(`/proxy/${id}/status`)
  },

  setControllerState(id: string, payload: LedState) {
    return client.post(`/proxy/${id}/set`, payload)
  },

  savePreset(id: string, payload: { name: string; state: LedState }) {
    return client.post(`/presets/${id}`, payload)
  },

  deletePreset(id: string, presetId: number) {
    return client.delete(`/presets/${id}/${presetId}`)
  },

  updateConfig(id: string, payload: { ui_name: string; ssid: string; pass: string }) {
    return client.post(`/proxy/${id}/config`, payload)
  },
}
