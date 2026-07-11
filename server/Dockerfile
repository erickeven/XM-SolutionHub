FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl wget python3 make g++ && npm install -g pnpm@9

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY server/package.json server/tsconfig.json ./server/
RUN pnpm install --frozen-lockfile

COPY server/prisma ./server/prisma
COPY server/src ./server/src
RUN pnpm --filter @xm-solutionhub/server prisma:generate
RUN pnpm --filter @xm-solutionhub/server build

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=30s \
  CMD wget --spider -q http://localhost:3001/api/v1/health || exit 1

CMD ["node", "server/dist/index.js"]
