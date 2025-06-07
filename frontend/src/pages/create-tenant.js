import { useState } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import keycloak from '@/services/keycloak';

export default function CreateTenant() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('http://localhost:4000/api/tenants', {
        method: 'POST',
        authentication: `Bearer ${keycloak.token}`,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantName, adminEmail }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to create tenant');
      }

      toast.success('Tenant created successfully!');
      router.push('/'); // Back to tenant selection or dashboard
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-6 border rounded shadow">
      <h1 className="text-xl font-bold mb-4">Create New Tenant</h1>
      <form onSubmit={handleSubmit}>
        <label className="block mb-2">
          Tenant Name
          <input
            required
            type="text"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
            className="w-full border px-3 py-2 rounded mt-1"
            placeholder="e.g. tenant-3"
          />
        </label>
        <label className="block mb-4">
          Admin Email
          <input
            required
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            className="w-full border px-3 py-2 rounded mt-1"
            placeholder="admin@example.com"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          {loading ? 'Creating...' : 'Create Tenant'}
        </button>
      </form>
    </div>
  );
}
