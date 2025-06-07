import Link from 'next/link';
import keycloak from '../services/keycloak';

export default function Navbar() {
  const logout = () => {
  localStorage.clear(); // clear stored realm, tokens, etc
  keycloak.logout({ redirectUri: window.location.origin }); // log out from Keycloak, redirect to home/tenant selection
};


  return (
    <nav className="p-4 bg-gray-800 text-white flex justify-between">
      <div className="text-xl">Multi-Tenant SaaS</div>
      <div className="flex gap-4">
        <Link href="/dashboard">Dashboard</Link>
        {/* <Link href="/profile">
          Profile
        </Link> */}
        <button onClick={logout}>Logout</button>
      </div>
    </nav>
  );
}
