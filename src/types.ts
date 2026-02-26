export interface Controller {
  id: string
  ip: string
  port: number
}

export interface LedState {
  on: boolean
  r: number
  g: number
  b: number
  w: number
  br: number
}

export interface DeviceStatus extends LedState {
  ui_name: string
}

export interface Preset {
  id: number
  name: string
  state: LedState
}

export interface InitResponse {
  controllers: Controller[]
  presets: Record<string, Preset[]>
}
