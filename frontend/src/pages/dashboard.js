import { useEffect, useState } from 'react';
import keycloak from '../services/keycloak';
import Navbar from '../components/Navbar';
import { useRouter } from 'next/router';
import Link from 'next/link';
import CreateTenantButton from '../components/CreateTenantButton';

import toast from 'react-hot-toast';


export default function Dashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const realm = typeof window !== 'undefined' ? localStorage.getItem('tenantRealm') : '';


  let fetchUsers;  
  useEffect(() => {
     fetchUsers = async () => {
      try {
        const res = await fetch('http://localhost:4000/api/users', {
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
            'X-Tenant-Realm': realm,
          },
        });
        const data = await res.json();
        setUsers(data);
        console.log(data)
      } catch (err) {
        console.error(err);
      }
    };

    if (keycloak.authenticated) fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
      if (!confirm('Are you sure you want to delete this user?')) return;

      setLoading(true); // show spinner

      try {
        const res = await fetch(`http://localhost:4000/api/users/${userId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${keycloak.token}`,
            'X-Tenant-Realm': realm,
            'Content-Type': 'application/json',
          },
        });
        if (!res.ok) throw new Error('Failed to delete user');

        // Refresh list after deletion
        await fetchUsers();

        toast.success('User deleted successfully');
      
      } catch (err) {
        toast.error(err.message || 'Failed to delete user');
      } finally {
        setLoading(false);
      }
    };

  return (
    <>
      <Navbar />
      <div className="p-6 max-w-4xl mx-auto">
        <h2 className="text-xl font-bold mb-6">Users in {realm}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-md shadow">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left px-6 py-3 border-b border-gray-300">Email</th>
                <th className="text-left px-6 py-3 border-b border-gray-300">Roles</th>
                <th className="text-left px-6 py-3 border-b border-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(users).map(user => (
                <tr key={user.user_id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 border-b border-gray-200">{user.email}</td>
                  <td className="px-6 py-3 border-b border-gray-200">{user.roles.join(', ')}</td>
                  <td className="px-6 py-3 border-b border-gray-200">
                    <Link href={`/users/edit/${user.user_id}`}>
                      <button className="mr-3 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                        Edit
                      </button>
                    </Link>
                    {keycloak.hasRealmRole('admin') && (
                      <button
                        onClick={() => handleDelete(user.user_id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => router.push('/users/create')}
          className="mt-6 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 transition"
        >
          Create User
        </button>
          <br />
          <br />
         <CreateTenantButton userRoles={keycloak.realmAccess?.roles || []} />
      </div>
    </>
  );
}
