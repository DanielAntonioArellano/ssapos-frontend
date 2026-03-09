import { Outlet } from "react-router-dom";
import Sidebar from "./SideBar";
import Topbar from "./TopBar";
import styles from "./layout.module.css";
import { useCaja } from "../context/CajaContext";
import { useAuth } from "../context/AuthContext";
import AbrirCajaModal from "../modules/caja/AbrirCajaModal";
import { useState } from "react";

export default function DashboardLayout({ children }: any) {
  const { caja, loading, refreshCaja } = useCaja();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cajaSkipped, setCajaSkipped] = useState(false);

  if (loading || !user) return null;

const isAdmin = user?.role === "ADMIN" || user?.isSuperAdmin;

console.log("user?.role:", user?.role);
console.log("isAdmin:", isAdmin);
console.log("caja:", caja);
console.log("cajaSkipped:", cajaSkipped);
console.log("mostrarModal:", mostrarModal);
  // Mostrar modal si no hay caja Y no la saltó
  const mostrarModal = !caja && !cajaSkipped;

  return (
    <div className={styles.wrapper}>
      {/* Overlay para cerrar sidebar en móvil */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {mostrarModal && (
        <AbrirCajaModal
          onSuccess={() => {
            setCajaSkipped(false);
            refreshCaja();
          }}
          onSkip={isAdmin ? () => setCajaSkipped(true) : undefined}
        />
      )}

      <div className={styles.main}>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}