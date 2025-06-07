import { useState } from 'react';

export default function Home() {
  const [tenant, setTenant] = useState('');

  const submit = () => {
    if (!tenant) return alert("Enter a realm!");
    localStorage.setItem('tenantRealm', tenant);
    window.location.href = '/dashboard';
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center gap-4 bg-gray-100">
      <h1 className="text-2xl font-bold">🔐 Select Tenant Realm</h1>
      <input
        value={tenant}
        onChange={(e) => setTenant(e.target.value)}
        placeholder="tenant-1"
        className="px-4 py-2 border rounded w-64"
      />
      <button
        onClick={submit}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Continue
      </button>
    </div>
  );
}
