FROM node:24-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/neo/package.json ./apps/neo/package.json

RUN npm ci --ignore-scripts

COPY apps/neo ./apps/neo

ARG VITE_API_BASE_URL=/api
ARG VITE_REALTIME_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_REALTIME_BASE_URL=$VITE_REALTIME_BASE_URL

RUN npm run build --workspace @neo/neo

FROM nginx:1.27-alpine AS runner

COPY apps/neo/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/neo/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
