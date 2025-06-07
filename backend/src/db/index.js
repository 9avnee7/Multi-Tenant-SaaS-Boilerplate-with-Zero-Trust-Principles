const knex = require('knex');
const { DATABASE_URL } = process.env;

// Cache tenant-specific Knex instances
const tenantKnexInstances = {};

function getTenantKnex(tenantRealm) {
  if (!tenantKnexInstances[tenantRealm]) {
    tenantKnexInstances[tenantRealm] = knex({
      client: 'pg',
      connection: DATABASE_URL,
      searchPath: [`tenant_${tenantRealm}`, 'public'],  // tenant-specific schema
      pool: { min: 2, max: 10 },
    });
  }
  return tenantKnexInstances[tenantRealm];
}

module.exports = { getTenantKnex };
