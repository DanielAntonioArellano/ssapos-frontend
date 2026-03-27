import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { JSX } from "react/jsx-dev-runtime";

export default function MeseroRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/" replace />;
  if (user.role !== "MESERO") return <Navigate to="/dashboard" replace />;

  return children;
}