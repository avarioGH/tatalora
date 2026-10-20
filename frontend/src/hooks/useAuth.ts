import { useState, useEffect } from 'react';

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('erp_token');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  return { token };
}
