export interface LedState {
  on: boolean
  r: number
  g: number
  b: number
  w: number
  br: number
}

export interface Controller {
  id: string
  ip: string
  port: number
  ui_name: string
}

export interface Preset {
  id: number
  name: string
  state: LedState
}

export interface AppData {
  controllers: Controller[]
  presets: Record<string, Preset[]> // Keyed by controllerId
}
