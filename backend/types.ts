export interface LedState {
  on: boolean
  r: number
  g: number
  b: number
  w: number
  br: number
}

export interface StoredController {
  ip: string
  port: number
}

export interface Controller {
  id: string
  ip: string
  port: number
}

export interface Preset {
  id: number
  name: string
  state: LedState
}

export interface AppData {
  controllers: StoredController[]
  presets: Record<string, Preset[]> // Keyed by controllerId
}
