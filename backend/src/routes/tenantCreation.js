const express = require('express');
const axios = require('axios');
const {getTenantKnex} = require('../db'); 




const router = express.Router();

const KEYCLOAK_BASE_URL = 'http://localhost:8080';
const KEYCLOAK_ADMIN_USERNAME = 'admin';
const KEYCLOAK_ADMIN_PASSWORD = 'admin';
const KEYCLOAK_ADMIN_CLIENT_ID = 'admin-cli';

let adminAccessToken = null;

async function getAdminToken() {
  if (adminAccessToken) {
    console.log('[getAdminToken] Using cached admin access token');
    return adminAccessToken;
  }

  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('client_id', KEYCLOAK_ADMIN_CLIENT_ID);
  params.append('username', KEYCLOAK_ADMIN_USERNAME);
  params.append('password', KEYCLOAK_ADMIN_PASSWORD);

  try {
    console.log('[getAdminToken] Requesting new admin access token...');
    const res = await axios.post(`${KEYCLOAK_BASE_URL}/realms/master/protocol/openid-connect/token`, params);
    adminAccessToken = res.data.access_token;
    console.log('[getAdminToken] Received new admin access token');
    return adminAccessToken;
  } catch (err) {
    console.error('[getAdminToken] Error fetching admin token:', err.response?.data || err.message);
    throw err;
  }
}

async function createRealm(realmName, adminEmail) {
  const token = await getAdminToken();

  const newRealmConfig = {
    realm: realmName,
    enabled: true,
  };

  try {
    console.log(`[createRealm] Creating new realm: ${realmName}`);
    await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms`,
      newRealmConfig,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`[createRealm] Realm '${realmName}' created successfully`);
  } catch (err) {
    console.error(`[createRealm] Error creating realm '${realmName}':`, err.response?.data || err.message);
    throw err;
  }

  const clientConfig = {
    clientId: 'saas-frontend',
    enabled: true,
    redirectUris: ['http://localhost:3000/*'],
    publicClient: true,
  };
  try {
    console.log(`[createRealm] Creating client for realm '${realmName}'`);
    await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms/${realmName}/clients`,
      clientConfig,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`[createRealm] Client created for realm '${realmName}'`);
  } catch (err) {
    console.error(`[createRealm] Error creating client for realm '${realmName}':`, err.response?.data || err.message);
    throw err;
  }

  const adminUser = {
    username: adminEmail,
    email: adminEmail,
    enabled: true,
    credentials: [
      { type: 'password', value: 'changeMe123!', temporary: true }
    ],
  };

  try {
    console.log(`[createRealm] Creating admin user '${adminEmail}' in realm '${realmName}'`);
    const userRes = await axios.post(
      `${KEYCLOAK_BASE_URL}/admin/realms/${realmName}/users`,
      adminUser,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log(`[createRealm] Admin user '${adminEmail}' created in realm '${realmName}'`);
    return userRes.headers.location.split('/').pop(); // return Keycloak user ID
  } catch (err) {
    console.error(`[createRealm] Error creating admin user '${adminEmail}' in realm '${realmName}':`, err.response?.data || err.message);
    throw err;
  }
}

router.post('/tenants', async (req, res) => {

  console.log('[POST /api/tenants] Incoming request body:', req.body);

  const { tenantName, adminEmail } = req.body;
  const knex = getTenantKnex('master'); // Use master DB for tenant creation

  if (!tenantName || !adminEmail) {
    console.warn('[POST /api/tenants] Missing tenantName or adminEmail');
    return res.status(400).json({ message: 'Tenant name and admin email are required' });
  }

  try {
    console.log(`[POST /api/tenants] Creating tenant '${tenantName}' with admin email '${adminEmail}'`);

    // 1. Create realm and admin user in Keycloak
    const keycloakUserId = await createRealm(tenantName, adminEmail);

    // 2. Insert tenant into PostgreSQL
    const [tenantRow] = await knex('tenants')
      .insert({
        name: tenantName,
        domain: null,
        settings: {},
      })
      .returning(['tenant_id', 'name']);

    console.log(`[POST /api/tenants] Inserted tenant into DB:`, tenantRow);

    // 3. Insert admin user into users table
    const [newUser] = await knex('users')
      .insert({
        user_id: keycloakUserId,
        email: adminEmail,
        password: "changeMe123",
        roles: ['admin'],
        tenant_id: tenantRow.tenant_id,
      })
      .returning('*');

    console.log(`[POST /api/tenants] Admin user '${adminEmail}' inserted into DB`);

    res.status(201).json({
      message: 'Tenant and admin user created successfully',
      tenant: tenantRow,
      adminUser: newUser,
    });
  } catch (err) {
    console.error('[POST /api/tenants] Error creating tenant:', err.response?.data || err.message);
    res.status(500).json({ message: 'Failed to create tenant', error: err.message });
  }
});

module.exports = router;
