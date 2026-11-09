FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
ENV API_BASE_URL=https://api.tashkino.ir/api/v1
COPY deploy/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY deploy/15-runtime-config.sh /docker-entrypoint.d/15-runtime-config.sh
COPY --from=build /app/dist/toshakino-panel/browser /usr/share/nginx/html
EXPOSE 80
