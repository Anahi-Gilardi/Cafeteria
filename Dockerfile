# ====================================================================
# RESTO BAR DEL TEATRO - DOCKERFILE ANTI-GRAVITY FRONTEND
# Multi-stage build con Nginx Alpine y aceleración por GPU CSS
# ====================================================================

# Stage 1: Build de Aplicación React/Vite
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Servidor Web Nginx de Producción
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Copiar archivos compilados del build
COPY --from=builder /app/dist .

# Copiar configuración Nginx optimizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
