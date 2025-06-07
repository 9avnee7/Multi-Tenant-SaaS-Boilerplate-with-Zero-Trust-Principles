const KcAdminClient = require('keycloak-admin').default;

async function getKeycloakAdmin(realmName) {
  const kcAdminClient = new KcAdminClient({
    baseUrl: process.env.KEYCLOAK_AUTH_URL || 'http://localhost:8080',
    realmName: 'master', // Admin login realm
  });

  try {
    await kcAdminClient.auth({
      username: process.env.KEYCLOAK_ADMIN_USERNAME || 'admin',
      password: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin', // no spaces
      grantType: 'password',
      clientId: 'admin-cli',
    });
    console.log('✅ Keycloak admin authenticated');
  } catch (err) {
    console.error('❌ Keycloak admin auth failed:', err.response?.data || err.message);
    throw err;
  }

  kcAdminClient.setConfig({ realmName }); // switch to the target tenant realm
  return kcAdminClient;
}

module.exports = { getKeycloakAdmin };
