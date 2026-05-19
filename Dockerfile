FROM node:20-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/extension/package.json apps/extension/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=http://187.77.138.174
ARG VITE_WEB_LOGIN_URL=http://187.77.138.174
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WEB_LOGIN_URL=$VITE_WEB_LOGIN_URL
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS api
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/package.json ./apps/api/package.json
COPY --from=deps /app/apps/api/dist ./apps/api/dist
COPY --from=deps /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=deps /app/packages/shared/dist ./packages/shared/dist
COPY --from=deps /app/prisma ./prisma

EXPOSE 4000
CMD ["npm", "run", "start"]

FROM nginx:1.27-alpine AS web
COPY --from=deps /app/apps/web/dist /usr/share/nginx/html
COPY deploy/nginx-web.conf /etc/nginx/conf.d/default.conf
