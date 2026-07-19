FROM node:22-alpine

ARG VCS_REF=local

LABEL org.opencontainers.image.title="jenkins-cicd-pipeline" \
  org.opencontainers.image.description="Containerized Node.js service with Jenkins CI/CD validation" \
  org.opencontainers.image.revision="${VCS_REF}"

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev --ignore-scripts

COPY --chown=node:node src ./src

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "src/server.js"]
