# Build stage: install deps and compile the Vite app
FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_URL
ARG VITE_MAPY_API_KEY
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_MAPY_API_KEY=$VITE_MAPY_API_KEY
RUN npm run build

# Serve stage: ship prebuilt assets with nginx
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
