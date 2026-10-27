# Etapa 1: Construcción y dependencias
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias necesarias para compilación en Alpine
RUN apk add --no-cache libc6-compat

# Copiar archivos de paquetes e instalar dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Copiar el código fuente del proyecto
COPY . .

# Variable de entorno pública para Mapbox durante el build (leída de .env.local o build-arg)
ARG NEXT_PUBLIC_MAPBOX_TOKEN=""
ENV NEXT_PUBLIC_MAPBOX_TOKEN=${NEXT_PUBLIC_MAPBOX_TOKEN}
ENV NEXT_TELEMETRY_DISABLED=1

# Compilar la aplicación de producción
RUN npm run build

# Etapa 2: Ejecución ligera en producción
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copiar artefactos compilados desde la etapa builder
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000

CMD ["npm", "run", "start"]
