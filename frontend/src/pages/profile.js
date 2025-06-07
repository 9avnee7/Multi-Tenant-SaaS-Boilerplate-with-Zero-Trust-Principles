import { useEffect, useState } from 'react';
import { useKeycloak } from '../context/keycloakContext';

export default function Profile() {
  const { keycloak } = useKeycloak();

  const [user, setUser] = useState(null);
    const realm = typeof window !== 'undefined' ? localStorage.getItem('tenantRealm') : '';

  useEffect(() => {
    if (!keycloak?.token) return;

    fetch('http://localhost:4000/api/users/me', {
        
      headers: { Authorization: `Bearer ${keycloak.token}`,'X-Tenant-Realm': realm, }
    })
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(console.error);
  }, [keycloak]);

  if (!user) return <p>Loading...</p>;

  return (
    <div className="p-8">
      {/* <h1 className="text-2xl font-bold mb-4">My Profile</h1>
      <p><strong>Email:</strong> {user.email}</p>
      <p><strong>Roles:</strong> {user.roles.join(', ')}</p> */}

    </div>
  );
}
