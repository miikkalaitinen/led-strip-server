import { Request, Response } from 'express'
import * as express from 'express'
import axios from 'axios'
import * as cors from 'cors'
import * as fs from 'fs-extra'
import * as path from 'path'
import * as morgan from 'morgan'
import { fileURLToPath } from 'url'
import { AppData, Controller, LedState, Preset } from './types.js'

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
    return data
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
  res.json(data)
})

// Add/Update a Controller
app.post('/api/controllers', async (req: Request, res: Response) => {
  const newController: Controller = req.body
  const data = await loadData()

  const index = data.controllers.findIndex((c) => c.id === newController.id)
  if (index > -1) {
    data.controllers[index] = newController
  } else {
    data.controllers.push(newController)
  }

  await saveData(data)
  res.json({ success: true })
})

// Proxy state change to ESP8266
app.post('/api/proxy/:controllerId/set', async (req: Request, res: Response) => {
  const { controllerId } = req.params
  const state: LedState = req.body

  const data = await loadData()
  const controller = data.controllers.find((c) => c.id === controllerId)

  if (!controller) return res.status(404).send('Controller not found')

  try {
    const url = `http://${controller.ip}:${controller.port}/api/set`
    await axios.post(url, state, { timeout: 1500 })
    res.json({ success: true })
  } catch (err) {
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

// 2. Catch-all route: Redirect all non-API requests to the Vue index.html
// This allows Vue Router to handle sub-pages (client-side routing)
app.get('*', (req: Request, res: Response) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(DIST_PATH, 'index.html'))
  }
})

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`🚀 Monolith Server running at http://localhost:${PORT}`)
  console.log(`📁 Serving UI from: ${DIST_PATH}`)
  console.log(`💾 Database file: ${DATA_FILE}`)
})
