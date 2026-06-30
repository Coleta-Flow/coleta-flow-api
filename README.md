# coleta-flow-api

Backend da plataforma ColetaFlow.

**Stack:** NestJS · TypeScript · MySQL · Prisma · Redis · WebSocket · JWT · CQRS · Swagger · Jest · Docker

---

## Quick start

```bash
# 1. Instalar dependências
npm install

# 2. Configurar variáveis de ambiente
cp .env.example .env
# Editar DATABASE_URL, JWT_SECRET, MAPBOX_TOKEN

# 3. Subir MySQL e Redis
docker-compose up -d mysql redis

# 4. Rodar migrations
npx prisma migrate dev --name init

# 5. (Opcional) Popular banco com dados iniciais
npm run db:seed

# 6. Rodar em desenvolvimento
npm run start:dev
```

API disponível em: `http://localhost:3333`
Swagger UI em: `http://localhost:3333/docs`

---

## Docker (todos os serviços)

```bash
docker-compose up -d
```

Sobe: MySQL (3306) + Redis (6379) + API (3333)

---

## Banco de dados

```bash
# Criar migration após alterar schema.prisma
npx prisma migrate dev --name nome-da-migration

# Aplicar migrations em produção
npm run db:migrate:prod

# Abrir Prisma Studio (interface visual do banco)
npm run db:studio

# Gerar Prisma Client após alterar schema
npm run db:generate
```

---

## Testes

```bash
# Rodar todos os testes unitários
npm test

# Watch mode
npm run test:watch

# Com coverage
npm run test:cov

# Testes E2E (requer banco de teste rodando)
npm run test:e2e
```

**Meta de cobertura:**
- 80% geral
- 90% em regras críticas (multi-tenant, geofence, status, declarações)

---

## Lint e qualidade

```bash
npm run lint          # ESLint + auto-fix
npm run format        # Prettier
```

---

## Arquitetura

### Módulos principais

```
AuthModule              → JWT, Passport, guards globais
TenantsModule           → gerenciamento de organizações (SUPER_ADMIN)
UsersModule             → usuários e perfis RBAC
DonorRequestsModule     → CQRS — ciclo de vida das solicitações
CollectionPointsModule  → pontos de coleta cadastrados
RoutesModule            → rotas, atribuição de motoristas, geofence
TrackingModule          → WebSocket + Redis para localização em tempo real
WeightsModule           → registro de peso real
DeclarationsModule      → geração de PDF de declaração
FilesModule             → upload e storage de arquivos
ReportsModule           → dashboard e métricas
EventStoreModule        → event store de negócio (global)
```

### Padrão CQRS

```
Controller → DTO → CommandBus/QueryBus → Handler → Domain Service → Repository → Prisma
                                                  ↘ EventStore
                                                  ↘ Redis
                                                  ↘ WebSocket Gateway
```

### Multi-tenant

Toda request autenticada carrega `tenantId` no JWT.
Guards e interceptors aplicam filtro automático por tenant.
Nenhuma query retorna dados de outro tenant.

### Geofence

Motorista só pode confirmar entrega se estiver dentro de `GEOFENCE_RADIUS_METERS` (padrão: 100m) do ponto de coleta.
Implementado com fórmula Haversine em `src/common/utils/geo.utils.ts`.

### Tracking realtime

- App envia GPS via WebSocket a cada 4s
- API salva última posição no Redis (não no event store)
- API retransmite para monitor e página pública de tracking
- Token de tracking expira ao finalizar rota

---

## Variáveis de ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `DATABASE_URL` | ✅ | Connection string MySQL |
| `REDIS_HOST` | ✅ | Host do Redis |
| `JWT_SECRET` | ✅ | Chave secreta JWT (mín. 16 chars) |
| `APP_URL` | ✅ | URL do monitor (para CORS e links) |
| `API_URL` | ✅ | URL da própria API |
| `MAPBOX_TOKEN` | Recomendado | Token Mapbox para cálculo de rotas |
| `GEOFENCE_RADIUS_METERS` | opcional | Raio de geofence em metros (padrão: 100) |
| `TRACKING_TOKEN_EXPIRES_IN_MINUTES` | opcional | TTL do token de tracking (padrão: 180) |

---

## Swagger / OpenAPI

Acesse `http://localhost:3333/docs` com a API rodando.

A documentação inclui:
- Todos os endpoints com exemplos de payload
- Autenticação Bearer JWT
- Tags por domínio
- Códigos de erro e descrições
- Exemplos de status de solicitação e rota
- Exemplos de payload de localização realtime

---

## Perfis (Roles)

| Role | Permissões |
|---|---|
| `SUPER_ADMIN` | Acesso global a todos os tenants |
| `TENANT_ADMIN` | Gerencia sua organização |
| `OPERATOR` | Solicitações, rotas, pontos, declarações |
| `DRIVER` | Apenas rotas atribuídas a ele |
| `COLLECTION_POINT_OPERATOR` | Confirmação de recebimento e pesagem |
