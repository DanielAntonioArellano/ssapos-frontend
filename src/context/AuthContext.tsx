import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "../services/api";

interface Restaurant {
  id: number;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  active: boolean;
}

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  isSuperAdmin?: boolean;
  restaurantId: number | null;
  restaurant: Restaurant | null;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  async function login(email: string, password: string) {
    const data = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    // Guardamos tokens
    localStorage.setItem("accessToken", data.accessToken);
    localStorage.setItem("refreshToken", data.refreshToken);

    // Guardamos usuario completo (incluye restaurant)
    localStorage.setItem("user", JSON.stringify(data.user));

    setUser(data.user);
    return data.user;    

    if (data.user.isSuperAdmin) {
  window.location.href = "/superadmin";
} else {
  window.location.href = "/dashboard";
}
  }

  function logout() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}