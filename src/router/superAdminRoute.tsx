// src/router/SuperAdminRoute.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface Props {
  children: React.ReactNode;
}

export default function SuperAdminRoute({ children }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  if (!user.isSuperAdmin) return <Navigate to="/dashboard" replace />;

  return <>{children}</>;
}