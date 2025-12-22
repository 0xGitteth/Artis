# Build production assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve the built assets
FROM node:20-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
ENV PORT=4173
EXPOSE 4173
CMD ["sh", "-c", "serve -s dist -l ${PORT:-4173}"]
