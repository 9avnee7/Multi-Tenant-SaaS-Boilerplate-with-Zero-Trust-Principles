
// components/CreateTenantButton.js
import { useRouter } from 'next/router';

export default function CreateTenantButton({ userRoles }) {
  const router = useRouter();

  // Only show if user has 'admin' role
  if (!userRoles.includes('admin')) return null;

  return (
    <button
      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      onClick={() => router.push('/create-tenant')}
    >
      Create Tenant
    </button>
  );
}
