FROM node:20-alpine

WORKDIR /app

# Copy package files and install production deps
COPY package*.json ./
RUN npm ci --production

# Copy repository files
COPY . .

WORKDIR /app/local-api

# Cloud Run expects the app to bind to PORT env var (default 8080)
ENV PORT 8080
EXPOSE 8080

CMD ["node", "server.js"]


