FROM oven/bun:1.4.4-debian AS bun

FROM maven:3.9.12-eclipse-temurin-21-noble AS parser
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /build
COPY apps/api/scripts/setup-replay.ts apps/api/scripts/setup-replay.ts
COPY apps/api/replay-parser apps/api/replay-parser
RUN bun apps/api/scripts/setup-replay.ts --system-java --output /opt/replay-parser

FROM eclipse-temurin:21-jre-noble AS runtime
COPY --from=bun /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /app
COPY package.json bun.lock ./
COPY patches ./patches
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN bun install --frozen-lockfile --production
COPY apps/api ./apps/api
COPY shared ./shared
COPY tsconfig.json ./tsconfig.json
RUN bun run --cwd apps/api build
COPY --from=parser /opt/replay-parser/parser.jar /opt/replay-parser/parser.jar
COPY --from=parser /opt/replay-parser/LICENSE /opt/replay-parser/LICENSE
ENV REPLAY_PARSER_JAR=/opt/replay-parser/parser.jar
ENV REPLAY_JAVA_BIN=/opt/java/openjdk/bin/java
ENV DATA_DIR=/app/.data
RUN useradd --create-home --uid 10001 tito && mkdir -p /app/.data && chown 10001:10001 /app/.data
USER 10001:10001
EXPOSE 3001
CMD ["bun", "run", "start"]
