# stage 1: Dependencies
# Pin specific image version for reproducibility
FROM node:24-alpine AS deps

WORKDIR /app

# copy package files
COPY package.json package-lock.json ./

# install dependencies
RUN npm install

# stage 2: Build
FROM node:24-alpine AS builder

WORKDIR /app

# copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build the application
RUN npm run build

# stage 3: Production
FROM node:24-alpine AS runner

WORKDIR /app

# set NODE_ENV to production
ENV NODE_ENV=production

# create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nuxtjs

# copy production dependencies
COPY --from=deps /app/node_modules ./node_modules

# copy built application
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output
COPY --from=builder --chown=nuxtjs:nodejs /app/package.json ./package.json

# switch to non-root user
USER nuxtjs

# expose the port Nuxt runs on
EXPOSE 3000

# healthcheck for container orchestration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# set the host to 0.0.0.0 to allow external connections
ENV HOST=0.0.0.0
ENV PORT=3000

# start the application
CMD ["node", ".output/server/index.mjs"]
