# LED Strip Server

A sleek, dark-mode web application for controlling multiple RGBW LED strip controllers (ESP8266) over your local network. Inspired by the Philips Hue app aesthetic.

## Features

- **Multi-controller support** — manage multiple LED controllers by IP and port
- **Interactive color wheel** — HSV-based color picker with live preview
- **RGBW control** — adjust red, green, blue, white channels and brightness
- **Preset system** — save, apply, reorder, and delete favorite colors per controller
- **Responsive UI** — works on desktop and mobile with touch support
- **Docker-ready** — single-container deployment with persistent data volume

## Tech Stack

| Layer    | Technology                           |
| -------- | ------------------------------------ |
| Frontend | Vue 3, TypeScript, Vite              |
| Backend  | Node.js, Express 5, TypeScript       |
| Styling  | CSS with dark-mode tokens, blur FX   |
| Deploy   | Docker (multi-stage), GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+ (or 22+)
- npm

### Development

```bash
# Install dependencies (root + backend)
npm install
cd backend && npm install && cd ..

# Run frontend + backend concurrently
npm run dev:full
```

- Frontend dev server: `http://localhost:5173` (with HMR)
- Backend API: `http://localhost:3000`
- Vite proxies `/api/*` to the backend automatically

### Build for Production

```bash
npm run build
```

This compiles the Vue frontend into `backend/frontend/` and type-checks the project.

## Docker

### Build and Run Locally

```bash
docker build -t led-strip-server .
docker run -d -p 3000:3000 -v led-strip-data:/app/data led-strip-server
```

The app will be available at `http://localhost:3000`. Controller data and presets persist in the `/app/data` volume.

### Pre-built Image (GHCR)

```bash
docker pull ghcr.io/miikkalaitinen/led-strip-server:latest
docker run -d -p 3000:3000 -v led-strip-data:/app/data ghcr.io/miikkalaitinen/led-strip-server:latest
```

## CI/CD

A GitHub Actions workflow automatically builds and pushes a new Docker image to GHCR whenever a GitHub release is published. Tags follow semver (e.g. `v1.0.4` → `1.0.4`, `1.0`, `latest`).

## Environment Variables

| Variable    | Default               | Description                   |
| ----------- | --------------------- | ----------------------------- |
| `PORT`      | `3000`                | Server listen port            |
| `DATA_FILE` | `<app-dir>/data.json` | Path to persistent data       |
| `NODE_ENV`  | —                     | Set to `production` in Docker |

## API Overview

All endpoints are under `/api`.

### Controllers

| Method   | Endpoint               | Description                     |
| -------- | ---------------------- | ------------------------------- |
| `GET`    | `/api/init`            | Fetch all controllers & presets |
| `POST`   | `/api/controllers`     | Add a controller                |
| `PUT`    | `/api/controllers/:id` | Update a controller             |
| `DELETE` | `/api/controllers/:id` | Remove a controller             |

### Device Proxy (ESP8266)

| Method | Endpoint                | Description           |
| ------ | ----------------------- | --------------------- |
| `GET`  | `/api/proxy/:id/status` | Get current LED state |
| `POST` | `/api/proxy/:id/set`    | Set LED state         |
| `POST` | `/api/proxy/:id/config` | Update device config  |

### Presets

| Method   | Endpoint                     | Description     |
| -------- | ---------------------------- | --------------- |
| `POST`   | `/api/presets/:id`           | Save a preset   |
| `DELETE` | `/api/presets/:id/:presetId` | Delete a preset |
| `PUT`    | `/api/presets/:id/reorder`   | Reorder presets |

## Project Structure

```
├── src/                  # Vue 3 frontend
│   ├── components/       # UI components
│   ├── api/              # Axios API client
│   ├── stores/           # State management
│   └── assets/           # CSS
├── backend/              # Express backend
│   ├── index.ts          # Server + routes
│   └── types.ts          # Shared types
├── Dockerfile            # Full-stack multi-stage build
├── .github/workflows/    # CI/CD pipeline
└── package.json
```

## License

Private project.
