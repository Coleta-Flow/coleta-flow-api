FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json yarn.lock ./
COPY prisma ./prisma/

RUN yarn install --frozen-lockfile

COPY . .

RUN npx prisma generate
RUN yarn build

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json yarn.lock ./

RUN mkdir -p uploads

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
