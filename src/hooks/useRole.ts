// src/hooks/useRole.ts
import { useAuth } from "../context/AuthContext";

export function useRole() {
  const { user } = useAuth();
  const role = user?.role;

  return {
    isAdmin:   role === "ADMIN",
    isCajero:  role === "CAJERO",
    isMesero:  role === "MESERO",
    isSuperAdmin: user?.isSuperAdmin ?? false,
    can: {
      checkout:      role === "CAJERO" || role === "ADMIN",
      cancelOrder:   role === "CAJERO" || role === "ADMIN",
      createOrder:   true, // todos
      changeStatus:  true, // todos
      verCaja:       role === "CAJERO" || role === "ADMIN",
      cerrarCaja:    role === "CAJERO",
      verReportes:   role === "ADMIN",
      verUsuarios:   role === "ADMIN",
      verProductos:  role === "ADMIN" || role === "CAJERO",
      verInventario: role === "ADMIN",
      verClientes:   role === "ADMIN",
      verMesero:     role === "MESERO",
    },
  };
}