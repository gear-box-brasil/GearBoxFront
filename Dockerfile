# ---------- Build stage ----------
FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM nginx:stable-alpine AS runner

ENV PORT=80

# Remove a config padrão para usar o template com envsubst
RUN rm /etc/nginx/conf.d/default.conf

# Config simples de SPA (processada pelo entrypoint via envsubst)
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Copia a build do Vite
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
