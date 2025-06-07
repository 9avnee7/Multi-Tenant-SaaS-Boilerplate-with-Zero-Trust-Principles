const { getTenantKnex } = require('../db');
const { execSync } = require('child_process');

async function createTenant(tenantRealm) {
  const knex = getTenantKnex('public'); // public schema for global tasks

  // Create schema for tenant
  await knex.raw(`CREATE SCHEMA IF NOT EXISTS tenant_${tenantRealm}`);

  // Run migrations on tenant schema
  // You can run migration CLI commands with schema override OR write migration scripts with schema prefix
  execSync(`npx knex migrate:latest --knexfile ./src/db/knexfile.js --env ${tenantRealm}`, { stdio: 'inherit' });

  // Seed tenant schema if necessary
  execSync(`npx knex seed:run --knexfile ./src/db/knexfile.js --env ${tenantRealm}`, { stdio: 'inherit' });

  return { success: true, message: `Tenant ${tenantRealm} created with schema tenant_${tenantRealm}` };
}

module.exports = { createTenant };
