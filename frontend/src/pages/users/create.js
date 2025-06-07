import { useState } from 'react';
import keycloak from '../../services/keycloak';
import Navbar from '../../components/Navbar';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';


export default function CreateUser() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roles, setRoles] = useState('');
  const router = useRouter();
  const realm = localStorage.getItem('tenantRealm');

  const handleCreate = async () => {
    const res = await fetch('http://localhost:4000/api/users', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
        'X-Tenant-Realm': realm,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, roles: roles.split(',') }),
    });

    if (res.ok) {
      router.push('/dashboard');
      toast.success('User created successfully');
    } else {
      alert("Failed to create user");
    }
  };

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Create User</h2>
        <input
          className="border p-2 w-full mb-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="border p-2 w-full mb-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="border p-2 w-full mb-3"
          placeholder="Roles (comma-separated)"
          value={roles}
          onChange={(e) => setRoles(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={handleCreate}
        >
          Submit
        </button>
      </div>
    </>
  );
}
