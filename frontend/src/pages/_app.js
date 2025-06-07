import { useEffect, useState } from 'react';
import keycloak from '../services/keycloak';
import '../styles/global.css';
import { Toaster } from 'react-hot-toast';

function MyApp({ Component, pageProps }) {
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    keycloak.init({ onLoad: 'login-required' }).then(auth => {
      setAuthenticated(auth);
    });
  }, []);

  if (!authenticated) return <div>Loading...</div>;

  return <>
  <Component {...pageProps} />
   <Toaster position="top-right" />
  </>;

}

export default MyApp;
