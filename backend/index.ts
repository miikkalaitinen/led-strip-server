import express, { Request, Response } from 'express'
import axios from 'axios'
import cors from 'cors'
import fs from 'fs-extra'
import * as path from 'path'
import morgan from 'morgan'
import { fileURLToPath } from 'url'
import { AppData, Controller, LedState, Preset, StoredController } from './types.js'

// --- Configuration & Setup ---
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const DATA_FILE = path.join(__dirname, 'data.json')
const DIST_PATH = path.join(__dirname, 'dist')
const PORT = process.env.PORT || 3000

const DEFAULT_DATA: AppData = {
  controllers: [],
  presets: {},
}

const getControllerId = (controller: StoredController): string =>
  `${controller.ip.replace(/\./g, '-')}-${controller.port}`

const toApiController = (controller: StoredController): Controller => ({
  id: getControllerId(controller),
  ip: controller.ip,
  port: controller.port,
})

const findControllerIndexById = (data: AppData, id: string): number =>
  data.controllers.findIndex((controller) => getControllerId(controller) === id)

const normalizeData = (rawData: unknown): AppData => {
  const raw = rawData as {
    controllers?: Array<{ id?: string; ip?: string; port?: number; ui_name?: string }>
    presets?: Record<string, Preset[]>
  }

  const controllers: StoredController[] = []
  const controllerIdMap = new Map<string, string>()

  for (const controller of raw.controllers ?? []) {
    if (!controller?.ip || typeof controller.port !== 'number') continue

    const normalized: StoredController = {
      ip: controller.ip,
      port: controller.port,
    }

    controllers.push(normalized)

    const newId = getControllerId(normalized)
    if (controller.id && controller.id !== newId) {
      controllerIdMap.set(controller.id, newId)
    }
  }

  const presets: Record<string, Preset[]> = {}
  const rawPresets = raw.presets ?? {}

  for (const [id, list] of Object.entries(rawPresets)) {
    const normalizedId = controllerIdMap.get(id) ?? id
    if (!presets[normalizedId]) {
      presets[normalizedId] = []
    }
    presets[normalizedId].push(...list)
  }

  return { controllers, presets }
}

// --- Middlewares ---
app.use(cors())
app.use(express.json())
app.use(morgan('dev'))

// --- Persistence Logic ---
const loadData = async (): Promise<AppData> => {
  try {
    const exists = await fs.pathExists(DATA_FILE)

    if (!exists) {
      console.log('data.json not found. Initializing with default structure...')
      await fs.writeJson(DATA_FILE, DEFAULT_DATA, { spaces: 2 })
      return DEFAULT_DATA
    }

    const data = await fs.readJson(DATA_FILE)
    const normalizedData = normalizeData(data)
    await saveData(normalizedData)
    return normalizedData
  } catch (err) {
    console.error('Error reading data.json, returning defaults:', err)
    return DEFAULT_DATA
  }
}

const saveData = async (data: AppData): Promise<void> => {
  await fs.writeJson(DATA_FILE, data, { spaces: 2 })
}

// --- API Routes ---

// Fetch everything for UI startup
app.get('/api/init', async (_req: Request, res: Response) => {
  const data = await loadData()
  res.json({
    controllers: data.controllers.map(toApiController),
    presets: data.presets,
  })
})

// Add/Update a Controller
app.post('/api/controllers', async (req: Request, res: Response) => {
  const { ip, port } = req.body as Partial<StoredController>

  if (!ip || typeof port !== 'number') {
    return res.status(400).json({ error: 'ip and port are required' })
  }

  const newController: StoredController = { ip, port }
  const data = await loadData()

  const index = data.controllers.findIndex(
    (c) => c.ip === newController.ip && c.port === newController.port,
  )
  if (index > -1) {
    data.controllers[index] = newController
  } else {
    data.controllers.push(newController)
  }

  await saveData(data)
  res.json({ success: true, controller: toApiController(newController) })
})

// Update a Controller by ID
app.put('/api/controllers/:controllerId', async (req: Request, res: Response) => {
  const { controllerId } = req.params as { controllerId: string }
  const { ip, port } = req.body as Partial<StoredController>

  if (!ip || typeof port !== 'number') {
    return res.status(400).json({ error: 'ip and port are required' })
  }

  const data = await loadData()
  const existingIndex = findControllerIndexById(data, controllerId)

  if (existingIndex === -1) {
    return res.status(404).json({ error: 'Controller not found' })
  }

  const updatedController: StoredController = { ip, port }
  const updatedId = getControllerId(updatedController)

  if (updatedId !== controllerId && findControllerIndexById(data, updatedId) !== -1) {
    return res.status(409).json({ error: 'Controller with same ip and port already exists' })
  }

  data.controllers[existingIndex] = updatedController

  if (updatedId !== controllerId && data.presets[controllerId]) {
    data.presets[updatedId] = data.presets[updatedId]
      ? [...data.presets[updatedId], ...data.presets[controllerId]]
      : data.presets[controllerId]
    delete data.presets[controllerId]
  }

  await saveData(data)
  res.json({ success: true, controller: toApiController(updatedController) })
})

// Delete a Controller by ID
app.delete('/api/controllers/:controllerId', async (req: Request, res: Response) => {
  const { controllerId } = req.params as { controllerId: string }
  const data = await loadData()
  const existingIndex = findControllerIndexById(data, controllerId)

  if (existingIndex === -1) {
    return res.status(404).json({ error: 'Controller not found' })
  }

  data.controllers.splice(existingIndex, 1)
  delete data.presets[controllerId]

  await saveData(data)
  res.json({ success: true })
})

// Proxy state change to ESP8266
app.post('/api/proxy/:controllerId/set', async (req: Request, res: Response) => {
  const { controllerId } = req.params
  const state: LedState = req.body

  const data = await loadData()
  const controller = data.controllers.find((c) => getControllerId(c) === controllerId)

  if (!controller) return res.status(404).send('Controller not found')

  try {
    const url = `http://${controller.ip}:${controller.port}/api/set`
    await axios.post(url, state, { timeout: 1500 })
    res.json({ success: true })
  } catch (err) {
    res.status(502).json({ error: `ESP8266 at ${controller.ip} is offline` })
  }
})

// Proxy status fetch from ESP8266
app.get('/api/proxy/:controllerId/status', async (req: Request, res: Response) => {
  const { controllerId } = req.params

  const data = await loadData()
  const controller = data.controllers.find((c) => getControllerId(c) === controllerId)

  if (!controller) return res.status(404).send('Controller not found')

  try {
    const url = `http://${controller.ip}:${controller.port}/api/status`
    const response = await axios.get(url, { timeout: 1500 })
    res.json(response.data)
  } catch {
    res.status(502).json({ error: `ESP8266 at ${controller.ip} is offline` })
  }
})

// Proxy config update to ESP8266
app.post('/api/proxy/:controllerId/config', async (req: Request, res: Response) => {
  const { controllerId } = req.params
  const config = req.body

  const data = await loadData()
  const controller = data.controllers.find((c) => getControllerId(c) === controllerId)

  if (!controller) return res.status(404).send('Controller not found')

  try {
    const url = `http://${controller.ip}:${controller.port}/api/config`
    const response = await axios.post(url, config, { timeout: 1500 })
    res.json(response.data)
  } catch {
    res.status(502).json({ error: `ESP8266 at ${controller.ip} is offline` })
  }
})

// Save a Preset
app.post('/api/presets/:controllerId', async (req: Request, res: Response) => {
  const { controllerId } = req.params as { controllerId: string }
  const { name, state } = req.body

  const data = await loadData()

  // TypeScript safety check: Ensure the controller key exists in the record
  if (!data.presets[controllerId]) {
    data.presets[controllerId] = []
  }

  const newPreset: Preset = { id: Date.now(), name, state }

  // Safe to push now as we ensured the array exists above
  data.presets[controllerId]!.push(newPreset)

  await saveData(data)
  res.json(newPreset)
})

// Delete a Preset
app.delete('/api/presets/:controllerId/:presetId', async (req: Request, res: Response) => {
  const { controllerId, presetId } = req.params as { controllerId: string; presetId: string }
  const data = await loadData()

  const controllerPresets = data.presets[controllerId]
  if (controllerPresets) {
    data.presets[controllerId] = controllerPresets.filter((p) => p.id !== Number(presetId))
    await saveData(data)
  }

  res.json({ success: true })
})

// --- Static Frontend Serving ---

// 1. Serve static files from the Vue build directory
app.use(express.static(DIST_PATH))

// 2. Catch-all fallback:
// - return 404 for unknown API routes
// - serve Vue index.html for all other routes (client-side routing)
app.use((req: Request, res: Response) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' })
  }

  res.sendFile(path.join(DIST_PATH, 'index.html'))
})

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Monolith Server running at http://localhost:${PORT}`)
  console.log(`📁 Serving UI from: ${DIST_PATH}`)
  console.log(`💾 Database file: ${DATA_FILE}`)
})
