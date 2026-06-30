# Setup — coleta-flow-api

## Pré-requisitos

- Node.js 20+
- Docker e Docker Compose
- MySQL 8 (via Docker)
- Redis 7 (via Docker)

---

## Início rápido com Docker

```bash
# 1. Copiar variáveis de ambiente
cp .env.example .env

# 2. Subir MySQL e Redis
docker compose up -d mysql redis

# 3. Instalar dependências
npm install

# 4. Gerar cliente Prisma
npx prisma generate

# 5. Rodar migrations
npx prisma migrate dev

# 6. (Opcional) Popular banco com dados iniciais
npx prisma db seed

# 7. Iniciar em desenvolvimento
npm run start:dev
```

API disponível em: `http://localhost:3333`
Swagger UI em: `http://localhost:3333/docs`

---

## Subir tudo via Docker

```bash
docker compose up -d
```

Aguarda healthcheck de MySQL e Redis antes de iniciar a API.

---

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|---|---|---|
| `DATABASE_URL` | URL de conexão MySQL | `mysql://root:root@localhost:3306/coleta_flow` |
| `REDIS_HOST` | Host do Redis | `localhost` |
| `REDIS_PORT` | Porta do Redis | `6379` |
| `JWT_SECRET` | Segredo JWT (mínimo 32 chars em prod) | `change-me-...` |
| `JWT_EXPIRES_IN` | Expiração do token | `7d` |
| `APP_URL` | URL do monitor web | `http://localhost:3000` |
| `API_URL` | URL própria da API | `http://localhost:3333` |
| `MAPBOX_TOKEN` | Token Mapbox (cálculo de ETA) | `pk.eyJ1...` |
| `GEOFENCE_RADIUS_METERS` | Raio de geofence | `100` |
| `TRACKING_TOKEN_EXPIRES_IN_MINUTES` | TTL do token de tracking | `180` |
| `STORAGE_TYPE` | `local` ou `s3` | `local` |

---

## Scripts

```bash
npm run start:dev     # desenvolvimento com watch
npm run build         # compilar para produção
npm run start:prod    # iniciar build de produção

npm run test          # unit tests
npm run test:cov      # unit tests com cobertura (mín. 80%)
npm run test:e2e      # e2e tests (requer MySQL e Redis)
npm run test:watch    # unit tests em watch mode

npm run lint          # ESLint
npm run format        # Prettier

npx prisma studio     # GUI do banco de dados
npx prisma migrate dev --name <nome>  # criar nova migration
```

---

## Estrutura de pastas

```
src/
  common/           → guards, decorators, filters, utils, erros de domínio
  config/           → validação de env, Swagger, Redis, JWT
  database/         → PrismaService e PrismaModule
  modules/          → um módulo por domínio de negócio
    auth/
    donor-requests/ → CQRS completo (commands, queries, handlers, domain, infra)
    routes/         → CQRS + geofence
    tracking/       → WebSocket gateway + Redis service
    ...
  shared/           → SharedModule com providers comuns
prisma/
  schema.prisma     → schema completo
  migrations/       → histórico de migrations
test/
  factories/        → builders de objetos para testes
  mocks/            → mock do PrismaService para unit tests
  *.e2e-spec.ts     → testes de integração com banco real
```

---

## Testes

```bash
# Unit tests (mocks do Prisma)
npm run test

# E2E (banco real — requer Docker rodando)
docker compose up -d mysql redis
npm run test:e2e

# Cobertura mínima exigida: 80% (configurado no jest.config.ts)
npm run test:cov
```
