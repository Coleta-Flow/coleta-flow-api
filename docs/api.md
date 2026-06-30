# API Reference — coleta-flow-api

**Base URL:** `http://localhost:3333`
**Swagger:** `http://localhost:3333/docs`

---

## Autenticação

Todas as rotas privadas requerem:
```
Authorization: Bearer <jwt_token>
```

JWT payload:
```json
{
  "sub": "user_uuid",
  "tenantId": "tenant_uuid",
  "role": "OPERATOR",
  "iat": 1700000000,
  "exp": 1700604800
}
```

---

## RBAC

| Role | Acesso |
|---|---|
| `SUPER_ADMIN` | Todos os tenants |
| `TENANT_ADMIN` | Gerencia sua organização |
| `OPERATOR` | Solicitações, rotas, pontos, declarações |
| `DRIVER` | Apenas rotas atribuídas a ele |
| `COLLECTION_POINT_OPERATOR` | Recebimento e pesagem no ponto |

---

## Rotas públicas (sem autenticação)

```
POST /public/donor-requests
  Body: { name, whatsapp, email?, address, city, materialTypeId,
          description, estimatedWeightKg?, bestTimeForPickup, photos? }
  Response: { id, trackingCode, message }

GET /public/tracking/:token
  Response: { driverName, status, lastLocation: { lat, lng }, eta, progress, finished }

GET /verificar/:validationToken
  Valida autenticidade de uma declaração
```

---

## Auth

```
POST /auth/login
  Body: { email, password }
  Response: { accessToken, user }

GET /auth/me
  Response: { id, name, email, role, tenantId }
```

---

## Donor Requests

```
GET    /donor-requests                   OPERATOR | TENANT_ADMIN
       Query: status?, city?, page?, limit?

GET    /donor-requests/:id               OPERATOR | TENANT_ADMIN

PATCH  /donor-requests/:id/review        OPERATOR | TENANT_ADMIN
PATCH  /donor-requests/:id/direct-to-point
       Body: { collectionPointId, notes? }
PATCH  /donor-requests/:id/approve-pickup
PATCH  /donor-requests/:id/cancel
       Body: { reason }
```

---

## Routes

```
POST  /routes                            OPERATOR | TENANT_ADMIN
      Body: { donorRequestId, stops? }

GET   /routes                            OPERATOR | TENANT_ADMIN | DRIVER
      Query: status?, driverId?

GET   /routes/:id

PATCH /routes/:id/assign-driver          OPERATOR | TENANT_ADMIN
      Body: { driverId }

PATCH /routes/:id/start                  DRIVER
      Response: { trackingToken }

PATCH /routes/:id/stops/:stopId/arrive   DRIVER
PATCH /routes/:id/stops/:stopId/collect  DRIVER

PATCH /routes/:id/deliver-to-point       DRIVER
      Body: { lat, lng }
      Erro 403 se fora do raio: { error: "GEOFENCE_VIOLATION", currentDistance, requiredRadius }

PATCH /routes/:id/finish                 DRIVER
```

---

## Collection Points

```
GET    /collection-points                OPERATOR | TENANT_ADMIN
POST   /collection-points                TENANT_ADMIN
       Body: { name, address, city, lat, lng, phone?, operatingHours? }
GET    /collection-points/:id
PATCH  /collection-points/:id            TENANT_ADMIN
DELETE /collection-points/:id            TENANT_ADMIN  (soft delete)
```

---

## Weights

```
POST /weights                            DRIVER | COLLECTION_POINT_OPERATOR
     Body: { routeId, donorRequestId, grossWeightKg, netWeightKg, tareKg?, notes? }
```

---

## Declarations

```
POST /declarations/generate              OPERATOR | TENANT_ADMIN
     Body: { donorRequestId }
     Requer: WeightRecord existente

GET  /declarations                       OPERATOR | TENANT_ADMIN
GET  /declarations/:id
GET  /declarations/:id/download          → PDF (application/pdf)
```

---

## Reports

```
GET /reports/dashboard                   OPERATOR | TENANT_ADMIN
    Response:
      totalRequests, pendingRequests, requestsThisMonth
      activeRoutes, totalWeightCollectedKg, declarationsGenerated
      requestsByStatus: Record<Status, number>
      requestsByCity: { city, count }[]
```

---

## WebSocket — namespace /tracking

### Eventos do cliente → servidor

```
tracking:subscribe
  { token }        → entra na sala tracking:{token}
  { routeId, tenantId } → entra na sala tenant:{tenantId}:route:{routeId}

driver:location:update
  { routeId, tenantId, lat, lng, accuracy?, speed?, bearing? }
```

### Eventos servidor → cliente

```
tracking:update
  { lat, lng, status, timestamp }

route:status:changed
  { routeId, status, updatedAt }

driver:delivered
  { routeId, collectionPointName }

error
  { code: "TRACKING_TOKEN_EXPIRED" | "ROUTE_NOT_FOUND" }
```

---

## Códigos de erro

| Código | HTTP | Descrição |
|---|---|---|
| `GEOFENCE_VIOLATION` | 403 | Motorista fora do raio do ponto |
| `WEIGHT_REQUIRED` | 422 | Declaração requer peso confirmado |
| `INVALID_STATUS_TRANSITION` | 422 | Transição de status inválida |
| `TENANT_ACCESS_DENIED` | 403 | Recurso de outro tenant |
| `TRACKING_TOKEN_EXPIRED` | 410 | Token expirado ou inválido |
| `DRIVER_NOT_ASSIGNED` | 422 | Rota sem motorista atribuído |
| `ROUTE_ALREADY_ACTIVE` | 409 | Motorista já tem rota ativa |
