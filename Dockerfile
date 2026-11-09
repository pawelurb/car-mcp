FROM node:24-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build


FROM node:24-bookworm-slim AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV DOTENV_CONFIG_QUIET=true

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist

COPY data/manual-chunks.json ./data/manual-chunks.json
COPY data/embeddings-index.json ./data/embeddings-index.json

USER node

EXPOSE 3000

CMD ["node", "dist/server-http.js"]