const axios = require('axios');

/**
 * Calls OPA to authorize the request
 */
async function opaAuthorize({ userRole, userTenant, resourceTenant, action }) {
  try {
    const input = {
      role: userRole,
      tenant: userTenant,
      resource_tenant: resourceTenant,
      action: action,
    };

    const res = await axios.post('http://localhost:8181/v1/data/authz/allow', { input });

    return res.data.result === true;
  } catch (err) {
    console.error('[OPA] Error:', err.message);
    return false;
  }
}

/**
 * Express middleware to enforce OPA authorization
 */
async function opaMiddleware(req, res, next) {
  // Extract info from decoded JWT (populated by tenantExtractor middleware)
  const userRoles = req.roles; // array of roles
  const userTenant = req.tenantRealm; // realm name from token
  const resourceTenant = req.params.tenantId || userTenant; // fallback to user's own tenant
  const action = req.method.toLowerCase();

  const preferredRoles = ['admin', 'user']; 
  const userRole = preferredRoles.find(role => req.roles.includes(role));

  console.log('[OPA] Authorizing request:', {
    userRole,
    userTenant,
    resourceTenant,
    action,
  });
  const allowed = await opaAuthorize({
    userRole,
    userTenant,
    resourceTenant,
    action,
  });
  console.log(allowed, 'OPA authorization result');

  if (!allowed) {
    return res.status(403).json({ message: 'Access denied by OPA policy' });
  }

  next();
}

module.exports = opaMiddleware;
