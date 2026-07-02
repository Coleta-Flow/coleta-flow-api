# Arquitetura — ecologi-api

**Stack:** NestJS · TypeScript · MySQL 8 · Prisma · Redis 7 · WebSocket (socket.io) · JWT · CQRS

---

## Visão geral

A API é o núcleo da plataforma EcoLogi. Responsável por:
- Autenticação e autorização (JWT + RBAC)
- Isolamento multi-tenant por `tenantId`
- Gerenciamento de solicitações de coleta com máquina de estados explícita
- Rastreamento em tempo real via WebSocket + Redis
- Geofence para validação de entrega
- Geração de PDFs de declaração (PDFKit)
- Event store de auditoria (MySQL)

---

## Multi-tenant

### Estratégia: single database, row-level isolation

```
1 banco MySQL
1 schema
tenantId em todas as tabelas operacionais
```

**Garantias de isolamento:**
- `TenantGuard` extrai `tenantId` do JWT — nunca do body
- Middleware Prisma injeta `where: { tenantId }` em todas as queries
- `TenantAccessDeniedError` lançado se `request.tenantId !== resource.tenantId`
- `SUPER_ADMIN` tem acesso cross-tenant com flag explícita

```typescript
// JWT payload — nunca confia no tenantId do body
{
  sub: "user_uuid",
  tenantId: "tenant_uuid",   // ← fonte da verdade
  role: "OPERATOR",
}
```

---

## CQRS

Aplicado nos módulos com regra de negócio complexa: `donor-requests`, `routes`, `declarations`.

```
Controller → DTO (validação) → CommandBus / QueryBus
                                      ↓
                               Command Handler
                                      ↓
                          Domain Service / Use Case
                                      ↓
                         Repository (interface Prisma)
```

**Módulos com service direto** (sem CQRS): `collection-points`, `users`, `files`, `weights`.

---

## Event Store vs Redis

| Dado | Destino | Motivo |
|---|---|---|
| Eventos de negócio (criação, aprovação, coleta) | MySQL `business_events` | Imutáveis, auditáveis |
| Localização GPS (a cada 4s) | Redis apenas | ~7.200 pts/rota em 8h — inviabilizaria o event store |
| Snapshots de localização | MySQL `driver_location_snapshots` | A cada 60s ou em eventos críticos |

```
App → GPS a cada 4s → WebSocket → API
  → Redis: tenant:{tenantId}:driver:{driverId}:location (TTL)
  → Emite para sala WebSocket
  → Snapshot no MySQL a cada 60s
```

---

## Módulos NestJS

```
src/modules/
  auth/               → JWT strategy, guards globais via APP_GUARD
  tenants/            → CRUD de organizações (SUPER_ADMIN)
  users/              → CRUD de usuários por tenant
  donor-requests/     → CQRS completo, máquina de estados, fotos
  routes/             → CQRS, geofence, foreground tracking
  tracking/           → WebSocket gateway, Redis service
  collection-points/  → CRUD simples
  weights/            → Registro de pesagem pós-coleta
  declarations/       → Geração de PDF (PDFKit + QR Code)
  files/              → Upload e storage de assets
  reports/            → Dashboard e relatórios agregados
  event-store/        → Registro imutável de eventos de negócio
```

---

## Guards globais

Ambos registrados via `APP_GUARD` no `AuthModule` — aplicados em **todas** as rotas automaticamente:

```typescript
// auth.module.ts
providers: [
  { provide: APP_GUARD, useClass: JwtAuthGuard },
  { provide: APP_GUARD, useClass: RolesGuard },
]
```

Rotas públicas decoradas com `@Public()` — bypassa o `JwtAuthGuard`.

---

## Geofence

Haversine em `src/common/utils/geo.utils.ts`:

```typescript
haversineDistance(lat1, lng1, lat2, lng2): number  // metros
isWithinRadius(lat1, lng1, lat2, lng2, radiusMeters): boolean
```

Raio configurável: `GEOFENCE_RADIUS_METERS=100` no `.env`.

Resposta de erro `403`:
```json
{
  "error": "GEOFENCE_VIOLATION",
  "data": { "currentDistance": 347, "requiredRadius": 100 }
}
```

---

## Tracking Token

```
startRoute()
  → gera UUID v4 (tracking token)
  → salva TrackingSession no MySQL
  → salva no Redis com TTL (TRACKING_TOKEN_EXPIRES_IN_MINUTES, default 180)
  → retorna token para o motorista

deliverToPoint()
  → valida geofence
  → invalida token no Redis
  → página /acompanhar/{token} exibe estado final
```

---

## Máquina de estados — DonorRequest

`DonorRequestStatusVO` encapsula transições válidas. Lança `InvalidStatusTransitionError` em transição inválida.

```
REQUESTED → UNDER_REVIEW → APPROVED_FOR_PICKUP → DRIVER_ASSIGNED
  → DRIVER_ON_THE_WAY → DRIVER_ARRIVED → COLLECTED
  → GOING_TO_COLLECTION_POINT → DELIVERED_TO_COLLECTION_POINT
  → WEIGHED → DECLARATION_AVAILABLE → FINISHED

REQUESTED → UNDER_REVIEW → DIRECTED_TO_COLLECTION_POINT
  → WAITING_DROPOFF_AT_POINT → DELIVERED_TO_COLLECTION_POINT
  → WEIGHED → DECLARATION_AVAILABLE → FINISHED

Qualquer → CANCELLED (exceto FINISHED)
```

---

## PDF (Declaração)

Gerado por `DeclarationPdfFactory` com PDFKit. Requer `WeightRecord` existente.

Conteúdo obrigatório: dados da organização, solicitante, material, peso real, data, ponto de coleta, motorista, código único, QR Code de validação.

---

## WebSocket

Namespace `/tracking`. Salas:
- `tenant:{tenantId}:route:{routeId}` — painel interno do monitor
- `tracking:{token}` — página pública do solicitante

Eventos:
- `driver:location:update` → salva Redis, emite `tracking:update`
- `route:status:changed` → emite mudança de status
- `driver:delivered` → encerra sessão pública

---

## Segurança

- Helmet.js — headers HTTP
- Rate limiting em rotas públicas
- CORS restrito a `APP_URL`
- Validação global com `class-validator` (whitelist + forbidNonWhitelisted)
- `tenantId` sempre do JWT, nunca do body
