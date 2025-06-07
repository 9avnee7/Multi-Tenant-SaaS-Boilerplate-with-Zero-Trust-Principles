import Keycloak from 'keycloak-js';

const realm = typeof window !== 'undefined' ? localStorage.getItem('tenantRealm') || 'tenant-1' : 'tenant-1';

const keycloak = new Keycloak({
  url: 'http://localhost:8080/',
  realm,
  clientId: 'saas-frontend',
});


export default keycloak;
