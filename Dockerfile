# Build the frontend
FROM node:25-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Build the backend
FROM node:25-alpine AS backend-builder
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ ./
RUN npx tsc

# Production image
FROM node:25-alpine
WORKDIR /app

# Copy backend package files and install production dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Copy built backend files
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend files to the backend's dist folder so it can serve them
COPY --from=frontend-builder /app/dist ./dist/dist

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
