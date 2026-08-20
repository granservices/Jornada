FROM node:24-alpine

WORKDIR /workspace

COPY package.json ./

CMD ["sh", "-c", "echo 'Use o docker-compose.yml da raiz ou o Dockerfile especifico de apps/api.'"]
