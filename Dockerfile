FROM golang:1.25.12-alpine3.23@sha256:cc985ef6f9c3bf9ece7488129c9abe0a150388ccdfa428d886fc709dca0b230a AS gosu-builder

ENV GOPROXY=https://goproxy.cn,direct \
    GOSUMDB=sum.golang.google.cn
ARG GOSU_COMMIT=6456aaa0f3c854d199d0f037f068eb97515b7513
RUN apk add --no-cache git \
    && git clone --depth 1 --branch 1.19 https://github.com/tianon/gosu.git /src/gosu \
    && test "$(git -C /src/gosu rev-parse HEAD)" = "${GOSU_COMMIT}"
WORKDIR /src/gosu
RUN CGO_ENABLED=0 go build -trimpath -ldflags "-s -w" -o /out/gosu .

FROM golang:1.25.12-alpine3.23@sha256:cc985ef6f9c3bf9ece7488129c9abe0a150388ccdfa428d886fc709dca0b230a AS storage-builder

ENV GOPROXY=https://goproxy.cn,direct \
    GOSUMDB=off
ARG SEAWEEDFS_COMMIT=1355c7a102194d6c461baf090eff50367b575afb
COPY deploy/seaweedfs-security-go.sum /tmp/seaweedfs-security-go.sum
COPY deploy/vendor/seaweedfs-4.29-build-source.tar.gz /tmp/seaweedfs-4.29-build-source.tar.gz
COPY deploy/vendor/seaweedfs-4.29-build-source.tar.gz.sha256 /tmp/seaweedfs-4.29-build-source.tar.gz.sha256
RUN cd /tmp \
    && sha256sum -c seaweedfs-4.29-build-source.tar.gz.sha256 \
    && mkdir -p /src/seaweedfs \
    && tar -xzf seaweedfs-4.29-build-source.tar.gz -C /src/seaweedfs
WORKDIR /src/seaweedfs
RUN cat /tmp/seaweedfs-security-go.sum >> go.sum \
    && go mod edit -dropreplace=github.com/apache/thrift \
    && go get github.com/apache/thrift@v0.23.0 golang.org/x/net@v0.55.0 \
    && cd weed \
    && CGO_ENABLED=0 go build -trimpath \
      -ldflags "-s -w -X github.com/seaweedfs/seaweedfs/weed/util/version.COMMIT=${SEAWEEDFS_COMMIT}-security-20260713" \
      -o /out/weed .

FROM mysql:9.7.0-oraclelinux9 AS db

USER root
RUN microdnf update --assumeyes \
    && microdnf clean all \
    && rm -rf /usr/bin/mysqlsh /usr/lib/mysqlsh /usr/local/lib/node_modules \
    /usr/local/bin/node /usr/local/bin/npm /usr/local/bin/npx \
    /usr/local/bin/corepack /usr/local/bin/pnpm /usr/local/bin/pnpx
COPY --from=gosu-builder /out/gosu /usr/local/bin/gosu

FROM alpine:3.23@sha256:fd791d74b68913cbb027c6546007b3f0d3bc45125f797758156952bc2d6daf40 AS storage

RUN apk upgrade --no-cache \
    && apk add --no-cache ca-certificates \
    && addgroup -g 1000 seaweed \
    && adduser -D -u 1000 -G seaweed seaweed \
    && mkdir -p /data \
    && chown -R seaweed:seaweed /data
COPY --from=storage-builder /out/weed /usr/local/bin/weed
USER 1000:1000
WORKDIR /data
EXPOSE 7333 8333 8888 9333 23646
ENTRYPOINT ["/usr/local/bin/weed"]
CMD ["mini", "-dir=/data"]

FROM registry.access.redhat.com/ubi9/ubi-minimal:9.7 AS node-base

USER root
ARG NODE_VERSION=24.18.0
RUN microdnf update --assumeyes \
    && microdnf install --assumeyes ca-certificates gzip openssl tar xz \
    && microdnf clean all \
    && cd /tmp \
    && curl --fail --silent --show-error --location --remote-name "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" \
    && curl --fail --silent --show-error --location --remote-name "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" \
    && grep " node-v${NODE_VERSION}-linux-x64.tar.xz$" SHASUMS256.txt | sha256sum --check - \
    && tar --extract --xz --file "node-v${NODE_VERSION}-linux-x64.tar.xz" --directory /usr/local --strip-components=1 \
    && rm "node-v${NODE_VERSION}-linux-x64.tar.xz" SHASUMS256.txt \
    && node --version \
    && npm install --global pnpm@11.8.0

ENTRYPOINT []

FROM node-base AS build
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json eslint.config.js ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN pnpm install --frozen-lockfile
COPY server server
COPY client client
RUN DATABASE_URL=mysql://build:build@127.0.0.1:3306/build pnpm --filter @xinmaowei/server prisma:generate \
    && pnpm build

FROM node-base AS api
ENV NODE_ENV=production
WORKDIR /workspace/server
COPY --from=build /workspace/package.json /workspace/pnpm-lock.yaml /workspace/pnpm-workspace.yaml /workspace/
COPY --from=build /workspace/node_modules /workspace/node_modules
COPY --from=build /workspace/server/package.json ./package.json
COPY --from=build /workspace/server/node_modules ./node_modules
COPY --from=build /workspace/server/dist ./dist
RUN rm -rf /usr/local/lib/node_modules \
    /usr/local/bin/corepack /usr/local/bin/npm /usr/local/bin/npx \
    /usr/local/bin/pnpm /usr/local/bin/pnpx
USER 65532:65532
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM nginx:1.30.3-alpine3.23 AS web
RUN apk upgrade --no-cache
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/client/dist /usr/share/nginx/html
EXPOSE 80
