FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Install dependencies
RUN npm install --prefix backend

# Copy source code
COPY backend/ ./backend/

# Build TypeScript code
WORKDIR /app/backend
RUN npm run type-check || true
RUN npx tsc

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies only
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy built files from builder
COPY --from=builder /app/backend/dist ./dist
COPY --from=builder /app/backend/package.json ./

# Create a volume for persistent data
VOLUME ["/app/data"]

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_FILE=/app/data/data.json

# Expose the port
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
