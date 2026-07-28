# Leaderboard API: Node + Fastify + better-sqlite3, run straight from TS via tsx.
# Debian slim (not alpine) so better-sqlite3 uses its glibc prebuild — no native
# toolchain needed in the image.

FROM node:20-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund
COPY tsconfig.json ./
COPY src ./src
# tsx is a runtime dep here so `npm start` works without a build step.
RUN npm install tsx@^4.19.2 --no-audit --no-fund
ENV PORT=3001
ENV DB_PATH=/data/leaderboard.db
VOLUME ["/data"]
EXPOSE 3001
CMD ["npm", "start"]
