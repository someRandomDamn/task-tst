FROM node:16-alpine AS builder
WORKDIR "/app"
COPY . .
RUN npm ci
RUN npm run build
# We run debug mode so console.log is visible in terminal
CMD [ "sh", "-c", "npm run start:debug"]

