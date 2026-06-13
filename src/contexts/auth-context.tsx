'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type UserInfo = {
  id: string;
  email: string;
  name: string;
  roleId: string;
  permissions: Record<string, Record<string, boolean>>;
};

type AuthContextType = {
  user: UserInfo | null;
  loading: boolean;
  can: (page: string, action: string) => boolean;
  refresh: () => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  can: () => false,
  refresh: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = () => {
    setLoading(true);
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        if (data.error) { setUser(null); return; }
        setUser(data);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUser(); }, []);

  const can = (page: string, action: string): boolean => {
    if (!user?.permissions) return false;
    return user.permissions[page]?.[action] ?? false;
  };

  return (
    <AuthContext.Provider value={{ user, loading, can, refresh: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
