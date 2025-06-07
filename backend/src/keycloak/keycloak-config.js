const Keycloak = require('keycloak-connect');
const session = require('express-session');
const memoryStore = new session.MemoryStore();

let keycloakInstances = {}; // { tenantRealm: KeycloakInstance }

function initKeycloak() {
  console.log("🔐 Initializing Keycloak instances for all configured realms...");

  const realms = ['tenant-1', 'tenant-2']; // You can load this from a config/env if needed

  realms.forEach((realm) => {
    const secret = process.env[`KEYCLOAK_CLIENT_SECRET_${realm.toUpperCase()}`];

    if (!secret) {
      console.warn(`⚠️  Missing client secret for realm: ${realm}. Skipping this realm.`);
      return;
    }

    console.log(`🔧 Setting up Keycloak instance for realm: ${realm}`);

    try {
      keycloakInstances[realm] = new Keycloak(
        { store: memoryStore },
        {
          realm,
          'auth-server-url': process.env.KEYCLOAK_AUTH_URL,
          'ssl-required': 'external',
          resource: process.env.KEYCLOAK_CLIENT_ID,
          credentials: { secret },
          'confidential-port': 0,
        }
      );
      console.log(`✅ Keycloak instance initialized for realm: ${realm}`);
    } catch (err) {
      console.error(`❌ Failed to initialize Keycloak for realm ${realm}:`, err);
    }
  });

  console.log("✅ All configured Keycloak instances initialized.\n");
}

function getKeycloak(tenantRealm) {
  const kc = keycloakInstances[tenantRealm];
  if (!kc) {
    console.error(`❌ Attempted to access uninitialized Keycloak instance for realm: ${tenantRealm}`);
    throw new Error(`Keycloak instance not initialized for realm ${tenantRealm}`);
  }

  console.log(`➡️  Retrieved Keycloak instance for realm: ${tenantRealm}`);
  return kc;
}

module.exports = { initKeycloak, getKeycloak, memoryStore };
