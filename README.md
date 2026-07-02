# ecologi-api

Backend da plataforma EcoLogi.

**Stack:** NestJS · TypeScript · MySQL 8 · Prisma · Redis · WebSocket (socket.io) · JWT · Swagger · Jest · Docker

---

## Quick start

```bash
# 1. Instalar dependências
yarn install

# 2. Variáveis de ambiente
cp .env.example .env
# Editar DATABASE_URL, JWT_SECRET, REDIS_HOST

# 3. Subir MySQL e Redis
docker-compose up -d mysql redis

# 4. Aplicar schema no banco
yarn db:push          # prisma db push (dev)
# ou em produção:
yarn db:migrate:prod  # prisma migrate deploy

# 5. Criar usuários iniciais
yarn db:seed

# 6. Rodar em desenvolvimento
yarn start:dev
```

API disponível em: `http://localhost:3333`
Swagger UI em: `http://localhost:3333/docs`

---

## Usuários de teste (seed)

| E-mail | Senha | Role |
|---|---|---|
| `cordeiro@adm.com` | `123456` | ADMIN |
| `cordeiro@empresa.com` | `123456` | OPERATOR |
| `cordeiro@motorista.com` | `123456` | DRIVER |

---

## Docker

```bash
# Apenas MySQL e Redis (desenvolvimento local)
docker-compose up -d mysql redis

# Todos os serviços (API + MySQL + Redis)
docker-compose up -d
```

**Nota macOS ARM64:** Docker Desktop às vezes não faz bind de porta do MySQL para o host. Solução:
```bash
docker network connect ecologi-api_default ecologi-mysql
# Então rodar prisma de um container na mesma rede
```

---

## Banco de dados

```bash
yarn db:push        # aplica schema sem gerar migration (dev)
yarn db:generate    # gera Prisma Client após alterar schema
yarn db:seed        # popula banco com dados iniciais
yarn db:studio      # Prisma Studio (interface visual)
```

O schema usa `prismaSchemaFolder` (preview feature) — arquivos separados em `prisma/schema/`.

---

## Testes

```bash
yarn test           # todos os testes unitários
yarn test:watch     # watch mode
yarn test:cov       # com coverage
yarn test:e2e       # testes E2E
```

---

## Arquitetura — Módulos

```
AuthModule              → JWT, Passport, guards globais, @Public() decorator
UsersModule             → usuários, RBAC (roles: ADMIN, OPERATOR, DRIVER, COLLECTION_POINT_OPERATOR)
DonorRequestsModule     → ciclo de vida das solicitações de coleta
CollectionPointsModule  → pontos de coleta cadastrados
RoutesModule            → rotas, atribuição de motoristas, confirmações de status
TrackingModule          → WebSocket gateway + Redis para localização em tempo real
WeightsModule           → registro de peso no ponto de coleta
DeclarationsModule      → geração de declaração PDF
```

---

## Fluxo de tracking em tempo real

```
App (4s) ──POST /routes/:id/location──→ RoutesService.sendLocation()
                                               │
                               ┌───────────────┴──────────────────┐
                               ▼                                  ▼
                    Redis.setex(driver:{driverId}:location)   Redis.setex(route:{routeId}:live-location)
                               │
                               ▼
                    TrackingGateway.emit('tracking:update')
                               │
                    WebSocket room: route:{routeId}
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
               Monitor               /public/tracking/:token
```

**Chaves Redis:**
- `driver:{driverId}:location` — TTL 5 min, última posição do motorista
- `route:{routeId}:live-location` — TTL 5 min, posição ligada à rota
- `tracking:{token}:session` — TTL configurável, token público de rastreamento

---

## WebSocket

**Namespace:** `/tracking`

**Eventos do cliente para o servidor:**
- `tracking:subscribe` `{ routeId }` — entra na sala da rota
- `tracking:unsubscribe` `{ routeId }` — sai da sala
- `driver:location:update` `{ routeId, driverId, lat, lng, ... }` — motorista envia localização (requer JWT)

**Eventos do servidor para o cliente:**
- `tracking:update` `{ routeId, driverId, lat, lng, speed, heading, battery, updatedAt }` — nova posição do motorista
- `route:status:changed` `{ routeId, status }` — mudança de status da rota

---

## Roles

| Role | Permissões |
|---|---|
| `ADMIN` | Acesso total |
| `OPERATOR` | Solicitações, rotas, pontos, declarações |
| `DRIVER` | Apenas rotas atribuídas a ele |
| `COLLECTION_POINT_OPERATOR` | Confirmação de recebimento e pesagem |

---

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string MySQL |
| `REDIS_HOST` | ✅ | Host do Redis (default: localhost) |
| `REDIS_PORT` | ✅ | Porta do Redis (default: 6379) |
| `JWT_SECRET` | ✅ | Chave secreta JWT |
| `JWT_EXPIRES_IN` | opcional | Expiração do JWT (default: 7d) |
| `APP_URL` | ✅ | URL do monitor (CORS e links de tracking) |
| `GEOFENCE_RADIUS_METERS` | opcional | Raio de geofence em metros (default: 100) |
| `TRACKING_TOKEN_EXPIRES_IN_MINUTES` | opcional | TTL do token de tracking (default: 180) |

---

## Endpoints principais

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/auth/login` | Autenticação, retorna JWT |
| `GET` | `/auth/me` | Usuário autenticado atual |
| `GET` | `/donor-requests` | Lista solicitações de coleta |
| `POST` | `/donor-requests/public` | Cria solicitação pública (sem auth) |
| `GET` | `/routes` | Lista rotas |
| `GET` | `/routes/assigned` | Rotas atribuídas ao motorista logado |
| `POST` | `/routes/:id/start` | Inicia rota, gera tracking token |
| `POST` | `/routes/:id/location` | Envia localização GPS (motorista) |
| `PATCH` | `/routes/:id/stops/:stopId/arrive` | Confirma chegada no doador |
| `GET` | `/public/tracking/:token` | Estado da rota via token público |
| `GET` | `/collection-points` | Pontos de coleta disponíveis |

Documentação completa em `/docs` (Swagger).
