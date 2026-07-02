# Deploy no Railway — Eco Logi API

Guia para publicar a API NestJS no [Railway](https://railway.com).

## Arquitetura

| Serviço Railway | Uso |
|-----------------|-----|
| **Web (API)** | NestJS — este repositório (`eco-logi-api`) |
| **MySQL** | Banco principal (Prisma) |
| **Redis** | Tracking GPS e sessões WebSocket |

Opcional: bucket S3 para uploads em produção (`STORAGE_TYPE=s3`).

## 1. Criar o projeto

1. Novo projeto no Railway → **Deploy from GitHub** → selecione o repositório.
2. Defina o **Root Directory** como `eco-logi-api` (se o repo for monorepo).
3. O Railway detecta `railway.json` e usa o **Dockerfile** automaticamente.

## 2. Provisionar MySQL e Redis

1. No projeto, **Add Service** → **Database** → **MySQL**.
2. **Add Service** → **Database** → **Redis**.
3. Aguarde os plugins ficarem online.

## 3. Variáveis de ambiente (serviço API)

No serviço da API, configure:

```env
NODE_ENV=production

# MySQL — referencie a URL do plugin (nome pode variar)
DATABASE_URL=${{MySQL.MYSQL_URL}}

# Redis — Railway expõe REDIS_URL no plugin
REDIS_URL=${{Redis.REDIS_URL}}

JWT_SECRET=<gere-uma-string-aleatoria-com-32+-caracteres>
JWT_EXPIRES_IN=7d

# URLs públicas (ajuste após gerar domínio Railway)
APP_URL=https://seu-frontend.up.railway.app
API_URL=https://sua-api.up.railway.app

# CORS extra (opcional, separado por vírgula)
CORS_ORIGINS=https://seu-frontend.up.railway.app

STORAGE_TYPE=s3
AWS_S3_BUCKET=seu-bucket
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

> **PORT** é injetada automaticamente pelo Railway — não precisa definir.

> **Importante:** disco local é **efêmero**. Com `STORAGE_TYPE=local`, uploads são perdidos a cada redeploy. Use S3 em produção.

### Referências de variáveis (Railway)

Os nomes `${{MySQL.MYSQL_URL}}` e `${{Redis.REDIS_URL}}` dependem do nome dos serviços. Use **Variables → Add Reference** no dashboard para vincular corretamente.

Alternativa Redis (sem URL):

```env
REDIS_HOST=${{Redis.REDIS_HOST}}
REDIS_PORT=${{Redis.REDIS_PORT}}
REDIS_PASSWORD=${{Redis.REDIS_PASSWORD}}
```

## 4. Domínio público

1. Serviço API → **Settings** → **Networking** → **Generate Domain**.
2. Atualize `API_URL` com a URL gerada.
3. Configure o frontend (`NEXT_PUBLIC_API_URL`) apontando para essa URL.

## 5. Migrations e seed

O container executa automaticamente:

```bash
npx prisma migrate deploy && node dist/main
```

Para popular dados iniciais (opcional, uma vez):

```bash
railway run yarn db:seed
```

## 6. Health check

- Endpoint: `GET /health`
- Retorna `{ status: "ok" }` se o MySQL estiver acessível.
- Configurado em `railway.json` como `healthcheckPath`.

## 7. WebSocket (tracking)

O namespace `/tracking` roda no mesmo serviço HTTP. No frontend, use:

```
wss://sua-api.up.railway.app/tracking
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| Build falha no Prisma | Verifique se `prisma/` e `yarn.lock` estão no repo |
| App crasha na subida | Confira `DATABASE_URL`, `JWT_SECRET` (mín. 16 chars) e `APP_URL`/`API_URL` como URI válida |
| CORS bloqueado | Ajuste `APP_URL` ou `CORS_ORIGINS` com a URL exata do frontend |
| Redis connection refused | Use `REDIS_URL` do plugin ou referências `${{Redis.*}}` |
| Uploads sumindo | Migre para `STORAGE_TYPE=s3` |
| Prisma OpenSSL / `Error load` no deploy | Dockerfile usa `node:22-bookworm-slim` + `openssl`; regenere client após mudar `binaryTargets` |
| Health check `service unavailable` | `/health` é público (sem JWT); use `/health/ready` para testar DB; confira `PORT`, `APP_URL` e `API_URL` como URI válida |

## Arquivos relevantes

- `Dockerfile` — build multi-stage + migrate deploy
- `railway.json` — builder Docker + health check
- `nixpacks.toml` — fallback se não usar Docker
- `.env.example` — referência completa de variáveis
