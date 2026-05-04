# STAGE 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build-only

# STAGE 2: Build Backend
FROM node:20-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npx tsc

# STAGE 3: Production
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY backend/package*.json ./
RUN npm install --omit=dev

COPY --from=backend-builder /app/dist ./dist
COPY --from=frontend-builder /app/backend/frontend ./dist/frontend

VOLUME ["/app/data"]

ENV PORT=3000
ENV DATA_FILE=/app/data/data.json

EXPOSE 3000
CMD ["node", "dist/index.js"]
