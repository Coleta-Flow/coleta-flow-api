export function makeTenant(overrides: Partial<{
  id: string;
  name: string;
  slug: string;
  email: string;
}> = {}) {
  return {
    id: overrides.id ?? 'tenant-uuid',
    name: overrides.name ?? 'Empresa Teste Ltda',
    slug: overrides.slug ?? 'empresa-teste',
    email: overrides.email ?? 'contato@empresa-teste.com',
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
