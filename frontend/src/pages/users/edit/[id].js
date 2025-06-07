import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import keycloak from '../../../services/keycloak';
import Navbar from '../../../components/Navbar';

export default function EditUser() {
  const router = useRouter();
  const { id } = router.query;
  const realm = localStorage.getItem('tenantRealm');
  const [user, setUser] = useState(null);
  const [originalEmail, setOriginalEmail] = useState(null);

useEffect(() => {
  if (!id) return;

  fetch(`http://localhost:4000/api/users/${id}`, {
    headers: {
      Authorization: `Bearer ${keycloak.token}`,
      'X-Tenant-Realm': realm,
    },
  })
    .then(res => res.json())
    .then((data) => {
      setUser(data);
      setOriginalEmail(data.email); // store original email
    });
}, [id]);


  useEffect(() => {
    if (!id) return;

    fetch(`http://localhost:4000/api/users/${id}`, {
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
        'X-Tenant-Realm': realm,
      },
    })
      .then(res => res.json())
      .then(setUser);
  }, [id]);

  const updateUser = () => {
  fetch(`http://localhost:4000/api/users/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${keycloak.token}`,
      'X-Tenant-Realm': realm,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...user,
      oldEmail: originalEmail, 
    }),
  }).then(() => router.push('/dashboard'));
};


  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Edit User</h2>
        <input
          className="border p-2 w-full mb-3"
          value={user.email}
          onChange={(e) => setUser({ ...user, email: e.target.value })}
        />
        <input
          className="border p-2 w-full mb-3"
          value={user.password}
          type="password"
          onChange={(e) => setUser({ ...user, password: e.target.value })}
        />
        <input
          className="border p-2 w-full mb-3"
          value={user.roles.join(',')}
          onChange={(e) => setUser({ ...user, roles: e.target.value.split(',') })}
        />
        <button
          className="bg-green-600 text-white px-4 py-2 rounded"
          onClick={updateUser}
        >
          Save Changes
        </button>
      </div>
    </>
  );
}
