FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json ./
COPY prisma ./prisma/

RUN yarn install

COPY . .

RUN npx prisma generate
RUN yarn build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3333

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
