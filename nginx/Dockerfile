FROM node:20-alpine AS builder

RUN npm install -g pnpm@9
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY client/package.json client/tsconfig.json client/vite.config.ts client/tailwind.config.ts client/postcss.config.cjs ./client/
COPY client/index.html ./client/
RUN pnpm install --frozen-lockfile

COPY client/src ./client/src
RUN pnpm --filter @xm-solutionhub/client build

FROM nginx:alpine
COPY --from=builder /app/client/dist /usr/share/nginx/html
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
