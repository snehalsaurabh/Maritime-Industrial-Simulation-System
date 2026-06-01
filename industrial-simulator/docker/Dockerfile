FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY config ./config
USER node
EXPOSE 5020 8088
CMD ["node", "dist/cli/index.js", "--config", "config/examples/modbus-devices.yaml"]
