FROM node:25-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

COPY backend/package*.json ./backend/
RUN npm install --prefix backend

COPY backend/ ./backend/

WORKDIR /app/backend
RUN npm run type-check || true
RUN npx tsc

FROM node:25-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY backend/package*.json ./backend/
RUN npm install --prefix backend --omit=dev

COPY --from=builder /app/backend/dist ./dist
RUN mv backend/node_modules ./node_modules && rm -rf backend

VOLUME ["/app/data"]

ENV PORT=3000
ENV DATA_FILE=/app/data/data.json

EXPOSE 3000

CMD ["node", "dist/index.js"]