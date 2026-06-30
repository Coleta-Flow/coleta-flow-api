module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['api', 'monitor', 'app', 'root', 'auth', 'tenants', 'donor-requests', 'routes', 'tracking', 'declarations', 'weights', 'collection-points', 'files', 'reports', 'docker', 'ci'],
    ],
  },
}
