# stage 1: Dependencies
FROM node:22.20.0-alpine AS deps

WORKDIR /app

# copy package files
COPY package.json package-lock.json ./

# install dependencies
RUN npm ci --only=production --ignore-scripts && \
  cp -R node_modules /tmp/node_modules && \
  npm ci --ignore-scripts

# stage 2: Build
FROM node:22.20.0-alpine AS builder

WORKDIR /app

# copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# build the application
RUN npm run build

# stage 3: Production
FROM node:22.20.0-alpine AS runner

WORKDIR /app

# set NODE_ENV to production
ENV NODE_ENV=production

# create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
  adduser --system --uid 1001 nuxtjs

# copy production dependencies
COPY --from=deps /tmp/node_modules ./node_modules

# copy built application
COPY --from=builder --chown=nuxtjs:nodejs /app/.output ./.output
COPY --from=builder --chown=nuxtjs:nodejs /app/package.json ./package.json

# switch to non-root user
USER nuxtjs

# expose the port Nuxt runs on
EXPOSE 3000

# set the host to 0.0.0.0 to allow external connections
ENV HOST=0.0.0.0
ENV PORT=3000

# start the application
CMD ["node", ".output/server/index.mjs"]
