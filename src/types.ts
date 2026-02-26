export interface SavedColor {
  id: string
  label: string
  r: number
  g: number
  b: number
  w: number
  br: number
}

export interface Controller {
  id: string
  ui_name: string
  ip: string
  port: number
  savedColors: SavedColor[]
}

export interface LedState {
  on: boolean
  r: number
  g: number
  b: number
  w: number
  br: number
}