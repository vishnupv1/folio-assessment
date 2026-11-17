FROM node:22-bookworm-slim

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV COOKIE_SECURE=true

EXPOSE 3000

CMD ["sh", "-c", "npx next start -H 0.0.0.0 -p ${PORT:-3000}"]
