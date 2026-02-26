# STAGE 1: Build the Backend
FROM node:25-alpine AS builder

WORKDIR /app

# Install all dependencies
COPY package*.json ./
RUN npm install

# Copy everything (including your manual frontend folder)
COPY . .

# Run compiler
RUN npx tsc

# STAGE 2: Production
FROM node:25-alpine

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled backend code (Fixed Path)
COPY --from=builder /app/dist ./dist

# Copy the manually built frontend assets (Fixed Path)
COPY --from=builder /app/frontend ./dist/frontend

# Persistent data for Unraid
VOLUME ["/app/data"]

ENV PORT=3000
ENV DATA_FILE=/app/data/data.json

EXPOSE 3000

CMD ["node", "dist/index.js"]