// keycloak/middleware.js
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { getKeycloak } = require('./keycloak-config');

const jwksClients = {};

function getSigningKey(tenantRealm, header, callback) {
  if (!jwksClients[tenantRealm]) {
    jwksClients[tenantRealm] = jwksClient({
      jwksUri: `http://localhost:8080/realms/${tenantRealm}/protocol/openid-connect/certs`,
    });
  }

  jwksClients[tenantRealm].getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

function tenantExtractor(req, res, next) {
  const authHeader = req.headers.authorization;
  const tenantRealm = req.headers['x-tenant-realm'];

  if (!authHeader || !tenantRealm) {
    return res.status(400).json({ error: 'Missing auth token or tenant realm' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    (header, callback) => getSigningKey(tenantRealm, header, callback),
    {},
    (err, decoded) => {
      if (err) {
        console.error('JWT verification failed:', err);
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      req.user = decoded;
      req.roles = decoded.realm_access?.roles || [];
      req.tenantRealm = tenantRealm;

      try {
        req.keycloak = getKeycloak(tenantRealm);
      } catch (e) {
        return res.status(500).json({ error: 'Invalid tenant realm' });
      }

      next();
    }
  );
}

function rbac(requiredRole) {
  return (req, res, next) => {
    console.log(req.roles, 'Required role:', requiredRole);
    if (!req.roles.includes(requiredRole)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}



const keycloakMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(400).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.decode(token);

    if (!decoded) return res.status(400).json({ error: 'Failed to decode token' });

    req.user = decoded;
    req.tenantRealm = decoded.iss?.split('/realms/')[1] || null;

    next();
  } catch (err) {
    console.error('Token decode failed:', err);
    res.status(400).json({ error: 'Invalid token' });
  }
};

module.exports = {
  keycloakMiddleware,
  rbac,
};


module.exports = { tenantExtractor, rbac,keycloakMiddleware };
