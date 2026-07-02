## feat: Donors, Reports, Declarations, Auth & Tests

### Summary

Refatoração completa do módulo de Donors (desacoplado de User), reports de eficiência e sustentabilidade, declarações automáticas, roleId como UUID e 70+ testes de unidade.

### Changes

- **Donors** — Novo módulo independente com CRUD, history, DTOs e migração própria. `DonorRequest` refatorado para usar FK `donorId`.
- **Declarações** — Geração automática ao finalizar pesagem via CommandBus, PDF factory customizável (logo, CompanySettings), fallback para fontes locais.
- **Reports** — RF26 (eficiência com haversine + horas), RF27 (CO₂ por material), RF30 (exportação CSV).
- **Auth & Users** — Role ID como UUID no payload JWT (role name nunca exposto), refresh token com rotação, `POST /auth/refresh` e `POST /auth/logout`. CRUD de usuários com roleId.
- **Material Types** — `unitOfMeasure` adicionado, CRUD completo.
- **Files** — Upload/download com `FileAsset`, resolvido `photoIds` em DonorRequest.
- **Unit of Measure** — Suporte a kg/g/t/unidades com conversão nos relatórios.
- **Tests** — 11 suites, 70 testes (auth, donor, reports, email, declarations, weights, tracking, handlers).
- **CI/CD** — GitHub Actions com Node 20, Prisma generate, lint, test, coverage.
- **Infra** — Docker Compose com MySQL 8 + Redis, CSP para Scalar CDN, env validation.
- **Rebrand** — ColetaFlow → EcoLogi (61 referências em 34 arquivos).

### Breaking

- `role` removido dos responses da API — usar `roleId` (UUID)
- `POST /auth/login` e `POST /auth/register` agora retornam apenas `{ accessToken, refreshToken }`
- Banco renomeado de `coleta_flow` para `eco_logi`

### How to test

```bash
npx prisma db push --force-reset
pnpm ts-node prisma/seed.ts
pnpm test
```
